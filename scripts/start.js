// Starts Froggy. Clears ELECTRON_RUN_AS_NODE, which some tools (e.g. VS Code) set and which
// would make Electron run as plain Node instead of opening the browser.
const path = require('path');
const { spawn } = require('child_process');
const electron = require('electron');

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

spawn(electron, ['.', ...process.argv.slice(2)], { cwd: path.join(__dirname, '..'), env, stdio: 'inherit' }).on(
  'exit',
  (code) => process.exit(code ?? 0),
);
