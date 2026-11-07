const { app } = require('electron');
const fs = require('fs/promises');
const path = require('path');
const { ElectronBlocker } = require('@ghostery/adblocker-electron');

let blocker = null;
let enabled = false;
let wanted = false;

// Downloads (then caches) the ads + trackers filter lists and starts blocking.
async function init(session, { enabled: on, onBlocked }) {
  wanted = on;
  blocker = await ElectronBlocker.fromPrebuiltAdsAndTracking(fetch, {
    path: path.join(app.getPath('userData'), 'adblock-engine.bin'),
    read: fs.readFile,
    write: fs.writeFile,
  });
  // request.tabId is the id of the webContents that made the request.
  blocker.on('request-blocked', (request) => onBlocked(request.tabId, request.url));
  setEnabled(session, wanted);
}

function setEnabled(session, on) {
  wanted = on;
  if (!blocker || on === enabled) return;
  if (on) blocker.enableBlockingInSession(session);
  else blocker.disableBlockingInSession(session);
  enabled = on;
}

module.exports = { init, setEnabled };
