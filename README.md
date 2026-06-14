# Caffeine PK Explorer

Static Vite + React + TypeScript app for comparing coffee timing scenarios with transparent caffeine pharmacokinetic estimates.

Current implementation includes:

- Pure caffeine PK engine with first-order absorption/elimination, profile modifiers, uncertainty bands, and non-medical disclaimer copy.
- Explicit Scenario 1 / Scenario 2 comparison graph backed by versioned v2 app state.
- Curated capsule catalog with company → system → product selection, dose-group/source-confidence badges, scenario-targeted manual caffeine entry, and per-drink override.
- Balanced local profile state, local persistence, sanitized URL share links, malformed-link recovery, and privacy exclusions for sensitive profile flags. Legacy v1 localStorage/share payloads migrate into Scenario 1 plus a Scenario 2 comparison copy.
- GitHub Pages deployment workflow and baseline quality gates.

This is an educational planning tool, not medical advice. Capsule caffeine values vary by market, batch, recipe, and source; use manual overrides when your sleeve or product page provides a better value. The graph reference line is a user planning marker, not a universal sleep cutoff.

## Coffee seed sources

The seed catalog intentionally stays curated, not exhaustive. Public capsule materials often provide caffeine ranges rather than complete market-stable per-capsule measurements. Source notes are kept in `src/catalog/vertuo.ts` and should be treated as planning defaults, not authoritative medical data.

Useful references used during planning:

- FDA caffeine consumer guidance: https://www.fda.gov/consumers/consumer-updates/spilling-beans-how-much-caffeine-too-much
- NCBI Bookshelf caffeine overview: https://www.ncbi.nlm.nih.gov/books/NBK519490/
- Nestlé Nespresso coffee and health: https://nestle-nespresso.com/views/coffee_and_health
- Nespresso FAQ examples for Vertuo caffeine ranges: https://www.contact.nespresso.com/faq/mo
- Nespresso Canada FAQ caffeine ranges: https://www.contact.nespresso.com/faq/ca/en/detail/5239
- Nespresso USA Vertuo product listing: https://www.nespresso.com/us/en/vertuo-coffee-pods
- Nespresso USA Original product listing: https://www.nespresso.com/us/en/original-coffee-pods
- Nespresso USA Melozio Boost product page: https://www.nespresso.com/us/en/order/capsules/vertuo/melozio-boost-vertuo-coffee-pods
- Keurig caffeine-content support article: https://support.keurig.com/?kmContentId=1014715&page=shell&shell=knowledge-article
- Starbucks at Home K-Cup product listing: https://athome.starbucks.com/product-category/k-cup-pods
- NESCAFÉ Dolce Gusto capsule listing: https://www.dolcegusto-me.com/ndg_mena_en/coffee-drinks

## Scripts

- `npm run dev` — local Vite dev server
- `npm run lint` — ESLint checks
- `npm run test` — Vitest tests
- `npm run typecheck` — TypeScript type check without emitting
- `npm run build` — TypeScript build plus Vite static artifact

## GitHub Pages

The Vite `base` path defaults to the repository name when `GITHUB_REPOSITORY` is set by Actions. Override with `BASE_PATH` when needed.
