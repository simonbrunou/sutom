# Graph Report - sutom  (2026-06-16)

## Corpus Check
- 30 files · ~112,107 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 126 nodes · 160 edges · 30 communities (25 shown, 5 thin omitted)
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 17 edges (avg confidence: 0.77)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bb74ebaa`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 29|Community 29]]

## God Nodes (most connected - your core abstractions)
1. `WORDS Constant (Solution Word Lists)` - 9 edges
2. `Game Logic Tests` - 9 edges
3. `evaluateGuess()` - 7 edges
4. `handleKey()` - 6 edges
5. `GameState Interface` - 6 edges
6. `Main Game Page (+page.svelte)` - 6 edges
7. `evaluateGuess()` - 5 edges
8. `isValidWord()` - 5 edges
9. `submitGuess()` - 5 edges
10. `getDailyWord()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `CLAUDE.md Project Notes` --conceptually_related_to--> `Library Barrel Exports`  [INFERRED]
  CLAUDE.md → src/lib/index.ts
- `Main Game Page (+page.svelte)` --conceptually_related_to--> `Static Adapter Configuration`  [INFERRED]
  src/routes/+page.svelte → svelte.config.js
- `Favicon SVG Icon` --references--> `App HTML Shell`  [EXTRACTED]
  static/favicon.svg → src/app.html
- `French Dictionary (dictionary.txt)` --conceptually_related_to--> `*.txt?raw Module Declaration`  [INFERRED]
  src/lib/dictionary.txt → src/app.d.ts
- `isValidWord()` --semantically_similar_to--> `isValidLength()`  [INFERRED] [semantically similar]
  src/lib/words.ts → src/lib/game.ts

## Hyperedges (group relationships)
- **Game State Mutation Pipeline** — game_createinitialstate, game_addletter, game_removeletter, game_submitguess, game_gamestate [EXTRACTED 0.95]
- **Guess Evaluation and Display Pipeline** — game_evaluateguess, game_getgriddata, game_getkeyboardstate, game_tiledata, game_letterstate [EXTRACTED 0.90]
- **Word Validation System** — words_words, words_valid_guesses, dictionary_txt, words_isvalidword [EXTRACTED 0.95]
- **Board-Row-Tile Rendering Hierarchy** — board_component, row_component, tile_component, tiledata_type [EXTRACTED 1.00]
- **LetterState Shared Between Tile and Keyboard** — tile_component, keyboard_component, letterstate_type [EXTRACTED 0.90]
- **Component Test Suite with Testing Library** — board_test, toast_test, modal_test, tile_test, header_test, keyboard_test [EXTRACTED 1.00]

## Communities (30 total, 5 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.18
Nodes (19): addLetter(), createInitialState(), evaluateGuess(), GameState Interface, GameStatus Type, getDailyWord(), getGridData(), getKeyboardState() (+11 more)

### Community 1 - "Community 1"
Cohesion: 0.18
Nodes (13): *.txt?raw Module Declaration, French Dictionary (dictionary.txt), deterministicShuffle(), mulberry32(), getWordsByLength(), isValidWord(), Words Module Tests, VALID_GUESSES Set (+5 more)

### Community 2 - "Community 2"
Cohesion: 0.3
Nodes (12): addLetter(), createInitialState(), evaluateGuess(), getCorrectPositions(), getDailyWord(), getDayIndex(), getGridData(), getKeyboardState() (+4 more)

### Community 3 - "Community 3"
Cohesion: 0.33
Nodes (6): createStats(), isValidStats(), loadStats(), recordResult(), saveStats(), winPercent()

### Community 4 - "Community 4"
Cohesion: 0.29
Nodes (10): Board Component, Board Tests, Keyboard Component, Keyboard onKey Callback, Keyboard Tests, LetterState Type, Row Component, Tile Component (+2 more)

### Community 5 - "Community 5"
Cohesion: 0.24
Nodes (10): Header Component, Header onShowRules Callback, Header onShowStats Callback, Header Tests, Modal Component, Modal onClose Callback, Modal Tests, ModalTestWrapper Component (+2 more)

### Community 6 - "Community 6"
Cohesion: 0.25
Nodes (3): isValidWord(), handleKey(), handleKeydown()

### Community 7 - "Community 7"
Cohesion: 0.5
Nodes (5): App HTML Shell, Purple-to-Pink Gradient Background, Letter S Branding Element, Favicon SVG Icon, Static Headers Config

## Knowledge Gaps
- **21 isolated node(s):** `Vite Configuration`, `App Type Declarations`, `*.txt?raw Module Declaration`, `Header Tests`, `Keyboard Tests` (+16 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `WORDS Constant (Solution Word Lists)` connect `Community 1` to `Community 0`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Why does `handleKey()` connect `Community 6` to `Community 2`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Why does `getDailyWord()` connect `Community 0` to `Community 1`, `Community 2`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `handleKey()` (e.g. with `isValidWord()` and `submitGuess()`) actually correct?**
  _`handleKey()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Vite Configuration`, `App Type Declarations`, `*.txt?raw Module Declaration` to the rest of the system?**
  _21 weakly-connected nodes found - possible documentation gaps or missing edges._