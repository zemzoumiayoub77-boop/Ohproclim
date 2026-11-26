/* O&H Pro Clim — effets visuels (barre de progression, tilt 3D, halo) */
(function(){
  'use strict';
  var bar = document.createElement('div'); bar.id = 'scrollBar'; bar.setAttribute('aria-hidden','true'); document.body.appendChild(bar);
  function prog(){ var h = document.documentElement; var m = h.scrollHeight - h.clientHeight; bar.style.width = (m > 0 ? (h.scrollTop / m * 100) : 0) + '%'; }
  window.addEventListener('scroll', prog, {passive:true}); prog();

  var fine = window.matchMedia('(hover:hover) and (pointer:fine)').matches && !window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  function tilt(root){
    if(!fine) return;
    (root || document).querySelectorAll('.srv-card,.why-card,.cert-badge').forEach(function(el){
      if(el.dataset.tilt) return; el.dataset.tilt = '1';
      el.addEventListener('mousemove', function(e){
        var r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        el.style.setProperty('--mx', (x*100)+'%'); el.style.setProperty('--my', (y*100)+'%');
        el.style.transform = 'perspective(800px) rotateX('+((.5-y)*6)+'deg) rotateY('+((x-.5)*8)+'deg) translateY(-4px)';
      });
      el.addEventListener('mouseleave', function(){ el.style.transform = ''; });
    });
  }
  window.OHPFX = {tilt: tilt};
  tilt(document);
})();
