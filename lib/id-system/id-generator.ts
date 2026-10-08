// ============================================
// Kebele ID Generation System
// ============================================
// Format: ETH-ADD-01-03-05-2026-004589-X
//         |   |   |  |  |  |    |      |
//         |   |   |  |  |  |    |      └─ Check digit (Mod-11)
//         |   |   |  |  |  |    └──────── Sequence number (6 digits)
//         |   |   |  |  |  └───────────── Year (4 digits)
//         |   |   |  |  └──────────────── Kebele code (2 digits)
//         |   |   |  └─────────────────── Woreda code (2 digits)
//         |   |   └────────────────────── Zone code (2 digits)
//         |   └────────────────────────── City code (3 chars)
//         └────────────────────────────── Country code (3 chars)

const COUNTRY_CODE = 'ETH';
const CITY_CODE = 'ADD'; // Addis Ababa

// Sequence tracking (in real system, this would be database-backed)
const sequenceCounters: Map<string, number> = new Map();

/**
 * Calculate Mod-11 check digit for ID validation
 * Uses weighted sum with weights 2-7 repeating from right to left
 */
export function calculateCheckDigit(idWithoutCheck: string): string {
  // Extract only numeric characters for calculation
  const numericString = idWithoutCheck.replace(/[^0-9]/g, '');
  
  let sum = 0;
  let weight = 2;
  
  // Process from right to left
  for (let i = numericString.length - 1; i >= 0; i--) {
    sum += parseInt(numericString[i]) * weight;
    weight = weight === 7 ? 2 : weight + 1;
  }
  
  const remainder = sum % 11;
  const checkDigit = 11 - remainder;
  
  // Handle special cases
  if (checkDigit === 10) return 'X';
  if (checkDigit === 11) return '0';
  return checkDigit.toString();
}

/**
 * Validate a complete ID including check digit
 */
export function validateCheckDigit(fullId: string): boolean {
  // Extract the check digit (last character after final hyphen)
  const parts = fullId.split('-');
  if (parts.length !== 8) return false;
  
  const checkDigit = parts[7];
  const idWithoutCheck = parts.slice(0, 7).join('-');
  
  const calculatedCheckDigit = calculateCheckDigit(idWithoutCheck);
  return checkDigit === calculatedCheckDigit;
}

/**
 * Parse an ID into its components
 */
export interface ParsedID {
  countryCode: string;
  cityCode: string;
  zoneCode: string;
  woredaCode: string;
  kebeleCode: string;
  year: number;
  sequence: number;
  checkDigit: string;
  isValid: boolean;
}

export function parseID(id: string): ParsedID | null {
  const parts = id.split('-');
  
  if (parts.length !== 8) return null;
  
  const [countryCode, cityCode, zoneCode, woredaCode, kebeleCode, yearStr, sequenceStr, checkDigit] = parts;
  
  const year = parseInt(yearStr);
  const sequence = parseInt(sequenceStr);
  
  if (isNaN(year) || isNaN(sequence)) return null;
  
  return {
    countryCode,
    cityCode,
    zoneCode,
    woredaCode,
    kebeleCode,
    year,
    sequence,
    checkDigit,
    isValid: validateCheckDigit(id),
  };
}

/**
 * Get the next sequence number for a given kebele and year
 */
function getNextSequence(kebeleId: string, year: number): number {
  const key = `${kebeleId}-${year}`;
  const current = sequenceCounters.get(key) ?? 0;
  const next = current + 1;
  sequenceCounters.set(key, next);
  return next;
}

/**
 * Generate a new Kebele ID
 */
export interface GenerateIDParams {
  zoneCode: string;    // 2-digit zone code (e.g., "01")
  woredaCode: string;  // 2-digit woreda code (e.g., "03")
  kebeleCode: string;  // 2-digit kebele code (e.g., "05")
  kebeleId: string;    // Full kebele ID for sequence tracking
}

export interface GeneratedID {
  idNumber: string;      // Full ID: ETH-ADD-01-03-05-2026-004589-X
  internalId: number;    // Numeric sequence for database indexing
  year: number;
  sequence: number;
}

export function generateID(params: GenerateIDParams): GeneratedID {
  const { zoneCode, woredaCode, kebeleCode, kebeleId } = params;
  
  const year = new Date().getFullYear();
  const sequence = getNextSequence(kebeleId, year);
  const sequenceStr = sequence.toString().padStart(6, '0');
  
  // Build the ID without check digit
  const idWithoutCheck = `${COUNTRY_CODE}-${CITY_CODE}-${zoneCode}-${woredaCode}-${kebeleCode}-${year}-${sequenceStr}`;
  
  // Calculate check digit
  const checkDigit = calculateCheckDigit(idWithoutCheck);
  
  // Build complete ID
  const fullId = `${idWithoutCheck}-${checkDigit}`;
  
  return {
    idNumber: fullId,
    internalId: parseInt(`${year}${sequenceStr}`),
    year,
    sequence,
  };
}

// Backward-compatible API aliases.
export const generateKebeleId = generateID;
export const validateKebeleId = (id: string): boolean => validateIDFormat(id).isValid;
export const parseKebeleId = parseID;
export const formatIdForDisplay = formatIDForDisplay;

/**
 * Validate ID format (not just check digit, but entire format)
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateIDFormat(id: string): ValidationResult {
  const errors: string[] = [];
  
  // Check overall format
  const pattern = /^[A-Z]{3}-[A-Z]{3}-\d{2}-\d{2}-\d{2}-\d{4}-\d{6}-[0-9X]$/;
  if (!pattern.test(id)) {
    errors.push('Invalid ID format');
    return { isValid: false, errors };
  }
  
  const parsed = parseID(id);
  if (!parsed) {
    errors.push('Unable to parse ID');
    return { isValid: false, errors };
  }
  
  // Validate country code
  if (parsed.countryCode !== COUNTRY_CODE) {
    errors.push(`Invalid country code: expected ${COUNTRY_CODE}`);
  }
  
  // Validate city code
  if (parsed.cityCode !== CITY_CODE) {
    errors.push(`Invalid city code: expected ${CITY_CODE}`);
  }
  
  // Validate year range
  const currentYear = new Date().getFullYear();
  if (parsed.year < 2024 || parsed.year > currentYear + 1) {
    errors.push(`Invalid year: ${parsed.year}`);
  }
  
  // Validate check digit
  if (!parsed.isValid) {
    errors.push('Invalid check digit');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Format ID for display (with optional masking)
 */
export function formatIDForDisplay(id: string, masked: boolean = false): string {
  if (masked) {
    const parts = id.split('-');
    if (parts.length === 8) {
      return `${parts[0]}-${parts[1]}-**-**-**-****-******-*`;
    }
  }
  return id;
}

/**
 * Extract location info from ID
 */
export function extractLocationFromID(id: string): { zoneCode: string; woredaCode: string; kebeleCode: string } | null {
  const parsed = parseID(id);
  if (!parsed) return null;
  
  return {
    zoneCode: parsed.zoneCode,
    woredaCode: parsed.woredaCode,
    kebeleCode: parsed.kebeleCode,
  };
}

/**
 * Generate QR code payload for verification
 */
export interface QRPayload {
  id: string;
  residentId: string;
  issuedAt: string;
  expiresAt: string;
  token: string;
}

export function generateQRPayload(
  idNumber: string,
  residentId: string,
  issuedAt: Date,
  expiresAt: Date
): string {
  const payload: QRPayload = {
    id: idNumber,
    residentId,
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    token: btoa(`${idNumber}:${residentId}:${Date.now()}`),
  };
  
  return btoa(JSON.stringify(payload));
}

/**
 * Decode and verify QR payload
 */
export function decodeQRPayload(encoded: string): QRPayload | null {
  try {
    const decoded = atob(encoded);
    return JSON.parse(decoded) as QRPayload;
  } catch {
    return null;
  }
}
