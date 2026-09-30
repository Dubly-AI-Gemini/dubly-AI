(() => {
  if (window.__DUBLY_AI_V6__) return;
  window.__DUBLY_AI_V6__ = true;

  const LANGS = {
    fa:"فارسی", en:"English", ar:"العربية", fr:"Français", de:"Deutsch", es:"Español", tr:"Türkçe (Türkiye)", az:"Türkçe (Azərbaycan)",
    zh:"中文", ja:"日本語", ko:"한국어", pt:"Português", ru:"Русский", it:"Italiano",
    tr:"Türkçe", hi:"हिन्दी", nl:"Nederlands", pl:"Polski", uk:"Українська",
    vi:"Tiếng Việt", id:"Bahasa Indonesia", fil:"Filipino", he:"עברית", th:"ไทย"
  };

  let subtitle=null;
  let subtitleEnabled=true;
  let boundVideo=null;
  let lastOutput="";

  function videoEl(){
    return document.querySelector("video.html5-main-video") || document.querySelector("video");
  }

  function videoState(extra={}){
    const v=videoEl();
    if(!v) return {playing:false,currentTime:0,rate:1,...extra};
    return {
      playing:!v.paused && !v.ended,
      currentTime:Number(v.currentTime||0),
      rate:Number(v.playbackRate||1),
      ...extra
    };
  }

  function sendVideoState(extra={}){
    chrome.runtime.sendMessage({type:"DUBLY_VIDEO_STATE",state:videoState(extra)}).catch(()=>{});
  }

  function ensureSubtitle(){
    if(subtitle?.isConnected) return subtitle;
    subtitle=document.createElement('div');
    subtitle.id='__dubly_ai_subtitle_v6__';
    subtitle.style.cssText=[
      'position:fixed','left:50%','bottom:8%','transform:translateX(-50%)',
      'z-index:2147483647','max-width:min(86vw,1000px)','padding:8px 14px',
      'border-radius:8px','background:rgba(0,0,0,.78)','color:#fff',
      'font:700 20px/1.45 system-ui,-apple-system,Segoe UI,Arial,sans-serif',
      'text-align:center','text-shadow:0 1px 2px #000','pointer-events:none',
      'display:none','white-space:pre-wrap','box-sizing:border-box','max-height:30vh','overflow:hidden','word-break:break-word'
    ].join(';');
    document.documentElement.appendChild(subtitle);
    return subtitle;
  }

  function setSubtitle(text, size){
    if(!subtitleEnabled || !text){ if(subtitle) subtitle.style.display='none'; return; }
    const el=ensureSubtitle();
    const px=size==='small'?16:size==='large'?26:20;
    el.style.fontSize=px+'px';
    el.textContent=text;
    el.style.display='block';
    lastOutput=text;
    clearTimeout(hideTimer); hideTimer=setTimeout(()=>{ if(subtitle) subtitle.style.display='none'; },7000);
  }

  let hideTimer=null;
  function hideSubtitle(){ clearTimeout(hideTimer); if(subtitle) subtitle.style.display='none'; }

  function bindVideo(){
    const v=videoEl();
    if(!v || v===boundVideo) return;
    boundVideo=v;
    for(const ev of ['play','pause','ratechange']) v.addEventListener(ev,()=>sendVideoState(),{passive:true});
    for(const ev of ['seeking','seeked']) v.addEventListener(ev,()=>sendVideoState({seeking:true}),{passive:true});
  }
  bindVideo();
  setInterval(bindVideo,800);

  chrome.runtime.onMessage.addListener((m, sender, reply) => {
    try{
      if(m.type==='DUBLY_UI_START'){
        subtitleEnabled=m.config?.subtitles!==false;
        hideSubtitle();
        reply?.({ok:true});
      } else if(m.type==='DUBLY_UI_STOP'){
        hideSubtitle();
        reply?.({ok:true});
      } else if(m.type==='DUBLY_UI_STATUS'){
        subtitleEnabled=m.subtitleEnabled!==false;
        if(m.output){ lastOutput=m.output; setSubtitle(m.output,m.subtitleSize||'medium'); }
        else if(!m.live) hideSubtitle();
        reply?.({ok:true});
      } else if(m.type==='DUBLY_SUBTITLE_CONFIG'){
        subtitleEnabled=m.enabled!==false;
        if(!subtitleEnabled) hideSubtitle();
        else if(lastOutput) setSubtitle(lastOutput,m.subtitleSize||'medium');
        reply?.({ok:true});
      } else if(m.type==='GET_VIDEO_STATE'){
        reply?.(videoState());
      }
      return true;
    }catch{ return true; }
  });
})();
