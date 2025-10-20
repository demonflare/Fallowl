import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

let _pool: Pool | undefined;
let _db: ReturnType<typeof drizzle> | undefined;

function initializeDatabase() {
  if (!_pool || !_db) {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL must be set. Did you forget to provision a database?",
      );
    }
    
    _pool = new Pool({ connectionString: process.env.DATABASE_URL });
    _db = drizzle({ client: _pool, schema });
  }
  
  return { pool: _pool, db: _db };
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