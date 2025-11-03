# Repository Guidelines

## Project Structure & Module Organization
- Root: `index.html`, `vite.config.ts`, `tsconfig.json`, `package.json`.
- Source lives in `src/`:
  - `src/scenes/` — Phaser scenes (e.g., `TerminalScene.ts`, `StoreScene.ts`).
  - `src/ui/` — UI components (e.g., `UIOverlay.ts`).
  - `src/data/` — static data/config (e.g., `items.ts`).
- Build output: `dist/` (gitignored). Add static assets to `public/` if introduced.

## Build, Test, and Development Commands
- `npm run dev` — start Vite dev server at localhost with HMR.
- `npm run build` — production build to `dist/`.
- `npm run preview` — serve the production build locally.
Tip: Use Node.js LTS. After cloning, run `npm ci`.

## Coding Style & Naming Conventions
- Language: TypeScript with ES modules.
- Indentation: 2 spaces; include semicolons; keep imports sorted.
- Naming: `PascalCase` for classes and scene/UI files; `camelCase` for functions/variables; `UPPER_SNAKE_CASE` for constants; data/config files lowercase (e.g., `items.ts`).
- Exports: prefer named exports for clarity.
- No formatter is configured; keep style consistent. If adding tooling, use Prettier + ESLint with TS.

## Testing Guidelines
- No test framework is configured yet. If adding tests, prefer Vitest:
  - Place unit tests alongside sources as `*.spec.ts` or under `tests/`.
  - Aim for fast, deterministic tests; keep scene logic thin and test pure helpers.
  - Consider Playwright for UI/E2E when scenes become interactive.

## Commit & Pull Request Guidelines
- Commits: write clear, scoped messages. Prefer Conventional Commits (`feat:`, `fix:`, `refactor:`, `chore:`, `docs:`).
- PRs: include summary, linked issues, and screenshots/GIFs for UI changes. Keep PRs focused and small; update docs (`README.md`) when adding commands or features.

## Security & Configuration Tips
- Do not commit secrets. Use Vite env vars (`VITE_*`) via `.env.local` and avoid checking them in.
- Large binaries/assets should be optimized; consider hosting heavy assets outside the repo.
