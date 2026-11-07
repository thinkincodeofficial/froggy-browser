const path = require('path');
const { pathToFileURL } = require('url');
const { WebContentsView, BaseWindow, screen } = require('electron');
const settings = require('./settings');

// Sizes of the browser chrome. Sent to the renderer in every state update so both sides agree.
const LAYOUT = { sidebarW: 248, sidebarCollapsedW: 64, toolbarH: 52, gap: 8, radius: 10 };
const FLOAT_SIZE = { width: 480, height: 300 };

const NEWTAB_BASE = pathToFileURL(path.join(__dirname, '..', 'renderer', 'newtab.html')).href;

function newTabUrl() {
  const engine = settings.SEARCH_ENGINES[settings.get().searchEngine];
  return `${NEWTAB_BASE}?engine=${encodeURIComponent(engine)}`;
}

// Turns address bar text into a URL: full URLs pass through, domains get https://, anything else is searched.
function resolveInput(input) {
  const text = input.trim();
  if (!text) return null;
  if (/^(https?|file|about|chrome|view-source):/i.test(text)) return text;
  if (!/\s/.test(text)) {
    if (/^(localhost|\d{1,3}(\.\d{1,3}){3})(:\d+)?([/?#].*)?$/i.test(text)) return `http://${text}`;
    if (/^([\w-]+\.)+[a-z]{2,}(:\d+)?([/?#].*)?$/i.test(text)) return `https://${text}`;
  }
  return settings.SEARCH_ENGINES[settings.get().searchEngine] + encodeURIComponent(text);
}

class TabManager {
  constructor(win) {
    this.win = win;
    this.tabs = new Map(); // webContents id -> tab
    this.order = [];
    this.activeId = null;
    this.prevActiveId = null;
    this.split = null; // [leftId, rightId] while split view is on
    this.emitTimer = null;
  }

  get active() {
    return this.tabs.get(this.activeId);
  }

  create(url = newTabUrl(), { activate = true } = {}) {
    const view = new WebContentsView({ webPreferences: { sandbox: true, contextIsolation: true } });
    view.setBorderRadius?.(LAYOUT.radius);
    view.setBackgroundColor('#ffffff');
    const wc = view.webContents;
    // `blocked` holds unique blocked URLs: some sites retry a blocked request thousands of times.
    const tab = { id: wc.id, view, favicon: null, blocked: new Set(), floating: null, attached: false, fullscreen: false };
    this.tabs.set(tab.id, tab);
    this.order.push(tab.id);

    const changed = () => this.emit();
    for (const event of ['did-start-loading', 'did-stop-loading', 'did-navigate', 'did-navigate-in-page']) {
      wc.on(event, changed);
    }
    wc.on('page-title-updated', (_e, title) => {
      tab.floating?.setTitle(title);
      changed();
    });
    wc.on('page-favicon-updated', (_e, favicons) => {
      tab.favicon = favicons[0] ?? null;
      changed();
    });
    wc.on('did-start-navigation', (details) => {
      if (details.isMainFrame && !details.isSameDocument) {
        tab.blocked.clear();
        tab.favicon = null;
      }
    });
    // In split view, clicking into a pane makes it the active tab (the one the address bar shows).
    wc.on('focus', () => {
      if (this.split?.includes(tab.id) && this.activeId !== tab.id) {
        this.prevActiveId = this.activeId;
        this.activeId = tab.id;
        changed();
      }
    });
    wc.on('enter-html-full-screen', () => this.setFullscreen(tab, true));
    wc.on('leave-html-full-screen', () => this.setFullscreen(tab, false));
    wc.setWindowOpenHandler(({ url: target }) => {
      this.create(target);
      return { action: 'deny' };
    });

    wc.loadURL(url).catch(() => {});
    if (activate) this.activate(tab.id);
    else this.emit();
    return tab;
  }

  activate(id) {
    const tab = this.tabs.get(id);
    if (!tab) return;
    if (tab.floating) {
      tab.floating.focus();
      return;
    }
    // Picking a tab outside the split replaces whichever pane is active.
    if (this.split && !this.split.includes(id)) {
      this.split[Math.max(0, this.split.indexOf(this.activeId))] = id;
    }
    if (id !== this.activeId) {
      this.prevActiveId = this.activeId;
      this.activeId = id;
    }
    this.layout();
    tab.view.webContents.focus();
    this.emit();
  }

  close(id) {
    const tab = this.tabs.get(id);
    if (!tab) return;
    const index = this.order.indexOf(id);
    this.tabs.delete(id);
    this.order.splice(index, 1);

    if (tab.floating) {
      tab.floating.removeAllListeners('closed');
      tab.floating.close();
    }
    if (tab.attached) this.win.contentView.removeChildView(tab.view);
    tab.view.webContents.close();

    let fallback = null;
    if (this.split?.includes(id)) {
      fallback = this.split.find((other) => other !== id);
      this.split = null;
    }
    if (this.activeId === id) this.activeId = fallback ?? this.pickDocked(index);
    if (this.activeId == null) {
      this.create();
      return;
    }
    this.layout();
    this.emit();
  }

  // The docked (not floating) tab at or after `near` in the tab order, else the last docked tab.
  pickDocked(near = 0) {
    const docked = this.order.filter((id) => !this.tabs.get(id).floating);
    return docked.find((id) => this.order.indexOf(id) >= near) ?? docked[docked.length - 1] ?? null;
  }

  move(id, toIndex) {
    const from = this.order.indexOf(id);
    if (from === -1) return;
    this.order.splice(from, 1);
    this.order.splice(Math.max(0, Math.min(toIndex, this.order.length)), 0, id);
    this.emit();
  }

  cycle(step) {
    const docked = this.order.filter((id) => !this.tabs.get(id).floating);
    if (docked.length < 2) return;
    const i = docked.indexOf(this.activeId);
    this.activate(docked[(i + step + docked.length) % docked.length]);
  }

  toggleSplit() {
    if (this.split) {
      this.split = null;
    } else {
      const isDocked = (id) => id !== this.activeId && this.tabs.has(id) && !this.tabs.get(id).floating;
      let partner = isDocked(this.prevActiveId) ? this.prevActiveId : [...this.order].reverse().find(isDocked);
      if (partner == null) partner = this.create(undefined, { activate: false }).id;
      this.split = [this.activeId, partner];
    }
    this.layout();
    this.emit();
  }

  // Moves a tab into its own small always-on-top window. Closing that window docks the tab back.
  popOut(id = this.activeId) {
    const tab = this.tabs.get(id);
    if (!tab || tab.floating) return;
    if (this.split?.includes(id)) {
      const other = this.split.find((t) => t !== id);
      this.split = null;
      if (this.activeId === id) this.activeId = other;
    }
    if (tab.attached) {
      this.win.contentView.removeChildView(tab.view);
      tab.attached = false;
    }

    const { workArea } = screen.getDisplayMatching(this.win.getBounds());
    const float = new BaseWindow({
      ...FLOAT_SIZE,
      x: workArea.x + workArea.width - FLOAT_SIZE.width - 24,
      y: workArea.y + workArea.height - FLOAT_SIZE.height - 24,
      minWidth: 240,
      minHeight: 140,
      title: tab.view.webContents.getTitle(),
      backgroundColor: '#0d1110',
      autoHideMenuBar: true,
    });
    float.setAlwaysOnTop(true, 'floating');
    float.removeMenu?.();
    tab.view.setBorderRadius?.(0);
    float.contentView.addChildView(tab.view);

    const fit = () => {
      const { width, height } = float.getContentBounds();
      tab.view.setBounds({ x: 0, y: 0, width, height });
    };
    fit();
    for (const event of ['resize', 'maximize', 'unmaximize', 'enter-full-screen', 'leave-full-screen']) float.on(event, fit);
    float.on('close', () => float.contentView.removeChildView(tab.view));
    float.on('closed', () => {
      tab.floating = null;
      if (this.win.isDestroyed() || !this.tabs.has(id)) return;
      tab.view.setBorderRadius?.(LAYOUT.radius);
      this.activate(id);
    });
    tab.floating = float;

    if (this.activeId === id) this.activeId = this.pickDocked(this.order.indexOf(id));
    if (this.activeId == null) {
      this.create();
      return;
    }
    this.layout();
    this.emit();
  }

  dock(id) {
    this.tabs.get(id)?.floating?.close();
  }

  setFullscreen(tab, on) {
    tab.fullscreen = on;
    tab.view.setBorderRadius?.(on || tab.floating ? 0 : LAYOUT.radius);
    (tab.floating ?? this.win).setFullScreen(on);
    this.layout();
  }

  // Closes floating windows without docking them back (used when the main window closes).
  closeFloating() {
    for (const tab of this.tabs.values()) {
      if (!tab.floating) continue;
      tab.floating.removeAllListeners('closed');
      tab.floating.close();
    }
  }

  navigate(input) {
    const url = resolveInput(input);
    const wc = this.active?.view.webContents;
    if (!url || !wc) return;
    wc.loadURL(url).catch(() => {});
    wc.focus();
  }

  navAction(action) {
    const wc = this.active?.view.webContents;
    if (!wc) return;
    const history = wc.navigationHistory ?? wc;
    switch (action) {
      case 'back':
        if (history.canGoBack()) history.goBack();
        break;
      case 'forward':
        if (history.canGoForward()) history.goForward();
        break;
      case 'reload':
        wc.reload();
        break;
      case 'stop':
        wc.stop();
        break;
      case 'home':
        wc.loadURL(newTabUrl()).catch(() => {});
        break;
      case 'devtools':
        wc.toggleDevTools();
        break;
    }
  }

  onBlocked(webContentsId, url) {
    const tab = this.tabs.get(webContentsId);
    if (!tab || tab.blocked.has(url)) return;
    tab.blocked.add(url);
    this.emit();
  }

  sidebarWidth() {
    return settings.get().sidebarCollapsed ? LAYOUT.sidebarCollapsedW : LAYOUT.sidebarW;
  }

  // Attaches the visible tab views to the main window and sizes them to the content area.
  layout() {
    if (this.win.isDestroyed()) return;
    const { width, height } = this.win.getContentBounds();
    const { toolbarH, gap } = LAYOUT;
    const x = this.sidebarWidth();
    const area = { x, y: toolbarH, width: Math.max(0, width - x - gap), height: Math.max(0, height - toolbarH - gap) };
    const visible = this.split ?? [this.activeId];

    for (const tab of this.tabs.values()) {
      if (tab.floating) continue;
      const pane = visible.indexOf(tab.id);
      if (pane === -1) {
        if (tab.attached) {
          this.win.contentView.removeChildView(tab.view);
          tab.attached = false;
        }
        continue;
      }
      // Re-adding a view moves it to the top, which a fullscreen tab needs.
      if (!tab.attached || tab.fullscreen) {
        this.win.contentView.addChildView(tab.view);
        tab.attached = true;
      }
      let bounds = area;
      if (tab.fullscreen) {
        bounds = { x: 0, y: 0, width, height };
      } else if (this.split) {
        const half = Math.floor((area.width - gap) / 2);
        bounds = { ...area, x: area.x + pane * (half + gap), width: half };
      }
      tab.view.setBounds(bounds);
    }
  }

  describe(tab) {
    const wc = tab.view.webContents;
    const history = wc.navigationHistory ?? wc;
    const url = wc.getURL();
    const isNewTab = !url || url.startsWith(NEWTAB_BASE);
    return {
      id: tab.id,
      title: isNewTab ? 'New Tab' : wc.getTitle() || url,
      url: isNewTab ? '' : url,
      favicon: tab.favicon,
      loading: wc.isLoading(),
      canGoBack: history.canGoBack(),
      canGoForward: history.canGoForward(),
      floating: !!tab.floating,
      blocked: tab.blocked.size,
    };
  }

  state() {
    return {
      layout: { sidebarW: this.sidebarWidth(), toolbarH: LAYOUT.toolbarH, gap: LAYOUT.gap },
      settings: settings.get(),
      activeId: this.activeId,
      split: this.split,
      tabs: this.order.map((id) => this.describe(this.tabs.get(id))),
    };
  }

  // Sends the full state to the browser UI, batched so bursts of events cause one update.
  emit() {
    if (this.emitTimer) return;
    this.emitTimer = setTimeout(() => {
      this.emitTimer = null;
      if (!this.win.isDestroyed()) this.win.webContents.send('state', this.state());
    }, 16);
  }
}

module.exports = { TabManager, LAYOUT };
