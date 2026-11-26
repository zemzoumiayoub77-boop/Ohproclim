/* O&H Pro Clim — moteur multilingue FR / EN / AR (RTL pour l'arabe)
   Les textes français du HTML servent de clés ; i18n.js contient EN et AR.
   Tout texte qui n'a pas de traduction (ex : texte modifié dans l'admin) reste tel quel. */
(function(){
  'use strict';
  var DICT = window.OHP_DICT || {}, IDX = {en:0, ar:1}, LANGS = ['fr','en','ar'];
  var cur = 'fr';
  var rev = {en:{}, ar:{}};
  Object.keys(DICT).forEach(function(k){ ['en','ar'].forEach(function(l){ var v = DICT[k][IDX[l]]; if(v) rev[l][v.replace(/~$/,'')] = k; }); });
  var ATTRS = ['aria-label','alt','placeholder','title','data-title','data-badge','data-desc'];
  var SKIP = {SCRIPT:1, STYLE:1, TEXTAREA:1, NOSCRIPT:1};
  var origT = new WeakMap(), origA = new WeakMap();
  function norm(s){ return s.replace(/\s+/g,' ').trim(); }
  function toFr(v){ if(DICT.hasOwnProperty(v)) return v; if(cur !== 'fr' && rev[cur].hasOwnProperty(v)) return rev[cur][v]; return null; }
  function pick(fr){ if(cur === 'fr') return fr; var t = DICT[fr] && DICT[fr][IDX[cur]]; if(t == null || t === undefined) return fr; return t; }

  function doText(n){
    var o = origT.get(n);
    if(!o){
      var raw = n.nodeValue; if(!raw) return;
      var k = norm(raw); if(!k) return;
      var fr = toFr(k); if(!fr) return;
      var m = raw.match(/^(\s*)[\s\S]*?(\s*)$/);
      o = {fr:fr, lead:m[1], trail:m[2]}; origT.set(n, o);
    }
    var t = pick(o.fr), out;
    if(t === '') out = '';
    else if(/~$/.test(t)) out = o.lead + t.slice(0,-1) + ' ';
    else out = o.lead + t + o.trail;
    if(cur === 'fr') out = o.lead + o.fr + o.trail;
    if(n.nodeValue !== out) n.nodeValue = out;
  }
  function doEl(el){
    for(var i = 0; i < ATTRS.length; i++){
      var a = ATTRS[i]; if(!el.hasAttribute || !el.hasAttribute(a)) continue;
      var map = origA.get(el); if(!map){ map = {}; origA.set(el, map); }
      var v = el.getAttribute(a), o = map[a];
      if(!o){ var k = norm(v); var fr = toFr(k); if(!fr) continue; o = map[a] = fr; }
      var out = cur === 'fr' ? o : (pick(o).replace(/~$/,'') || o);
      if(v !== out) el.setAttribute(a, out);
    }
  }
  function walk(root){
    if(root.nodeType === 3){ if(!SKIP[root.parentNode && root.parentNode.nodeName]) doText(root); return; }
    if(root.nodeType !== 1 || SKIP[root.nodeName]) return;
    doEl(root);
    var w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {acceptNode:function(n){ return (n.nodeType === 1 && SKIP[n.nodeName]) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; }});
    var n; while((n = w.nextNode())){ if(n.nodeType === 3){ if(!SKIP[n.parentNode.nodeName]) doText(n); } else doEl(n); }
  }

  var queue = [], raf = 0;
  var mo = new MutationObserver(function(muts){
    if(cur === 'fr') return;
    muts.forEach(function(m){ m.addedNodes.forEach(function(n){ queue.push(n); }); });
    if(!raf) raf = requestAnimationFrame(function(){ raf = 0; var q = queue; queue = []; q.forEach(function(n){ if(document.body.contains(n)) walk(n); }); });
  });

  function meta(sel, attr, val){ var m = document.querySelector(sel); if(m && val) m.setAttribute(attr, val); }
  function setLang(l, persist){
    if(LANGS.indexOf(l) < 0) l = 'fr';
    cur = l;
    var h = document.documentElement; h.lang = l; h.dir = l === 'ar' ? 'rtl' : 'ltr';
    if(persist !== false){ try{ localStorage.setItem('ohp_lang', l); }catch(e){} }
    walk(document.body);
    if(window.OHP_TITLES) document.title = OHP_TITLES[l];
    if(window.OHP_DESCS){ meta('meta[name="description"]','content',OHP_DESCS[l]); meta('meta[property="og:description"]','content',OHP_DESCS[l]); meta('meta[name="twitter:description"]','content',OHP_DESCS[l]); }
    if(window.OHP_TITLES){ meta('meta[property="og:title"]','content',OHP_TITLES[l]); }
    document.querySelectorAll('.lang-sw button').forEach(function(b){ var on = b.dataset.lang === l; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    document.dispatchEvent(new CustomEvent('ohp:lang', {detail:l}));
  }

  function switcher(){
    var d = document.createElement('div'); d.className = 'lang-sw'; d.setAttribute('role','group'); d.setAttribute('aria-label','Langue / Language / اللغة');
    d.innerHTML = '<button type="button" data-lang="fr" lang="fr" title="Français">FR</button><button type="button" data-lang="en" lang="en" title="English">EN</button><button type="button" data-lang="ar" lang="ar" title="العربية">ع</button>';
    d.addEventListener('click', function(e){ var b = e.target.closest('button[data-lang]'); if(b) setLang(b.dataset.lang); });
    return d;
  }

  function init(){
    var tr = document.querySelector('.topbar-right'); if(tr) tr.insertBefore(switcher(), tr.firstChild);
    var mm = document.getElementById('mobileMenu'); if(mm){ var s = switcher(); s.classList.add('lang-sw-mobile'); mm.insertBefore(s, mm.children[1] || null); }
    var l = 'fr', q = /[?&]lang=(fr|en|ar)/.exec(location.search);
    if(q) l = q[1]; else { try{ l = localStorage.getItem('ohp_lang') || 'fr'; }catch(e){} }
    mo.observe(document.body, {childList:true, subtree:true});
    setLang(l, !!q);
  }
  window.OHP_LANG = {set:setLang, get:function(){ return cur; }, t:function(fr){ return pick(fr); }};
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
