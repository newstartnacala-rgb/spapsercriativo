// SPAP Sercriativo para Windows (computador)
// Abre o sistema SPAP (Loja, Monitor, Banca e Vendas, Monitor e Banca) numa janela própria,
// funciona sem internet (como no telemóvel) e actualiza-se sozinho.
'use strict';
const { app, BrowserWindow, Menu, shell, session, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let autoUpdater = null;
try { autoUpdater = require('electron-updater').autoUpdater; } catch (e) { autoUpdater = null; }

// Endereços do sistema (o primeiro é o principal; os outros são reserva, iguais aos das apps Android)
const BASES = [
  'https://newstartnacala-rgb.github.io/spapsercriativo',
  'https://spapsercriativo2950.vercel.app',
  'https://spapsercriativo-spapcercruativoteam.vercel.app'
];
const APPS = {
  loja:         { nome: 'Loja',            pagina: '/login.html' },
  monitor:      { nome: 'Monitor',         pagina: '/monitor.html' },
  banca:        { nome: 'Banca e Vendas',  pagina: '/mobile.html' },
  bancamonitor: { nome: 'Monitor e Banca', pagina: '/mobile-monitor.html' }
};
const ICONE = path.join(__dirname, 'paginas', 'app.png');

// ---------- definições guardadas (que app abrir) ----------
const FICH_CONF = () => path.join(app.getPath('userData'), 'spap-pc.json');
function lerConf() { try { return JSON.parse(fs.readFileSync(FICH_CONF(), 'utf8')) || {}; } catch (e) { return {}; } }
function gravarConf(c) { try { fs.writeFileSync(FICH_CONF(), JSON.stringify(c)); } catch (e) {} }
let conf = {};

let win = null;
let baseIdx = 0;

function ehProprio(url) {
  try {
    const u = new URL(url);
    return BASES.some(b => { const x = new URL(b); return u.host === x.host && (x.pathname === '/' || u.pathname.indexOf(x.pathname) === 0); });
  } catch (e) { return false; }
}
function abrirFora(url) {
  if (/^(https?:|mailto:|tel:|whatsapp:|intent:)/i.test(url || '')) {
    shell.openExternal(String(url).replace(/^intent:/i, 'https:')).catch(() => {});
  }
}
function urlDaApp(tipo) { return BASES[baseIdx] + (APPS[tipo] || APPS.loja).pagina; }

function abrirEscolha() {
  if (!win) return;
  win.setTitle('SPAP Sercriativo');
  win.loadFile(path.join(__dirname, 'paginas', 'escolher.html'));
}
function abrirApp(tipo) {
  if (!APPS[tipo]) return abrirEscolha();
  conf.app = tipo; gravarConf(conf);
  baseIdx = 0;
  win.setTitle('SPAP Sercriativo — ' + APPS[tipo].nome);
  win.loadURL(urlDaApp(tipo));
  montarMenu();
}
function semLigacao() {
  win.loadFile(path.join(__dirname, 'paginas', 'offline.html'), { query: { app: conf.app || '' } });
}

// ---------- janela ----------
function criarJanela() {
  win = new BrowserWindow({
    width: 1366, height: 800, minWidth: 960, minHeight: 600,
    show: false, backgroundColor: '#15151d', icon: ICONE, autoHideMenuBar: true,
    title: 'SPAP Sercriativo',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, spellcheck: false }
  });
  win.once('ready-to-show', () => { win.maximize(); win.show(); });

  const wc = win.webContents;
  // As páginas reconhecem a app pela assinatura «SPAPApp/…» (entra só com o código do balconista, guarda a conta, etc.)
  const ua = wc.getUserAgent().replace(/\s?Electron\/[\d.]+/i, '').replace(/\s?spap-sercriativo-pc\/[\d.]+/i, '');
  wc.setUserAgent(ua + ' SPAPApp/pc/' + app.getVersion() + ' SPAPDesktop');

  // Links de fora (WhatsApp, e-mail, outros sites) abrem no navegador do computador
  wc.on('will-navigate', (e, url) => {
    if (url.indexOf('file:') === 0 || ehProprio(url)) return;
    e.preventDefault(); abrirFora(url);
  });
  wc.setWindowOpenHandler(({ url }) => {
    if (!url || /^about:blank/i.test(url) || ehProprio(url)) {      // janelas em branco: recibos/relatórios para imprimir
      return { action: 'allow', overrideBrowserWindowOptions: { autoHideMenuBar: true, icon: ICONE, width: 980, height: 760, backgroundColor: '#ffffff' } };
    }
    abrirFora(url); return { action: 'deny' };
  });
  // Sem internet e sem cópia guardada: tenta o endereço de reserva; se nada responder, mostra o ecrã «sem ligação»
  wc.on('did-fail-load', (e, codigo, desc, url, principal) => {
    if (!principal || codigo === -3) return;            // -3 = carregamento cancelado (normal)
    if (url && url.indexOf('file:') === 0) return;
    if (baseIdx < BASES.length - 1) { baseIdx++; win.loadURL(urlDaApp(conf.app)); }
    else semLigacao();
  });
  wc.on('context-menu', (e, p) => menuDoRato(p));

  if (conf.app && APPS[conf.app]) abrirApp(conf.app); else abrirEscolha();
  win.on('closed', () => { win = null; });
}

// ---------- menus ----------
function itensApp() {
  return Object.keys(APPS).map(k => ({ label: APPS[k].nome, type: 'radio', checked: conf.app === k, click: () => abrirApp(k) }));
}
function montarMenu() {
  const m = Menu.buildFromTemplate([
    { label: 'SPAP', submenu: [
      { label: 'Abrir', submenu: itensApp() },
      { label: 'Escolher a app…', accelerator: 'CmdOrCtrl+Shift+A', click: abrirEscolha },
      { type: 'separator' },
      { label: 'Imprimir', accelerator: 'CmdOrCtrl+P', click: () => win && win.webContents.print() },
      { type: 'separator' },
      { label: 'Procurar actualizações', click: () => procurarAtualizacoes(true) },
      { label: 'Sobre', click: sobre },
      { type: 'separator' },
      { label: 'Sair', role: 'quit' }
    ] },
    { label: 'Ver', submenu: [
      { label: 'Recarregar', accelerator: 'F5', click: () => win && win.webContents.reload() },
      { label: 'Recarregar (forçar)', accelerator: 'CmdOrCtrl+F5', click: () => win && win.webContents.reloadIgnoringCache() },
      { type: 'separator' },
      { label: 'Aumentar', role: 'zoomIn', accelerator: 'CmdOrCtrl+=' },
      { label: 'Diminuir', role: 'zoomOut' },
      { label: 'Tamanho normal', role: 'resetZoom' },
      { type: 'separator' },
      { label: 'Ecrã inteiro', role: 'togglefullscreen', accelerator: 'F11' },
      { label: 'Ferramentas (suporte técnico)', role: 'toggleDevTools', accelerator: 'CmdOrCtrl+Shift+I' }
    ] }
  ]);
  Menu.setApplicationMenu(m);
}
function menuDoRato(p) {
  const t = [];
  if (p.isEditable) t.push({ label: 'Cortar', role: 'cut' }, { label: 'Copiar', role: 'copy' }, { label: 'Colar', role: 'paste' }, { type: 'separator' });
  else if (p.selectionText) t.push({ label: 'Copiar', role: 'copy' }, { type: 'separator' });
  t.push(
    { label: 'Abrir', submenu: itensApp() },
    { label: 'Recarregar', click: () => win.webContents.reload() },
    { label: 'Ecrã inteiro', click: () => win.setFullScreen(!win.isFullScreen()) },
    { type: 'separator' },
    { label: 'Procurar actualizações', click: () => procurarAtualizacoes(true) },
    { label: 'Sobre o SPAP Sercriativo', click: sobre }
  );
  Menu.buildFromTemplate(t).popup({ window: win });
}
function sobre() {
  dialog.showMessageBox(win, {
    type: 'info', title: 'SPAP Sercriativo', icon: ICONE, buttons: ['OK'],
    message: 'SPAP Sercriativo para Windows',
    detail: 'Versão da app: ' + app.getVersion() + '\nSSTEAM — Tecnologia varejista de ponta\n\nO sistema actualiza-se sozinho: as páginas vêm sempre na versão mais recente e a app instala as novas versões quando forem publicadas.\n\nSuporte: +258 86 166 7843'
  });
}

// ---------- actualização automática da app ----------
let manual = false, pronta = false;
function procurarAtualizacoes(peloUtilizador) {
  if (!autoUpdater || !app.isPackaged) {
    if (peloUtilizador) dialog.showMessageBox(win, { type: 'info', title: 'Actualizações', message: 'As actualizações automáticas funcionam na app instalada.' });
    return;
  }
  if (pronta) return avisarPronta();
  manual = !!peloUtilizador;
  autoUpdater.checkForUpdates().catch(err => {
    if (manual) dialog.showMessageBox(win, { type: 'warning', title: 'Actualizações', message: 'Não foi possível procurar actualizações agora.', detail: 'Verifique a internet e tente mais tarde.' });
    manual = false;
  });
}
let ultimaVersao = '';
function avisarPronta() {
  dialog.showMessageBox(win, {
    type: 'info', title: 'Actualização pronta', icon: ICONE,
    buttons: ['Reiniciar e actualizar', 'Mais tarde'], defaultId: 0, cancelId: 1,
    message: 'Há uma versão nova do SPAP Sercriativo' + (ultimaVersao ? ' (' + ultimaVersao + ')' : '') + '.',
    detail: 'As vendas por enviar ficam guardadas. Se escolher «Mais tarde», a actualização instala-se sozinha quando fechar a app.'
  }).then(r => { if (r.response === 0) setImmediate(() => autoUpdater.quitAndInstall(true, true)); });
}
function iniciarAtualizacoes() {
  if (!autoUpdater || !app.isPackaged) return;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('update-available', info => {
    if (manual) dialog.showMessageBox(win, { type: 'info', title: 'Actualizações', message: 'Há uma versão nova (' + info.version + '). Está a ser baixada…', detail: 'Avisamos quando estiver pronta.' });
  });
  autoUpdater.on('update-not-available', () => {
    if (manual) dialog.showMessageBox(win, { type: 'info', title: 'Actualizações', message: 'Já tem a versão mais recente (' + app.getVersion() + ').' });
    manual = false;
  });
  autoUpdater.on('update-downloaded', info => { pronta = true; ultimaVersao = info && info.version || ''; manual = false; avisarPronta(); });
  autoUpdater.on('error', () => { manual = false; });
  setTimeout(() => procurarAtualizacoes(false), 10000);          // pouco depois de abrir
  setInterval(() => procurarAtualizacoes(false), 3 * 3600 * 1000); // e de 3 em 3 horas
}

// ---------- ligação com as páginas locais (escolher a app / sem ligação) ----------
ipcMain.on('spap-escolher', (e, tipo) => abrirApp(tipo));
ipcMain.on('spap-tentar', () => { if (conf.app) abrirApp(conf.app); else abrirEscolha(); });
ipcMain.on('spap-trocar', () => abrirEscolha());
ipcMain.handle('spap-info', () => ({ versao: app.getVersion(), app: conf.app || '', apps: APPS }));

// ---------- arranque ----------
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
  app.setAppUserModelId('com.spapsercriativo.pc');
  app.whenReady().then(() => {
    conf = lerConf();
    // câmara (leitor de códigos), notificações e área de transferência: permitidas só para o próprio sistema
    session.defaultSession.setPermissionRequestHandler((wc, perm, cb, det) => {
      const ok = ['media', 'notifications', 'clipboard-read', 'clipboard-sanitized-write', 'fullscreen'].indexOf(perm) >= 0;
      const url = (det && det.requestingUrl) || (wc && wc.getURL()) || '';
      cb(ok && (ehProprio(url) || url.indexOf('file:') === 0));
    });
    montarMenu();
    criarJanela();
    iniciarAtualizacoes();
  });
  app.on('window-all-closed', () => app.quit());
}
