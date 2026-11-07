# Extensions

Froggy loads every **unpacked** Chrome extension in this folder at startup. Each extension needs its own subfolder with a `manifest.json` inside.

```
extensions/
├── ublock-origin-lite/
│   └── manifest.json
└── dark-reader/
    └── manifest.json
```

The extensions in this folder ship inside the installers. If you've installed Froggy, add your own to the `extensions` folder in Froggy's user data directory instead:

- **Windows:** `%APPDATA%\Froggy\extensions`
- **macOS:** `~/Library/Application Support/Froggy/extensions`
- **Linux:** `~/.config/Froggy/extensions`

## Adding an extension

1. Download the extension as a `.zip`. Many extensions publish one on their GitHub releases page, for example [uBlock Origin Lite](https://github.com/uBlockOrigin/uBOL-home/releases) and [Dark Reader](https://github.com/darkreader/darkreader/releases).
2. Unzip it into a new folder here.
3. Restart Froggy. The terminal prints `[extensions] loaded <name>` for each extension it loaded.

## What works

Electron supports part of the Chrome extension API. Content scripts and most background logic work: Dark Reader, ad blockers and userscript managers all run. Toolbar buttons and popups aren't shown yet (see the roadmap in the main README).
