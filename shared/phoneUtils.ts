import { parsePhoneNumber, isValidPhoneNumber, CountryCode } from 'libphonenumber-js';

export interface NormalizedPhone {
  normalized: string;
  isValid: boolean;
  countryCode?: string;
  nationalNumber?: string;
  originalInput: string;
}

/**
 * Normalizes phone numbers to a consistent format: +<country_code><number>
 * Handles various input formats and applies intelligent country code detection
 */
export function normalizePhoneNumber(
  input: string, 
  defaultCountry: CountryCode = 'US'
): NormalizedPhone {
  if (!input) {
    return {
      normalized: '',
      isValid: false,
      originalInput: input
    };
  }

  // Clean the input - remove all non-digit characters except +
  let cleanInput = input.replace(/[^\d+]/g, '');
  
  // Remove leading zeros and "00" prefixes (international dialing prefixes)
  cleanInput = cleanInput.replace(/^00+/, '');
  cleanInput = cleanInput.replace(/^0+/, '');
  
  try {
    // Try to parse with libphonenumber-js
    const phoneNumber = parsePhoneNumber(cleanInput, defaultCountry);
    
    if (phoneNumber && phoneNumber.isValid()) {
      return {
        normalized: phoneNumber.format('E.164'),
        isValid: true,
        countryCode: phoneNumber.country,
        nationalNumber: phoneNumber.nationalNumber,
        originalInput: input
      };
    }
  } catch (error) {
    // If parsing fails, try manual normalization
  }

  // Manual normalization for edge cases
  let manualNormalized = cleanInput;
  
  // If no country code and looks like a US number (10 digits)
  if (manualNormalized.length === 10 && !manualNormalized.startsWith('+')) {
    manualNormalized = '+1' + manualNormalized;
  }
  // If no + prefix but has country code
  else if (manualNormalized.length > 10 && !manualNormalized.startsWith('+')) {
    manualNormalized = '+' + manualNormalized;
  }
  // If already has + prefix
  else if (!manualNormalized.startsWith('+') && manualNormalized.length > 0) {
    manualNormalized = '+' + manualNormalized;
  }

  // Validate the manually normalized number
  const isValid = manualNormalized.length >= 10 && isValidPhoneNumber(manualNormalized);

  return {
    normalized: manualNormalized,
    isValid,
    originalInput: input
  };
}

/**
 * Compares two phone numbers for equality after normalization
 */
export function arePhoneNumbersEqual(
  phone1: string, 
  phone2: string, 
  defaultCountry: CountryCode = 'US'
): boolean {
  const normalized1 = normalizePhoneNumber(phone1, defaultCountry);
  const normalized2 = normalizePhoneNumber(phone2, defaultCountry);
  
  return normalized1.isValid && 
         normalized2.isValid && 
         normalized1.normalized === normalized2.normalized;
}

/**
 * Formats a phone number for display purposes
 */
export function formatPhoneForDisplay(
  input: string, 
  defaultCountry: CountryCode = 'US'
): string {
  try {
    const phoneNumber = parsePhoneNumber(input, defaultCountry);
    if (phoneNumber && phoneNumber.isValid()) {
      return phoneNumber.formatNational();
    }
  } catch (error) {
    // Fallback to original input if formatting fails
  }
  
  return input;
}

/**
 * Test cases for phone number normalization
 */
export const testPhoneNormalization = () => {
  const testCases = [
    '1234567890',
    '091234567890', 
    '919876543210',
    '00919876543210',
    '000919876543210',
    '09876543210',
    '919123456789',
    '0919123456789',
    '00919123456789',
    '+1 (555) 123-4567',
    '555.123.4567',
    '(555) 123-4567'
  ];

  console.log('Phone Number Normalization Test Results:');
  testCases.forEach(test => {
    const result = normalizePhoneNumber(test);
    console.log(`Input: "${test}" -> Normalized: "${result.normalized}" (Valid: ${result.isValid})`);
  });
};