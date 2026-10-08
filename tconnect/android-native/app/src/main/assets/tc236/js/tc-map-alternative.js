
/*
 T-Connect v2.39.5 — Alternative Map
 Leaflet + OpenStreetMap tiles. No Google Maps API key required.
 The existing interface is intentionally preserved.
*/
(() => {
  // Leaflet expõe o global `L` (usado diretamente abaixo via window.L). Se o script do
  // Leaflet ainda não tiver corrido quando `init()` é chamado, o mapa não abria e ficava
  // em silêncio para sempre; `init()` passa a reagendar-se até o Leaflet existir.
  let leafletWaitTimer = null, leafletWaitTries = 0;
  const DEFAULT = [-15.1165, 39.2666]; // Nampula, Mozambique: initial map center only; marker remains hidden until a real location is received
  let map, marker, accuracyCircle, trail = [], currentType = 'roadmap';
  let lastKnownLocation = null, gridLayer = null;
  let mapContainer = null;
  let hasLiveLocation = false;
  let roadLayer, satelliteLayer, hybridLabels, fallbackRoadLayer;
  let initToken = 0;
  let useFallbackRoad = false;
  const _termLast = {};
  function term(key, minMs, ...args) {
    const now = Date.now();
    if (_termLast[key] && now - _termLast[key] < minMs) return;
    _termLast[key] = now;
    if (window.tcMapTerminalEvent) window.tcMapTerminalEvent(...args);
  }
  let lastGeocodeAt = 0;
  let lastGeocodeKey = '', geocodeTimer = null, areaName = '';

  function escapeHtml(v) { return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  async function reverseGeocode(lat, lng) {
    // ~11 m de precisão: evita pedir ao Nominatim a cada oscilação do GPS.
    const key = lat.toFixed(4)+','+lng.toFixed(4);
    if (key === lastGeocodeKey) return;
    areaName = '';
    clearTimeout(geocodeTimer);
    const wait = Math.max(350, 1100 - (Date.now() - lastGeocodeAt));
    geocodeTimer = setTimeout(async () => {
      try {
        lastGeocodeAt = Date.now();
        const url = 'https://nominatim.openstreetmap.org/reverse?format=jsonv2&accept-language=pt&lat='+encodeURIComponent(lat)+'&lon='+encodeURIComponent(lng)+'&zoom=18&addressdetails=1';
        const r = await fetch(url, {headers:{'Accept':'application/json'}});
        if (!r.ok) return;
        const data = await r.json();
        lastGeocodeKey = key; // só memoriza depois de sucesso, para permitir nova tentativa
        const a = data.address || {};
        // Endereço detalhado como no Google Maps: via/avenida, bairro, distrito,
        // cidade e província/estado. Igual para Mapa, Satélite e Híbrido (mesmo areaName).
        const via = a.road || a.pedestrian || a.footway || a.residential || '';
        const bairro = a.neighbourhood || a.suburb || a.quarter || a.hamlet || '';
        const distrito = a.city_district || a.district || a.county || a.municipality || '';
        const cidade = a.city || a.town || a.village || '';
        const provincia = a.state || a.region || a.province || '';
        const parts = [via, bairro, distrito, cidade, provincia].filter((v,i,arr)=>v && arr.indexOf(v)===i);
        areaName = parts.length ? parts.join(', ') : (data.display_name || '');
        window.TC_MAP_ADDRESS = {via, bairro, distrito, cidade, provincia, pais:a.country||'', full:areaName, lat, lng};
        if (marker) {
          const coords = lat.toFixed(6)+', '+lng.toFixed(6);
          const title = areaName ? escapeHtml(areaName) : 'Localização detectada';
          marker.bindPopup('<b>Child localizado</b><br>'+title+'<br><span style="font-family:monospace">'+coords+'</span>');
        }
        window.TC_MAP_AREA_NAME = areaName;
        if (window.refreshLocationTerminalUI) window.refreshLocationTerminalUI();
        const hud = mapContainer && mapContainer.querySelector('.tc-exact-coordinate-hud');
        if (hud && hud.querySelector('small')) hud.querySelector('small').textContent = '✓ Localizado · ' + (areaName || 'posição recebida');
        try{ const gp=mapContainer&&mapContainer.querySelector('.tc-glass-panel'); if(gp&&gp.classList.contains('open')){ const ael=gp.querySelector('[data-k=addr]'); if(ael) tcTypeInto(ael, areaName||'—'); } }catch(_){}
      } catch(e) {}
    }, wait);
  }

  function icon() {
    // Ponteiro com ícone de telemóvel (celular) do dispositivo da Criança.
    const name = (window.TC_DEVICE_NAME || 'Child');
    return window.L.divIcon({
      className: '',
      html: '<div class="tc-map-phone" aria-label="Localização do dispositivo">'
        + '<div class="tc-map-phone-pin">'
        + '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="2.5" width="10" height="19" rx="2.2"/><line x1="10.5" y1="18.5" x2="13.5" y2="18.5"/></svg>'
        + '</div>'
        + '<span class="tc-map-phone-label">' + String(name).replace(/[&<>"]/g, '') + '</span>'
        + '</div>',
      iconSize: [40,52],
      iconAnchor: [20,52]
    });
  }

  function findContainer() {
    return document.getElementById('map') ||
      document.getElementById('tc-map') ||
      document.querySelector('.tc-map') ||
      document.querySelector('[data-map]') ||
      document.querySelector('.map-container');
  }

  function destroyMap() {
    try { if (map) map.remove(); } catch (e) {}
    map = null; marker = null; accuracyCircle = null; roadLayer = null;
    satelliteLayer = null; hybridLabels = null; fallbackRoadLayer = null; mapContainer = null;
    initToken++;
  }

  // ===== Camada de ficção científica (HUD por cima dos tiles reais) =====
  let tcMapCtx = null;
  function tcMapAudio(){ try{ if(!tcMapCtx) tcMapCtx = new (window.AudioContext||window.webkitAudioContext)(); if(tcMapCtx.state==='suspended') tcMapCtx.resume(); return tcMapCtx; }catch(_){ return null; } }
  try{ ['click','touchstart','keydown'].forEach(function(ev){ window.addEventListener(ev, function(){ tcMapAudio(); }, {once:true, passive:true}); }); }catch(_){}
  function tcSonarPing(){ const ctx=tcMapAudio(); if(!ctx) return; const now=ctx.currentTime;
    function beep(delay,gv){ const o=ctx.createOscillator(); o.type='sine'; const g=ctx.createGain(); g.gain.value=0.0001; o.connect(g); g.connect(ctx.destination); o.frequency.setValueAtTime(1500, now+delay); o.frequency.exponentialRampToValueAtTime(540, now+delay+0.5); g.gain.exponentialRampToValueAtTime(gv, now+delay+0.03); g.gain.exponentialRampToValueAtTime(0.0001, now+delay+0.72); o.start(now+delay); o.stop(now+delay+0.78); }
    beep(0,0.5); beep(0.2,0.22); }
  function tcScanSweep(){ const ctx=tcMapAudio(); if(!ctx) return; const now=ctx.currentTime; const o=ctx.createOscillator(); o.type='triangle'; const g=ctx.createGain(); g.gain.value=0.0001; o.connect(g); g.connect(ctx.destination); o.frequency.setValueAtTime(300, now); o.frequency.linearRampToValueAtTime(1200, now+0.7); g.gain.linearRampToValueAtTime(0.16, now+0.1); g.gain.linearRampToValueAtTime(0.0001, now+0.75); o.start(now); o.stop(now+0.8); }
  function positionReticle(){ if(!map||!mapContainer||!lastKnownLocation) return; const scifi=mapContainer.querySelector('.tc-scifi-hud'); const ret=scifi&&scifi.querySelector('.tc-scifi-reticle'); if(!ret) return; try{ const pt=map.latLngToContainerPoint([lastKnownLocation.lat,lastKnownLocation.lng]); ret.style.left=pt.x+'px'; ret.style.top=pt.y+'px'; }catch(_){} }
  function scifiLock(){ if(!mapContainer) return; const scifi=mapContainer.querySelector('.tc-scifi-hud'); if(!scifi) return; scifi.classList.remove('tc-scanning'); scifi.classList.add('tc-locked'); const st=scifi.querySelector('.tc-scifi-status span'); if(st) st.textContent='ALVO LOCALIZADO'; positionReticle(); const ret=scifi.querySelector('.tc-scifi-reticle'); if(ret){ ret.classList.remove('lock-anim'); void ret.offsetWidth; ret.classList.add('lock-anim'); } try{ tcSonarPing(); }catch(_){} try{ openGlassPanel(); }catch(_){} }
  window.TC_MAP_SCIFI = { lock: scifiLock, scan: tcScanSweep, ping: tcSonarPing };
  function tcCinematicOpen(){ const c=tcMapAudio(); if(!c) return; const n=c.currentTime;
    const o=c.createOscillator(); o.type='sawtooth'; const g=c.createGain(); g.gain.value=0.0001; const lp=c.createBiquadFilter(); lp.type='lowpass'; lp.frequency.setValueAtTime(400,n); lp.frequency.exponentialRampToValueAtTime(4200,n+0.5); o.connect(g); g.connect(lp); lp.connect(c.destination); o.frequency.setValueAtTime(180,n); o.frequency.exponentialRampToValueAtTime(700,n+0.55); g.gain.linearRampToValueAtTime(0.22,n+0.1); g.gain.exponentialRampToValueAtTime(0.0001,n+0.8); o.start(n); o.stop(n+0.85);
    [1318,1760].forEach(function(fr){ const sx=c.createOscillator(); sx.type='sine'; const sg=c.createGain(); sg.gain.value=0.0001; sx.connect(sg); sg.connect(c.destination); sx.frequency.setValueAtTime(fr,n+0.15); sg.gain.exponentialRampToValueAtTime(0.12,n+0.25); sg.gain.exponentialRampToValueAtTime(0.0001,n+0.95); sx.start(n+0.15); sx.stop(n+1.0); }); }
  const tcTypers = {};
  function tcTypeInto(el, text){ if(!el) return; text=String(text==null?'':text); const key=el.getAttribute('data-k')||Math.random(); if(tcTypers[key]) clearInterval(tcTypers[key]); el.textContent=''; el.classList.add('tc-type-caret'); let i=0; tcTypers[key]=setInterval(function(){ i++; el.textContent=text.slice(0,i); if(i>=text.length){ clearInterval(tcTypers[key]); delete tcTypers[key]; el.classList.remove('tc-type-caret'); } }, 24); }
  function tcGlassInfo(){ const d=window.TC_DEVICE_INFO||{}; const lat=lastKnownLocation?lastKnownLocation.lat:null, lng=lastKnownLocation?lastKnownLocation.lng:null; const now=new Date();
    return { name:(window.TC_DEVICE_NAME||d.name||'Child'), coords:(lat!=null&&lng!=null)?(Number(lat).toFixed(6)+'°, '+Number(lng).toFixed(6)+'°'):'—', addr: areaName || 'a localizar endereço…', acc:(lastKnownLocation&&lastKnownLocation.accuracy?Math.round(lastKnownLocation.accuracy)+' m':'—'), bat:(d.battery!=null&&d.battery!==''?d.battery+'%':'—'), st:(d.status?(d.status==='online'?'ONLINE':String(d.status).toUpperCase()):'ONLINE'), upd: now.toLocaleTimeString('pt-PT') }; }
  function openGlassPanel(){ if(!mapContainer) return; let p=mapContainer.querySelector('.tc-glass-panel'); const info=tcGlassInfo();
    if(!p){ p=document.createElement('div'); p.className='tc-glass-panel'; p.innerHTML='<div class="tc-glass-head"><span class="tc-glass-dot"></span><b>ALVO LOCALIZADO</b><button class="tc-glass-close" aria-label="Fechar">×</button></div><div class="tc-glass-name" data-k="name"></div><div class="tc-glass-rows"><div class="tc-glass-row"><span>COORDENADAS</span><b data-k="coords"></b></div><div class="tc-glass-row"><span>LOCAL / RUA</span><b data-k="addr"></b></div><div class="tc-glass-row"><span>PRECISÃO</span><b data-k="acc"></b></div><div class="tc-glass-row"><span>BATERIA</span><b data-k="bat"></b></div><div class="tc-glass-row"><span>ESTADO</span><b data-k="st"></b></div><div class="tc-glass-row"><span>ATUALIZADO</span><b data-k="upd"></b></div></div><div class="tc-glass-foot"><span class="tc-glass-live">● LIVE</span><span>TC::TARGET-LOCK</span></div>';
      mapContainer.appendChild(p); p.querySelector('.tc-glass-close').addEventListener('click',function(){ p.classList.remove('open'); });
      requestAnimationFrame(function(){ p.classList.add('open'); }); try{ tcCinematicOpen(); }catch(_){}
      tcTypeInto(p.querySelector('[data-k=name]'), info.name);
      setTimeout(function(){ tcTypeInto(p.querySelector('[data-k=coords]'), info.coords); },160);
      setTimeout(function(){ tcTypeInto(p.querySelector('[data-k=addr]'), info.addr); },360);
      setTimeout(function(){ tcTypeInto(p.querySelector('[data-k=acc]'), info.acc); },560);
      setTimeout(function(){ tcTypeInto(p.querySelector('[data-k=bat]'), info.bat); },700);
      setTimeout(function(){ tcTypeInto(p.querySelector('[data-k=st]'), info.st); },820);
      setTimeout(function(){ tcTypeInto(p.querySelector('[data-k=upd]'), info.upd); },940);
    } else { if(!p.classList.contains('open')){ p.classList.add('open'); try{ tcCinematicOpen(); }catch(_){} } updateGlassPanel(); } }
  function updateGlassPanel(){ if(!mapContainer) return; const p=mapContainer.querySelector('.tc-glass-panel'); if(!p||!p.classList.contains('open')) return; const info=tcGlassInfo();
    tcTypeInto(p.querySelector('[data-k=coords]'), info.coords); tcTypeInto(p.querySelector('[data-k=addr]'), info.addr);
    const bat=p.querySelector('[data-k=bat]'); if(bat) bat.textContent=info.bat; const st=p.querySelector('[data-k=st]'); if(st) st.textContent=info.st; const upd=p.querySelector('[data-k=upd]'); if(upd) upd.textContent=info.upd; }
  window.TC_MAP_SCIFI.panel = openGlassPanel; window.TC_MAP_SCIFI.updatePanel = updateGlassPanel;

  function init() {
    if (!window.L) {
      // O Leaflet ainda não carregou (ordem de scripts, rede lenta). Em vez de desistir
      // em silêncio, tenta de novo durante alguns segundos até o `L` estar disponível.
      if (leafletWaitTries < 40) {
        leafletWaitTries++;
        clearTimeout(leafletWaitTimer);
        leafletWaitTimer = setTimeout(init, 150);
      } else {
        const el0 = findContainer();
        if (el0 && !el0.querySelector('.leaflet-container') && !el0.querySelector('.map-provider-error')) {
          el0.innerHTML = '<div class="map-provider-error"><b>Mapa indisponível</b><span>Não foi possível carregar a biblioteca do mapa (Leaflet). Verifique a ligação à internet e recarregue a aplicação.</span></div>';
        }
      }
      return;
    }
    leafletWaitTries = 0;
    clearTimeout(leafletWaitTimer);
    const el = findContainer();
    if (!el) {
      // O Guardian saiu da tela do mapa: liberta a instância antiga (evita fuga de memória).
      if (map && mapContainer && !document.body.contains(mapContainer)) destroyMap();
      return;
    }

    // Guardian re-renders the page when switching tabs/settings. That replaces
    // #map with a new DOM node. A Leaflet instance cannot remain attached to
    // the old node, otherwise the map appears once and then disappears.
    if (map && mapContainer !== el) {
      destroyMap();
    }
    if (map) {
      map.invalidateSize(false);
      return;
    }

    mapContainer = el;
    const token = ++initToken;
    // maxZoom limitado a 19: é o zoom máximo real dos tiles OSM/Esri. Acima disso o
    // Leaflet mostrava "Map data not yet available" porque não existem tiles. zoomSnap 1
    // evita níveis fracionários que agravavam o problema.
    map = window.L.map(el, { zoomControl: true, preferCanvas: true, minZoom: 3, maxZoom: 19, zoomSnap: 1, zoomDelta: 1, wheelDebounceTime: 40, wheelPxPerZoomLevel: 120 }).setView(DEFAULT, 13);
    const BLANK_TILE0 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    roadLayer = window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxNativeZoom: 19,
      maxZoom: 19,
      noWrap: true,
      updateWhenZooming: false,
      updateWhenIdle: true,
      keepBuffer: 3,
      errorTileUrl: BLANK_TILE0,
      attribution: '&copy; OpenStreetMap contributors'
    });
    // Tile transparente (1x1 PNG) usado quando um tile de satélite não existe: em vez
    // do texto "Map data not yet available", fica apenas o fundo escuro do mapa.
    const BLANK_TILE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    satelliteLayer = window.L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      // maxNativeZoom 17: a cobertura de satélite da Esri é fiável até 17 mesmo em zonas
      // rurais (ex.: Moçambique). Com maxZoom 19, o Leaflet amplia o tile de 17 em vez de
      // mostrar "Map data not yet available".
      maxNativeZoom: 17,
      maxZoom: 19,
      updateWhenZooming: false,
      updateWhenIdle: true,
      keepBuffer: 4,
      errorTileUrl: BLANK_TILE,
      attribution: '&copy; Esri'
    });
    hybridLabels = window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxNativeZoom: 19, maxZoom: 19, errorTileUrl: BLANK_TILE0, updateWhenZooming: false, updateWhenIdle: true, keepBuffer: 3, opacity: .34, attribution: '&copy; OpenStreetMap contributors'
    });
    fallbackRoadLayer = window.L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
      maxNativeZoom: 17, maxZoom: 19, errorTileUrl: BLANK_TILE0, updateWhenZooming: false, updateWhenIdle: true, keepBuffer: 3, attribution: '&copy; Esri'
    });
    // If OSM tiles fail repeatedly, switch only the road base to Esri instead of
    // destroying the Leaflet instance. This keeps the map usable during provider hiccups.
    let roadErrors = 0;
    roadLayer.on('tileerror', () => {
      roadErrors++;
      if (roadErrors >= 4 && !useFallbackRoad) {
        useFallbackRoad = true;
        if (map && currentType === 'roadmap') { try { updateLayers(); } catch (_) {} }
      }
    });
    roadLayer.addTo(map);
    map.on('resize', () => { if (!map) return; map.invalidateSize(false); updateGrid(); restoreLastKnownLocation(); });
    map.on('zoomend', () => { updateGrid(); restoreLastKnownLocation(); term('zoom',1500,'ZOOM', `ZOOM_${map.getZoom().toFixed(2)}`, 'OK', {detail:`Zoom ${map.getZoom().toFixed(2)}`}); });
    map.on('moveend', () => { updateGrid(); restoreLastKnownLocation(); term('move',1500,'MAPA', 'MOVIMENTO_CONCLUÍDO', 'OK', {detail:`Centro ${map.getCenter().lat.toFixed(6)}, ${map.getCenter().lng.toFixed(6)}`}); });
    map.on('click', (e) => { term('click',400,'CLICK', 'CLIQUE_NO_MAPA', 'OK', {detail:`${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)}`}); });
    map.whenReady(() => {
      if (token !== initToken || !map) return;
      [60,180,400,800].forEach(ms => setTimeout(() => { try { if (token === initToken && map && mapContainer === el) map.invalidateSize(false); } catch (_) {} }, ms));
    });

    try {
      const saved = JSON.parse(localStorage.getItem('tc:lastKnownLocation') || 'null');
      if (saved && Number.isFinite(Number(saved.lat)) && Number.isFinite(Number(saved.lng))) lastKnownLocation = {lat:Number(saved.lat),lng:Number(saved.lng),accuracy:Number(saved.accuracy)||60};
    } catch(e) {}
    marker = window.L.marker(DEFAULT, { icon: icon(), opacity: 0, zIndexOffset: 3000, keyboard: false }).addTo(map);
    restoreLastKnownLocation();
    // Exact-coordinate HUD stays inside the map and updates with every live point.
    let coordHud = el.querySelector('.tc-exact-coordinate-hud');
    if (!coordHud) {
      coordHud = document.createElement('div');
      coordHud.className = 'tc-exact-coordinate-hud';
      coordHud.innerHTML = '<span class="tc-coord-label">COORDENADAS EXATAS</span><strong>—</strong><small>aguardando localização</small>';
      el.appendChild(coordHud);
    }
    // HUD de ficção científica (não substitui o mapa; desenha por cima)
    let scifiHud = el.querySelector('.tc-scifi-hud');
    if (!scifiHud) {
      scifiHud = document.createElement('div');
      scifiHud.className = 'tc-scifi-hud tc-scanning';
      scifiHud.innerHTML = '<div class="tc-scifi-corner tl"></div><div class="tc-scifi-corner tr"></div><div class="tc-scifi-corner bl"></div><div class="tc-scifi-corner br"></div><div class="tc-scifi-radar"></div><div class="tc-scifi-scan"></div><div class="tc-scifi-status"><i></i><span>A PROCURAR ALVO…</span></div><div class="tc-scifi-reticle"><div class="r1"></div><div class="r2"></div><div class="r3"></div><div class="rx"></div><div class="ry"></div><b>ALVO</b></div>';
      el.appendChild(scifiHud);
      try { tcScanSweep(); } catch (_) {}
    }
    try { map.on('move zoom moveend zoomend resize', positionReticle); } catch (_) {}
    accuracyCircle = window.L.circle(DEFAULT, {
      radius: 60,
      weight: 1,
      opacity: 0,
      fillOpacity: 0
    }).addTo(map);

    // Only change layers after ALL location objects exist.
    // This prevents the first render/resize event from calling setLatLng on null.
    updateLayers();
    restoreLastKnownLocation();
  }

  function updateGrid() {
    // Coordinate grid lines are intentionally disabled. Exact coordinates are
    // shown in the HUD and terminal without drawing lines over the map.
    if (gridLayer && map && map.hasLayer(gridLayer)) { try { map.removeLayer(gridLayer); } catch (_) {} }
    gridLayer = null;
  }

  function restoreLastKnownLocation() {
    if (!map || !lastKnownLocation) return;
    const {lat,lng,accuracy=60}=lastKnownLocation;
    if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) return;
    const pos=[Number(lat),Number(lng)];

    // Leaflet objects can temporarily be absent while Guardian replaces #map.
    // Never let a missing marker/circle break the entire map.
    if (!marker) {
      try { marker = window.L.marker(pos, { icon: icon(), opacity: 1, zIndexOffset: 3000, keyboard: false }).addTo(map); } catch(e) { return; }
    } else {
      try { marker.setLatLng(pos).setOpacity(1).setZIndexOffset(3000); } catch(e) {}
    }
    try { if (typeof marker.bringToFront === "function") marker.bringToFront(); } catch(e) {}

    if (!accuracyCircle) {
      try { accuracyCircle = window.L.circle(pos, { radius:Number(accuracy)||60, weight:1, opacity:.55, fillOpacity:.06 }).addTo(map); } catch(e) {}
    } else {
      try { accuracyCircle.setLatLng(pos).setRadius(Number(accuracy)||60).setStyle({opacity:.55,fillOpacity:.06}); } catch(e) {}
    }
    const hud=mapContainer && mapContainer.querySelector('.tc-exact-coordinate-hud');
    if(hud){ const strong=hud.querySelector('strong'); if(strong) strong.textContent=Number(lat).toFixed(6)+'°, '+Number(lng).toFixed(6)+'°'; }
  }

  function updateLayers() {
    if (!map || !roadLayer || !satelliteLayer || !hybridLabels) return;
    [roadLayer, fallbackRoadLayer, satelliteLayer, hybridLabels].forEach(layer => { if (layer && map.hasLayer(layer)) map.removeLayer(layer); });
    if (currentType === 'satellite') satelliteLayer.addTo(map);
    else if (currentType === 'hybrid') { satelliteLayer.addTo(map); hybridLabels.addTo(map); }
    else { (useFallbackRoad && fallbackRoadLayer ? fallbackRoadLayer : roadLayer).addTo(map); }
    restoreLastKnownLocation();
    updateGrid();
    try { if (marker && typeof marker.bringToFront === 'function') marker.bringToFront(); } catch (_) {}

  }

  window.TC_MAP = {
    init,
    refresh() {
      init();
      if (map) {
        [0,80,250,600].forEach(ms => setTimeout(() => { try { if (map) map.invalidateSize(false); } catch (_) {} }, ms));
      }
    },
    setType(type) {
      currentType = ['roadmap','satellite','hybrid'].includes(type) ? type : 'roadmap';
      if (!map) init();
      if (map) {
        updateLayers();
        requestAnimationFrame(() => { try { map.invalidateSize(false); } catch (_) {} });
      }
    },
    showTrail(points) {
      if (!map) init();
      if (!map || !window.L || !Array.isArray(points)) { this.clearTrail(); return; }
      const latlngs = points.filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng)).map(p => [p.lat, p.lng]);
      if (latlngs.length < 2) { this.clearTrail(); return; }
      if (this._trail) { try { map.removeLayer(this._trail); } catch (_) {} }
      this._trail = window.L.polyline(latlngs, { color: '#38bdf8', weight: 4, opacity: .85, dashArray: '1,9', lineCap: 'round' }).addTo(map);
      try { map.fitBounds(this._trail.getBounds(), { padding: [40, 40], maxZoom: 17 }); } catch (_) {}
    },
    clearTrail() {
      if (this._trail && map) { try { map.removeLayer(this._trail); } catch (_) {} this._trail = null; }
    },
    setLocation(lat, lng, accuracy = 60, follow = true) {
      if (!map) init();
      if (!map || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const pos = [lat, lng];
      hasLiveLocation = true;
      if (!window.__tcAutoHybrid) { window.__tcAutoHybrid = true; currentType = 'hybrid'; try { updateLayers(); } catch(_){} }
      lastKnownLocation = {lat, lng, accuracy: Number(accuracy)||60};
      term('loc',2000,'LOCALIZAÇÃO', 'ATUALIZACAO_DISPOSITIVO', 'OK', {detail:`${(window.TC_DEVICE_NAME||'Child')} · ${lat.toFixed(6)}, ${lng.toFixed(6)}`, contact:(window.TC_DEVICE_NAME||'Child')});
      try { localStorage.setItem('tc:lastKnownLocation', JSON.stringify(lastKnownLocation)); } catch(e) {}
      reverseGeocode(lat, lng);
      if (!marker) { try { marker = window.L.marker(pos, { icon: icon(), opacity: 1, zIndexOffset: 3000, keyboard: false }).addTo(map); } catch(e) { return; } }
      marker.setLatLng(pos).setOpacity(1).setZIndexOffset(2000);
      if (typeof marker.bringToFront === "function") marker.bringToFront();
      const hud = mapContainer && mapContainer.querySelector('.tc-exact-coordinate-hud');
      if (hud) {
        const strong = hud.querySelector('strong');
        const small = hud.querySelector('small');
        if (strong) strong.textContent = lat.toFixed(6) + '°, ' + lng.toFixed(6) + '°';
        if (small) small.textContent = '✓ Localizado · ' + (areaName || 'a obter endereço…');
        if (window.refreshLocationTerminalUI) window.refreshLocationTerminalUI();
      }
      if (!accuracyCircle) { try { accuracyCircle = window.L.circle(pos, { radius:Number(accuracy)||60, weight:1, opacity:.8, fillOpacity:.08 }).addTo(map); } catch(e) {} }
      else { accuracyCircle.setLatLng(pos).setRadius(Number(accuracy) || 60).setStyle({opacity:.8, fillOpacity:.08}); }
      // Do not draw a route/trail over the map. Keep only the live/last-known marker.
      if (window.refreshLocationTerminalUI) window.refreshLocationTerminalUI();
      if (follow) {
        const targetZoom = 17;
        const center = map.getCenter();
        const movedFar = center && map.distance(center, pos) > 120;
        if (movedFar || map.getZoom() < 17) map.flyTo(pos, targetZoom, { animate: true, duration: 0.65 }); else map.panTo(pos, { animate: true, duration: 0.35 });
        if (marker && typeof marker.bringToFront === "function") setTimeout(() => marker.bringToFront(), 1200);
        setTimeout(() => { if (map) map.invalidateSize(false); }, 120);
      }
      try { positionReticle(); scifiLock(); } catch (_) {}
    },
    clearLocation() {
      // Keep the last known point visible. Offline/temporary loss must not erase it.
      hasLiveLocation = false;
      if (lastKnownLocation) restoreLastKnownLocation();
      if (accuracyCircle) accuracyCircle.setStyle({opacity:0, fillOpacity:0});
      if (this._line && map) { try { map.removeLayer(this._line); } catch (_) {} this._line = null; }
      trail = [];
    },
    reset() {
      // Chamado no logout: nenhuma localização do Child fica guardada neste navegador.
      lastKnownLocation = null; hasLiveLocation = false; areaName = ''; lastGeocodeKey = '';
      try { localStorage.removeItem('tc:lastKnownLocation'); } catch (e) {}
      try { if (marker) marker.setOpacity(0); } catch (e) {}
      try { if (accuracyCircle) accuracyCircle.setStyle({opacity:0, fillOpacity:0}); } catch (e) {}
    },
    isLocationLive() { return hasLiveLocation; },
    locateUser() {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        p => this.setLocation(p.coords.latitude, p.coords.longitude, p.coords.accuracy, true),
        () => {},
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
    }
  };

  // Guardian re-renders portions of the dashboard frequently. A synchronous
  // MutationObserver callback used to re-enter Leaflet during every DOM change,
  // causing visible stalls and repeated map initialization. Debounce it so a
  // burst of UI changes produces only one lightweight size/init pass.
  let observerTimer = null;
  const observer = new MutationObserver((records) => {
    // Ignora mutações feitas pelo próprio Leaflet (tiles, marcador, HUD): só reage
    // quando o Guardian redesenha a página fora do contentor do mapa.
    const relevant = records.some(r => {
      const t = r.target && r.target.nodeType === 1 ? r.target : (r.target && r.target.parentElement);
      return !(t && t.closest && t.closest('.leaflet-container'));
    });
    if (!relevant) return;
    clearTimeout(observerTimer);
    observerTimer = setTimeout(() => {
      if (document.visibilityState !== 'hidden') init();
    }, 80);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  // Lazy initialization: the map is created only when the Guardian enters
  // Visão Geral or Localização. It must never open during login/startup.

})();
