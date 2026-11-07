const { app } = require('electron');
const fs = require('fs');
const path = require('path');

const SEARCH_ENGINES = {
  duckduckgo: 'https://duckduckgo.com/?q=',
  google: 'https://www.google.com/search?q=',
  bing: 'https://www.bing.com/search?q=',
  brave: 'https://search.brave.com/search?q=',
};

const DEFAULTS = {
  searchEngine: 'duckduckgo',
  accent: '#4ade80',
  adblock: true,
  sidebarCollapsed: false,
};

// Each key the renderer may change, with a check for its value.
const VALIDATORS = {
  searchEngine: (v) => v in SEARCH_ENGINES,
  accent: (v) => /^#[0-9a-f]{6}$/i.test(v),
  adblock: (v) => typeof v === 'boolean',
  sidebarCollapsed: (v) => typeof v === 'boolean',
};

let settings = null;
const file = () => path.join(app.getPath('userData'), 'settings.json');

function get() {
  if (!settings) {
    try {
      settings = { ...DEFAULTS, ...JSON.parse(fs.readFileSync(file(), 'utf8')) };
    } catch {
      settings = { ...DEFAULTS };
    }
  }
  return settings;
}

// Applies the valid keys of `patch`, saves, and returns only what changed.
function update(patch = {}) {
  const changed = {};
  for (const [key, value] of Object.entries(patch)) {
    if (VALIDATORS[key]?.(value) && get()[key] !== value) changed[key] = value;
  }
  if (Object.keys(changed).length) {
    settings = { ...get(), ...changed };
    fs.writeFileSync(file(), JSON.stringify(settings, null, 2));
  }
  return changed;
}

module.exports = { get, update, SEARCH_ENGINES };
