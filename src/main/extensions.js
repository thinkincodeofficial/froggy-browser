const fs = require('fs');
const path = require('path');
const { app } = require('electron');

// Bundled extensions (code/extensions/, copied next to the app when packaged), plus a folder in
// the user data directory so people with an installed copy can add their own.
function extensionDirs() {
  const bundled = app.isPackaged
    ? path.join(process.resourcesPath, 'extensions')
    : path.join(__dirname, '..', '..', 'extensions');
  return [bundled, path.join(app.getPath('userData'), 'extensions')];
}

// Loads every unpacked Chrome extension (a folder with a manifest.json) from the extension folders.
async function loadExtensions(session) {
  // Electron 36+ moved the extension API to session.extensions.
  const api = session.extensions ?? session;
  const loaded = [];

  for (const root of extensionDirs()) {
    if (!fs.existsSync(root)) continue;
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      const dir = path.join(root, entry.name);
      if (!entry.isDirectory() || !fs.existsSync(path.join(dir, 'manifest.json'))) continue;
      try {
        const ext = await api.loadExtension(dir, { allowFileAccess: true });
        console.log(`[extensions] loaded ${ext.name} ${ext.version}`);
        loaded.push(ext);
      } catch (err) {
        console.warn(`[extensions] failed to load ${entry.name}: ${err.message}`);
      }
    }
  }
  return loaded;
}

module.exports = { loadExtensions };
