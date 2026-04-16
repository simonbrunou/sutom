# Graph Report - .  (2026-04-16)

## Corpus Check
- 28 files · ~93,009 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 90 nodes · 99 edges · 27 communities detected
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.76)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Core Game Logic|Core Game Logic]]
- [[_COMMUNITY_Word Lists & Validation|Word Lists & Validation]]
- [[_COMMUNITY_Board Display Components|Board Display Components]]
- [[_COMMUNITY_Overlay UI Components|Overlay UI Components]]
- [[_COMMUNITY_Static Assets & Branding|Static Assets & Branding]]
- [[_COMMUNITY_Board Component Tests|Board Component Tests]]
- [[_COMMUNITY_Toast Component Tests|Toast Component Tests]]
- [[_COMMUNITY_Modal Component Tests|Modal Component Tests]]
- [[_COMMUNITY_Tile Component Tests|Tile Component Tests]]
- [[_COMMUNITY_Header Component Tests|Header Component Tests]]
- [[_COMMUNITY_Keyboard Component Tests|Keyboard Component Tests]]
- [[_COMMUNITY_Page Routing|Page Routing]]
- [[_COMMUNITY_Project Documentation|Project Documentation]]
- [[_COMMUNITY_Build & Test Config|Build & Test Config]]
- [[_COMMUNITY_Vite Build Config|Vite Build Config]]
- [[_COMMUNITY_Svelte Framework Config|Svelte Framework Config]]
- [[_COMMUNITY_TypeScript Declarations|TypeScript Declarations]]
- [[_COMMUNITY_Game Logic Tests|Game Logic Tests]]
- [[_COMMUNITY_Word Validation Tests|Word Validation Tests]]
- [[_COMMUNITY_Library Exports|Library Exports]]
- [[_COMMUNITY_Modal Dialog|Modal Dialog]]
- [[_COMMUNITY_Row Component|Row Component]]
- [[_COMMUNITY_App Layout|App Layout]]
- [[_COMMUNITY_Test Setup|Test Setup]]
- [[_COMMUNITY_Svelte Config|Svelte Config]]
- [[_COMMUNITY_App Type Defs|App Type Defs]]
- [[_COMMUNITY_Root Layout|Root Layout]]

## God Nodes (most connected - your core abstractions)
1. `WORDS Constant (Solution Word Lists)` - 9 edges
2. `Game Logic Tests` - 9 edges
3. `evaluateGuess()` - 7 edges
4. `GameState Interface` - 6 edges
5. `Main Game Page (+page.svelte)` - 6 edges
6. `isValidWord()` - 5 edges
7. `submitGuess()` - 5 edges
8. `getDailyWord()` - 5 edges
9. `Modal Component` - 5 edges
10. `createInitialState()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `CLAUDE.md Project Notes` --conceptually_related_to--> `Library Barrel Exports`  [INFERRED]
  CLAUDE.md → src/lib/index.ts
- `Static Adapter Configuration` --conceptually_related_to--> `Main Game Page (+page.svelte)`  [INFERRED]
  svelte.config.js → src/routes/+page.svelte
- `App HTML Shell` --references--> `Favicon SVG Icon`  [EXTRACTED]
  src/app.html → static/favicon.svg
- `isValidLength()` --semantically_similar_to--> `isValidWord()`  [INFERRED] [semantically similar]
  src/lib/game.ts → src/lib/words.ts
- `*.txt?raw Module Declaration` --conceptually_related_to--> `French Dictionary (dictionary.txt)`  [INFERRED]
  src/app.d.ts → src/lib/dictionary.txt

## Hyperedges (group relationships)
- **Game State Mutation Pipeline** — game_createinitialstate, game_addletter, game_removeletter, game_submitguess, game_gamestate [EXTRACTED 0.95]
- **Guess Evaluation and Display Pipeline** — game_evaluateguess, game_getgriddata, game_getkeyboardstate, game_tiledata, game_letterstate [EXTRACTED 0.90]
- **Word Validation System** — words_words, words_valid_guesses, dictionary_txt, words_isvalidword [EXTRACTED 0.95]
- **Board-Row-Tile Rendering Hierarchy** — board_component, row_component, tile_component, tiledata_type [EXTRACTED 1.00]
- **LetterState Shared Between Tile and Keyboard** — tile_component, keyboard_component, letterstate_type [EXTRACTED 0.90]
- **Component Test Suite with Testing Library** — board_test, toast_test, modal_test, tile_test, header_test, keyboard_test [EXTRACTED 1.00]

## Communities

### Community 0 - "Core Game Logic"
Cohesion: 0.21
Nodes (19): addLetter(), createInitialState(), evaluateGuess(), GameState Interface, GameStatus Type, getDailyWord(), getGridData(), getKeyboardState() (+11 more)

### Community 1 - "Word Lists & Validation"
Cohesion: 0.23
Nodes (11): *.txt?raw Module Declaration, French Dictionary (dictionary.txt), getWordsByLength(), isValidWord(), Words Module Tests, VALID_GUESSES Set, WORDS Constant (Solution Word Lists), WORDS_5 (5-Letter French Words) (+3 more)

### Community 2 - "Board Display Components"
Cohesion: 0.29
Nodes (10): Board Component, Board Tests, Keyboard Component, Keyboard onKey Callback, Keyboard Tests, LetterState Type, Row Component, Tile Component (+2 more)

### Community 3 - "Overlay UI Components"
Cohesion: 0.24
Nodes (10): Header Component, Header onShowRules Callback, Header onShowStats Callback, Header Tests, Modal Component, Modal onClose Callback, Modal Tests, ModalTestWrapper Component (+2 more)

### Community 4 - "Static Assets & Branding"
Cohesion: 0.5
Nodes (5): App HTML Shell, Purple-to-Pink Gradient Background, Letter S Branding Element, Favicon SVG Icon, Static Headers Config

### Community 5 - "Board Component Tests"
Cohesion: 0.5
Nodes (0): 

### Community 6 - "Toast Component Tests"
Cohesion: 1.0
Nodes (0): 

### Community 7 - "Modal Component Tests"
Cohesion: 1.0
Nodes (0): 

### Community 8 - "Tile Component Tests"
Cohesion: 1.0
Nodes (0): 

### Community 9 - "Header Component Tests"
Cohesion: 1.0
Nodes (0): 

### Community 10 - "Keyboard Component Tests"
Cohesion: 1.0
Nodes (0): 

### Community 11 - "Page Routing"
Cohesion: 1.0
Nodes (0): 

### Community 12 - "Project Documentation"
Cohesion: 1.0
Nodes (2): CLAUDE.md Project Notes, Library Barrel Exports

### Community 13 - "Build & Test Config"
Cohesion: 1.0
Nodes (2): Test Setup (jest-dom/vitest), Vite Configuration

### Community 14 - "Vite Build Config"
Cohesion: 1.0
Nodes (0): 

### Community 15 - "Svelte Framework Config"
Cohesion: 1.0
Nodes (0): 

### Community 16 - "TypeScript Declarations"
Cohesion: 1.0
Nodes (0): 

### Community 17 - "Game Logic Tests"
Cohesion: 1.0
Nodes (0): 

### Community 18 - "Word Validation Tests"
Cohesion: 1.0
Nodes (0): 

### Community 19 - "Library Exports"
Cohesion: 1.0
Nodes (0): 

### Community 20 - "Modal Dialog"
Cohesion: 1.0
Nodes (0): 

### Community 21 - "Row Component"
Cohesion: 1.0
Nodes (0): 

### Community 22 - "App Layout"
Cohesion: 1.0
Nodes (0): 

### Community 23 - "Test Setup"
Cohesion: 1.0
Nodes (0): 

### Community 24 - "Svelte Config"
Cohesion: 1.0
Nodes (1): Svelte Configuration

### Community 25 - "App Type Defs"
Cohesion: 1.0
Nodes (1): App Type Declarations

### Community 26 - "Root Layout"
Cohesion: 1.0
Nodes (1): Root Layout (+layout.svelte)

## Knowledge Gaps
- **21 isolated node(s):** `Vite Configuration`, `Svelte Configuration`, `CLAUDE.md Project Notes`, `App Type Declarations`, `Library Barrel Exports` (+16 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Toast Component Tests`** (2 nodes): `Toast.svelte`, `Toast.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Modal Component Tests`** (2 nodes): `Modal.test.ts`, `ModalTestWrapper.svelte`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Tile Component Tests`** (2 nodes): `Tile.svelte`, `Tile.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Header Component Tests`** (2 nodes): `Header.svelte`, `Header.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Keyboard Component Tests`** (2 nodes): `Keyboard.svelte`, `Keyboard.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Page Routing`** (2 nodes): `if()`, `+page.svelte`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Project Documentation`** (2 nodes): `CLAUDE.md Project Notes`, `Library Barrel Exports`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Build & Test Config`** (2 nodes): `Test Setup (jest-dom/vitest)`, `Vite Configuration`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Vite Build Config`** (1 nodes): `vite.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Svelte Framework Config`** (1 nodes): `svelte.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `TypeScript Declarations`** (1 nodes): `app.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Game Logic Tests`** (1 nodes): `game.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Word Validation Tests`** (1 nodes): `words.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Library Exports`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Modal Dialog`** (1 nodes): `Modal.svelte`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Row Component`** (1 nodes): `Row.svelte`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `App Layout`** (1 nodes): `+layout.svelte`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Test Setup`** (1 nodes): `setup.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Svelte Config`** (1 nodes): `Svelte Configuration`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `App Type Defs`** (1 nodes): `App Type Declarations`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Root Layout`** (1 nodes): `Root Layout (+layout.svelte)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `WORDS Constant (Solution Word Lists)` connect `Word Lists & Validation` to `Core Game Logic`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Why does `Main Game Page (+page.svelte)` connect `Core Game Logic` to `Word Lists & Validation`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **What connects `Vite Configuration`, `Svelte Configuration`, `CLAUDE.md Project Notes` to the rest of the system?**
  _21 weakly-connected nodes found - possible documentation gaps or missing edges._