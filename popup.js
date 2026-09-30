
const $ = id => document.getElementById(id);

const WALLET = "0xc13F621C04b65E13D41b0De52ad7b400eFc98Fa2";

const LANGS = [
  ["en","English"],["fr","Français"],["de","Deutsch"],["es","Español"],["fa","فارسی"],["ar","العربية"],
  ["zh","中文"],["ja","日本語"],["ko","한국어"],["pt","Português"],["ru","Русский"],["it","Italiano"],
  ["tr","Türkçe (Türkiye)"],["az","Türkçe (Azərbaycan)"],["hi","हिन्दी"],["nl","Nederlands"],["pl","Polski"],["uk","Українська"],
  ["vi","Tiếng Việt"],["id","Bahasa Indonesia"],["fil","Filipino"],["he","עברית"],["th","ไทย"]
];

const SOURCE_LANGS = [["auto","Auto — detect"], ...LANGS];

const UILANGS = [
  ["en","English","ltr"],["fr","Français","ltr"],["de","Deutsch","ltr"],["es","Español","ltr"],
  ["fa","فارسی","rtl"],["ar","العربية","rtl"],["tr","Türkçe","ltr"],["zh","中文","ltr"],
  ["ja","日本語","ltr"]
];

const VOICES = [
  ["auto","Auto / Kore"],["Zephyr","Zephyr — Bright"],["Puck","Puck — Upbeat"],["Charon","Charon — Informative"],
  ["Kore","Kore — Firm"],["Fenrir","Fenrir — Excitable"],["Leda","Leda — Youthful"],["Orus","Orus — Firm"],
  ["Aoede","Aoede — Breezy"],["Callirrhoe","Callirrhoe — Easy-going"],["Autonoe","Autonoe — Bright"],
  ["Enceladus","Enceladus — Breathy"],["Iapetus","Iapetus — Clear"],["Umbriel","Umbriel — Easy-going"],
  ["Algieba","Algieba — Smooth"],["Despina","Despina — Smooth"],["Erinome","Erinome — Clear"],
  ["Algenib","Algenib — Gravelly"],["Rasalgethi","Rasalgethi — Informative"],["Laomedeia","Laomedeia — Upbeat"],
  ["Achernar","Achernar — Soft"],["Alnilam","Alnilam — Firm"],["Schedar","Schedar — Even"],
  ["Gacrux","Gacrux — Mature"],["Pulcherrima","Pulcherrima — Forward"],["Achird","Achird — Friendly"],
  ["Zubenelgenubi","Zubenelgenubi — Casual"],["Vindemiatrix","Vindemiatrix — Gentle"],
  ["Sadachbia","Sadachbia — Lively"],["Sadaltager","Sadaltager — Knowledgeable"],["Sulafat","Sulafat — Warm"]
];

const I18N = {
  fa:{
    tagline:"دوبله زنده ویدیو با Gemini",tabDub:"دوبله",tabSettings:"تنظیمات",tabSupport:"حمایت",
    apiKey:"کلید Gemini API",show:"نمایش",hide:"مخفی",save:"ذخیره",aiStudio:"دریافت API Key از Google AI Studio ↗",
    testApi:"تست API",target:"زبان دوبله",source:"زبان مبدأ",subtitles:"زیرنویس ترجمه‌شده",originalVolume:"صدای اصلی",
    dubVolume:"صدای دوبله",start:"▶ شروع دوبله",stop:"■ توقف",status:"وضعیت",liveText:"آخرین ترجمه",
    interfaceLanguage:"زبان رابط",defaultLanguage:"زبان پیش‌فرض دوبله",voice:"صدای Gemini",
    voiceHint:"30 صدای آماده + Voice Library با API",voiceQuality:"کیفیت صدا",
    voiceQualityHint:"Fast برای تأخیر کمتر؛ Quality برای کیفیت بالاتر",refreshVoices:"به‌روزرسانی صداها",
    testVoice:"تست صدا",uiFont:"فونت رابط",uiFontSize:"اندازه فونت رابط",subtitleSize:"اندازه زیرنویس",
    theme:"تم",chunkMode:"حالت پردازش سریع",chunkHint:"قطعه کوچک‌تر = شروع ترجمه سریع‌تر",chunkLength:"مدت قطعه صوتی",
    reset:"بازنشانی تنظیمات",about:"کلید API فقط به‌صورت محلی در Chrome ذخیره می‌شود و مستقیم به Google Gemini ارسال می‌شود.",
    supportTitle:"حمایت از پروژه",supportText:"این افزونه رایگان است. برای پشتیبانی از توسعه می‌توانید با رمزارز کمک کنید.",
    copyWallet:"کپی آدرس کیف پول",networkWarning:"شبکه را قبل از ارسال دقیقاً بررسی کنید.",privacy:"حریم خصوصی",
    docs:"مستندات Gemini",webStore:"Chrome Web Store",ready:"آماده.",starting:"در حال شروع…",live:"دوبله فعال است.",
    stopped:"دوبله متوقف شد.",engine:"موتور دوبله",engineHint:"زنده = پیوسته و کم‌تأخیر؛ قطعه‌ای = جایگزین",engLive:"ترجمه زنده (پیشنهادی)",engClassic:"قطعه‌ای (ترجمه + صدا)",saved:"کلید ذخیره شد.",apiOk:"API معتبر است.",error:"خطا: ",copied:"کپی شد."
  },
  en:{
    tagline:"Live video dubbing with Gemini",tabDub:"Dub",tabSettings:"Settings",tabSupport:"Support",
    apiKey:"Gemini API Key",show:"Show",hide:"Hide",save:"Save",aiStudio:"Get your API key from Google AI Studio ↗",
    testApi:"Test API",target:"Dub language",source:"Source language",subtitles:"Translated subtitles",originalVolume:"Original audio",
    dubVolume:"Dubbed voice",start:"▶ Start dubbing",stop:"■ Stop",status:"Status",liveText:"Latest translation",
    interfaceLanguage:"Interface language",defaultLanguage:"Default dubbing language",voice:"Gemini voice",
    voiceHint:"30 prebuilt voices + Voice Library via API",voiceQuality:"Voice quality",
    voiceQualityHint:"Fast for lower latency; Quality for richer audio",refreshVoices:"Refresh voices",
    testVoice:"Test voice",uiFont:"Interface font",uiFontSize:"Interface font size",subtitleSize:"Subtitle size",
    theme:"Theme",chunkMode:"Fast processing",chunkHint:"Smaller chunks start translation sooner",chunkLength:"Audio chunk length",
    reset:"Reset settings",about:"Your API key is stored locally in Chrome and sent directly to Google Gemini.",
    supportTitle:"Support the project",supportText:"This extension is free. You can support development with a crypto donation.",
    copyWallet:"Copy wallet address",networkWarning:"Verify the selected network before sending.",privacy:"Privacy",
    docs:"Gemini docs",webStore:"Chrome Web Store",ready:"Ready.",starting:"Starting…",live:"Dubbing is active.",
    stopped:"Dubbing stopped.",engine:"Dubbing engine",engineHint:"Live = continuous, lowest delay. Segmented = fallback.",engLive:"Live translate (recommended)",engClassic:"Segmented (translate + voice)",saved:"API key saved.",apiOk:"API key works.",error:"Error: ",copied:"Copied."
  }
};

let settings = {};
let currentUi = "en";
let typeTimer = null;
let typeToken = 0;
let lastShown = "";

function tr(k){
  return (I18N[currentUi] && I18N[currentUi][k]) || I18N.en[k] || k;
}

function fillSelect(id, items){
  $(id).innerHTML = items.map(([v,l]) => `<option value="${v}">${l}</option>`).join("");
}

function renderVoices(selected="auto"){
  fillSelect("voice", VOICES);
  $("voice").value = VOICES.some(v => v[0] === selected) ? selected : "auto";
}

function applyTheme(){
  const t = settings.theme || "system";
  const dark = t === "dark" || (t === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.body.classList.toggle("dark", dark);
}

function applyFont(){
  const m = {
    system:"system-ui,-apple-system,'Segoe UI',Arial,sans-serif",
    tahoma:"Tahoma,Arial,sans-serif", arial:"Arial,sans-serif",
    segoe:"'Segoe UI',Arial,sans-serif", verdana:"Verdana,Arial,sans-serif"
  };
  document.documentElement.style.setProperty("--ui-font", m[settings.uiFont] || m.system);
  document.body.style.fontFamily = m[settings.uiFont] || m.system;
}

function localize(){
  const ui = $("uiLang").value || "en";
  currentUi = ui;
  const dict = I18N[ui] || I18N.en;
  const dir = UILANGS.find(x => x[0] === ui)?.[2] || "ltr";
  document.documentElement.lang = ui;
  document.documentElement.dir = dir;
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const k = el.dataset.i18n;
    if (dict[k]) el.textContent = dict[k];
  });
  $("showKey").textContent = $("apiKey").type === "password" ? tr("show") : tr("hide");
  document.querySelectorAll("option[data-i18n]").forEach(el => { const k=el.dataset.i18n; if(dict[k]) el.textContent=dict[k]; });
}

async function save(){
  settings = {
    ...settings,
    apiKey: $("apiKey").value.trim(),
    targetLang: $("targetLang").value,
    settingsTarget: $("settingsTarget").value,
    sourceLang: $("sourceLang").value,
    subtitles: $("subtitles").checked,
    originalVolume: Number($("originalVolume").value)/100,
    dubVolume: Number($("dubVolume").value)/100,
    uiLang: $("uiLang").value,
    uiFont: $("uiFont").value,
    uiFontSize: $("uiFontSize").value,
    subtitleSize: $("subtitleSize").value,
    theme: $("theme").value,
    fastMode: $("fastMode").checked,
    chunkSeconds: Number($("chunkSeconds").value),
    voice: $("voice").value || "auto",
    ttsModel: $("ttsModel").value || "gemini-3.8-flash-tts",
    engine: $("engine").value || "live"
  };
  await chrome.storage.local.set(settings);
}

function populate(){
  fillSelect("targetLang", LANGS);
  fillSelect("settingsTarget", LANGS);
  fillSelect("sourceLang", SOURCE_LANGS);
  fillSelect("uiLang", UILANGS.map(([v,l]) => [v,l]));
  renderVoices(settings.voice || "auto");

  $("apiKey").value = settings.apiKey || "";
  $("targetLang").value = settings.targetLang || "en";
  $("settingsTarget").value = settings.settingsTarget || settings.targetLang || "en";
  $("sourceLang").value = settings.sourceLang || "auto";
  $("subtitles").checked = settings.subtitles !== false;
  $("subtitlesLive").checked = settings.subtitles !== false;
  $("originalVolume").value = Math.round((settings.originalVolume ?? 0)*100);
  $("dubVolume").value = Math.round((settings.dubVolume ?? 1)*100);
  $("uiLang").value = settings.uiLang || "en";
  $("uiFont").value = settings.uiFont || "tahoma";
  $("uiFontSize").value = settings.uiFontSize || "medium";
  $("subtitleSize").value = settings.subtitleSize || "medium";
  $("theme").value = settings.theme || "system";
  $("fastMode").checked = settings.fastMode !== false;
  $("chunkSeconds").value = String(settings.chunkSeconds ?? 8);
  $("ttsModel").value = settings.ttsModel || "gemini-3.8-flash-tts";
  $("engine").value = settings.engine || "live";
  $("originalPct").textContent = `${$("originalVolume").value}%`;
  $("dubPct").textContent = `${$("dubVolume").value}%`;

  localize(); applyTheme(); applyFont();
}

async function getActiveTab(){
  const [tab] = await chrome.tabs.query({active:true,currentWindow:true});
  if(!tab?.id) throw new Error("No active tab.");
  return tab;
}

function setStatus(text, live=false){
  $("statusText").textContent = text;
  $("liveDot").classList.toggle("live", live);
}

function setBusy(active){
  $("start").disabled = active; $("stop").disabled = !active;
}
// Smooth typewriter for the translation card.
// Text may arrive in small fragments (live engine) or as a whole sentence (segmented engine);
// either way the characters are revealed by one continuous timer, so the card never jumps or restarts.
let tChars=[], tShown=0, tFrac=0, tPace=0, tLast=0, tTimer=null;
function typerTick(){
  const el=$("translationContent"), bar=$("subtitleProgressBar"); if(!el) return;
  const now=performance.now(), dt=Math.min(0.2,(now-tLast)/1000); tLast=now;
  const backlog=tChars.length-tShown;
  if(backlog>0){
    // fixed pace when the audio length is known; otherwise ~15 chars/s, speeding up smoothly when text piles up
    const rate=tPace>0 ? tPace : Math.max(15, backlog*1.6);
    tFrac+=rate*dt;
    const n=Math.min(backlog, Math.floor(tFrac));
    if(n>0){ tFrac-=n; tShown+=n; el.textContent=tChars.slice(0,tShown).join(""); }
  }
  if(bar) bar.style.width=tChars.length?Math.round(tShown/tChars.length*100)+"%":"0%";
}
function setLiveTranslation(text, audioDuration=0, streaming=false){
  const el=$("translationContent"); if(!el) return;
  el.dir="auto";
  if(!tTimer){ tLast=performance.now(); tTimer=setInterval(typerTick,30); }
  const full=String(text||"").trim();
  if(!full){ tChars=[]; tShown=0; tFrac=0; tPace=0; el.textContent="—"; return; }
  const next=[...full], cur=tChars.join("");
  if(full===cur) return;
  if(full.startsWith(cur)){ /* text only grew: keep typing from the current position */ }
  else {
    // trimmed/replaced text: continue from where the visible text reappears, otherwise start over
    const seen=tChars.slice(0,tShown).join(""), tail=seen.slice(-16);
    const idx=tail.length>=6 ? full.indexOf(tail) : -1;
    tShown = idx>=0 ? [...full.slice(0,idx+tail.length)].length : 0;
    tFrac=0;
  }
  tChars=next;
  tPace = streaming ? 0 : Math.max(8, next.length/Math.max(1.2, Number(audioDuration)||Math.max(2.5,next.length/14)));
  if(tShown===0) el.textContent="";
}

async function refreshStatus(tabId){
  const status = await chrome.runtime.sendMessage({type:"DUBLY_GET_STATUS",tabId});
  if(status?.live){
    setBusy(true); setStatus(status.text || tr("live"), true);
    setLiveTranslation(status.output || "", status.audioDuration || 0, true);
  } else {
    setBusy(false); setStatus(tr("ready"), false);
  }
}

function donation(network){
  const map = {
    eth:["Ethereum · Chain ID 1","https://etherscan.io/address/"+WALLET,"donation/eth.png"],
    base:["Base · Chain ID 8453","https://basescan.org/address/"+WALLET,"donation/base.png"],
    bsc:["BNB Smart Chain · Chain ID 56","https://bscscan.com/address/"+WALLET,"donation/bsc.png"]
  };
  const x = map[network] || map.eth;
  $("qr").src = x[2]; $("networkName").textContent = x[0]; $("explorer").href = x[1];
}

document.querySelectorAll(".tab").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
    $(btn.dataset.tab).classList.add("active");
  });
});

document.querySelectorAll(".network").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".network").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    donation(btn.dataset.network);
  });
});

$("showKey").addEventListener("click", () => {
  const input = $("apiKey");
  input.type = input.type === "password" ? "text" : "password";
  $("showKey").textContent = input.type === "password" ? tr("show") : tr("hide");
});

$("saveKey").addEventListener("click", async () => {
  await save();
  $("apiState").textContent = tr("saved");
  $("apiState").className = "apiState ok";
});

$("testApi").addEventListener("click", async () => {
  const key = $("apiKey").value.trim();
  if(!key){ $("apiState").textContent = tr("apiKey")+" — "+tr("error")+"empty"; $("apiState").className="apiState error"; return; }
  $("apiState").textContent = "…"; $("apiState").className="apiState";
  const r = await chrome.runtime.sendMessage({type:"DUBLY_TEST_API",apiKey:key});
  if(r?.ok){ $("apiState").textContent = tr("apiOk"); $("apiState").className="apiState ok"; await save(); }
  else { $("apiState").textContent = tr("error")+(r?.error||"API test failed"); $("apiState").className="apiState error"; }
});

$("uiLang").addEventListener("change", async () => {
  settings.uiLang = $("uiLang").value; await save(); localize();
});
$("theme").addEventListener("change", async () => { settings.theme=$("theme").value; await save(); applyTheme(); });
$("uiFont").addEventListener("change", async () => { settings.uiFont=$("uiFont").value; await save(); applyFont(); });
$("uiFontSize").addEventListener("change", async () => { settings.uiFontSize=$("uiFontSize").value; await save(); });
$("subtitleSize").addEventListener("change", async () => { settings.subtitleSize=$("subtitleSize").value; await save(); });
$("settingsTarget").addEventListener("change", async () => { $("targetLang").value=$("settingsTarget").value; await save(); });
$("targetLang").addEventListener("change", async () => { $("settingsTarget").value=$("targetLang").value; await save(); });
$("sourceLang").addEventListener("change", save);
$("subtitles").addEventListener("change", async () => { $("subtitlesLive").checked=$("subtitles").checked; await save(); });
$("subtitlesLive").addEventListener("change", async () => { $("subtitles").checked=$("subtitlesLive").checked; await save(); });
$("fastMode").addEventListener("change", save);
$("chunkSeconds").addEventListener("change", save);
$("ttsModel").addEventListener("change", save);
$("engine").addEventListener("change", save);
$("voice").addEventListener("change", save);

$("originalVolume").addEventListener("input", async () => {
  $("originalPct").textContent = `${$("originalVolume").value}%`;
  await save();
  try {
    const t = await getActiveTab();
    await chrome.runtime.sendMessage({
      type:"DUBLY_VOLUME",tabId:t.id,
      originalVolume:Number($("originalVolume").value)/100,
      dubVolume:Number($("dubVolume").value)/100
    });
  } catch {}
});
$("dubVolume").addEventListener("input", async () => {
  $("dubPct").textContent = `${$("dubVolume").value}%`;
  await save();
  try {
    const t = await getActiveTab();
    await chrome.runtime.sendMessage({
      type:"DUBLY_VOLUME",tabId:t.id,
      originalVolume:Number($("originalVolume").value)/100,
      dubVolume:Number($("dubVolume").value)/100
    });
  } catch {}
});

$("start").addEventListener("click", async () => {
  try {
    const key = $("apiKey").value.trim();
    if(!key) throw new Error("Enter your Gemini API key first.");
    await save();
    const tab = await getActiveTab();
    setStatus(tr("starting"), false);
    setLiveTranslation("—", 0);
    const r = await chrome.runtime.sendMessage({
      type:"DUBLY_START",
      tabId:tab.id,
      config:{
        apiKey:key,targetLang:$("targetLang").value,sourceLang:$("sourceLang").value,
        subtitles:$("subtitles").checked,originalVolume:Number($("originalVolume").value)/100,
        dubVolume:Number($("dubVolume").value)/100,fastMode:$("fastMode").checked,
        chunkSeconds:Number($("chunkSeconds").value),subtitleSize:$("subtitleSize").value,
        uiFont:$("uiFont").value,uiFontSize:$("uiFontSize").value,
        voice:$("voice").value || "auto",ttsModel:$("ttsModel").value,engine:$("engine").value || "live"
      }
    });
    if(!r?.ok) throw new Error(r?.error || "Start failed.");
    setBusy(true); setStatus(tr("live"), true);
  } catch(e) {
    setBusy(false); setStatus(tr("error")+(e?.message||e), false);
  }
});

$("stop").addEventListener("click", async () => {
  try {
    const tab = await getActiveTab();
    const r = await chrome.runtime.sendMessage({type:"DUBLY_STOP",tabId:tab.id});
    if(!r?.ok) throw new Error(r?.error || "Stop failed.");
    setBusy(false); setStatus(tr("stopped"), false);
  } catch(e) {
    setStatus(tr("error")+(e?.message||e), false);
  }
});

$("refreshVoices").addEventListener("click", async () => {
  const key = $("apiKey").value.trim();
  if(!key){ $("apiState").textContent=tr("error")+"API key"; $("apiState").className="apiState error"; return; }
  const r = await chrome.runtime.sendMessage({type:"DUBLY_LIST_VOICES",apiKey:key});
  if(r?.ok && Array.isArray(r.voices) && r.voices.length){
    const combined = [["auto","Auto / Kore"], ...r.voices.map(v => [v.name, v.name])];
    fillSelect("voice", combined);
    $("voice").value = settings.voice || "auto";
    $("apiState").textContent = `${r.voices.length} voices`;
    $("apiState").className="apiState ok";
  } else {
    $("apiState").textContent = tr("error")+(r?.error||"Could not load voices");
    $("apiState").className="apiState error";
  }
});

$("testVoice").addEventListener("click", async () => {
  const key = $("apiKey").value.trim();
  if(!key){ $("apiState").textContent=tr("error")+"API key"; $("apiState").className="apiState error"; return; }
  const r = await chrome.runtime.sendMessage({
    type:"DUBLY_TEST_TTS",apiKey:key,text:"Hello, this is a Dubly AI voice test.",
    lang:$("targetLang").value,voice:$("voice").value,volume:Number($("dubVolume").value)/100,
    ttsModel:$("ttsModel").value
  });
  $("apiState").textContent = r?.ok ? "✓" : tr("error")+(r?.error||"TTS failed");
  $("apiState").className = r?.ok ? "apiState ok" : "apiState error";
});

$("copyWallet").addEventListener("click", async () => {
  let ok=false;
  try { await navigator.clipboard.writeText(WALLET); ok=true; } catch {}
  if(!ok){
    try{
      const ta=document.createElement("textarea"); ta.value=WALLET; ta.style.position="fixed"; ta.style.left="-9999px";
      document.body.appendChild(ta); ta.select(); ok=document.execCommand("copy"); ta.remove();
    }catch{}
  }
  $("copyState").textContent=ok?tr("copied"):"";
});

$("reset").addEventListener("click", async () => {
  await chrome.storage.local.clear();
  settings = {
    apiKey:"",targetLang:"en",settingsTarget:"en",sourceLang:"auto",subtitles:true,
    originalVolume:0,dubVolume:1,uiLang:"en",uiFont:"tahoma",uiFontSize:"medium",subtitleSize:"medium",
    theme:"system",fastMode:false,chunkSeconds:8,voice:"auto",ttsModel:"gemini-3.8-flash-tts",engine:"live",settingsVersion:"6.3.1"
  };
  populate();
  $("apiState").textContent = tr("saved");
  $("apiState").className="apiState ok";
});

chrome.runtime.onMessage.addListener((message) => {
  if(message?.type === "DUBLY_OFFSCREEN_STATUS"){
    setStatus(message.text || tr("live"), !!message.live);
    if(message.output) setLiveTranslation(message.output, message.audioDuration || 0, !!message.streaming);
    if(message.live === false) setBusy(false);
  }
});

chrome.storage.local.get(null).then(async data => {
  const defaults = {
    apiKey:"",targetLang:"en",settingsTarget:"en",sourceLang:"auto",subtitles:true,
    originalVolume:0,dubVolume:1,uiLang:"en",uiFont:"tahoma",uiFontSize:"medium",subtitleSize:"medium",
    theme:"system",fastMode:false,chunkSeconds:8,voice:"auto",ttsModel:"gemini-3.8-flash-tts",engine:"live",settingsVersion:"6.3.1"
  };
  settings = {...defaults, ...data};
  // One-time migration: older builds could persist Persian as the interface/target default.
  // 6.2.7 deliberately resets the defaults to English; future manual choices are preserved.
  if (settings.settingsVersion !== "6.3.1") {
    settings.uiLang = "en";
    settings.targetLang = "en";
    settings.settingsTarget = "en";
    settings.chunkSeconds = 8;
    settings.fastMode = false;
    settings.ttsModel = "gemini-3.8-flash-tts";
    settings.settingsVersion = "6.3.1";
    settings.engine = "live";
    await chrome.storage.local.set(settings);
  }
  populate();
  donation("eth");
  getActiveTab().then(t => refreshStatus(t.id)).catch(() => {});
});

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyTheme);
