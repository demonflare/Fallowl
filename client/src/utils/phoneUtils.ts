// Re-export the shared phone utilities for frontend use
export { 
  normalizePhoneNumber, 
  arePhoneNumbersEqual, 
  formatPhoneForDisplay,
  testPhoneNormalization,
  type NormalizedPhone 
} from '@shared/phoneUtils';