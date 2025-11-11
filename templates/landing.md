# Micro-landing playbook

A lightweight Astro site (`/landing`) powers the global micro-landing for selling curated n8n automation packs. The site consumes pack metadata generated from the workflow repository, renders all sections statically, and hydrates a minimal client-side script for filtering + modals.

## 1. Data pipeline
1. **Curate packs**
   ```bash
   python3 scripts/generate_packs.py
   ```
   - Scans `workflows/`, selects integrations per blueprint, and writes `static/packs.json`.
   - Update the `PACK_BLUEPRINTS` array in `scripts/generate_packs.py` to tweak pricing, ICP, deliverables, or grouping logic.
2. **Sync packs into the landing project**
   ```bash
   cd landing
   npm run sync:packs
   ```
   - Copies `static/packs.json` → `landing/src/data/packs.json` (for SSG) and `landing/public/packs.json` (for runtime fetches/tests).

## 2. Local development workflow
```bash
cd landing
npm install            # first run only
npm run sync:packs     # whenever packs.json changes
npm run dev            # hot reload on http://localhost:4321
```
- Global styles live in `src/styles/globals.css`.
- Content strings / FAQs / metrics: `src/lib/content.ts`.
- Catalog filters + modal behavior: `src/scripts/catalog.ts` (vanilla TS module).

## 3. Build, export, deploy
```bash
cd landing
npm run build          # astro build → landing/dist
npm run export         # copies landing/dist → ../docs/landing
```
- Publish via GitHub Pages by pointing Pages to the root `docs/` folder (micro-landing lives at `/landing`).
- For Cloudflare Pages/Netlify, deploy the `docs/landing` subfolder or run the same build/export commands in CI.
- `npm run lint` runs `astro check` (optional) once the upstream compiler bug is resolved.

## 4. Stripe & lead capture
- Each pack stores a `stripeCheckoutUrl` (test-mode links by default). Replace with live-mode URLs before launch.
- The lead magnet form is client-only today; connect it to Formspree, Loops, or Lovable Forms by swapping the form `action` + JS handler in `LeadMagnet.astro` / `catalog.ts`.

## 5. Migrating to Lovable
- Components are already content-driven:
  - `Hero`, `SocialProof`, `Benefits`, `HowItWorks`, `LeadMagnet`, `PackCatalog`, `FAQ`, `FinalCTA`, `Footer`.
  - Data contracts (`hero`, `socialProof`, `packsData`, etc.) live in `src/lib/content.ts` and `static/packs.json`.
- To move into Lovable, replicate the same JSON contract (or fetch `packs.json`) and port each component as a Lovable block, keeping the `data-*` attributes so the catalog script can be re-used.
- The filtering script only depends on DOM `data-` attributes, so it can drop in unchanged.

## 6. Testing checklist
- [ ] `python3 scripts/generate_packs.py` regenerates updated pack metadata without errors.
- [ ] `npm run sync:packs && npm run build && npm run export` completes and refreshes `docs/landing`.
- [ ] Catalog filters (search, ICP, stack, complexity, price slider) hide/show cards correctly on desktop + mobile.
- [ ] “View details” modal populates deliverables/stack and closes via backdrop/Escape.
- [ ] Stripe checkout buttons open the configured USD links (use test mode until go-live).
- [ ] Lead magnet form shows confirmation text and (once wired) posts to the selected provider.
- [ ] SEO/analytics: inspect page source for `<script type="application/ld+json">`, OG tags, and Plausible snippet; run Lighthouse for performance ≥ 90.
- [ ] `docs/landing` assets load under `/landing/` on GitHub Pages or Cloudflare Pages.
