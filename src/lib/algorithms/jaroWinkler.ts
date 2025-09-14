/**
 * Jaro-Winkler string similarity algorithm implementation
 * Returns a score between 0 and 1, where 1 is an exact match
 */

/**
 * Calculate Jaro similarity between two strings
 */
function jaroSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1.0
  if (s1.length === 0 || s2.length === 0) return 0.0

  const matchWindow = Math.floor(Math.max(s1.length, s2.length) / 2) - 1
  if (matchWindow < 0) return 0.0

  const s1Matches = new Array(s1.length).fill(false)
  const s2Matches = new Array(s2.length).fill(false)

  let matches = 0
  let transpositions = 0

  // Find matches
  for (let i = 0; i < s1.length; i++) {
    const start = Math.max(0, i - matchWindow)
    const end = Math.min(i + matchWindow + 1, s2.length)

    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue
      s1Matches[i] = true
      s2Matches[j] = true
      matches++
      break
    }
  }

  if (matches === 0) return 0.0

  // Find transpositions
  let k = 0
  for (let i = 0; i < s1.length; i++) {
    if (!s1Matches[i]) continue
    while (!s2Matches[k]) k++
    if (s1[i] !== s2[k]) transpositions++
    k++
  }

  return (matches / s1.length + matches / s2.length + (matches - transpositions / 2) / matches) / 3.0
}

/**
 * Calculate Jaro-Winkler similarity between two strings
 * @param s1 - First string
 * @param s2 - Second string
 * @param prefixScale - Scaling factor for common prefix (default: 0.1)
 * @returns Similarity score between 0 and 1
 */
export function jaroWinklerSimilarity(s1: string, s2: string, prefixScale: number = 0.1): number {
  const jaroScore = jaroSimilarity(s1, s2)
  
  if (jaroScore < 0.7) return jaroScore

  // Calculate common prefix length (up to 4 characters)
  let prefixLength = 0
  const maxPrefix = Math.min(4, Math.min(s1.length, s2.length))
  
  for (let i = 0; i < maxPrefix; i++) {
    if (s1[i] === s2[i]) {
      prefixLength++
    } else {
      break
    }
  }

  return jaroScore + (prefixLength * prefixScale * (1 - jaroScore))
}

/**
 * Normalize a path for comparison (remove leading/trailing slashes, convert to lowercase)
 */
export function normalizePath(path: string): string {
  return path.toLowerCase().replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/')
}

/**
 * Calculate similarity between two paths with normalization
 */
export function pathSimilarity(path1: string, path2: string): number {
  const normalized1 = normalizePath(path1)
  const normalized2 = normalizePath(path2)
  
  return jaroWinklerSimilarity(normalized1, normalized2)
}
