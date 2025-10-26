import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

let _pool: Pool | undefined;
let _db: ReturnType<typeof drizzle> | undefined;
let _initError: Error | undefined;

function initializeDatabase() {
  if (!_pool || !_db) {
    if (!process.env.DATABASE_URL) {
      const error = new Error(
        "DATABASE_URL must be set. Did you forget to provision a database?",
      );
      _initError = error;
      throw error;
    }
    
    try {
      _pool = new Pool({ 
        connectionString: process.env.DATABASE_URL,
        connectionTimeoutMillis: 10000,
        max: 20,
      });
      _db = drizzle({ client: _pool, schema });
      console.log('✅ Database connection initialized successfully');
    } catch (error: any) {
      console.error('❌ Failed to initialize database:', error.message);
      
      // Enhanced error logging for DNS issues
      if (error.code === 'EAI_AGAIN' || error.message?.includes('getaddrinfo')) {
        console.error('🔍 DNS Resolution Error Details:');
        console.error('   - This typically means the database hostname cannot be resolved');
        console.error('   - Check your VPC/network configuration if on AWS');
        console.error('   - Ensure NAT Gateway is configured for private subnets');
        console.error('   - Verify VPC DNS resolution is enabled');
        console.error('   - DATABASE_URL:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@'));
      }
      
      _initError = error;
      throw error;
    }
  }
  
  return { pool: _pool, db: _db };
}

export function getDatabaseInitError(): Error | undefined {
  return _initError;
}

export const pool = new Proxy({} as Pool, {
  get(target, prop) {
    const { pool: poolInstance } = initializeDatabase();
    return (poolInstance as any)[prop];
  },
  set(target, prop, value) {
    const { pool: poolInstance } = initializeDatabase();
    (poolInstance as any)[prop] = value;
    return true;
  }
});

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(target, prop) {
    const { db: database } = initializeDatabase();
    return (database as any)[prop];
  },
  set(target, prop, value) {
    const { db: database } = initializeDatabase();
    (database as any)[prop] = value;
    return true;
  }
});