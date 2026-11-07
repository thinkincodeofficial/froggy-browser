const ICONS = {
  back: '<path d="m15 18-6-6 6-6"/>',
  forward: '<path d="m9 18 6-6-6-6"/>',
  reload: '<path d="M21 12a9 9 0 1 1-2.6-6.4L21 8"/><path d="M21 3v5h-5"/>',
  stop: '<path d="M18 6 6 18M6 6l12 12"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  close: '<path d="M18 6 6 18M6 6l12 12"/>',
  split: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 4v16"/>',
  float: '<rect x="3" y="4" width="18" height="16" rx="2"/><rect x="12" y="11" width="7" height="6" rx="1"/>',
  dock: '<path d="m14 10 7-7"/><path d="M20 10h-6V4"/><path d="m3 21 7-7"/><path d="M4 14h6v6"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  settings: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  sidebar: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/>',
};

const ACCENTS = ['#4ade80', '#38bdf8', '#a78bfa', '#f472b6', '#fb923c', '#facc15'];

const $ = (id) => document.getElementById(id);
const els = {
  tabList: $('tab-list'),
  tabsPanel: $('tabs-panel'),
  settingsPanel: $('settings-panel'),
  address: $('address'),
  back: $('back'),
  forward: $('forward'),
  reload: $('reload'),
  shield: $('shield'),
  blocked: $('blocked-count'),
  split: $('split'),
  float: $('float'),
  swatches: $('swatches'),
  searchEngine: $('search-engine'),
  adblockToggle: $('adblock-toggle'),
};

let state = null;
let settingsOpen = false;
let draggingId = null;

function setIcon(el, name) {
  el.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;
}

function iconSpan(name) {
  const span = document.createElement('span');
  span.dataset.icon = name;
  setIcon(span, name);
  return span;
}

document.body.classList.add(froggy.platform);
document.querySelectorAll('[data-icon]').forEach((el) => setIcon(el, el.dataset.icon));

// ---------- Rendering ----------

function render() {
  const { layout, settings } = state;
  const root = document.documentElement.style;
  root.setProperty('--sidebar-w', `${layout.sidebarW}px`);
  root.setProperty('--toolbar-h', `${layout.toolbarH}px`);
  root.setProperty('--gap', `${layout.gap}px`);
  root.setProperty('--accent', settings.accent);
  document.body.classList.toggle('collapsed', settings.sidebarCollapsed);

  // Settings only fit in the full-width sidebar.
  const showSettings = settingsOpen && !settings.sidebarCollapsed;
  els.settingsPanel.hidden = !showSettings;
  els.tabsPanel.hidden = showSettings;
  $('settings-button').classList.toggle('on', showSettings);

  if (draggingId == null) renderTabs();
  renderToolbar();
  renderSettings();
}

function renderTabs() {
  els.tabList.replaceChildren(...state.tabs.map(tabItem));
}

function tabItem(tab, index) {
  const el = document.createElement('div');
  el.className = 'tab';
  el.classList.toggle('active', tab.id === state.activeId);
  el.classList.toggle('in-split', !!state.split?.includes(tab.id));
  el.classList.toggle('floating', tab.floating);
  el.title = tab.title;
  el.draggable = true;

  el.append(faviconFor(tab));

  const title = document.createElement('span');
  title.className = 'title';
  title.textContent = tab.title;
  el.append(title);

  if (tab.floating) {
    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = 'Floating';
    el.append(badge, tabAction('dock', 'Dock back', () => froggy.dock(tab.id)));
  }
  el.append(tabAction('close', 'Close tab', () => froggy.closeTab(tab.id)));

  el.addEventListener('click', () => froggy.activateTab(tab.id));
  el.addEventListener('auxclick', (e) => {
    if (e.button === 1) froggy.closeTab(tab.id);
  });

  el.addEventListener('dragstart', () => {
    draggingId = tab.id;
  });
  el.addEventListener('dragend', () => {
    draggingId = null;
    renderTabs();
  });
  el.addEventListener('dragover', (e) => {
    e.preventDefault();
    el.classList.add('drop-target');
  });
  el.addEventListener('dragleave', () => el.classList.remove('drop-target'));
  el.addEventListener('drop', (e) => {
    e.preventDefault();
    if (draggingId != null && draggingId !== tab.id) froggy.moveTab(draggingId, index);
  });
  return el;
}

function faviconFor(tab) {
  if (tab.loading) {
    const spinner = document.createElement('span');
    spinner.className = 'spinner';
    return spinner;
  }
  if (tab.favicon) {
    const img = document.createElement('img');
    img.className = 'favicon';
    img.src = tab.favicon;
    img.addEventListener('error', () => img.replaceWith(globeIcon()));
    return img;
  }
  return globeIcon();
}

function globeIcon() {
  const span = iconSpan('globe');
  span.classList.add('favicon');
  return span;
}

function tabAction(icon, title, onClick) {
  const button = document.createElement('button');
  button.className = 'tab-action';
  button.title = title;
  button.append(iconSpan(icon));
  button.addEventListener('click', (e) => {
    e.stopPropagation();
    onClick();
  });
  return button;
}

function renderToolbar() {
  const active = state.tabs.find((t) => t.id === state.activeId);
  if (!active) return;
  els.back.disabled = !active.canGoBack;
  els.forward.disabled = !active.canGoForward;

  const reloadIcon = active.loading ? 'stop' : 'reload';
  if (els.reload.dataset.mode !== reloadIcon) {
    els.reload.dataset.mode = reloadIcon;
    setIcon(els.reload.firstElementChild, reloadIcon);
    els.reload.title = active.loading ? 'Stop' : 'Reload (Ctrl+R)';
  }

  // Don't overwrite what the user is typing, unless they've switched to another tab.
  if (document.activeElement !== els.address || els.address.dataset.tab !== String(active.id)) {
    els.address.value = active.url;
    els.address.dataset.tab = active.id;
  }

  els.blocked.textContent = state.settings.adblock ? active.blocked : 'off';
  els.shield.classList.toggle('off', !state.settings.adblock);
  els.shield.title = state.settings.adblock
    ? `${active.blocked} ads & trackers blocked on this page. Click to turn off.`
    : 'Ad blocker is off. Click to turn on.';
  els.split.classList.toggle('on', !!state.split);
}

function renderSettings() {
  const { settings } = state;
  if (!els.swatches.childElementCount) {
    for (const color of ACCENTS) {
      const swatch = document.createElement('button');
      swatch.className = 'swatch';
      swatch.style.background = color;
      swatch.dataset.color = color;
      swatch.title = color;
      swatch.addEventListener('click', () => froggy.updateSettings({ accent: color }));
      els.swatches.append(swatch);
    }
  }
  for (const swatch of els.swatches.children) {
    swatch.classList.toggle('selected', swatch.dataset.color === settings.accent);
  }
  els.searchEngine.value = settings.searchEngine;
  els.adblockToggle.checked = settings.adblock;
}

// ---------- Events ----------

froggy.onState((next) => {
  state = next;
  render();
});

froggy.onFocusAddress(() => {
  els.address.focus();
  els.address.select();
});

$('new-tab').addEventListener('click', () => froggy.newTab());
els.back.addEventListener('click', () => froggy.nav('back'));
els.forward.addEventListener('click', () => froggy.nav('forward'));
els.reload.addEventListener('click', () => froggy.nav(els.reload.dataset.mode === 'stop' ? 'stop' : 'reload'));
els.split.addEventListener('click', () => froggy.toggleSplit());
els.float.addEventListener('click', () => froggy.popOut(state.activeId));
els.shield.addEventListener('click', () => froggy.updateSettings({ adblock: !state.settings.adblock }));

$('sidebar-toggle').addEventListener('click', () =>
  froggy.updateSettings({ sidebarCollapsed: !state.settings.sidebarCollapsed }),
);
$('settings-button').addEventListener('click', () => {
  if (state.settings.sidebarCollapsed) {
    settingsOpen = true;
    froggy.updateSettings({ sidebarCollapsed: false });
  } else {
    settingsOpen = !settingsOpen;
    render();
  }
});

els.searchEngine.addEventListener('change', () => froggy.updateSettings({ searchEngine: els.searchEngine.value }));
els.adblockToggle.addEventListener('change', () => froggy.updateSettings({ adblock: els.adblockToggle.checked }));

$('address-form').addEventListener('submit', (e) => {
  e.preventDefault();
  froggy.navigate(els.address.value);
  els.address.blur();
});
els.address.addEventListener('focus', () => els.address.select());
els.address.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const active = state.tabs.find((t) => t.id === state.activeId);
  els.address.value = active?.url ?? '';
  els.address.blur();
});
