const path = require('path');
const { app, BrowserWindow, Menu, ipcMain, session } = require('electron');
const settings = require('./settings');
const adblock = require('./adblock');
const { loadExtensions } = require('./extensions');
const { TabManager, LAYOUT } = require('./tabs');

const BG = '#0d1110';

let win = null;
let tabs = null;

function focusAddressBar() {
  win.webContents.focus();
  win.webContents.send('focus-address');
}

function newTab() {
  tabs.create();
  focusAddressBar();
}

function updateSettings(patch) {
  const changed = settings.update(patch);
  if ('adblock' in changed) adblock.setEnabled(session.defaultSession, changed.adblock);
  tabs.layout();
  tabs.emit();
}

function buildMenu() {
  // The menu bar stays hidden; it exists so these shortcuts work wherever focus is.
  const item = (label, accelerator, click) => ({ label, accelerator, click });
  return Menu.buildFromTemplate([
    {
      label: 'Froggy',
      submenu: [
        item('New Tab', 'CmdOrCtrl+T', newTab),
        item('Close Tab', 'CmdOrCtrl+W', () => tabs.close(tabs.activeId)),
        item('Next Tab', 'Ctrl+Tab', () => tabs.cycle(1)),
        item('Previous Tab', 'Ctrl+Shift+Tab', () => tabs.cycle(-1)),
        { type: 'separator' },
        item('Focus Address Bar', 'CmdOrCtrl+L', focusAddressBar),
        item('Back', 'Alt+Left', () => tabs.navAction('back')),
        item('Forward', 'Alt+Right', () => tabs.navAction('forward')),
        item('Reload', 'CmdOrCtrl+R', () => tabs.navAction('reload')),
        item('Reload', 'F5', () => tabs.navAction('reload')),
        { type: 'separator' },
        item('Toggle Split View', 'CmdOrCtrl+Shift+S', () => tabs.toggleSplit()),
        item('Pop Out Tab', 'CmdOrCtrl+Shift+P', () => tabs.popOut()),
        item('Toggle Sidebar', 'CmdOrCtrl+B', () => updateSettings({ sidebarCollapsed: !settings.get().sidebarCollapsed })),
        item('Developer Tools', 'F12', () => tabs.navAction('devtools')),
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    { role: 'editMenu' },
  ]);
}

// Only the browser UI may send these; web pages never get the preload.
function handle(channel, handler) {
  ipcMain.on(channel, (event, ...args) => {
    if (event.sender === win?.webContents) handler(...args);
  });
}

function registerIpc() {
  handle('tab:new', newTab);
  handle('tab:close', (id) => tabs.close(id));
  handle('tab:activate', (id) => tabs.activate(id));
  handle('tab:move', (id, index) => tabs.move(id, index));
  handle('tab:popout', (id) => tabs.popOut(id ?? tabs.activeId));
  handle('tab:dock', (id) => tabs.dock(id));
  handle('tab:navigate', (input) => tabs.navigate(String(input)));
  handle('tab:nav', (action) => tabs.navAction(action));
  handle('view:split', () => tabs.toggleSplit());
  handle('settings:update', updateSettings);
}

function createWindow() {
  win = new BrowserWindow({
    width: 1320,
    height: 840,
    minWidth: 760,
    minHeight: 480,
    title: 'Froggy',
    backgroundColor: BG,
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: BG, symbolColor: '#cfe8d6', height: LAYOUT.toolbarH },
    trafficLightPosition: { x: 18, y: 18 },
    webPreferences: { preload: path.join(__dirname, '..', 'preload', 'preload.js') },
  });

  tabs = new TabManager(win);
  win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  win.webContents.on('did-finish-load', () => tabs.emit());
  for (const event of ['resize', 'maximize', 'unmaximize', 'enter-full-screen', 'leave-full-screen']) {
    win.on(event, () => tabs.layout());
  }
  win.on('close', () => tabs.closeFloating());

  // URLs passed on the command line open as tabs: `Froggy.exe https://example.com`, or for several,
  // `Froggy.exe -- <url> <url>` (Electron refuses to start when a URL is followed by other arguments).
  const startUrls = process.argv.slice(1).filter((arg) => /^https?:\/\//i.test(arg));
  if (startUrls.length) startUrls.forEach((url, i) => tabs.create(url, { activate: i === 0 }));
  else tabs.create();
}

app.whenReady().then(async () => {
  const ses = session.defaultSession;
  // Some sites (e.g. Google sign-in) refuse user agents that mention Electron.
  ses.setUserAgent(ses.getUserAgent().replace(/\s(Electron|froggy)\/\S+/gi, ''));

  Menu.setApplicationMenu(buildMenu());
  registerIpc();
  await loadExtensions(ses);
  createWindow();

  adblock
    .init(ses, { enabled: settings.get().adblock, onBlocked: (id, url) => tabs.onBlocked(id, url) })
    .catch((err) => console.warn(`[adblock] disabled: ${err.message}`));
});

app.on('window-all-closed', () => app.quit());
