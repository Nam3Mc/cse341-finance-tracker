// api/index.js
import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { createRequire } from 'module';
import { MongoClient } from 'mongodb';

// ─────────────────────────────────────────────
// Load swagger.json (CommonJS require works in ESM via createRequire)
// ─────────────────────────────────────────────
const require = createRequire(import.meta.url);
const swaggerDocument = require('../swagger.json');

// ─────────────────────────────────────────────
// Routes & middleware
// ─────────────────────────────────────────────
import apiRouter from '../routes/index.js';
import errorHandler from '../middleware/errorHandler.js';

// ─────────────────────────────────────────────
// MongoDB connection (serverless-safe)
// Reuses the client across warm invocations of the same Lambda
// ─────────────────────────────────────────────
let cachedClient = null;
let cachedDb = null;

async function connectToDb() {
  if (cachedDb) return cachedDb;

  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME;

  if (!uri) throw new Error('MONGODB_URI is required.');
  if (!dbName) throw new Error('MONGODB_DB_NAME is required.');

  if (!cachedClient) {
    cachedClient = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
    await cachedClient.connect();
  }

  cachedDb = cachedClient.db(dbName);
  console.log(`✅ MongoDB connected: ${dbName}`);
  return cachedDb;
}

// ─────────────────────────────────────────────
// Express app
// ─────────────────────────────────────────────
const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─────────────────────────────────────────────
// Ensure DB is connected before every API request
// (serverless functions can cold-start, so we lazily connect)
// ─────────────────────────────────────────────
app.use(async (req, res, next) => {
  try {
    await connectToDb();
    next();
  } catch (err) {
    console.error('❌ DB connect failed:', err.message);
    res.status(500).json({ message: 'Database connection failed' });
  }
});

// ─────────────────────────────────────────────
// Swagger UI — load assets from CDN so Vercel
// doesn't 404 on node_modules static files
// ─────────────────────────────────────────────
const SWAGGER_CSS_URL =
  'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css';
const SWAGGER_JS_URLS = [
  'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.js',
  'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.js',
];

// Serve the OpenAPI JSON at its own endpoint
app.get('/docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerDocument);
});

// Serve Swagger UI HTML, pointing at CDN assets and the JSON endpoint
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument, {
    customCssUrl: SWAGGER_CSS_URL,
    customJs: SWAGGER_JS_URLS,
    swaggerOptions: {
      url: '/docs.json',
      persistAuthorization: true,
    },
  })
);

// ─────────────────────────────────────────────
// Health check
// ─────────────────────────────────────────────
app.get('/', (req, res) => {
  res.status(200).json({ message: 'Finance Tracker API is running' });
});

// ─────────────────────────────────────────────
// API routes
// ─────────────────────────────────────────────
app.use('/api', apiRouter);

// ─────────────────────────────────────────────
// 404 handler
// ─────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// ─────────────────────────────────────────────
// Centralized error handler
// ─────────────────────────────────────────────
app.use(errorHandler);

// ─────────────────────────────────────────────
// Export for Vercel
// ─────────────────────────────────────────────
export default app;