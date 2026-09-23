import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { createRequire } from 'module';
import errorHandler from './middleware/errorHandler.js';
import apiRouter from './routes/index.js';

// Load JSON via require-style since ESM JSON import needs a flag
const require = createRequire(import.meta.url);
const swaggerDocument = require('./swagger.json');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Swagger UI with CDN assets ───
// app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
const SWAGGER_CSS_URL =
  'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css';
const SWAGGER_JS_URLS = [
  'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.js',
  'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.js',
];

app.get('/docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerDocument);
});

app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument, {
    customCssUrl: SWAGGER_CSS_URL,
    customJs: SWAGGER_JS_URLS,
    swaggerOptions: { url: '/docs.json' },
  })
);
// ─── Swagger UI with CDN assets ───

app.get('/', (req, res) => {
  res.status(200).json({ message: 'Finance Tracker API is running' });
});

app.use('/api', apiRouter);

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use(errorHandler);

export default app;