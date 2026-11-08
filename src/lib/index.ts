// Barrel exports for the library
export {
	evaluateGuess,
	createInitialState,
	addLetter,
	removeLetter,
	submitGuess,
	getKeyboardState,
	getGridData,
	getDailyWord,
	isValidLength
} from './game';
export type { LetterState, TileData, GameStatus, GameState } from './game';
export { ANSWER_WORDS, createValidGuessesLoader, loadValidGuesses, isValidWord } from './words';
