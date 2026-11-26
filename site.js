/* O&H Pro Clim — applique les modifications faites dans l'espace admin */
(function(){
  'use strict';
  var D = window.OHP_DEFAULTS || {content:{}, services:[], faq:[], zones:[]};
  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function fmtPhone(p){ var d = String(p||'').replace(/[^\d]/g,''); if(d.indexOf('212')===0 && d.length>=12) return '+212 '+d.slice(3,6)+'-'+d.slice(6); return p; }
  function digits(p){ return String(p||'').replace(/[^\d]/g,''); }
  function safeUrl(u){ return /^https?:\/\//i.test(u||'') ? u : ''; }
  var lastWa = '212649811813';

  function setText(a, re, val){
    var walker = document.createTreeWalker(a, NodeFilter.SHOW_TEXT), n;
    while((n = walker.nextNode())){ if(re.test(n.nodeValue)){ n.nodeValue = n.nodeValue.replace(re, val); return; } }
  }

  function renderServices(list){
    var g = document.getElementById('srvGrid'); if(!g) return;
    var wa = lastWa;
    g.innerHTML = list.map(function(s,i){
      var n = String(i+1).padStart(2,'0');
      return '<div class="srv-card reveal"><span class="srv-n">'+n+'</span><div class="srv-ico">'+esc(s.icon)+'</div><h3 class="srv-ttl">'+esc(s.title)+'</h3><div class="srv-dsc">'+esc(s.desc)+'</div><ul class="srv-list">'+(s.bullets||[]).map(function(b){return '<li>'+esc(b)+'</li>';}).join('')+'</ul><a href="https://wa.me/'+wa+'?text='+encodeURIComponent(s.wa||'Bonjour, je veux un devis.')+'" class="srv-wa" target="_blank" rel="noopener" aria-label="'+esc(s.cta||'Demander un devis')+'">'+esc(s.cta||'💬 Demander un devis →')+'</a></div>';
    }).join('');
    g.querySelectorAll('.reveal').forEach(function(el){ if(window.obs) obs.observe(el); else el.classList.add('vis'); });
    if(window.OHPFX) OHPFX.tilt(g);
  }
  function renderFaq(list){
    var c = document.getElementById('faqList'); if(!c) return;
    c.innerHTML = list.map(function(f){ return '<div class="faq-item"><button class="faq-q" aria-expanded="false">'+esc(f.q)+'<span class="faq-ico" aria-hidden="true">+</span></button><div class="faq-a"><p>'+esc(f.a)+'</p></div></div>'; }).join('');
    c.querySelectorAll('.faq-q').forEach(function(q){
      q.addEventListener('click', function(){
        var item = q.parentElement, a = item.querySelector('.faq-a'), open = item.classList.contains('open');
        c.querySelectorAll('.faq-item').forEach(function(it){ it.classList.remove('open'); it.querySelector('.faq-a').style.maxHeight = null; it.querySelector('.faq-q').setAttribute('aria-expanded','false'); });
        if(!open){ item.classList.add('open'); a.style.maxHeight = a.scrollHeight+'px'; q.setAttribute('aria-expanded','true'); }
      });
    });
  }
  function renderZones(list){
    var c = document.getElementById('zonesGrid'); if(!c) return;
    c.innerHTML = list.map(function(z){ return '<div class="zone-pill"><div class="zdot"></div>'+esc(z)+'</div>'; }).join('');
  }

  window.applySettings = function(s){
    s = s || {};
    var C = Object.assign({}, D.content, s.content || {});

    // textes
    document.querySelectorAll('[data-edit]').forEach(function(el){ var k = el.getAttribute('data-edit'); if(C[k] != null && C[k] !== '') el.textContent = C[k]; });
    // chiffres animés
    document.querySelectorAll('[data-edit-target]').forEach(function(el){ var v = parseInt(C[el.getAttribute('data-edit-target')],10); if(!isNaN(v)){ el.dataset.target = v; if(el.textContent !== '0') el.textContent = v; } });

    // liens & contacts
    var wa = digits(C.whatsapp) || '212649811813';
    document.querySelectorAll('a[href*="wa.me/"]').forEach(function(a){ a.href = a.href.replace(/wa\.me\/\d+/, 'wa.me/'+wa); });
    if(window.setWaBase) window.setWaBase(wa);
    var waF = document.getElementById('waFloat'); if(waF) waF.href = waF.href.replace(/wa\.me\/\d+/, 'wa.me/'+wa);
    lastWa = wa;

    [['phone1','tel:'],['phone2','tel:']].forEach(function(p){
      var v = C[p[0]]; if(!v) return;
      document.querySelectorAll('a[data-link="'+p[0]+'"]').forEach(function(a){ a.setAttribute('href','tel:+'+digits(v)); setText(a, /\+?\d[\d\s-]{7,}\d/, fmtPhone('+'+digits(v))); a.setAttribute('aria-label','Appeler '+fmtPhone('+'+digits(v))); });
    });
    if(C.email) document.querySelectorAll('a[data-link="email"]').forEach(function(a){ a.setAttribute('href','mailto:'+C.email); setText(a, /[^\s✉️]+@[^\s]+/, C.email); });
    ['instagram','facebook'].forEach(function(k){ var u = safeUrl(C[k]); if(u) document.querySelectorAll('a[data-link="'+k+'"]').forEach(function(a){ a.href = u; }); });

    // listes
    if(Array.isArray(s.services) && s.services.length) renderServices(s.services);
    else if(s.servicesCustom) renderServices(s.services||[]);
    if(Array.isArray(s.faq) && s.faq.length) renderFaq(s.faq);
    if(Array.isArray(s.zones) && s.zones.length) renderZones(s.zones);

    // thème (couleur principale)
    if(s.theme && /^#[0-9a-f]{6}$/i.test(s.theme.accent||'')){ document.documentElement.style.setProperty('--ice', s.theme.accent); }
    // bandeau d'annonce
    var bar = document.getElementById('announceBar');
    if(s.announce && s.announce.text && s.announce.on){ if(!bar){ bar = document.createElement('div'); bar.id='announceBar'; bar.className='announce'; document.body.insertBefore(bar, document.body.firstChild); } bar.textContent = s.announce.text; bar.hidden = false; }
    else if(bar){ bar.hidden = true; }
  };
})();
