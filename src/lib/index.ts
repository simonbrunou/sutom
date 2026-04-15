// Barrel exports for the library
export { evaluateGuess, createInitialState, addLetter, removeLetter, submitGuess, getKeyboardState, getGridData, getDailyWord, isValidLength } from './game';
export type { LetterState, TileData, GameStatus, GameState } from './game';
export { WORDS, VALID_GUESSES, isValidWord, getWordsByLength } from './words';
