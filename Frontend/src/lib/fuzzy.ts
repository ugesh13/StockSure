// Levenshtein distance for fuzzy matching
function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

export function fuzzyMatches(text: string, query: string): boolean {
  if (!query || !query.trim()) return true;

  const normalizedText = text.toLowerCase().trim();
  const normalizedQuery = query.toLowerCase().trim();

  // Direct substring check
  if (normalizedText.includes(normalizedQuery)) return true;

  // Word-by-word tokenized fuzzy check
  const textWords = normalizedText.split(/[\s,.-]+/);
  const queryWords = normalizedQuery.split(/[\s,.-]+/);

  for (const qWord of queryWords) {
    if (!qWord) continue;
    let wordMatched = false;

    for (const tWord of textWords) {
      if (tWord.includes(qWord)) {
        wordMatched = true;
        break;
      }
      // Allow 1 typo for words of length 3-5, 2 typos for words of length 6+
      const maxDistance = qWord.length >= 6 ? 2 : qWord.length >= 3 ? 1 : 0;
      if (Math.abs(tWord.length - qWord.length) <= maxDistance) {
        const dist = levenshteinDistance(tWord, qWord);
        if (dist <= maxDistance) {
          wordMatched = true;
          break;
        }
      }
    }

    if (!wordMatched) return false;
  }

  return true;
}
