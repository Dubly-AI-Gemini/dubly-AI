
const sessions = new Map();
const OFFSCREEN_URL = chrome.runtime.getURL("offscreen.html");
let offscreenCreating = null;

async function ensureOffscreen() {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
    documentUrls: [OFFSCREEN_URL]
  });
  if (contexts.length) return;
  if (offscreenCreating) return offscreenCreating;
  offscreenCreating = chrome.offscreen.createDocument({
    url: "offscreen.html",
    reasons: ["USER_MEDIA"],
    justification: "Capture the active tab audio and play Gemini-generated dubbed audio."
  }).finally(() => { offscreenCreating = null; });
  await offscreenCreating;
}

async function injectContent(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"]
    });
    return true;
  } catch (e) {
    throw new Error("This page does not allow extension injection. Open a normal HTTPS/HTTP webpage and try again.");
  }
}

async function sendTab(tabId, message) {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch {
    return null;
  }
}

async function waitCaptureStopped(tabId, timeoutMs = 2500) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const captures = await chrome.tabCapture.getCapturedTabs();
    const c = captures.find(x => x.tabId === tabId);
    if (!c || c.status === "stopped" || c.status === "error") return;
    await new Promise(r => setTimeout(r, 120));
  }
  throw new Error("Chrome still reports an active tab capture on this tab. Stop the other recorder/capture first.");
}

async function stopOurSession(tabId, removeUi = true) {
  if (!sessions.has(tabId)) return;
  await ensureOffscreen();
  try {
    await chrome.runtime.sendMessage({ type: "OFFSCREEN_STOP", tabId });
  } catch {}
  sessions.delete(tabId);
  if (removeUi) await sendTab(tabId, { type: "DUBLY_UI_STOP" });
  await waitCaptureStopped(tabId).catch(() => {});
}

function validTab(tab) {
  return !!tab?.id && /^https?:\/\//i.test(tab.url || "");
}

async function startSession(tabId, config) {
  if (!Number.isInteger(tabId)) throw new Error("Invalid tab.");
  const tab = await chrome.tabs.get(tabId);
  if (!validTab(tab)) throw new Error("Open the video on a normal HTTP/HTTPS webpage first.");

  await injectContent(tabId);
  await ensureOffscreen();

  // If this extension already owns the capture, tear it down completely.
  if (sessions.has(tabId)) {
    await stopOurSession(tabId, false);
    await waitCaptureStopped(tabId).catch(() => {});
  }

  // Never steal an active capture owned by another extension.
  const captures = await chrome.tabCapture.getCapturedTabs();
  const active = captures.find(x => x.tabId === tabId && x.status !== "stopped" && x.status !== "error");
  if (active) {
    throw new Error("This tab is already being captured by another recorder or extension. Stop that capture and try again.");
  }

  let streamId;
  try {
    streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tabId });
  } catch (e) {
    throw new Error(`Chrome could not start tab capture: ${e.message || "unknown error"}`);
  }

  const videoState = await sendTab(tabId, { type: "GET_VIDEO_STATE" }) || {
    playing: true, currentTime: 0, rate: 1
  };

  const result = await chrome.runtime.sendMessage({
    type: "OFFSCREEN_START",
    tabId,
    streamId,
    config,
    videoState
  });
  if (!result?.ok) throw new Error(result?.error || "Audio engine failed to start.");

  sessions.set(tabId, {
    live: true,
    text: "Listening…",
    transcript: "",
    input: "",
    output: "",
    targetLang: config.targetLang,
    voice: config.voice,
    subtitleEnabled: config.subtitles !== false,
    subtitleSize: config.subtitleSize || "medium"
  });

  await sendTab(tabId, {
    type: "DUBLY_UI_START",
    config: { subtitles: config.subtitles, subtitleSize: config.subtitleSize }
  });

  return true;
}

chrome.runtime.onMessage.addListener((message, sender, reply) => {
  (async () => {
    try {
      if (message.type === "DUBLY_START") {
        const tabId = message.tabId ?? sender.tab?.id;
        await startSession(tabId, message.config);
        reply({ ok: true });
        return;
      }

      if (message.type === "DUBLY_STOP") {
        const tabId = message.tabId ?? sender.tab?.id;
        if (!Number.isInteger(tabId)) throw new Error("Invalid tab.");
        await ensureOffscreen();
        const r = await chrome.runtime.sendMessage({ type: "OFFSCREEN_STOP", tabId });
        sessions.delete(tabId);
        await sendTab(tabId, { type: "DUBLY_UI_STOP" });
        await waitCaptureStopped(tabId).catch(() => {});
        reply({ ok: r?.ok !== false, error: r?.error });
        return;
      }

      if (message.type === "DUBLY_VOLUME") {
        await ensureOffscreen();
        const r = await chrome.runtime.sendMessage({
          type: "OFFSCREEN_VOLUME",
          tabId: message.tabId,
          originalVolume: message.originalVolume,
          dubVolume: message.dubVolume
        });
        reply(r || { ok: false, error: "Audio engine not available." });
        return;
      }

      if (message.type === "DUBLY_VIDEO_STATE") {
        const tabId = sender.tab?.id ?? message.tabId;
        if (sessions.get(tabId)?.live) {
          await ensureOffscreen();
          await chrome.runtime.sendMessage({
            type: "OFFSCREEN_VIDEO_STATE",
            tabId,
            state: message.state
          });
        }
        reply({ ok: true });
        return;
      }

      if (message.type === "DUBLY_GET_STATUS") {
        reply(sessions.get(message.tabId) || {
          live: false, text: "Ready", transcript: "", input: "", output: "", audioDuration: 0
        });
        return;
      }

      if (message.type === "DUBLY_TEST_API") {
        const key = String(message.apiKey || "").trim();
        if (!key) throw new Error("API key is empty.");
        const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=1", {
          headers: { "x-goog-api-key": key }
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data?.error?.message || `HTTP ${r.status}`);
        reply({ ok: true });
        return;
      }

      if (message.type === "DUBLY_LIST_VOICES") {
        const key = String(message.apiKey || "").trim();
        if (!key) throw new Error("API key is empty.");
        const r = await fetch("https://generativelanguage.googleapis.com/v1beta/voices", {
          headers: { "x-goog-api-key": key }
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data?.error?.message || `HTTP ${r.status}`);
        const voices = (data.voices || data.items || [])
          .map(v => ({
            name: v.name || v.voiceName || "",
            languageCodes: v.language_codes || v.languageCodes || []
          }))
          .filter(v => v.name);
        reply({ ok: true, voices });
        return;
      }

      if (message.type === "DUBLY_TEST_TTS") {
        await ensureOffscreen();
        const r = await chrome.runtime.sendMessage({
          type: "OFFSCREEN_TEST_TTS",
          apiKey: message.apiKey,
          text: message.text,
          lang: message.lang,
          voice: message.voice,
          volume: message.volume,
          ttsModel: message.ttsModel
        });
        reply(r || { ok: false, error: "Voice engine not available." });
        return;
      }

      if (message.type === "DUBLY_OFFSCREEN_STATUS") {
        const s = sessions.get(message.tabId) || {};
        s.live = message.live !== false;
        s.text = message.text || "";
        s.transcript = message.transcript || "";
        s.input = message.input || "";
        s.output = message.live === false ? "" : (message.output || s.output || "");
        s.audioDuration = Number(message.audioDuration || 0);
        s.subtitleEnabled = s.subtitleEnabled !== false;
        s.subtitleSize = s.subtitleSize || "medium";
        sessions.set(message.tabId, s);
        await sendTab(message.tabId, {
          type: "DUBLY_UI_STATUS",
          text: message.text,
          transcript: message.transcript,
          input: message.input,
          output: message.output,
          audioDuration: Number(message.audioDuration || 0),
          live: message.live !== false,
          subtitleEnabled: (s.subtitleEnabled !== false),
          subtitleSize: s.subtitleSize || "medium"
        });
        reply({ ok: true });
        return;
      }
    } catch (e) {
      reply({ ok: false, error: e?.message || String(e) });
    }
  })();
  return true;
});

chrome.tabCapture.onStatusChanged.addListener(async info => {
  if (info.status === "stopped" || info.status === "error") {
    if (sessions.has(info.tabId)) {
      sessions.delete(info.tabId);
      await sendTab(info.tabId, {
        type: "DUBLY_UI_STATUS",
        text: info.status === "error" ? "Chrome stopped the capture." : "Capture stopped.",
        live: false
      });
      await sendTab(info.tabId, { type: "DUBLY_UI_STOP" });
    }
  }
});

chrome.tabs.onRemoved.addListener(tabId => {
  sessions.delete(tabId);
});
