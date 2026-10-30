# Graph Report - sutom  (2026-10-30)

## Corpus Check
- 46 files · ~109,504 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: (none) 6, .lock 1, .nix 1)

## Summary
- 323 nodes · 466 edges · 28 communities (18 shown, 10 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `02531888`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- +page.svelte
- words.ts
- check-node-pins.test.ts
- check-node-pins.test.ts
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
- steps
- CLAUDE.md Project Notes
- protect-word-data.sh
- Share Results Feature
- AGENTS.md
- check-node-pins.sh
- Issue tracker: Forgejo
- Domain Docs
- refresh-graph.sh
- triage-labels.md
- App Type Declarations
- Root Layout (+layout.svelte)

## God Nodes (most connected - your core abstractions)
1. `vitest` - 14 edges
2. `scripts` - 9 edges
3. `evaluateGuess()` - 9 edges
4. `handleKey()` - 9 edges
5. `@testing-library/svelte` - 8 edges
6. `getDailyWord()` - 7 edges
7. `WORDS Constant (Solution Word Lists)` - 7 edges
8. `steps` - 6 edges
9. `TileData` - 6 edges
10. `getGridData()` - 6 edges

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

## Communities (28 total, 10 thin omitted)

### Community 0 - "+page.svelte"
Cohesion: 0.09
Nodes (45): Invariants — do NOT break, addLetter(), createInitialState(), evaluateGuess(), GameState, GameStatus, getCorrectPositions(), getDailyWord() (+37 more)

### Community 1 - "words.ts"
Cohesion: 0.11
Nodes (18): After editing word data, Static assets (favicon / OG image), Word data & asset curation (sutom), Word lists (`src/lib/`), *.txt?raw Module Declaration, French Dictionary (dictionary.txt), ANSWER_WORDS, deterministicShuffle() (+10 more)

### Community 2 - "check-node-pins.test.ts"
Cohesion: 0.14
Nodes (7): {
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
	}

### Community 3 - "check-node-pins.test.ts"
Cohesion: 0.09
Nodes (18): base, ciLines, failsWith(), fixture, passesWith(), repo, run(), scriptPath (+10 more)

### Community 4 - "stats.ts"
Cohesion: 0.27
Nodes (9): createStats(), GameResult, isValidStats(), loadStats(), recordResult(), saveStats(), Stats, STATS_KEY (+1 more)

### Community 5 - "vitest"
Cohesion: 0.10
Nodes (18): @testing-library/svelte@^5.2.7, vitest@^5.0.0, @testing-library/svelte, vitest, Board Component, Header Component, Header onShowRules Callback, {
		onShowRules,
		onShowStats,
		attemptsUsed = 0,
		maxAttempts = 6,
		gameStatus = 'playing' as 'playing' | 'won' | 'lost'
	} (+10 more)

### Community 6 - "Modal.svelte"
Cohesion: 0.18
Nodes (4): dialogEl, {
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
Cohesion: 0.06
Nodes (39): devDependencies, eslint@^10.5.0, @eslint/js@^10.0.1, jsdom@^30.0.0, svelte@^5.57.1, svelte-check@^4.7.5, @sveltejs/adapter-static@^4.0.0, @sveltejs/kit@^3.0.0 (+31 more)

### Community 16 - "steps"
Cohesion: 0.10
Nodes (19): BASE_PATH, PUBLIC_SITE_URL, jobs, test, name, on, pull_request, push (+11 more)

### Community 20 - "AGENTS.md"
Cohesion: 0.25
Nodes (7): Agent skills, Domain docs, graphify, Issue tracker, Merge authority, Node version, Triage labels

### Community 21 - "check-node-pins.sh"
Cohesion: 0.61
Nodes (7): fail(), pin(), read_nvmrc(), read_package(), read_workflow(), read_workflows(), check-node-pins.sh script

### Community 22 - "Issue tracker: Forgejo"
Cohesion: 0.29
Nodes (6): Conventions, Issue tracker: Forgejo, Pull requests as a triage surface, Wayfinding operations, When a skill says "fetch the relevant ticket", When a skill says "publish to the issue tracker"

### Community 23 - "Domain Docs"
Cohesion: 0.33
Nodes (5): Before exploring, read these, Domain Docs, File structure, Flag ADR conflicts, Use the glossary's vocabulary

## Knowledge Gaps
- **18 isolated node(s):** `config:recommended`, `$app/tsconfig`, `LocalStorage State Persistence`, `*.txt?raw Module Declaration`, `WORDS_5 (5-Letter French Words)` (+13 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 154 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `vitest` to `+page.svelte`, `words.ts`, `check-node-pins.test.ts`, `stats.ts`, `package.json`?**
  _High betweenness centrality (0.196) - this node is a cross-community bridge._
- **What connects `config:recommended`, `$app/tsconfig`, `LocalStorage State Persistence` to the rest of the system?**
  _18 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `+page.svelte` be split into smaller, more focused modules?**
  _Cohesion score 0.08673469387755102 - nodes in this community are weakly interconnected._
- **Why does `svelte` connect `package.json` to `+page.svelte`, `Modal.svelte`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Should `words.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1067193675889328 - nodes in this community are weakly interconnected._
- **Why does `devDependencies` connect `package.json` to `vitest`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Should `check-node-pins.test.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14166666666666666 - nodes in this community are weakly interconnected._