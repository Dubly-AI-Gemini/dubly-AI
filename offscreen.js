
const sessions = new Map();
let testAudioContext = null;

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, Number(n)));
}

function toBase64(bytes) {
  let s = "";
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    s += String.fromCharCode(...bytes.subarray(i, Math.min(bytes.length, i + step)));
  }
  return btoa(s);
}

function makeWav(floatSamples, sampleRate = 16000) {
  const bytes = floatSamples.length * 2;
  const buffer = new ArrayBuffer(44 + bytes);
  const view = new DataView(buffer);
  let o = 0;
  const text = s => { for (let i = 0; i < s.length; i++) view.setUint8(o++, s.charCodeAt(i)); };
  text("RIFF"); view.setUint32(o, 36 + bytes, true); o += 4;
  text("WAVE"); text("fmt "); view.setUint32(o, 16, true); o += 4;
  view.setUint16(o, 1, true); o += 2; // PCM
  view.setUint16(o, 1, true); o += 2; // mono
  view.setUint32(o, sampleRate, true); o += 4;
  view.setUint32(o, sampleRate * 2, true); o += 4;
  view.setUint16(o, 2, true); o += 2;
  view.setUint16(o, 16, true); o += 2;
  text("data"); view.setUint32(o, bytes, true); o += 4;
  for (let i = 0; i < floatSamples.length; i++) {
    const x = clamp(floatSamples[i], -1, 1);
    view.setInt16(o, x < 0 ? x * 32768 : x * 32767, true); o += 2;
  }
  return new Uint8Array(buffer);
}

function resample16k(state, input, inputRate) {
  if (!input?.length) return [];
  const combined = new Float32Array(state.buffer.length + input.length);
  combined.set(state.buffer);
  combined.set(input, state.buffer.length);
  state.buffer = combined;

  const ratio = inputRate / 16000;
  const out = [];
  let pos = state.position;

  while (pos + 1 < state.buffer.length) {
    const i = Math.floor(pos);
    const f = pos - i;
    out.push(state.buffer[i] * (1 - f) + state.buffer[i + 1] * f);
    pos += ratio;
  }

  const keep = Math.max(0, Math.floor(pos));
  state.buffer = state.buffer.slice(keep);
  state.position = pos - keep;
  return out;
}

const LANG_NAMES = {
  fa: "Persian", en: "English", ar: "Arabic", fr: "French", de: "German",
  es: "Spanish", zh: "Mandarin Chinese", ja: "Japanese", ko: "Korean",
  pt: "Portuguese", ru: "Russian", it: "Italian", tr: "Turkish (Türkiye)", az: "Azerbaijani Turkish",
  hi: "Hindi", nl: "Dutch", pl: "Polish", uk: "Ukrainian", vi: "Vietnamese",
  id: "Indonesian", fil: "Filipino", he: "Hebrew", th: "Thai"
};

function langName(code) {
  return LANG_NAMES[code] || code || "English";
}

function postStatus(session, text, extra = {}) {
  chrome.runtime.sendMessage({
    type: "DUBLY_OFFSCREEN_STATUS",
    tabId: session.tabId,
    text,
    live: true,
    transcript: extra.transcript ?? session.transcript,
    input: extra.input ?? session.transcript,
    output: extra.output ?? session.translation,
    audioDuration: Number(extra.audioDuration || 0),
    streaming: !!extra.streaming
  }).catch(() => {});
}

async function geminiGenerate(apiKey, body, label="Gemini") {
  const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent";
  let lastMessage = "";
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(url, {
      method:"POST",
      headers:{"Content-Type":"application/json","x-goog-api-key":apiKey},
      body:JSON.stringify(body)
    });
    const data = await response.json().catch(()=>({}));
    if (response.ok) return data;
    const status = response.status;
    lastMessage = data?.error?.message || `${label} returned HTTP ${status}`;
    const text = String(lastMessage).toLowerCase();
    const retryable = status === 429 || status === 503 || text.includes("rate limit") || text.includes("quota exceeded");
    if (!retryable || attempt === 3) {
      if (status === 429 || text.includes("quota exceeded")) {
        throw new Error(`${label} quota/rate limit reached. The extension now uses larger audio chunks and one request at a time; wait about 60 seconds and try again.`);
      }
      throw new Error(lastMessage);
    }
    const delay = Math.min(30000, 3000 * (2 ** attempt));
    postStatusForRetry(label, delay);
    await new Promise(r=>setTimeout(r, delay));
  }
  throw new Error(lastMessage || `${label} request failed`);
}

function postStatusForRetry(label, delay){
  const sec = Math.ceil(delay/1000);
  for (const session of sessions.values()) {
    if (!session.destroyed) postStatus(session, `${label} is rate-limited; retrying in ${sec}s…`);
  }
}

async function transcribeAndTranslate(apiKey, wavBytes, config) {
  const source = config.sourceLang && config.sourceLang !== "auto"
    ? `The source language is ${langName(config.sourceLang)}.`
    : "Detect the source language automatically.";
  const target = langName(config.targetLang || "en");
  const prompt =
    `You are the subtitle and translation engine for a live video. ${source} ` +
    `First transcribe only the spoken words in the supplied audio. Then translate that exact subtitle into ${target}. ` +
    `Return JSON with exactly two strings: "transcript" and "translation". ` +
    `The transcript must be the source-language subtitle. The translation must be natural, concise enough to be spoken over the same clip, and preserve names, numbers, brands and technical terms. ` +
    `Ignore music, silence and sound effects. Do not add commentary.`;
  const body = {
    contents:[{role:"user",parts:[{text:prompt},{inlineData:{mimeType:"audio/wav",data:toBase64(wavBytes)}}]}],
    generationConfig:{temperature:0.1,responseMimeType:"application/json",
      responseSchema:{type:"OBJECT",properties:{transcript:{type:"STRING"},translation:{type:"STRING"}},required:["transcript","translation"]}}
  };
  const data = await geminiGenerate(apiKey, body, "Gemini subtitle engine");
  const text = data?.candidates?.[0]?.content?.parts?.map(p=>p.text||"").join("").trim() || "";
  if(!text) return {transcript:"",translation:""};
  try {
    const obj=JSON.parse(text);
    return {transcript:String(obj.transcript||"").trim(),translation:String(obj.translation||"").trim()};
  } catch {
    return {transcript:text,translation:""};
  }
}

function decodeB64(b64){
  if(!b64) return new Uint8Array();
  const binary=atob(b64);
  const bytes=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i);
  return bytes;
}

function pcm16ToAudioBuffer(ctx, bytes, sampleRate=24000){
  if(bytes.byteLength<2) throw new Error("Gemini returned empty PCM audio.");
  const samples=Math.floor(bytes.byteLength/2);
  const buffer=ctx.createBuffer(1,samples,sampleRate);
  const channel=buffer.getChannelData(0);
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  for(let i=0;i<samples;i++) channel[i]=view.getInt16(i*2,true)/32768;
  return buffer;
}

function extractInlineAudio(data){
  const candidates=data?.candidates || [];
  for(const c of candidates){
    for(const p of (c?.content?.parts || [])){
      const inline=p?.inlineData || p?.inline_data;
      if(inline?.data) return {data:inline.data,mime:inline.mimeType||inline.mime_type||"audio/wav"};
    }
  }
  return null;
}

async function synthesize(apiKey, text, config, ctx) {
  if (!text || !text.trim()) return null;

  const model = config.ttsModel || "gemini-3.8-flash-tts";
  const voice = config.voice && config.voice !== "auto" ? config.voice : "Kore";

  // Use the public GenerateContent TTS endpoint. It returns inline audio
  // in the same shape as the normal Gemini GenerateContent API.
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const body = {
    contents: [{
      role: "user",
      parts: [{
        text: text.trim(),
        speech_metadata: {
          style: "Natural, conversational dubbing. Clear diction, appropriate emotion, no extra words."
        }
      }]
    }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voice }
        }
      }
    }
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey
    },
    body: JSON.stringify(body)
  });

  const raw = await response.text();
  let data = {};
  try { data = JSON.parse(raw); } catch {}

  if (!response.ok) {
    const msg = data?.error?.message || raw.slice(0, 500) || `Gemini TTS returned HTTP ${response.status}`;
    if (response.status === 429 || response.status === 503) {
      throw new Error(`Gemini TTS rate/quota limit (${response.status}). Wait a little and try again.`);
    }
    throw new Error(msg);
  }

  const inline = extractInlineAudio(data);
  const b64 = inline?.data;
  if (!b64) throw new Error("Gemini TTS returned no audio data.");

  const bytes = decodeB64(b64);
  if (bytes.byteLength < 2) throw new Error("Gemini TTS returned empty audio.");

  // Gemini TTS GenerateContent normally returns raw 24 kHz mono 16-bit PCM.
  // Also accept WAV in case the API/account returns a WAV container.
  if (bytes.byteLength >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF") {
    return await ctx.decodeAudioData(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
    );
  }
  return pcm16ToAudioBuffer(ctx, bytes, 24000);
}


// =====================================================================
// v6.3 ENGINE — two modes
//  "live"    : Gemini Live Translate (continuous speech-to-speech over WebSocket)
//  "classic" : VAD-segmented pipeline (translate JSON -> TTS), parallel + ordered playback
// =====================================================================
const LIVE_CODES = { zh:"zh-Hans", pt:"pt-BR" };           // other codes are passed through as-is
const liveCode = c => LIVE_CODES[c] || c || "en";

function b64FromBytes(u8){ return toBase64(u8); }

function stopSources(session){
  for (const s of session.sources){ try{s.stop();}catch{} try{s.disconnect();}catch{} }
  session.sources.clear();
  session.playQueueEnd = session.ctx.currentTime + 0.05;
}

// ---- unified scheduled playback (used by both engines) ----
function schedule(session, buffer, text, opts = {}){
  const ctx = session.ctx, now = ctx.currentTime;
  if (session.playQueueEnd < now) session.playQueueEnd = now + 0.04;
  const lag = session.playQueueEnd - now;
  const maxLag = session.maxLag;
  if (lag > maxLag * 2) return false;                        // hopelessly behind: drop to stay live
  let rate = 1 + Math.max(0, lag - 1) / maxLag * 0.6;         // smooth catch-up
  if (opts.fitSeconds) rate = Math.max(rate, buffer.duration / Math.max(0.6, opts.fitSeconds));
  rate = clamp(rate, 1, 1.45);
  const src = ctx.createBufferSource();
  src.buffer = buffer; src.playbackRate.value = rate; src.connect(session.dubGain);
  session.sources.add(src);
  src.onended = () => { session.sources.delete(src); try{src.disconnect();}catch{} };
  const when = session.playQueueEnd;
  src.start(when);
  session.playQueueEnd = when + buffer.duration / rate;
  if (text){
    const delay = Math.max(0, (when - now) * 1000);
    setTimeout(() => { if (!session.destroyed) postStatus(session, "Playing dubbed audio…", { output: text, audioDuration: buffer.duration / rate }); }, delay);
  }
  return true;
}

// ---- LIVE engine ----
function liveSend(session, pcm16){
  session.ab.push(pcm16); session.al += pcm16.length;
  if (session.al < 1600) return;                              // ~100 ms chunks
  const m = new Int16Array(session.al); let p = 0;
  for (const c of session.ab){ m.set(c, p); p += c.length; }
  session.ab = []; session.al = 0;
  const msg = JSON.stringify({ realtimeInput:{ audio:{ data: b64FromBytes(new Uint8Array(m.buffer)), mimeType:"audio/pcm;rate=16000" } } });
  if (session.ready && session.ws?.readyState === 1) session.ws.send(msg);
  else { session.q.push(msg); if (session.q.length > 30) session.q.shift(); }
}
function liveKick(session){
  clearTimeout(session.wd);
  session.wd = setTimeout(() => { try{ session.ws?.close(); }catch{} }, 90000);
}
function liveConnect(session){
  if (session.destroyed) return;
  postStatus(session, session.everLive ? "Reconnecting…" : "Connecting to Gemini Live Translate…");
  session.ready = false;
  const ws = session.ws = new WebSocket("wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=" + encodeURIComponent(session.config.apiKey));
  ws.onopen = () => {
    liveKick(session);
    const tc = { targetLanguageCode: liveCode(session.config.targetLang), echoTargetLanguage: false };
    const gc = { responseModalities:["AUDIO"] };
    const setup = { model:"models/" + (session.config.liveModel || "gemini-3.5-live-translate-preview"), generationConfig: gc, inputAudioTranscription:{}, outputAudioTranscription:{} };
    if (session.tcTop) setup.translationConfig = tc; else gc.translationConfig = tc;
    ws.send(JSON.stringify({ setup }));
  };
  ws.onmessage = async e => {
    if (session.ws !== ws || session.destroyed) return;
    liveKick(session);
    let m; try{ m = JSON.parse(typeof e.data === "string" ? e.data : await e.data.text()); }catch{ return; }
    if (m.setupComplete){
      session.ready = true; session.everLive = true; session.tries = 0;
      postStatus(session, "Listening to tab audio…");
      for (const x of session.q) ws.send(x); session.q = [];
    }
    if (m.goAway){ ws.close(); return; }
    const c = m.serverContent; if (!c) return;
    for (const p of (c.modelTurn?.parts || [])){
      const d = p.inlineData?.data || p.inline_data?.data;
      if (d) { try{ schedule(session, pcm16ToAudioBuffer(session.ctx, decodeB64(d), 24000)); }catch{} }
    }
    const it = c.inputTranscription?.text, ot = c.outputTranscription?.text;
    const trim = (t, n) => t.length > n ? t.slice(-n).replace(/^\S+\s+/, "") : t;
    if (it) session.transcript = trim(session.transcript + it, 240);
    if (ot){
      session.translation = trim(session.translation + ot, 160);
      clearTimeout(session.capTimer);
      session.capTimer = setTimeout(() => { session.translation = ""; session.transcript = ""; }, 5000);
      postStatus(session, "Playing dubbed audio…", { transcript: session.transcript, input: session.transcript, output: session.translation, streaming: true });
    }
  };
  ws.onclose = e => {
    if (session.ws !== ws) return;
    session.ready = false; clearTimeout(session.wd);
    if (session.destroyed) return;
    const reason = e.reason || "";
    if (!session.everLive && /translationConfig/i.test(reason) && !session.tcTop){ session.tcTop = true; return setTimeout(() => liveConnect(session), 200); }
    if (!session.everLive && (e.code === 1007 || e.code === 1008 || e.code === 1003)){
      postStatus(session, "Audio error: " + (reason || "WebSocket " + e.code));
      return;                                                  // bad key / model: do not loop forever
    }
    setTimeout(() => liveConnect(session), Math.min(400 * 2 ** session.tries++, 6000));
  };
}

// ---- CLASSIC engine (segmenter + parallel pipeline + ordered playback) ----
function classicFeed(session, pcmFloat, rms, dur){
  const nf = session.nf = rms < session.nf ? rms : session.nf + (rms - session.nf) * 0.002;
  const voiced = rms > Math.max(0.008, nf * 2.5);
  if (!session.cur.length && !voiced){ session.pre = pcmFloat; return; }
  if (!session.cur.length && session.pre) session.cur.push(session.pre);
  session.cur.push(pcmFloat); session.segLen += dur;
  if (voiced){ session.voicedDur += dur; session.sil = 0; } else session.sil += dur;
  const maxSeg = clamp(session.config.chunkSeconds || 6, 3, 12);
  if ((session.segLen >= 2.5 && session.sil >= 0.4) || session.segLen >= maxSeg){
    const v = session.voicedDur, chunks = session.cur;
    session.cur = []; session.pre = null; session.segLen = session.voicedDur = session.sil = 0;
    if (v >= 0.6) classicEnqueue(session, chunks);
  }
}
function classicEnqueue(session, chunks){
  const seq = session.nextCapture++;
  if (session.inFlight >= 4){ session.skipped.add(seq); return classicDrain(session); }   // API slower than real time: skip, stay live
  let n = 0; for (const c of chunks) n += c.length;
  const all = new Float32Array(n); let p = 0; for (const c of chunks){ all.set(c, p); p += c.length; }
  session.inFlight++;
  const gen = session.generation;
  classicProcess(session, all, seq, gen).finally(() => { session.inFlight = Math.max(0, session.inFlight - 1); });
}
function classicDrain(session){
  for (;;){
    if (session.clsReady.has(session.nextPlay)){
      const it = session.clsReady.get(session.nextPlay); session.clsReady.delete(session.nextPlay);
      schedule(session, it.buffer, it.text); session.nextPlay++; continue;
    }
    if (session.skipped.has(session.nextPlay)){ session.skipped.delete(session.nextPlay); session.nextPlay++; continue; }
    break;
  }
}
async function classicProcess(session, samples, seq, gen){
  try{
    const wav = makeWav(samples);
    const pair = await transcribeAndTranslate(session.config.apiKey, wav, session.config);
    if (gen !== session.generation || session.destroyed) return;
    if (!pair.transcript || !pair.translation){ session.skipped.add(seq); return classicDrain(session); }
    session.transcript = pair.transcript; session.translation = pair.translation;
    postStatus(session, "Subtitle ready. Generating dubbed voice…", { transcript: pair.transcript, input: pair.transcript, output: pair.translation });
    const buffer = await synthesize(session.config.apiKey, pair.translation, session.config, session.ctx);
    if (gen !== session.generation || session.destroyed) return;
    if (!buffer){ session.skipped.add(seq); return classicDrain(session); }
    session.clsReady.set(seq, { buffer, text: pair.translation });
    classicDrain(session);
  }catch(e){
    if (gen === session.generation && !session.destroyed){
      session.skipped.add(seq); classicDrain(session);
      postStatus(session, `Audio error: ${e?.message || e}`);
    }
  }
}

// ---- capture ----
async function attachCapture(session){
  await session.ctx.audioWorklet.addModule(chrome.runtime.getURL("audio-processor.js"));
  const worklet = new AudioWorkletNode(session.ctx, "dubly-capture-processor", { numberOfInputs:1, numberOfOutputs:1, channelCount:2, channelCountMode:"explicit" });
  session.worklet = worklet;
  session.source.connect(worklet);
  const silence = session.ctx.createGain(); silence.gain.value = 0;
  worklet.connect(silence).connect(session.ctx.destination);
  worklet.port.onmessage = ({ data }) => {
    if (session.destroyed || !session.playing) return;
    const out = resample16k(session.resampler, data, session.ctx.sampleRate);
    if (!out.length) return;
    const f = Float32Array.from(out);
    if (session.config.engine === "classic"){
      let e2 = 0; for (let i = 0; i < f.length; i++) e2 += f[i] * f[i];
      classicFeed(session, f, Math.sqrt(e2 / f.length), f.length / 16000);
    } else {
      const i16 = new Int16Array(f.length);
      for (let i = 0; i < f.length; i++){ const x = clamp(f[i], -1, 1); i16[i] = x < 0 ? x * 32768 : x * 32767; }
      liveSend(session, i16);
    }
  };
}

async function createSession(tabId, streamId, config, videoState){
  await stopSession(tabId);
  config = { engine:"live", ...config };
  const ctx = new AudioContext({ latencyHint:"interactive" });
  const stream = await navigator.mediaDevices.getUserMedia({ audio:{ mandatory:{ chromeMediaSource:"tab", chromeMediaSourceId:streamId } }, video:false });
  if (!stream.getAudioTracks().length){ await ctx.close().catch(()=>{}); throw new Error("The tab did not expose an audio track. Check that the video is playing and has sound."); }
  const source = ctx.createMediaStreamSource(stream);
  const originalGain = ctx.createGain(), dubGain = ctx.createGain();
  originalGain.gain.value = clamp(config.originalVolume ?? 0.12, 0, 1);
  dubGain.gain.value = clamp(config.dubVolume ?? 1, 0, 1.4);
  source.connect(originalGain).connect(ctx.destination);      // tabCapture mutes the tab: restore original audio
  dubGain.connect(ctx.destination);
  const session = {
    tabId, stream, ctx, source, originalGain, dubGain, worklet:null, config,
    playing: videoState?.playing !== false, destroyed:false, maxLag:10,
    resampler:{ buffer:new Float32Array(0), position:0 },
    playQueueEnd: ctx.currentTime + 0.05, sources:new Set(),
    transcript:"", translation:"",
    // live
    ws:null, ready:false, everLive:false, tries:0, q:[], ab:[], al:0, wd:null, tcTop:false, capTimer:null,
    // classic
    cur:[], pre:null, segLen:0, voicedDur:0, sil:0, nf:0.01, inFlight:0, generation:0,
    nextCapture:0, nextPlay:0, skipped:new Set()
  };
  // NOTE: 'ready' is the websocket flag for live; classic uses 'clsReady'
  session.clsReady = new Map();
  sessions.set(tabId, session);
  if (ctx.state === "suspended") await ctx.resume();
  await attachCapture(session);
  if (config.engine === "classic") postStatus(session, "Listening to tab audio…"); else liveConnect(session);
}

async function stopSession(tabId){
  const session = sessions.get(tabId); if (!session) return;
  session.destroyed = true; session.generation++;
  clearTimeout(session.wd); clearTimeout(session.capTimer);
  try{ session.ws?.close(); }catch{}
  stopSources(session);
  try{ session.worklet?.disconnect(); }catch{} try{ session.source.disconnect(); }catch{}
  try{ session.originalGain.disconnect(); }catch{} try{ session.dubGain.disconnect(); }catch{}
  try{ session.stream.getTracks().forEach(t => t.stop()); }catch{}
  try{ await session.ctx.close(); }catch{}
  sessions.delete(tabId);
  chrome.runtime.sendMessage({ type:"DUBLY_OFFSCREEN_STATUS", tabId, text:"Dubbing stopped.", live:false }).catch(()=>{});
}

function updateVideoState(tabId, state){
  const s = sessions.get(tabId); if (!s) return;
  const old = s.playing; s.playing = state?.playing !== false;
  if (state?.seeking){                                          // seek: drop everything queued, start fresh
    s.generation++; s.ab = []; s.al = 0; s.q = [];
    s.cur = []; s.pre = null; s.segLen = s.voicedDur = s.sil = 0;
    s.resampler = { buffer:new Float32Array(0), position:0 };
    s.nextCapture = 0; s.nextPlay = 0; s.clsReady.clear(); s.skipped.clear();
    stopSources(s); return;
  }
  if (old && !s.playing){ stopSources(s); postStatus(s, "Video paused."); }
  else if (!old && s.playing){ s.playQueueEnd = s.ctx.currentTime + 0.06; postStatus(s, "Resuming…"); }
}

async function testTts(m) {
  const ctx = testAudioContext || (testAudioContext = new AudioContext({ latencyHint: "interactive" }));
  if (ctx.state === "suspended") await ctx.resume();

  const buffer = await synthesize(m.apiKey, m.text || "Dubly AI voice test.", {
    targetLang: m.lang || "fa",
    voice: m.voice || "Kore",
    ttsModel: m.ttsModel || "gemini-3.8-flash-tts"
  }, ctx);
  if (!buffer) throw new Error("No test audio was returned.");
  const gain = ctx.createGain();
  gain.gain.value = clamp(m.volume ?? 1, 0, 1.4);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(gain).connect(ctx.destination);
  source.start();
}

chrome.runtime.onMessage.addListener((message, sender, reply) => {
  (async () => {
    try {
      if (message.type === "OFFSCREEN_START") {
        await createSession(message.tabId, message.streamId, message.config, message.videoState);
        reply({ ok: true });
        return;
      }
      if (message.type === "OFFSCREEN_STOP") {
        await stopSession(message.tabId);
        reply({ ok: true });
        return;
      }
      if (message.type === "OFFSCREEN_VIDEO_STATE") {
        updateVideoState(message.tabId, message.state);
        reply({ ok: true });
        return;
      }
      if (message.type === "OFFSCREEN_VOLUME") {
        const session = sessions.get(message.tabId);
        if (session) {
          session.originalGain.gain.value = clamp(message.originalVolume ?? 0, 0, 1);
          session.dubGain.gain.value = clamp(message.dubVolume ?? 1, 0, 1.4);
        }
        reply({ ok: true });
        return;
      }
      if (message.type === "OFFSCREEN_TEST_TTS") {
        await testTts(message);
        reply({ ok: true, engine: "Gemini TTS" });
        return;
      }
    } catch (e) {
      reply({ ok: false, error: e?.message || String(e) });
    }
  })();
  return true;
});
