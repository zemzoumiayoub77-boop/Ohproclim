/* ============================================================
   O&H Pro Clim — couche de données
   - Mode "firebase" : Firestore (partagé entre tous les visiteurs)
   - Mode "local"    : localStorage (démo, un seul navigateur)
   ============================================================ */
(function(){
  'use strict';
  var cfg = window.OHP_FIREBASE || {};
  var REMOTE = !!(cfg.apiKey && cfg.projectId);
  var FB_VER = '10.12.2';
  var listeners = {real:[], avis:[], settings:[]};
  var cache = {real:null, avis:null, settings:null};

  function uid(){ return 'l' + Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
  function lsGet(k, d){ try{ var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; }catch(e){ return d; } }
  function lsSet(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); return true; }catch(e){ throw new Error('Stockage local plein (images trop lourdes). Configurez Firebase.'); } }
  function emit(kind){ listeners[kind].forEach(function(fn){ try{ fn(cache[kind]); }catch(e){ console.error(e); } }); }
  function sub(kind, fn){ listeners[kind].push(fn); if(cache[kind] !== null) fn(cache[kind]); return function(){ listeners[kind] = listeners[kind].filter(function(f){ return f !== fn; }); }; }
  function byOrder(a,b){ return (a.order||0) - (b.order||0) || (b.createdAt||0) - (a.createdAt||0); }
  function byDateDesc(a,b){ return (b.createdAt||0) - (a.createdAt||0); }

  var api = { isRemote: REMOTE, isAdminSession: false, ready: null };
  var db = null, auth = null;

  /* ---------------- MODE LOCAL ---------------- */
  function localInit(){
    cache.real = lsGet('ohp_real', []).sort(byOrder);
    cache.avis = lsGet('ohp_avis', []).filter(function(a){ return !a.hidden; }).sort(byDateDesc);
    cache.settings = lsGet('ohp_settings', {});
    window.addEventListener('storage', function(){
      cache.real = lsGet('ohp_real', []).sort(byOrder); emit('real');
      cache.avis = lsGet('ohp_avis', []).filter(function(a){ return !a.hidden; }).sort(byDateDesc); emit('avis');
      cache.settings = lsGet('ohp_settings', {}); emit('settings');
    });
    api.ready = Promise.resolve();
    api.addAvis = function(a){
      var all = lsGet('ohp_avis', []); var id = uid();
      all.unshift({id:id, nom:a.nom, ville:a.ville, texte:a.texte, note:a.note, hidden:false, createdAt:Date.now()});
      lsSet('ohp_avis', all); cache.avis = all.filter(function(x){return !x.hidden;}).sort(byDateDesc); emit('avis'); return Promise.resolve(id);
    };
    api.subscribeReal = function(fn){ return sub('real', fn); };
    api.subscribeAvis = function(fn){ return sub('avis', fn); };
    api.subscribeSettings = function(fn){ return sub('settings', fn); };
    // admin
    var authCbs = [];
    function authEmit(u){ authCbs.forEach(function(f){ f(u); }); }
    api.login = function(email, pass){ api.isAdminSession = true; try{ sessionStorage.setItem('ohp_local_admin','1'); }catch(e){} var u = {email:email||'local'}; authEmit(u); return Promise.resolve(u); };
    api.logout = function(){ api.isAdminSession = false; try{ sessionStorage.removeItem('ohp_local_admin'); }catch(e){} authEmit(null); return Promise.resolve(); };
    api.onAuth = function(fn){ authCbs.push(fn); var on = false; try{ on = sessionStorage.getItem('ohp_local_admin') === '1'; }catch(e){} api.isAdminSession = on; setTimeout(function(){ fn(on ? {email:'local'} : null); }, 0); };
    api.adminListReal = function(){ return Promise.resolve(lsGet('ohp_real', []).sort(byOrder)); };
    api.saveReal = function(r){ var all = lsGet('ohp_real', []); var i; if(r.id){ i = all.findIndex(function(x){return x.id===r.id;}); if(i>=0) all[i] = Object.assign({}, all[i], r); else all.push(r); } else { r.id = uid(); r.createdAt = Date.now(); if(r.order==null) r.order = all.length ? Math.max.apply(null, all.map(function(x){return x.order||0;}))+1 : 0; all.push(r); } lsSet('ohp_real', all); cache.real = all.slice().sort(byOrder); emit('real'); return Promise.resolve(r.id); };
    api.deleteReal = function(id){ var all = lsGet('ohp_real', []).filter(function(x){return x.id!==id;}); lsSet('ohp_real', all); cache.real = all.sort(byOrder); emit('real'); return Promise.resolve(); };
    api.reorderReal = function(ids){ var all = lsGet('ohp_real', []); ids.forEach(function(id,i){ var r = all.find(function(x){return x.id===id;}); if(r) r.order = i; }); lsSet('ohp_real', all); cache.real = all.slice().sort(byOrder); emit('real'); return Promise.resolve(); };
    api.adminListAvis = function(){ return Promise.resolve(lsGet('ohp_avis', []).sort(byDateDesc)); };
    api.setAvisHidden = function(id, hidden){ var all = lsGet('ohp_avis', []); var r = all.find(function(x){return x.id===id;}); if(r) r.hidden = !!hidden; lsSet('ohp_avis', all); cache.avis = all.filter(function(x){return !x.hidden;}).sort(byDateDesc); emit('avis'); return Promise.resolve(); };
    api.deleteAvis = function(id){ var all = lsGet('ohp_avis', []).filter(function(x){return x.id!==id;}); lsSet('ohp_avis', all); cache.avis = all.filter(function(x){return !x.hidden;}).sort(byDateDesc); emit('avis'); return Promise.resolve(); };
    api.addAvisAdmin = function(a){ return api.addAvis(a); };
    api.saveSettings = function(patch){ var s = Object.assign({}, lsGet('ohp_settings', {}), patch); lsSet('ohp_settings', s); cache.settings = s; emit('settings'); return Promise.resolve(); };
    api.getSettings = function(){ return Promise.resolve(lsGet('ohp_settings', {})); };
  }

  /* ---------------- MODE FIREBASE (SDK modulaire) ---------------- */
  function remoteInit(){
    var base = 'https://www.gstatic.com/firebasejs/' + FB_VER + '/';
    var wantAuth = !!window.OHP_NEEDS_AUTH;
    var F = null, A = null, app = null;
    function openDb(id){ return F.getFirestore(app, id); }
    api.ready = Promise.all([
      import(base + 'firebase-app.js'),
      import(base + 'firebase-firestore.js'),
      wantAuth ? import(base + 'firebase-auth.js') : Promise.resolve(null)
    ]).then(function(m){
      F = m[1]; A = m[2];
      app = m[0].initializeApp(cfg);
      if(A) auth = A.getAuth(app);
      // Identifiant de la base : "(default)" ou "default" (détecté automatiquement)
      var id = cfg.databaseId || null;
      if(!id){ try{ id = localStorage.getItem('ohp_dbid'); }catch(e){} }
      if(id){ db = openDb(id); return; }
      db = openDb('(default)');
      return F.getDoc(F.doc(db, 'settings', 'site')).then(function(){ try{ localStorage.setItem('ohp_dbid', '(default)'); }catch(e){} }, function(e){
        if(e && (e.code === 'not-found' || /does not exist|NOT_FOUND/i.test(e.message || ''))){
          db = openDb('default'); try{ localStorage.setItem('ohp_dbid', 'default'); }catch(_){}
        }
      });
    });
    var started = {};
    function once(kind, starter){ if(started[kind]) return; started[kind] = true; api.ready.then(starter).catch(function(e){ console.error('Firebase:', e); cache[kind] = cache[kind] || (kind==='settings' ? {} : []); emit(kind); }); }
    function rows(snap){ return snap.docs.map(function(d){ return Object.assign({id:d.id}, d.data()); }); }

    api.subscribeReal = function(fn){
      once('real', function(){ F.onSnapshot(F.collection(db,'realisations'), function(snap){ cache.real = rows(snap).sort(byOrder); emit('real'); }, function(e){ console.error(e); cache.real = []; emit('real'); }); });
      return sub('real', fn);
    };
    api.subscribeAvis = function(fn){
      once('avis', function(){ F.onSnapshot(F.query(F.collection(db,'avis'), F.where('hidden','==',false)), function(snap){ cache.avis = rows(snap).sort(byDateDesc); emit('avis'); }, function(e){ console.error(e); cache.avis = []; emit('avis'); }); });
      return sub('avis', fn);
    };
    api.subscribeSettings = function(fn){
      once('settings', function(){ F.onSnapshot(F.doc(db,'settings','site'), function(d){ cache.settings = d.exists() ? d.data() : {}; emit('settings'); }, function(e){ console.error(e); cache.settings = {}; emit('settings'); }); });
      return sub('settings', fn);
    };
    api.addAvis = function(a){
      return api.ready.then(function(){ return F.addDoc(F.collection(db,'avis'), {nom:a.nom, ville:a.ville, texte:a.texte, note:a.note, hidden:false, createdAt:Date.now()}); }).then(function(ref){ return ref.id; });
    };
    // admin
    api.login = function(email, pass){ return api.ready.then(function(){ return A.signInWithEmailAndPassword(auth, email, pass); }).then(function(c){ api.isAdminSession = true; return c.user; }); };
    api.logout = function(){ return api.ready.then(function(){ return A.signOut(auth); }).then(function(){ api.isAdminSession = false; }); };
    api.onAuth = function(fn){ api.ready.then(function(){ A.onAuthStateChanged(auth, function(u){ api.isAdminSession = !!u; fn(u); }); }).catch(function(e){ console.error(e); fn(null, e); }); };
    api.adminListReal = function(){ return api.ready.then(function(){ return F.getDocs(F.collection(db,'realisations')); }).then(function(s){ return rows(s).sort(byOrder); }); };
    api.saveReal = function(r){
      var id = r.id; var data = Object.assign({}, r); delete data.id;
      return api.ready.then(function(){
        if(id){ return F.setDoc(F.doc(db,'realisations',id), data, {merge:true}).then(function(){ return id; }); }
        data.createdAt = Date.now(); if(data.order == null) data.order = Date.now();
        return F.addDoc(F.collection(db,'realisations'), data).then(function(ref){ return ref.id; });
      });
    };
    api.deleteReal = function(id){ return api.ready.then(function(){ return F.deleteDoc(F.doc(db,'realisations',id)); }); };
    api.reorderReal = function(ids){ return api.ready.then(function(){ var b = F.writeBatch(db); ids.forEach(function(id,i){ b.update(F.doc(db,'realisations',id), {order:i}); }); return b.commit(); }); };
    api.adminListAvis = function(){ return api.ready.then(function(){ return F.getDocs(F.collection(db,'avis')); }).then(function(s){ return rows(s).sort(byDateDesc); }); };
    api.setAvisHidden = function(id, hidden){ return api.ready.then(function(){ return F.updateDoc(F.doc(db,'avis',id), {hidden:!!hidden}); }); };
    api.deleteAvis = function(id){ return api.ready.then(function(){ return F.deleteDoc(F.doc(db,'avis',id)); }); };
    api.addAvisAdmin = api.addAvis;
    api.saveSettings = function(patch){ return api.ready.then(function(){ return F.setDoc(F.doc(db,'settings','site'), patch, {mergeFields:Object.keys(patch)}); }); };
    api.getSettings = function(){ return api.ready.then(function(){ return F.getDoc(F.doc(db,'settings','site')); }).then(function(d){ return d.exists() ? d.data() : {}; }); };
  }

  if(REMOTE) remoteInit(); else localInit();
  window.OHP = api;
})();
