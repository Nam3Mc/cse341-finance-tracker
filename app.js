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

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get('/', (req, res) => {
  res.status(200).json({ message: 'Finance Tracker API is running' });
});

app.use('/api', apiRouter);

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use(errorHandler);

export default app;