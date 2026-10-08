// ============================================
// Duplicate Detection & Scoring System
// ============================================

import type { Resident } from '@/lib/data/types';

// -------------------- Phonetic Algorithms --------------------

/**
 * Soundex algorithm for phonetic name matching
 * Converts names to a phonetic code for comparison
 */
export function soundex(str: string): string {
  if (!str) return '';
  
  const s = str.toUpperCase().replace(/[^A-Z]/g, '');
  if (s.length === 0) return '';
  
  const codes: Record<string, string> = {
    B: '1', F: '1', P: '1', V: '1',
    C: '2', G: '2', J: '2', K: '2', Q: '2', S: '2', X: '2', Z: '2',
    D: '3', T: '3',
    L: '4',
    M: '5', N: '5',
    R: '6',
  };
  
  let result = s[0];
  let prevCode = codes[s[0]] || '';
  
  for (let i = 1; i < s.length && result.length < 4; i++) {
    const code = codes[s[i]] || '';
    if (code && code !== prevCode) {
      result += code;
    }
    prevCode = code || prevCode;
  }
  
  return (result + '000').slice(0, 4);
}

/**
 * Double Metaphone algorithm (simplified version)
 * More accurate than Soundex for diverse name origins
 */
export function metaphone(str: string): string {
  if (!str) return '';
  
  let s = str.toUpperCase().replace(/[^A-Z]/g, '');
  if (s.length === 0) return '';
  
  // Simple metaphone transformation rules
  const transformations: [RegExp, string][] = [
    [/^KN/, 'N'],
    [/^GN/, 'N'],
    [/^PN/, 'N'],
    [/^WR/, 'R'],
    [/^PS/, 'S'],
    [/^X/, 'S'],
    [/GH(?!.)/g, ''],
    [/GN$/g, 'N'],
    [/MB$/g, 'M'],
    [/PH/g, 'F'],
    [/TCH/g, 'CH'],
    [/GH/g, ''],
    [/[AEIOU]/g, ''],
    [/(.)\1+/g, '$1'],
  ];
  
  for (const [pattern, replacement] of transformations) {
    s = s.replace(pattern, replacement);
  }
  
  return s.slice(0, 6);
}

// -------------------- String Similarity --------------------

/**
 * Levenshtein distance - edit distance between two strings
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  const m = s1.length;
  const n = s2.length;
  
  // Create distance matrix
  const d: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;
  
  for (let j = 1; j <= n; j++) {
    for (let i = 1; i <= m; i++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,      // deletion
        d[i][j - 1] + 1,      // insertion
        d[i - 1][j - 1] + cost // substitution
      );
    }
  }
  
  return d[m][n];
}

/**
 * Normalized similarity score (0-1) from Levenshtein distance
 */
export function stringSimilarity(str1: string, str2: string): number {
  if (!str1 && !str2) return 1;
  if (!str1 || !str2) return 0;
  
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1;
  
  const distance = levenshteinDistance(str1, str2);
  return 1 - (distance / maxLen);
}

/**
 * Jaro-Winkler similarity (better for names)
 */
export function jaroWinklerSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;
  
  const matchWindow = Math.floor(Math.max(s1.length, s2.length) / 2) - 1;
  const s1Matches = new Array(s1.length).fill(false);
  const s2Matches = new Array(s2.length).fill(false);
  
  let matches = 0;
  let transpositions = 0;
  
  // Find matches
  for (let i = 0; i < s1.length; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, s2.length);
    
    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }
  
  if (matches === 0) return 0;
  
  // Count transpositions
  let k = 0;
  for (let i = 0; i < s1.length; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }
  
  const jaro = (
    matches / s1.length +
    matches / s2.length +
    (matches - transpositions / 2) / matches
  ) / 3;
  
  // Winkler modification - boost for common prefix
  let prefix = 0;
  for (let i = 0; i < Math.min(4, Math.min(s1.length, s2.length)); i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }
  
  return jaro + prefix * 0.1 * (1 - jaro);
}

// -------------------- Scoring Components --------------------

export interface DuplicateScores {
  nameScore: number;      // Max 30 points
  phoneticScore: number;  // Max 15 points
  dobScore: number;       // Max 20 points
  phoneScore: number;     // Max 15 points
  addressScore: number;   // Max 10 points
  genderScore: number;    // Max 5 points
  householdScore: number; // Max 5 points
  faceScore: number;      // Max 20 points
  totalScore: number;     // Max 120 points
}

/**
 * Calculate name similarity score
 */
function calculateNameScore(r1: Resident, r2: Resident): number {
  const fullName1 = `${r1.firstName} ${r1.fatherName} ${r1.grandFatherName}`.toLowerCase();
  const fullName2 = `${r2.firstName} ${r2.fatherName} ${r2.grandFatherName}`.toLowerCase();
  
  // Check each name component
  const firstNameSim = jaroWinklerSimilarity(r1.firstName, r2.firstName);
  const fatherNameSim = jaroWinklerSimilarity(r1.fatherName, r2.fatherName);
  const grandFatherNameSim = jaroWinklerSimilarity(r1.grandFatherName, r2.grandFatherName);
  
  // Weighted average (first name most important)
  const weightedSim = (firstNameSim * 0.5 + fatherNameSim * 0.3 + grandFatherNameSim * 0.2);
  
  // Also check full name similarity
  const fullNameSim = jaroWinklerSimilarity(fullName1, fullName2);
  
  // Take the higher of weighted component or full name
  return Math.max(weightedSim, fullNameSim) * 30;
}

/**
 * Calculate phonetic similarity score
 */
function calculatePhoneticScore(r1: Resident, r2: Resident): number {
  const soundex1 = soundex(r1.firstName) + soundex(r1.fatherName);
  const soundex2 = soundex(r2.firstName) + soundex(r2.fatherName);
  
  const metaphone1 = metaphone(r1.firstName) + metaphone(r1.fatherName);
  const metaphone2 = metaphone(r2.firstName) + metaphone(r2.fatherName);
  
  let score = 0;
  
  // Soundex match
  if (soundex1 === soundex2) score += 7.5;
  else if (stringSimilarity(soundex1, soundex2) > 0.7) score += 4;
  
  // Metaphone match
  if (metaphone1 === metaphone2) score += 7.5;
  else if (stringSimilarity(metaphone1, metaphone2) > 0.7) score += 4;
  
  return score;
}

/**
 * Calculate date of birth score
 */
function calculateDOBScore(r1: Resident, r2: Resident): number {
  if (!r1.dateOfBirth || !r2.dateOfBirth) return 0;
  
  // Exact match
  if (r1.dateOfBirth === r2.dateOfBirth) return 20;
  
  const date1 = new Date(r1.dateOfBirth);
  const date2 = new Date(r2.dateOfBirth);
  
  // Same year and month
  if (date1.getFullYear() === date2.getFullYear() && date1.getMonth() === date2.getMonth()) {
    return 15;
  }
  
  // Same year
  if (date1.getFullYear() === date2.getFullYear()) return 10;
  
  // Within 1 year
  const diffYears = Math.abs(date1.getFullYear() - date2.getFullYear());
  if (diffYears === 1) return 5;
  
  return 0;
}

/**
 * Calculate phone number score
 */
function calculatePhoneScore(r1: Resident, r2: Resident): number {
  if (!r1.phoneNumber || !r2.phoneNumber) return 0;
  
  // Normalize phone numbers (remove non-digits)
  const phone1 = r1.phoneNumber.replace(/\D/g, '');
  const phone2 = r2.phoneNumber.replace(/\D/g, '');
  
  // Exact match
  if (phone1 === phone2) return 15;
  
  // Check last 9 digits (Ethiopian format)
  const last9_1 = phone1.slice(-9);
  const last9_2 = phone2.slice(-9);
  
  if (last9_1 === last9_2) return 15;
  
  // High similarity
  const sim = stringSimilarity(last9_1, last9_2);
  if (sim > 0.9) return 12;
  if (sim > 0.8) return 8;
  if (sim > 0.7) return 5;
  
  return 0;
}

/**
 * Calculate address score
 */
function calculateAddressScore(r1: Resident, r2: Resident): number {
  let score = 0;
  
  // Same house number
  if (r1.address.houseNumber && r2.address.houseNumber) {
    if (r1.address.houseNumber === r2.address.houseNumber) score += 5;
  }
  
  // Same street
  if (r1.address.streetName && r2.address.streetName) {
    const streetSim = stringSimilarity(r1.address.streetName, r2.address.streetName);
    if (streetSim > 0.8) score += 3;
    else if (streetSim > 0.6) score += 1;
  }
  
  // Same subcity
  if (r1.address.subcity && r2.address.subcity) {
    if (r1.address.subcity === r2.address.subcity) score += 2;
  }
  
  return Math.min(score, 10);
}

/**
 * Calculate gender score
 */
function calculateGenderScore(r1: Resident, r2: Resident): number {
  return r1.gender === r2.gender ? 5 : 0;
}

/**
 * Calculate household overlap score
 */
function calculateHouseholdScore(r1: Resident, r2: Resident): number {
  if (!r1.householdId || !r2.householdId) return 0;
  return r1.householdId === r2.householdId ? 5 : 0;
}

// -------------------- Main Scoring Function --------------------

/**
 * Calculate complete duplicate score between two residents
 */
export function calculateDuplicateScore(
  r1: Resident,
  r2: Resident,
  options?: { faceSimilarity?: number },
): DuplicateScores {
  const nameScore = calculateNameScore(r1, r2);
  const phoneticScore = calculatePhoneticScore(r1, r2);
  const dobScore = calculateDOBScore(r1, r2);
  const phoneScore = calculatePhoneScore(r1, r2);
  const addressScore = calculateAddressScore(r1, r2);
  const genderScore = calculateGenderScore(r1, r2);
  const householdScore = calculateHouseholdScore(r1, r2);
  const normalizedFaceSimilarity =
    options?.faceSimilarity == null
      ? 0
      : options.faceSimilarity > 1
        ? Math.min(Math.max(options.faceSimilarity / 100, 0), 1)
        : Math.min(Math.max(options.faceSimilarity, 0), 1);
  const faceScore = normalizedFaceSimilarity * 20;
  
  const totalScore = nameScore + phoneticScore + dobScore + phoneScore + addressScore + genderScore + householdScore + faceScore;
  
  return {
    nameScore: Math.round(nameScore * 10) / 10,
    phoneticScore: Math.round(phoneticScore * 10) / 10,
    dobScore: Math.round(dobScore * 10) / 10,
    phoneScore: Math.round(phoneScore * 10) / 10,
    addressScore: Math.round(addressScore * 10) / 10,
    genderScore: Math.round(genderScore * 10) / 10,
    householdScore: Math.round(householdScore * 10) / 10,
    faceScore: Math.round(faceScore * 10) / 10,
    totalScore: Math.round(totalScore * 10) / 10,
  };
}

/**
 * Determine duplicate priority based on score
 */
export function getDuplicatePriority(score: number): 'low' | 'medium' | 'high' | 'critical' {
  if (score >= 90) return 'critical';
  if (score >= 80) return 'high';
  if (score >= 70) return 'medium';
  return 'low';
}

/**
 * Check if score meets duplicate threshold
 */
export function isDuplicateThreshold(score: number): boolean {
  return score >= 75;
}

/**
 * Find potential duplicates for a resident
 */
export function findPotentialDuplicates(
  resident: Resident,
  allResidents: Resident[],
  threshold: number = 75
): Array<{ resident: Resident; scores: DuplicateScores }> {
  const duplicates: Array<{ resident: Resident; scores: DuplicateScores }> = [];
  
  for (const other of allResidents) {
    // Skip self-comparison
    if (other.id === resident.id) continue;
    
    // Quick pre-filter: same gender
    if (other.gender !== resident.gender) continue;
    
    // Calculate full score
    const scores = calculateDuplicateScore(resident, other);
    
    if (scores.totalScore >= threshold) {
      duplicates.push({ resident: other, scores });
    }
  }
  
  // Sort by score descending
  return duplicates.sort((a, b) => b.scores.totalScore - a.scores.totalScore);
}
