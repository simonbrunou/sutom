#!/usr/bin/env bash
# PreToolUse(Write|Edit): caution before editing curated game-data word lists.
# dictionary.txt feeds getDailyWord; corrupting it breaks the daily-word sequence
# for every player. Warn (non-blocking) — these ARE edited during curation.
input=$(cat)
path=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty' 2>/dev/null)
case "$path" in
  */src/lib/dictionary.txt|*/src/lib/valid-guesses.txt|src/lib/dictionary.txt|src/lib/valid-guesses.txt)
    jq -n '{hookSpecificOutput:{hookEventName:"PreToolUse",additionalContext:"CAUTION: curated game data. dictionary.txt = the daily-answer pool (must be 5-8 letters, UPPERCASE A-Z, sorted; entries outside 5-8 are silently dropped by parseWordList). valid-guesses.txt = ~85k accepted guesses. The mulberry32 shuffle seed in words.ts is load-bearing — adding/removing words reshuffles the daily-word order, and changing the seed shifts every player history; never change the seed when merely curating. Re-run `npm run test` (words.test.ts) after. See the word-data-curation skill."}}'
    ;;
esac
exit 0
