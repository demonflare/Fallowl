import dotenv from "dotenv";

// Load environment variables from .env file FIRST
dotenv.config();

// Global error handlers to prevent crashes from database connection issues
// MUST be set up before any database operations
process.on('uncaughtException', (error: Error) => {
  if (error.message?.includes('Connection terminated') || 
      error.message?.includes('endpoint has been disabled')) {
    console.error('⚠️ Database connection error (non-fatal, continuing):', error.message);
    return; // Don't exit
  }
  console.error('Fatal uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason: any) => {
  if (reason?.message?.includes('Connection terminated') || 
      reason?.message?.includes('endpoint has been disabled')) {
    console.error('⚠️ Database connection error (non-fatal, continuing):', reason.message);
    return; // Don't exit
  }
  console.error('Unhandled rejection:', reason);
});

import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { Pool } from "pg";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import { seedSmsData, seedLeadData, seedContactLists } from "./seedData";
import { seedDemoContacts } from "./seedContacts";
import { twilioWebhookVerifier } from "./services/twilioWebhookVerifier";
import { validateEnvironment, testDatabaseConnection } from "./env-validation";

// Validate environment before starting
const envValidation = validateEnvironment();
if (!envValidation.isValid) {
  console.error('\n❌ Environment validation failed!');
  console.error('Please fix the errors listed above before starting the application.\n');
  process.exit(1);
}

const app = express();

// Trust proxy - required for secure cookies to work behind load balancers/reverse proxies
app.set('trust proxy', 1);

// CORS configuration
const getAllowedOrigins = (): string[] => {
  if (process.env.NODE_ENV !== 'production') {
    return [];
  }
  
  // Collect origins from environment variables and split comma-separated values
  const originSources = [
    process.env.CLIENT_ORIGIN,
    process.env.REPLIT_DOMAINS,
    process.env.REPLIT_DEV_DOMAIN
  ].filter((origin): origin is string => Boolean(origin));
  
  // Split comma-separated origins and trim whitespace
  const allowedOrigins = originSources
    .flatMap(origin => origin.split(','))
    .map(origin => origin.trim())
    .filter(origin => origin.length > 0);
  
  if (allowedOrigins.length === 0) {
    console.warn('⚠️  No CORS origins configured for production.');
    console.warn('    Set CLIENT_ORIGIN environment variable to your domain (e.g., https://yourdomain.com)');
    console.warn('    Or set REPLIT_DOMAINS for Replit deployments');
    console.warn('    ⚠️  WARNING: Allowing all origins in production - this is insecure!');
  } else {
    console.log('✓ Production CORS origins configured:', allowedOrigins);
  }
  
  return allowedOrigins;
};

const allowedOrigins = getAllowedOrigins();

// Helper function to check if origin matches allowed patterns
function isOriginAllowed(origin: string, allowedOrigins: string[]): boolean {
  // Direct match
  if (allowedOrigins.includes(origin)) {
    return true;
  }
  
  // Check wildcard patterns (e.g., *.example.com, *.replit.dev)
  for (const allowed of allowedOrigins) {
    if (allowed.startsWith('*.')) {
      const domain = allowed.slice(2); // Remove *.
      if (origin.endsWith(domain) || origin.endsWith('.' + domain)) {
        return true;
      }
    }
  }
  
  return false;
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, Postman, server-to-server)
    if (!origin) {
      return callback(null, true);
    }
    
    // In development, allow all origins
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    // In production, check against allowed origins
    if (allowedOrigins.length === 0) {
      // No origins configured - allow all with warning (better than breaking in production)
      // Users should configure CLIENT_ORIGIN for security
      console.warn(`⚠️ CORS request from ${origin} allowed (no origins configured - INSECURE)`);
      return callback(null, true);
    }
    
    if (isOriginAllowed(origin, allowedOrigins)) {
      return callback(null, true);
    }
    
    console.warn(`⚠️ CORS request from ${origin} rejected - not in allowed origins: ${allowedOrigins.join(', ')}`);
    callback(new Error(`Origin ${origin} not allowed`), false);
  },
  credentials: true, // Allow cookies and authorization headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Validate required environment variables
if (!process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET environment variable must be set for security. Please set SESSION_SECRET before starting the application.');
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      // Truncate log lines to prevent log spam while allowing reasonable debugging info
      // 200 chars balances visibility with DoS protection on high-volume endpoints
      if (logLine.length > 200) {
        logLine = logLine.slice(0, 199) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Test database connection
  let dbConnected = false;
  if (process.env.DATABASE_URL) {
    dbConnected = await testDatabaseConnection();
    
    if (!dbConnected) {
      console.warn('⚠️  Using in-memory session store as fallback\n');
    }
  }
  
  // Configure session store based on database availability
  const isProduction = process.env.NODE_ENV === 'production';
  const sessionConfig = {
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: 'auto' as const,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: 'lax' as const
    },
    proxy: true
  };
  
  if (dbConnected) {
    console.log('✅ Using PostgreSQL session store');
    const PgSession = connectPgSimple(session);
    app.use(session({
      ...sessionConfig,
      store: new PgSession({
        conString: process.env.DATABASE_URL,
        createTableIfMissing: true,
        tableName: 'session',
      })
    }));
  } else {
    console.warn('⚠️  Database unavailable - using in-memory session store');
    console.warn('   Sessions will be lost on server restart.');
    console.warn('   To enable database: Go to Database tab → Enable/Resume your database\n');
    app.use(session(sessionConfig));
  }
  
  // Only run database-dependent operations if database is available
  if (dbConnected) {
    try {
      // Initialize default data (admin user and sample data)
      await storage.initializeDefaultData();
    } catch (error: any) {
      console.error("Error initializing default data:", error?.message || error);
    }
    
    try {
      // Seed SMS data (templates and campaigns)
      await seedSmsData();
    } catch (error: any) {
      console.error("Error seeding SMS data:", error?.message || error);
    }
    
    try {
      // Seed lead management data (sources, statuses, campaigns, leads)
      await seedLeadData();
    } catch (error: any) {
      console.error("Error seeding lead data:", error?.message || error);
    }
    
    try {
      // Seed demo contacts
      await seedDemoContacts();
    } catch (error: any) {
      console.error("Error seeding demo contacts:", error?.message || error);
    }
    
    try {
      // Seed contact lists
      await seedContactLists();
    } catch (error: any) {
      console.error("Error seeding contact lists:", error?.message || error);
    }
    
    try {
      // Automatically verify and update Twilio webhooks on startup
      await twilioWebhookVerifier.verifyAllWebhooks();
    } catch (error: any) {
      console.error("Error verifying Twilio webhooks:", error?.message || error);
    }
  } else {
    console.log('⏭️  Skipping database initialization - database unavailable');
  }
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})().catch((error: any) => {
  console.error('❌ Fatal startup error:', error);
  process.exit(1);
});
