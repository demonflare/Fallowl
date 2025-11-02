import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

let _pool: Pool | undefined;
let _db: ReturnType<typeof drizzle> | undefined;
let _initError: Error | undefined;
let _dbAvailable: boolean = false;
let _lastAttemptTime: number = 0;
let _retryDelayMs: number = 1000; // Start with 1 second
const MAX_RETRY_DELAY_MS = 60000; // Max 1 minute between retries

function initializeDatabase() {
  // If we failed before and haven't waited long enough, throw cached error
  const now = Date.now();
  const timeSinceLastAttempt = now - _lastAttemptTime;
  
  if (!_dbAvailable && _initError && timeSinceLastAttempt < _retryDelayMs) {
    // Still in backoff period, throw cached error without retrying
    throw _initError;
  }
  
  if (!_pool || !_db) {
    _lastAttemptTime = now;
    
    if (!process.env.DATABASE_URL) {
      const error = new Error(
        "DATABASE_URL must be set. Did you forget to provision a database?",
      );
      _initError = error;
      _dbAvailable = false;
      throw error;
    }
    
    try {
      _pool = new Pool({ 
        connectionString: process.env.DATABASE_URL,
        connectionTimeoutMillis: 10000,
        max: 20,
      });
      
      // Add error handler to prevent unhandled errors from crashing the app
      _pool.on('error', (err) => {
        console.error('🔴 Database pool error (non-fatal):', err.message);
        // Don't crash the app - just log the error
      });
      
      _db = drizzle({ client: _pool, schema });
      _dbAvailable = true;
      _retryDelayMs = 1000; // Reset backoff on success
      console.log('✅ Database connection initialized successfully');
    } catch (error: any) {
      // Only log DNS errors on first attempt or after significant time has passed
      const shouldLog = !_initError || timeSinceLastAttempt > 30000;
      
      if (shouldLog) {
        console.error('❌ Failed to initialize database:', error.message);
        
        // Enhanced error logging for DNS issues
        if (error.code === 'EAI_AGAIN' || error.message?.includes('getaddrinfo')) {
          console.error('🔍 DNS Resolution Error Details:');
          console.error('   - This typically means the database hostname cannot be resolved');
          console.error('   - Check your VPC/network configuration if on AWS');
          console.error('   - Ensure NAT Gateway is configured for private subnets');
          console.error('   - Verify VPC DNS resolution is enabled');
          console.error('   - DATABASE_URL:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@'));
          console.error(`   - Will retry in ${_retryDelayMs / 1000} seconds`);
        }
      }
      
      _initError = error;
      _dbAvailable = false;
      
      // Exponential backoff: double delay each time, up to max
      _retryDelayMs = Math.min(_retryDelayMs * 2, MAX_RETRY_DELAY_MS);
      
      throw error;
    }
  }
  
  return { pool: _pool, db: _db };
}

export function isDatabaseAvailable(): boolean {
  return _dbAvailable;
}

export function getDatabaseInitError(): Error | undefined {
  return _initError;
}

export const pool = new Proxy({} as Pool, {
  get(target, prop) {
    try {
      const { pool: poolInstance } = initializeDatabase();
      return (poolInstance as any)[prop];
    } catch (error) {
      // Return a no-op for most methods when DB is unavailable
      if (typeof prop === 'string' && ['query', 'connect', 'end'].includes(prop)) {
        return async () => {
          throw new Error('Database is not available. Please enable your database and restart the application.');
        };
      }
      return undefined;
    }
  },
  set(target, prop, value) {
    try {
      const { pool: poolInstance } = initializeDatabase();
      (poolInstance as any)[prop] = value;
      return true;
    } catch (error) {
      return false;
    }
  }
});

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(target, prop) {
    try {
      const { db: database } = initializeDatabase();
      return (database as any)[prop];
    } catch (error) {
      // Return a no-op for queries when DB is unavailable
      return () => {
        throw new Error('Database is not available. Please enable your database and restart the application.');
      };
    }
  },
  set(target, prop, value) {
    try {
      const { db: database } = initializeDatabase();
      (database as any)[prop] = value;
      return true;
    } catch (error) {
      return false;
    }
  }
});