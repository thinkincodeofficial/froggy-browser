<p align="center">
  <img src="src/renderer/logo.svg" width="96" alt="Froggy logo" />
</p>

<h1 align="center">Froggy 🐸</h1>

<p align="center">A fast, customizable browser that takes the best parts of Chrome, Firefox, Zen and Brave.</p>

<p align="center">
  <a href="../../releases/latest/download/Froggy-Setup-x64.exe"><img src="https://img.shields.io/badge/Download-Windows-2ea44f?style=for-the-badge" alt="Download for Windows" /></a>
  <a href="../../releases/latest/download/Froggy-mac-universal.dmg"><img src="https://img.shields.io/badge/Download-macOS-2ea44f?style=for-the-badge" alt="Download for macOS" /></a>
  <a href="../../releases/latest/download/Froggy-linux-x86_64.AppImage"><img src="https://img.shields.io/badge/Download-Linux-2ea44f?style=for-the-badge" alt="Download for Linux" /></a>
</p>

<p align="center"><a href="../../releases">All releases</a> · <a href="#install">Install help</a></p>

---

## Features

- **Vertical tabs**: a Zen-style sidebar. Drag to reorder, middle-click to close, collapse to icons with `Ctrl+B`.
- **Split view**: two tabs side by side (`Ctrl+Shift+S`). Click into a pane to make it active.
- **Floating windows**: pop any tab into a small always-on-top window (`Ctrl+Shift+P`). Close it to dock the tab back.
- **Built-in ad and tracker blocking**: Brave-style, using Ghostery's engine. The shield shows how many were blocked on the current page.
- **Chrome extensions**: drop unpacked extensions into [`extensions/`](extensions/).
- **Themes**: pick an accent color. Your search engine (DuckDuckGo, Google, Bing or Brave Search) is also set in Settings.
- **Chromium engine**: the same rendering engine as Chrome, through Electron.

## Run it

Requires [Node.js](https://nodejs.org/) 20+.

```bash
npm install
npm start
```

> If `npm start` says Electron failed to install correctly, run `node node_modules/electron/install.js` once.

## Install

Each link downloads the latest version:

| System | Download | How to install |
|---|---|---|
| Windows 10/11 | [**Froggy-Setup-x64.exe**](../../releases/latest/download/Froggy-Setup-x64.exe) | Run it and follow the setup wizard. |
| macOS (Intel + Apple Silicon) | [**Froggy-mac-universal.dmg**](../../releases/latest/download/Froggy-mac-universal.dmg) | Open it and drag Froggy into Applications. |
| Linux (any distro) | [**Froggy-linux-x86_64.AppImage**](../../releases/latest/download/Froggy-linux-x86_64.AppImage) | `chmod +x Froggy-linux-x86_64.AppImage`, then run it. |
| Debian / Ubuntu | [**Froggy-linux-amd64.deb**](../../releases/latest/download/Froggy-linux-amd64.deb) | `sudo apt install ./Froggy-linux-amd64.deb` |

Looking for an older version? See [all releases](../../releases).

The installers aren't code-signed yet, so your system will warn you the first time:
- **Windows:** SmartScreen says "Windows protected your PC". Click **More info → Run anyway**.
- **macOS:** If it says Froggy "is damaged" or "can't be opened", run `xattr -cr /Applications/Froggy.app` once, or right-click Froggy and choose **Open**.

## Build the installers

```bash
npm run dist:win     # dist/Froggy-Setup-x64.exe
npm run dist:mac     # dist/Froggy-mac-universal.dmg                  (must run on a Mac)
npm run dist:linux   # dist/Froggy-linux-x86_64.AppImage + .deb       (must run on Linux)
```

Each system's installer has to be built on that system. The [GitHub Actions workflow](.github/workflows/build.yml) builds all three on GitHub's machines:
- **Actions → Build installers → Run workflow** builds them and attaches them to the run.
- Pushing a version tag (`git tag v0.1.0 && git push --tags`) also publishes them as a GitHub Release.

The app icon comes from `build/icon.png`. To regenerate it after editing `src/renderer/logo.svg`, run `npm run icon`.

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+T` | New tab |
| `Ctrl+W` | Close tab |
| `Ctrl+Tab` / `Ctrl+Shift+Tab` | Next / previous tab |
| `Ctrl+L` | Focus address bar |
| `Alt+←` / `Alt+→` | Back / forward |
| `Ctrl+R` / `F5` | Reload |
| `Ctrl+Shift+S` | Toggle split view |
| `Ctrl+Shift+P` | Pop out tab into a floating window |
| `Ctrl+B` | Toggle sidebar |
| `F12` | Developer tools |

## Project structure

```
code/
├── .github/workflows/   # Builds the Windows, macOS and Linux installers
├── build/icon.png       # App icon used by the installers
├── extensions/          # Unpacked Chrome extensions, loaded at startup
├── scripts/
│   ├── start.js         # Launcher used by `npm start`
│   └── make-icon.js     # Renders logo.svg to build/icon.png
└── src/
    ├── main/            # Electron main process
    │   ├── main.js      # App start-up, window, shortcuts, IPC
    │   ├── tabs.js      # Tabs, split view, floating windows, layout
    │   ├── adblock.js   # Ad & tracker blocking
    │   ├── extensions.js
    │   └── settings.js  # Saved to settings.json in the user data folder
    ├── preload/         # The bridge between the UI and the main process
    └── renderer/        # Browser UI (sidebar, toolbar, settings) + new tab page
```

Each tab is an Electron `WebContentsView` laid over the browser UI. The UI never touches web pages directly. It sends commands through the preload bridge, and the main process sends back the full browser state.

## Roadmap

- [ ] Bookmarks and history
- [ ] Command palette (`Ctrl+K`)
- [ ] Extension toolbar buttons and popups
- [ ] Install extensions straight from the Chrome Web Store
- [ ] Workspaces
- [ ] Tab sleeping to save memory
- [ ] Downloads manager
- [ ] Code signing (Windows certificate, Apple notarization)
- [ ] Auto-updates

## License

MIT
