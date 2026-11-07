// Renders src/renderer/logo.svg to build/icon.png (1024×1024). electron-builder turns that one PNG
// into the Windows .ico, macOS .icns and Linux icons. Run `npm run icon` after changing the logo.
const fs = require('fs');
const path = require('path');

const SIZE = 1024;
const SVG = path.join(__dirname, '..', 'src', 'renderer', 'logo.svg');
const OUT = path.join(__dirname, '..', 'build', 'icon.png');

if (!process.versions.electron) {
  // Started with plain Node: re-run this file inside Electron, which can render SVG.
  const { spawn } = require('child_process');
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  spawn(require('electron'), [__filename], { env, stdio: 'inherit' }).on('exit', (code) => process.exit(code ?? 0));
} else {
  const { app, BrowserWindow } = require('electron');
  app.whenReady().then(async () => {
    // Draw the SVG onto a canvas of the exact icon size (a window would be limited by the screen size).
    const win = new BrowserWindow({ show: false });
    await win.loadURL('data:text/html,<!doctype html><title>icon</title>');
    const svg = `data:image/svg+xml;base64,${fs.readFileSync(SVG).toString('base64')}`;
    const png = await win.webContents.executeJavaScript(`new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = ${SIZE};
        canvas.getContext('2d').drawImage(img, 0, 0, ${SIZE}, ${SIZE});
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = ${JSON.stringify(svg)};
    })`);
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, Buffer.from(png.split(',')[1], 'base64'));
    console.log(`Wrote ${path.relative(process.cwd(), OUT)}`);
    app.quit();
  });
}
