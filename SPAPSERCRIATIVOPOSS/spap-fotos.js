/* SPAP — FOTOS NO ARMAZÉM (Supabase Storage) e tráfego mínimo.
   • spapFotos.paraUrl(valor, lojaId, nome)  → se o valor for uma foto em base64, comprime (WebP leve), envia para o
     armazém e devolve o URL curto; se não conseguir (sem internet / armazém ainda não criado), devolve o valor
     original (nada se perde — a migração automática trata dele mais tarde).
   • spapFotos.comprimir(fonte)               → Blob WebP (ou JPEG em aparelhos antigos), máx. 480 px.
   • spapFotos.colunasLeves()                 → Promise<boolean>: o SQL v2.9.296 já foi corrido (há imagem_url, tem_b64…)?
   • spapFotos.migrarDepois(lojaId)           → passa as fotos antigas em base64 desta loja para o armazém, aos poucos,
     em segundo plano, um aparelho de cada vez; só apaga o base64 depois de a foto estar guardada.
   ES2017 (funciona nos computadores antigos). */
(function () {
  'use strict';
  var BUCKET = 'produtos';
  var MAX = 480;

  function ehBase64(s) { return typeof s === 'string' && s.slice(0, 5) === 'data:'; }
  function ehUrl(s) { return typeof s === 'string' && /^https?:\/\//i.test(s); }
  function cliente() { try { return window.supabaseClient || (typeof supabaseClient !== 'undefined' ? supabaseClient : null); } catch (e) { return null; } }
  function guardar(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function ler(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function esperar(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  // ---------- comprimir ----------
  function carregarImagem(fonte) {
    return new Promise(function (res, rej) {
      var url = fonte, revogar = null;
      if (typeof Blob !== 'undefined' && fonte instanceof Blob) { url = URL.createObjectURL(fonte); revogar = url; }
      var img = new Image();
      img.onload = function () { if (revogar) setTimeout(function () { URL.revokeObjectURL(revogar); }, 1000); res(img); };
      img.onerror = function () { if (revogar) URL.revokeObjectURL(revogar); rej(new Error('imagem inválida')); };
      img.src = url;
    });
  }
  function canvasParaBlob(cv, tipo, q) {
    return new Promise(function (res) {
      try { cv.toBlob(function (b) { res(b); }, tipo, q); }
      catch (e) {
        try { var d = cv.toDataURL(tipo, q), bin = atob(d.split(',')[1]), arr = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i); res(new Blob([arr], { type: d.slice(5, d.indexOf(';')) })); } catch (e2) { res(null); }
      }
    });
  }
  function comprimir(fonte, max, qualidade) {
    max = max || MAX; qualidade = qualidade || 0.8;
    return carregarImagem(fonte).then(function (img) {
      var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
      if (!w || !h) throw new Error('imagem vazia');
      var esc = Math.min(1, max / Math.max(w, h)), cw = Math.max(1, Math.round(w * esc)), ch = Math.max(1, Math.round(h * esc));
      var cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
      var cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cw, ch);   // fundo branco (PNG transparente)
      cx.imageSmoothingEnabled = true; try { cx.imageSmoothingQuality = 'high'; } catch (e) {}
      cx.drawImage(img, 0, 0, cw, ch);
      return canvasParaBlob(cv, 'image/webp', qualidade).then(function (b) {
        if (b && b.type === 'image/webp' && b.size > 0) return b;
        return canvasParaBlob(cv, 'image/jpeg', 0.8);                                  // aparelhos sem WebP
      });
    });
  }

  // ---------- enviar ----------
  var _semArmazemAte = 0;
  function nomeFicheiro(nome, tipo) {
    var base = String(nome || 'p').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40) || 'p';
    return base + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7) + (tipo === 'image/jpeg' ? '.jpg' : '.webp');
  }
  function enviar(lojaId, fonte, nome, max) {
    var c = cliente();
    if (!c || !c.storage || !lojaId) return Promise.resolve(null);
    if (navigator.onLine === false || Date.now() < _semArmazemAte) return Promise.resolve(null);
    enviar.erro = null;
    return comprimir(fonte, max).then(null, function (e) { enviar.erro = 'imagem'; throw e; }).then(function (blob) {
      if (!blob) return null;
      var caminho = String(lojaId) + '/' + nomeFicheiro(nome, blob.type);
      return c.storage.from(BUCKET).upload(caminho, blob, { contentType: blob.type, cacheControl: '31536000', upsert: false }).then(function (r) {
        if (r && r.error) {
          var m = String(r.error.message || r.error.error || r.error);
          if (/bucket|not found|row-level|policy|unauthor|403|404/i.test(m)) _semArmazemAte = Date.now() + 10 * 60 * 1000;   // SQL ainda não corrido
          return null;
        }
        var pu = c.storage.from(BUCKET).getPublicUrl(caminho);
        var url = pu && pu.data && pu.data.publicUrl;
        if (url) { try { precarregar(url); } catch (e) {} }
        return url || null;
      });
    }).catch(function () { return null; });
  }
  // guarda já a foto no aparelho (quem a enviou não precisa de a descarregar)
  function precarregar(url) {
    if (!('caches' in window)) return;
    fetch(url, { mode: 'cors', credentials: 'omit' }).then(function (r) { if (r && r.ok) return caches.open('spap-fotos').then(function (cc) { return cc.put(url, r); }); }).catch(function () {});
  }
  function paraUrl(valor, lojaId, nome, max) {
    if (!ehBase64(valor)) return Promise.resolve(valor);
    return enviar(lojaId, valor, nome, max).then(function (u) { return u || valor; });
  }

  // ---------- o SQL v2.9.296 já foi corrido? ----------
  var _leves = null;
  function colunasLeves() {
    if (_leves) return _leves;
    var k = 'spap_fotos_esquema', v = ler(k);
    if (v) { var p = v.split('|'); if (Date.now() - (+p[1] || 0) < (p[0] === '1' ? 7 * 864e5 : 15 * 60e3)) return (_leves = Promise.resolve(p[0] === '1')); }
    var c = cliente(); if (!c) return Promise.resolve(false);
    _leves = Promise.resolve(c.from('produtos').select('id,imagem_url,tem_b64,atualizado_em').limit(1)).then(function (r) {
      var ok = !!(r && !r.error);
      if (r && r.error && !/column|does not exist|42703|schema cache/i.test(String(r.error.message || r.error.code || ''))) { _leves = null; return false; }  // erro de rede: tenta de novo depois
      guardar(k, (ok ? '1' : '0') + '|' + Date.now()); return ok;
    }, function () { _leves = null; return false; });
    return _leves;
  }
  function esquecerEsquema() { _leves = null; try { localStorage.removeItem('spap_fotos_esquema'); } catch (e) {} }

  // ---------- migração das fotos antigas (base64 → armazém) ----------
  var _aMigrar = false;
  function migrar(lojaId) {
    var c = cliente();
    if (_aMigrar || !c || !lojaId || navigator.onLine === false) return Promise.resolve(0);
    var kOk = 'spap_fotos_migradas_' + lojaId;
    if (Date.now() - (+ler(kOk) || 0) < 6 * 3600e3) return Promise.resolve(0);   // já sem fotos antigas há pouco tempo
    _aMigrar = true; var feitas = 0, inicio = Date.now();
    var kRuins = 'spap_fotos_ruins_' + lojaId, ruins = {}; try { ruins = JSON.parse(ler(kRuins) || '{}') || {}; } catch (e) { ruins = {}; }
    function vez() {
      return Promise.resolve(c.rpc('spap_vez_migrar_fotos', { p_loja: lojaId })).then(function (r) {
        if (r && r.error) return !/function|does not exist|schema cache|PGRST202/i.test(String(r.error.message || r.error.code || '')) ? false : true; // sem a função: segue (sem coordenação)
        return r && r.data === true;
      }, function () { return false; });
    }
    function umaFoto(tabela, id, coluna, nome, max) {
      return Promise.resolve(c.from(tabela).select(coluna).eq('id', id).maybeSingle()).then(function (r) {
        var val = r && r.data && r.data[coluna];
        if (!ehBase64(val)) return false;
        return enviar(lojaId, val, nome, max).then(function (url) {
          if (!url && enviar.erro === 'imagem') { ruins[id] = 1; guardar(kRuins, JSON.stringify(ruins)); return false; }   // foto estragada: fica como está e segue
          if (!url) return 'parar';
          var upd = {}; upd[coluna] = url;
          // só troca se ainda for o MESMO base64 (o dono pode ter posto outra foto entretanto)
          return Promise.resolve(c.from(tabela).update(upd).eq('id', id).like(coluna, 'data:%')).then(function (u) { return !(u && u.error); });
        });
      }, function () { return false; });
    }
    function lote() {
      if (Date.now() - inicio > 4 * 60e3 || navigator.onLine === false) return Promise.resolve('tempo');
      var nRuins = Object.keys(ruins).length;
      return Promise.resolve(c.from('produtos').select('id').eq('loja_id', lojaId).like('imagem', 'data:%').limit(15 + nRuins)).then(function (r) {
        if (!r || r.error) return 'erro';
        var ids = (r.data || []).map(function (x) { return x.id; }).filter(function (id) { return !ruins[id]; }).slice(0, 15);
        if (!ids.length) return 'fim';
        var cadeia = Promise.resolve(), parar = false;
        ids.forEach(function (id) {
          cadeia = cadeia.then(function () { if (parar) return; return umaFoto('produtos', id, 'imagem', id).then(function (ok) { if (ok === 'parar') parar = true; else if (ok) feitas++; return esperar(250); }); });
        });
        return cadeia.then(function () { return parar ? 'parar' : lote(); });
      });
    }
    function marca() {
      return Promise.resolve(c.from('lojas').select('id').eq('id', lojaId).like('logo', 'data:%').maybeSingle()).then(function (r) {
        return (r && r.data) ? umaFoto('lojas', lojaId, 'logo', 'logo') : false;
      }, function () { return false; }).then(function () {
        return Promise.resolve(c.from('lojas').select('id').eq('id', lojaId).like('banner', 'data:%').maybeSingle()).then(function (r) {
          return (r && r.data) ? umaFoto('lojas', lojaId, 'banner', 'banner', 1200) : false;
        }, function () { return false; });
      });
    }
    return vez().then(function (minha) {
      if (!minha) return 'outro';
      return lote().then(function (fim) { return marca().then(function () { return fim; }); });
    }).then(function (fim) {
      if (fim === 'fim') guardar(kOk, String(Date.now()));
      _aMigrar = false;
      if (feitas) { try { window.dispatchEvent(new CustomEvent('spap-fotos-migradas', { detail: { lojaId: lojaId, feitas: feitas } })); } catch (e) {} }
      return feitas;
    }, function () { _aMigrar = false; return feitas; });
  }
  var _migT = null;
  function migrarDepois(lojaId, ms) {
    clearTimeout(_migT);
    _migT = setTimeout(function () {
      colunasLeves().then(function (ok) { if (ok) migrar(lojaId); });   // só depois de o SQL existir (armazém criado)
    }, ms == null ? 45000 : ms);
  }

  // ---------- sincronização leve dos produtos (Banca, Monitor da Banca) ----------
  // Devolve null se o SQL v2.9.296 ainda não foi corrido (o chamador usa o modo antigo).
  // o = { lojaId, cols: 'id,nome,...' (SEM imagem), base: lista guardada no aparelho, chave: chave do cursor,
  //       ordem: 'nome' (opcional, para ordenar no fim) }
  // Resultado: { lista, incremental, mudados, apagados } ou { erro }.
  //  • 1.ª vez: lista inteira só com texto + URL da foto.  • Depois: só o que mudou desde o cursor.
  //  • Fotos antigas em base64 (ainda por migrar): descarregadas UMA vez e guardadas com a lista.
  function sincronizarProdutos(o) {
    var c = cliente(); if (!c || !o || !o.lojaId) return Promise.resolve(null);
    return colunasLeves().then(function (ok) {
      if (!ok) return null;
      var COLS = o.cols + ',imagem_url,tem_b64,atualizado_em';
      var base = (o.base || []).filter(function (x) { return x && x.id; });
      var velhos = {}; base.forEach(function (x) { velhos[x.id] = x; });
      var cursor = ler(o.chave), cur = cursor;
      function avancar(t) { if (t && (!cur || new Date(t) > new Date(cur))) cur = t; }
      function conv(r) {
        var v = velhos[r.id], n = Object.assign({}, v || {}, r);
        n._b64 = !!r.tem_b64;
        n.imagem = r.imagem_url || (r.tem_b64 && v && ehBase64(v.imagem) ? v.imagem : null);
        delete n.imagem_url; delete n.tem_b64; avancar(r.atualizado_em); vindos.push(r.id);
        return n;
      }
      function ordenar(l) { if (o.ordem) { var k = o.ordem; l.sort(function (a, b) { var x = String(a[k] || ''), y = String(b[k] || ''); return x < y ? -1 : x > y ? 1 : 0; }); } return l; }
      // base64 antigo que falta (só os produtos que ainda não foram migrados), aos 20
      function fotosAntigas(lista) {
        if (o.semFotosAntigas) return Promise.resolve(lista);
        var faltam = lista.filter(function (x) { return x._b64 && !x.imagem; }).map(function (x) { return x.id; });
        if (!faltam.length) return Promise.resolve(lista);
        var porId = {}; lista.forEach(function (x) { porId[x.id] = x; });
        var cadeia = Promise.resolve();
        for (var i = 0; i < faltam.length; i += 20) (function (ids) {
          cadeia = cadeia.then(function () {
            return Promise.resolve(c.from('produtos').select('id,imagem').in('id', ids)).then(function (r) {
              ((r && r.data) || []).forEach(function (x) { if (porId[x.id] && x.imagem) porId[x.id].imagem = x.imagem; });
            }, function () {});
          });
        })(faltam.slice(i, i + 20));
        return cadeia.then(function () { return lista; });
      }
      var vindos = [];   // ids que vieram agora do servidor (o resto é a cópia do aparelho)
      function fim(lista, inc, nm, na) {
        return fotosAntigas(lista).then(function (l) { if (cur) guardar(o.chave, cur); return { lista: ordenar(l), incremental: inc, mudados: nm, apagados: na, vindos: vindos }; });
      }
      function completo() {
        var todos = [], pag = 0; cur = null; vindos = [];
        function pg() {
          return Promise.resolve(c.from('produtos').select(COLS).eq('loja_id', o.lojaId).order('criado_em', { ascending: true }).range(pag * 1000, pag * 1000 + 999)).then(function (r) {
            if (!r || r.error) return { erro: (r && r.error) || 'erro' };
            todos = todos.concat(r.data || []);
            if (!r.data || r.data.length < 1000 || ++pag > 50) return fim(todos.map(conv), false, todos.length, 0);
            return pg();
          });
        }
        return pg();
      }
      if (!cursor || !base.length || Date.now() - new Date(cursor).getTime() > 60 * 864e5) return completo();
      var desde = new Date(new Date(cursor).getTime() - 15000).toISOString();   // 15 s de margem (transações em curso)
      return Promise.all([
        Promise.resolve(c.from('produtos').select(COLS).eq('loja_id', o.lojaId).gte('atualizado_em', desde).order('atualizado_em', { ascending: true }).limit(1000)),
        Promise.resolve(c.from('produtos_apagados').select('id,apagado_em').eq('loja_id', o.lojaId).gte('apagado_em', desde)).then(null, function () { return { data: [] }; })
      ]).then(function (rr) {
        var r = rr[0], a = rr[1];
        if (!r || r.error) return { erro: (r && r.error) || 'erro' };
        if ((r.data || []).length >= 1000) return completo();
        var mapa = {}; base.forEach(function (x) { mapa[x.id] = x; });
        (r.data || []).forEach(function (x) { mapa[x.id] = conv(x); });
        var na = 0; ((a && !a.error && a.data) || []).forEach(function (x) { if (mapa[x.id]) { delete mapa[x.id]; na++; } avancar(x.apagado_em); });
        return fim(Object.keys(mapa).map(function (k) { return mapa[k]; }), true, (r.data || []).length, na);
      });
    });
  }
  // ---------- depósito de dados grandes no aparelho (Cache Storage: muito mais espaço do que o localStorage) ----------
  var DEP = 'spap-dados';
  function dadosGuardar(k, obj) {
    if (!('caches' in window)) return Promise.resolve(false);
    return caches.open(DEP).then(function (c) { return c.put('https://spap.local/' + encodeURIComponent(k), new Response(JSON.stringify(obj), { headers: { 'content-type': 'application/json' } })); }).then(function () { return true; }, function () { return false; });
  }
  function dadosLer(k) {
    if (!('caches' in window)) return Promise.resolve(null);
    return caches.open(DEP).then(function (c) { return c.match('https://spap.local/' + encodeURIComponent(k)); }).then(function (r) { return r ? r.json() : null; }).then(null, function () { return null; });
  }
  function dadosApagar(k) { if (!('caches' in window)) return Promise.resolve(); return caches.open(DEP).then(function (c) { return c.delete('https://spap.local/' + encodeURIComponent(k)); }).then(null, function () {}); }
  function esquecerCursor(chave) { try { localStorage.removeItem(chave); } catch (e) {} }

  window.spapFotos = {
    BUCKET: BUCKET, ehBase64: ehBase64, ehUrl: ehUrl, comprimir: comprimir, enviar: enviar, paraUrl: paraUrl,
    colunasLeves: colunasLeves, esquecerEsquema: esquecerEsquema, sincronizarProdutos: sincronizarProdutos, esquecerCursor: esquecerCursor, dadosGuardar: dadosGuardar, dadosLer: dadosLer, dadosApagar: dadosApagar, migrar: migrar, migrarDepois: migrarDepois, precarregar: precarregar
  };
})();
