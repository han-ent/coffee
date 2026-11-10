# Caffeine PK Explorer

## Demo

[Live demo](https://ys-laube.github.io/pj_coffee/)

## What it is

Static app for comparing coffee timing scenarios with transparent caffeine pharmacokinetic estimates. Scenario 1 and Scenario 2 share a versioned v2 state model, a curated capsule catalog (company, system, product, dose-group and source-confidence badges), scenario-targeted manual caffeine entry, per-drink overrides, local persistence, and sanitized URL share links. Legacy v1 localStorage and share payloads migrate into Scenario 1 plus a Scenario 2 comparison copy. Sensitive profile flags stay out of share links.

This is an educational planning tool, not medical advice. Capsule caffeine values vary by market, batch, recipe, and source; use manual overrides when your sleeve or product page provides a better value. The graph reference line is a user planning marker, not a universal sleep cutoff.

The PK engine uses first-order absorption and elimination, profile modifiers, and uncertainty bands. Simulation output includes this disclaimer: "This caffeine curve is an educational planning estimate, not medical advice, diagnosis, or treatment. Individual metabolism can vary widely; use manual overrides and consult a clinician for health-specific questions."

## Stack

- Vite, React, and TypeScript
- Vitest and Testing Library
- ESLint
- GitHub Pages (static `dist` upload)

## Run locally

```bash
npm install
npm run dev
```

- `npm run dev` — local Vite dev server
- `npm run lint` — ESLint checks
- `npm run test` — Vitest tests
- `npm run typecheck` — TypeScript type check without emitting
- `npm run build` — TypeScript build plus Vite static artifact
- `npm run preview` — preview the production build

GitHub Pages runs the same lint, test, and build steps with `npm ci` on Node 20. The Vite `base` path defaults to the repository name when `GITHUB_REPOSITORY` is set by Actions. Override with `BASE_PATH` when needed.

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
