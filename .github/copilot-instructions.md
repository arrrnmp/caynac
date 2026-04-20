# Copilot instructions for `maniac`

## Build, test, and lint commands

- Install dependencies: `bun install`
- Run in dev mode (executes `src/cli.tsx` directly): `bun run dev`
- Build TypeScript to `dist/`: `bun run build`
- Run built CLI: `bun run start`
- Quick CLI smoke check: `bun src/cli.tsx --help`

Automated testing and linting are not configured in this repository yet:

- **Tests:** no test script and no `*.test` / `*.spec` files are present.
- **Single test execution:** not applicable until tests are added.
- **Lint:** no lint script or linter config is present.

## High-level architecture

- `src/cli.tsx` is the command entrypoint. It uses Commander to expose `debrid`, `compress`, `decompress`, `picocrypt`, and `onboarding` (`setup` alias), then renders Ink UI via `<App />` with command-specific initial props.
- `src/App.tsx` is a screen router for the TUI. It holds current screen state (`menu`, `debrid`, `compress`, `decompress`, `picocrypt`, `onboarding`), mounts the corresponding command component, and performs startup dependency gating (route to onboarding when required tools are missing).
- Each command in `src/commands/*/index.tsx` is implemented as a step-driven flow (`Step` string union + `useState` + `useEffect`) that advances through prompts, async work, completion, and error states.
- Operational logic is isolated in `src/utils/*`:
  - `realDebrid.ts`: Real-Debrid REST API wrapper + polling
  - `download.ts`: HTTP(S) file download with progress callbacks
  - `compression.ts`: `7z` spawn wrapper for compress/extract
  - `picocrypt.ts`: `picocrypt-cli` spawn wrapper
  - `onboarding.ts`: dependency detection + installer orchestration (7-Zip and Picocrypt CLI)
  - `config.ts`: persistent user config at `~/.config/maniac/config.json`
- UI primitives (`Spinner`, `ProgressBar`, `ErrorBox`, `PasswordInput`, `MultiSelect`, etc.) live in `src/components/*` and are themed through `src/theme.ts`.

## Key codebase conventions

- **ESM import style:** TypeScript source imports local files using `.js` extensions (required by `module: "NodeNext"` in `tsconfig.json`).
- **Step-machine pattern:** command modules use explicit `Step` unions and transition state names like `enter_*`, `pick_*`, `processing`, `done`, `error`.
- **Async side-effects by step:** async operations are triggered inside `useEffect` blocks gated by `if (step !== '...') return;`, with a local `fail()` helper that sets `error` state and transitions to `error`.
- **Keyboard UX pattern:** commands use `useInput` for escape/back behavior and avoid back-navigation while busy steps are running.
- **Persistent settings contract:** shared settings are read/written via `readConfig`/`mergeConfig` only (`rdToken`, `defaultOutputDir`, `picocryptPath`, `sevenZipPath`).
- **External tooling expectations:** compression/decompression use configured `sevenZipPath` (or `7z`/`7zz` on PATH) and encryption/decryption use configured `picocryptPath` (or CLI on PATH); onboarding is the built-in way to install missing tools.

## TUI rendering and interaction conventions

- **Hard-fill panel interiors:** to prevent terminal/background bleed-through, menu and command screens render an explicit absolute fill layer using `BLOCK_FULL` + `theme.panelBg` before content (`src/App.tsx`, `src/commands/*/index.tsx`, `src/commands/MainMenu.tsx`).
- **Do not rely on `Box` background props:** Ink `Box` does not provide `backgroundColor`; use `Text` rows for guaranteed background painting.
- **Transition contract:** `MainMenu` passes a snapshot of currently rendered menu text (`MenuTransitionSnapshot`) to `App`, and `App` uses the same vortex transition both when entering tool screens and when returning to menu via `onBack`/Esc.
- **Mouse handling is scoped:** mouse parsing is managed via `useMouse` with active lifecycle control; avoid globally enabling mouse mode in `cli.tsx` to prevent escape-sequence leakage into text inputs.
- **Backdrop interaction scope:** `App` owns backdrop selection: onboarding uses `MatrixParallaxBackdrop` as the full app background, while non-onboarding screens use `StarfieldBackdrop` (mouse-reactive black-hole behavior remains menu-only).
- **Onboarding completion transition:** after successful onboarding install, `App` runs a dedicated onboarding→menu transition (top-to-bottom onboarding wipe/fade, then menu fade-in) before returning to the interactive main menu.
- **Planet rendering rules:** Saturn uses a dedicated high-detail renderer; other planets use the spheroid renderer. Gas/ice giants (`jupiter`, `saturn`, `uranus`, `neptune`) render solo, while up to two concurrent planets are allowed only for rocky bodies (`mercury`, `moon`, `venus`, `earth`, `mars`).
