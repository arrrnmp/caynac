# AGENTS.md

Guidance for OpenCode sessions in this Bun workspace monorepo.

## Commands

```bash
# Dev (no build needed - uses "bun" export condition)
bun run dev:maniac      # from root
bun run dev:caymann     # from root
bun run dev             # from app directory

# Build (MUST use tsc -b for project references)
bun run build           # from root (builds shared first, then apps)
bun run build           # from app (builds shared via reference first)
```

**No tests.** TypeScript (`bun run build`) is the only verification.

## Structure

```
apps/maniac/      Full toolkit CLI (debrid, compress, decompress, encrypt/decrypt)
apps/caymann/     Consumer CLI (decrypt + decompress only)
packages/shared/  @caynac/shared - UI components, hooks, commands, utils
```

Entrypoints: `apps/*/src/cli.tsx` → `src/App.tsx` (screen router)

Screen union: `'menu' | 'debrid' | 'compress' | 'decompress' | 'picocrypt' | 'onboarding' | 'language'`

## Critical Conventions

**Import extensions:** `module: "NodeNext"` requires `.js` extensions on ALL local imports, even in `.tsx` files.

```typescript
// Correct:
import { theme } from './theme.js';

// Wrong:
import { theme } from './theme';
```

**Build mode:** Apps use `tsc -b` (not plain `tsc`). TypeScript project references (`composite: true`) ensure `packages/shared` builds first. Plain `tsc` from an app dir will fail.

**Dev mode workspace resolution:** `packages/shared/package.json` has a `"bun": "./src/index.ts"` export condition. At dev time, Bun resolves `@caynac/shared` to the source TS file, not `dist/`.

**Shared command props:** Commands in `packages/shared` cannot call `readConfig()` (each app has its own config). They must accept binary paths as props:

```typescript
// commands must receive these, not look them up
sevenZipBin?: string
picocryptBin?: string
```

**Terminal aspect ratio:** Cells are ~2:1 tall-to-wide. For circular appearance: `rx = r * 2, ry = r`. Used in `StarfieldBackdrop` planets/comets.

## Config Locations

- `~/.config/maniac/config.json`
- `~/.config/caymann/config.json`
- Downloaded binaries: `~/.config/maniac/bin/`

## Existing Instruction Files

- `CLAUDE.md` — Full architecture reference
- `.github/copilot-instructions.md` — Copilot-specific guidance (build/test conventions, TUI patterns)
