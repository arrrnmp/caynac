# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Monorepo structure

This is a Bun workspace monorepo (GitHub repo: **caynac**) containing two CLI apps and one shared package:

```
apps/
  maniac/    — Full toolkit: Real-Debrid, compress, decompress, encrypt/decrypt
  caymann/   — Consumer toolkit: decrypt + decompress only
packages/
  shared/    — @caynac/shared: UI components, theme, utilities shared by both apps
```

## Commands

```bash
# From monorepo root
bun run dev:maniac     # Run maniac directly via Bun (no build step)
bun run dev:caymann    # Run caymann directly via Bun (no build step)
bun run build          # Compile both apps (tsc -b, builds shared first)

# From apps/maniac/ or apps/caymann/
bun run dev            # Run the app directly
bun run build          # tsc -b (also builds referenced packages/shared)
bun run start          # Run compiled output
```

There are no tests. TypeScript (`bun run build`) is the only type-check tool.

## Architecture

### apps/maniac

**maniac** is a terminal UI toolkit built with [Ink](https://github.com/vadimdemedes/ink) (React for the terminal). Four capabilities: Real-Debrid torrent downloading, 7-Zip compression/decompression, and Picocrypt file encryption.

`apps/maniac/src/cli.tsx` parses CLI arguments with Commander and mounts `<App />` via Ink's `render()`. Uses the alternate screen buffer so the TUI doesn't pollute scrollback.

`apps/maniac/src/App.tsx` owns all screen routing. Screen union: `'menu' | 'debrid' | 'compress' | 'decompress' | 'picocrypt' | 'onboarding'`. Transitions are animated via a "gravitation" effect (`buildGravitationRows`).

Commands: `debrid`, `compress`, `decompress` (from `@caynac/shared`), `picocrypt` (full encrypt+decrypt), `onboarding`.

Config: `~/.config/maniac/config.json`. Downloaded binaries land in `~/.config/maniac/bin/`.

### apps/caymann

**caymann** is a consumer CLI: decrypt .pcv files and decompress .7z archives. Uses `PicocryptDecryptCommand` and `DecompressCommand` from `@caynac/shared`.

Config: `~/.config/caymann/config.json`.

### packages/shared (`@caynac/shared`)

Shared code imported by both apps:

- `theme.ts` — canonical color palette (blood-red/fire brand, panel bg `#090D14`)
- `uiTheme.ts` — `@inkjs/ui` theme tokens
- `hooks/useMouse.ts` — SGR mouse event parsing
- `components/` — `StarfieldBackdrop`, `Spinner`, `ProgressBar`, `Badge`, `Divider`, `ErrorBox`, `PasswordInput`, `SelectList`
- `commands/decompress/` — `DecompressCommand` (accepts `sevenZipBin` prop)
- `commands/picocrypt-decrypt/` — `PicocryptDecryptCommand` (decrypt-only, accepts `picocryptBin` prop)
- `utils/compression.ts` — 7-Zip subprocess wrapper
- `utils/picocrypt.ts` — picocrypt-cli subprocess wrapper

The `"bun"` export condition in `packages/shared/package.json` points to `./src/index.ts` so `bun run dev` works without a build step. TypeScript project references (`composite: true`) ensure `tsc -b` builds shared before apps.

### Key technical notes

- **Shared command prop pattern**: Commands in `packages/shared` must accept binary paths as props (`sevenZipBin?: string`, `picocryptBin?: string`) — they cannot call `readConfig()` since each app has its own config module.
- **Build mode required**: Apps use `tsc -b` (not plain `tsc`) so TypeScript builds `packages/shared` first via project references. Plain `tsc` from an app dir will fail if shared isn't compiled.
- **Terminal cell aspect ratio**: Cells are ~2:1 tall-to-wide. Ellipses use `rx = r*2, ry = r` to appear circular. `StarfieldBackdrop` planets and comets rely on this.
- **Module system**: `"type": "module"` with `"moduleResolution": "NodeNext"` — all local imports must use `.js` extensions even in `.tsx` source files.
- **JSX**: `"jsxImportSource": "react"` with `"jsx": "react-jsx"` — no explicit React import needed.
- **Runtime**: Bun; `bun run dev` skips the build step entirely.
- **Workspace resolution**: `@caynac/shared` is symlinked by Bun into each app's `node_modules`. The `"bun"` export condition resolves to `packages/shared/src/index.ts` at dev time.
