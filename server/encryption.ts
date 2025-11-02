import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable must be set');
  }
  
  // If the key is exactly 64 hex characters (32 bytes in hex), convert from hex
  if (key.length === 64 && /^[0-9a-fA-F]{64}$/.test(key)) {
    return Buffer.from(key, 'hex');
  }
  
  // For any other format, derive a consistent key using PBKDF2
  // This ensures the same input always produces the same encryption key
  return crypto.pbkdf2Sync(key, 'replit-encryption-salt', 100000, KEY_LENGTH, 'sha512');
}

export function encrypt(text: string): string {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Return iv:authTag:encrypted as a single string
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

export function decrypt(encryptedData: string): string {
  try {
    const key = getEncryptionKey();
    const parts = encryptedData.split(':');
    
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

export function encryptCredential(value: string | null | undefined): string | null {
  if (!value || value.trim() === '') {
    return null;
  }
  return encrypt(value);
}

export function decryptCredential(encryptedValue: string | null | undefined): string | null {
  if (!encryptedValue) {
    return null;
  }
  try {
    return decrypt(encryptedValue);
  } catch (error) {
    console.warn('Failed to decrypt credential, returning null');
    return null;
  }
}

function generateDefaultKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
}

if (!process.env.ENCRYPTION_KEY) {
  const defaultKey = generateDefaultKey();
  console.warn('⚠️  ENCRYPTION_KEY not set. Using generated key for this session.');
  console.warn('⚠️  Set ENCRYPTION_KEY environment variable for production use.');
  process.env.ENCRYPTION_KEY = defaultKey;
}
