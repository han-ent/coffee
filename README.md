# Caffeine PK Explorer

Static Vite + React + TypeScript foundation for a future caffeine timing explorer.

This slice intentionally includes only the app scaffold, premium design-token foundation, baseline tests, and GitHub Pages deployment plumbing. It does not implement the PK engine, coffee catalog, persistence/share links, or graph UX.

## Scripts

- `npm run dev` — local Vite dev server
- `npm run lint` — ESLint checks
- `npm run test` — Vitest baseline tests
- `npm run build` — TypeScript build plus Vite static artifact

## GitHub Pages

The Vite `base` path defaults to the repository name when `GITHUB_REPOSITORY` is set by Actions. Override with `BASE_PATH` when needed.
