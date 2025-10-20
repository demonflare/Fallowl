/**
 * Phone number utilities for formatting and validation
 * Uses libphonenumber-js for proper international phone number handling
 */
import { parsePhoneNumber, isValidPhoneNumber as isValidNumber, CountryCode } from 'libphonenumber-js';

// Remove all non-digit characters except + sign
export const cleanPhoneNumber = (input: string): string => {
  return input.replace(/[^\d+]/g, '');
};

/**
 * Format phone number for dialing (E.164 format)
 * Handles various input formats and applies smart country code logic:
 * - Numbers without country code: prepend +1 (US/Canada default)
 * - Numbers with country code: use as provided
 * - Handles formats like: 1234567890, (123) 456-7890, +91 98765 43210, 0044 7700 900123
 */
export const formatForDialing = (input: string): string => {
  if (!input) return '';
  
  // Clean the input first
  let cleaned = cleanPhoneNumber(input);
  
  // Handle special case: number starts with "00" (international prefix)
  // Convert 00 prefix to + (e.g., 0044 7700 900123 → +447700900123)
  if (cleaned.startsWith('00') && !cleaned.startsWith('000')) {
    cleaned = '+' + cleaned.substring(2);
  }
  
  try {
    // Try to parse with explicit country code detection
    if (cleaned.startsWith('+')) {
      // Number already has + prefix, parse as international
      const phoneNumber = parsePhoneNumber(cleaned);
      if (phoneNumber && phoneNumber.isValid()) {
        return phoneNumber.format('E.164');
      }
    }
    
    // Try parsing as US number first (default country code)
    try {
      const phoneNumber = parsePhoneNumber(cleaned, 'US');
      if (phoneNumber && phoneNumber.isValid()) {
        return phoneNumber.format('E.164');
      }
    } catch (e) {
      // Not a valid US number, continue
    }
    
    // If parsing as US failed, try as international without country assumption
    const phoneNumber = parsePhoneNumber('+' + cleaned);
    if (phoneNumber && phoneNumber.isValid()) {
      return phoneNumber.format('E.164');
    }
  } catch (error) {
    // If parsing fails, fall back to manual formatting
    console.debug('Phone number parsing failed, using fallback formatting:', error);
  }
  
  // Fallback: Manual formatting for edge cases
  // If already has +, return as is
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  
  // If 10 digits (US number without country code), add +1
  if (cleaned.length === 10 && cleaned.match(/^[2-9]/)) {
    return '+1' + cleaned;
  }
  
  // If 11 digits starting with 1 (US number with 1 prefix), add +
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return '+' + cleaned;
  }
  
  // For any other number without +, assume US and add +1
  if (cleaned.length > 0) {
    return '+1' + cleaned;
  }
  
  return cleaned;
};

/**
 * Format phone number for display (with nice formatting)
 * Shows numbers in a readable format while preserving the country code
 */
export const formatForDisplay = (input: string): string => {
  if (!input) return '';
  
  const cleaned = cleanPhoneNumber(input);
  
  if (cleaned.length === 0) return '';
  
  try {
    // Try to parse and format the number
    let phoneNumber;
    
    if (cleaned.startsWith('+')) {
      phoneNumber = parsePhoneNumber(cleaned);
    } else {
      // Default to US for numbers without country code
      phoneNumber = parsePhoneNumber(cleaned, 'US');
    }
    
    if (phoneNumber) {
      // Use international format for display
      return phoneNumber.formatInternational();
    }
  } catch (error) {
    // If parsing fails, use fallback formatting
  }
  
  // Fallback: Manual display formatting
  const digits = cleaned.replace('+', '');
  
  // Format US/Canada numbers (+1)
  if (digits.length >= 11 && digits.startsWith('1')) {
    const number = digits.substring(1);
    if (number.length >= 10) {
      return `+1 (${number.substring(0, 3)}) ${number.substring(3, 6)}-${number.substring(6, 10)}`;
    } else if (number.length >= 6) {
      return `+1 (${number.substring(0, 3)}) ${number.substring(3, 6)}-${number.substring(6)}`;
    } else if (number.length >= 3) {
      return `+1 (${number.substring(0, 3)}) ${number.substring(3)}`;
    } else {
      return `+1 (${number}`;
    }
  }
  
  // Format 10-digit US numbers (assume +1)
  if (digits.length === 10) {
    return `+1 (${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6)}`;
  }
  
  // For other numbers, just add + if needed
  if (cleaned.startsWith('+')) {
    return cleaned;
  } else if (digits.length > 0) {
    return '+' + digits;
  }
  
  return cleaned;
};

/**
 * Validate if phone number is complete and dialable
 */
export const isValidPhoneNumber = (number: string): boolean => {
  if (!number) return false;
  
  const cleaned = cleanPhoneNumber(number);
  
  try {
    // Try to validate using libphonenumber-js
    if (cleaned.startsWith('+')) {
      return isValidNumber(cleaned);
    }
    
    // Try as US number
    return isValidNumber(cleaned, 'US');
  } catch (error) {
    // Fallback validation
    if (!cleaned.startsWith('+')) return false;
    const digits = cleaned.substring(1);
    return digits.length >= 10 && !!digits.match(/^\d+$/);
  }
};

/**
 * Check if number has country code
 */
export const hasCountryCode = (number: string): boolean => {
  const cleaned = cleanPhoneNumber(number);
  return cleaned.startsWith('+') || cleaned.startsWith('00');
};

/**
 * Add default +1 country code if missing
 * @deprecated Use formatForDialing instead for better international support
 */
export const addDefaultCountryCode = (number: string): string => {
  return formatForDialing(number);
};
