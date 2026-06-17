---
name: word-data-curation
description: Curate the French word lists and regenerate static assets for the sutom game. Use when adding/removing answer words, editing dictionary.txt or valid-guesses.txt, changing the daily-word selection, or regenerating the favicon/OG image.
---

# Word data & asset curation (sutom)

## Word lists (`src/lib/`)
- `dictionary.txt` — the **daily-answer pool** (~2670 words). Alphabetical, UPPERCASE.
- `valid-guesses.txt` — ~85k accepted guesses (any real French word a player may type).
- `words.ts` parses both with `parseWordList`: keeps only length **5–8** and `^[A-Z]+$`.
  Anything outside that range (e.g. existing 4-letter entries) is **silently dropped** — it
  will never appear as an answer.

## Invariants — do NOT break
- **Shuffle seed** in `words.ts` (`mulberry32` / the literal seed) is load-bearing. Changing it
  reshuffles the entire answer order → every player gets a different "word of the day" and loses
  continuity. Never change it when merely adding words.
- **Daily epoch**: `getDayIndex` counts days from `2024-01-01` (local time); `getDailyWord`
  indexes `ANSWER_WORDS[dayIndex % length]`. Don't alter the epoch.
- Adding words to `dictionary.txt` shifts the shuffled order (full-array shuffle), so the
  sequence of upcoming daily words changes — be deliberate.
- Keep `dictionary.txt` alphabetically sorted + UPPERCASE for clean diffs.

## After editing word data
1. `npm run test` — `words.test.ts` / `game.test.ts` assert parsing + daily-word behavior.
2. `npm run check` (svelte-check) and `npm run lint`.
3. `graphify update .` if you also touched `.ts` source.

## Static assets (favicon / OG image)
- Source of truth = the inline SVG in `scripts/generate-assets.mjs`. Edit the SVG there, never
  the PNGs in `static/` directly.
- Regenerate: `node scripts/generate-assets.mjs` → writes the OG/favicon PNGs.
- Note: the script hardcodes a global Playwright path; adjust if the environment differs.
