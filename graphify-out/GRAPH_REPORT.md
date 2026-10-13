# Graph Report - sutom  (2026-10-13)

## Corpus Check
- 38 files · ~112,977 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 8 file(s) not represented in the graph (top: (none) 5, .lock 1, .nix 1)

## Summary
- 241 nodes · 352 edges · 22 communities (13 shown, 9 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8eed11a3`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- +page.svelte
- words.ts
- Keyboard.svelte
- devDependencies
- stats.ts
- vitest
- Modal.svelte
- Favicon SVG Icon
- scripts
- generate-assets.mjs
- tsconfig.json
- renovate.json
- +layout.svelte
- app.d.ts
- package.json
- +layout.ts
- graphify-update-reminder.sh
- CLAUDE.md Project Notes
- protect-word-data.sh
- Share Results Feature
- App Type Declarations
- Root Layout (+layout.svelte)

## God Nodes (most connected - your core abstractions)
1. `vitest` - 11 edges
2. `Game Logic Tests` - 11 edges
3. `scripts` - 9 edges
4. `Board Tests` - 9 edges
5. `evaluateGuess()` - 9 edges
6. `handleKey (Game Input Handler)` - 9 edges
7. `@testing-library/svelte` - 7 edges
8. `getDailyWord()` - 7 edges
9. `WORDS Constant (Solution Word Lists)` - 7 edges
10. `TileData Interface` - 6 edges

## Surprising Connections (you probably didn't know these)
- `Invariants — do NOT break` --references--> `mulberry32()`  [INFERRED]
  .claude/skills/word-data-curation/SKILL.md → src/lib/words.ts
- `Invariants — do NOT break` --references--> `getDayIndex()`  [INFERRED]
  .claude/skills/word-data-curation/SKILL.md → src/lib/game.ts
- `Invariants — do NOT break` --references--> `getDailyWord()`  [INFERRED]
  .claude/skills/word-data-curation/SKILL.md → src/lib/game.ts
- `Word lists (`src/lib/`)` --references--> `parseWordList()`  [INFERRED]
  .claude/skills/word-data-curation/SKILL.md → src/lib/words.ts
- `CLAUDE.md Project Notes` --conceptually_related_to--> `Library Barrel Exports`  [INFERRED]
  CLAUDE.md → src/lib/index.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Component Test Suite with Testing Library** — src_lib_components_board_test, src_lib_components_toast_test, src_lib_components_modal_test, src_lib_components_tile_test, src_lib_components_header_test, src_lib_components_keyboard_test [EXTRACTED 1.00]

## Communities (22 total, 9 thin omitted)

### Community 0 - "+page.svelte"
Cohesion: 0.09
Nodes (44): Invariants — do NOT break, addLetter(), createInitialState(), evaluateGuess(), GameState Interface, GameStatus Type, getCorrectPositions(), getDailyWord() (+36 more)

### Community 1 - "words.ts"
Cohesion: 0.11
Nodes (19): After editing word data, Static assets (favicon / OG image), Word data & asset curation (sutom), Word lists (`src/lib/`), *.txt?raw Module Declaration, French Dictionary (dictionary.txt), ANSWER_WORDS, deterministicShuffle() (+11 more)

### Community 2 - "Keyboard.svelte"
Cohesion: 0.14
Nodes (9): {
		grid,
		currentRowIndex = 0,
		shakeRow = -1,
		bounceRow = -1,
		initialLetter = ''
	}, {
		keyStates = {} as Record<string, LetterState>,
		onKey
	}, rows, stateLabels, isUnsubmitted, {
		tiles,
		animate = false,
		shake = false,
		bounce = false,
		initialLetter = '',
		rowLabel = ''
	}, {
		letter = '',
		state = 'empty' as LetterState,
		index = 0,
		animate = false,
		bounce = false,
		initial = false,
		placeholder = false
	}, LetterState Type (+1 more)

### Community 3 - "devDependencies"
Cohesion: 0.11
Nodes (18): devDependencies, eslint, @eslint/js, jsdom, svelte, svelte-check, @sveltejs/adapter-static, @sveltejs/kit (+10 more)

### Community 4 - "stats.ts"
Cohesion: 0.27
Nodes (9): createStats(), GameResult, isValidStats(), loadStats(), recordResult(), saveStats(), Stats, STATS_KEY (+1 more)

### Community 5 - "vitest"
Cohesion: 0.11
Nodes (22): @testing-library/svelte, vitest, Board Component, Board Tests, Header Component, Header onShowRules Callback, {
		onShowRules,
		onShowStats,
		attemptsUsed = 0,
		maxAttempts = 6,
		gameStatus = 'playing' as 'playing' | 'won' | 'lost'
	}, Header onShowStats Callback (+14 more)

### Community 6 - "Modal.svelte"
Cohesion: 0.17
Nodes (5): svelte, dialogEl, {
		open = false,
		title = '',
		onClose,
		children
	}, isOpen, { open: initialOpen = false, title = '' }

### Community 7 - "Favicon SVG Icon"
Cohesion: 0.67
Nodes (4): App HTML Shell, Purple-to-Pink Gradient Background, Letter S Branding Element, Favicon SVG Icon

### Community 8 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, check, dev, lint, preview, test, test:coverage (+1 more)

### Community 9 - "generate-assets.mjs"
Cohesion: 0.20
Nodes (4): { chromium }, __dirname, _require, staticDir

### Community 10 - "tsconfig.json"
Cohesion: 0.25
Nodes (7): $app/tsconfig, compilerOptions, sourceMap, strict, types, extends, include

### Community 11 - "renovate.json"
Cohesion: 0.33
Nodes (5): config:recommended, extends, packageRules, platformAutomerge, $schema

### Community 14 - "package.json"
Cohesion: 0.08
Nodes (23): imports, #lib/*, name, private, type, version, eslint, @eslint/js (+15 more)

## Knowledge Gaps
- **26 isolated node(s):** `@testing-library/user-event`, `@types/node`, `@vitest/coverage-v8`, `eslint`, `jsdom` (+21 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 136 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `vitest` to `+page.svelte`, `words.ts`, `stats.ts`, `package.json`?**
  _High betweenness centrality (0.154) - this node is a cross-community bridge._
- **What connects `@testing-library/user-event`, `@types/node`, `@vitest/coverage-v8` to the rest of the system?**
  _26 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `+page.svelte` be split into smaller, more focused modules?**
  _Cohesion score 0.08973172987974098 - nodes in this community are weakly interconnected._
- **Why does `svelte` connect `Modal.svelte` to `+page.svelte`, `package.json`?**
  _High betweenness centrality (0.115) - this node is a cross-community bridge._
- **Should `words.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1067193675889328 - nodes in this community are weakly interconnected._
- **Why does `devDependencies` connect `devDependencies` to `package.json`?**
  _High betweenness centrality (0.110) - this node is a cross-community bridge._
- **Should `Keyboard.svelte` be split into smaller, more focused modules?**
  _Cohesion score 0.1437908496732026 - nodes in this community are weakly interconnected._