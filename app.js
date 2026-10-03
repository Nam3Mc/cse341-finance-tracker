import express from 'express';
import cors from 'cors';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import swaggerUi from 'swagger-ui-express';
import { createRequire } from 'module';
import errorHandler from './middleware/errorHandler.js';
import apiRouter from './routes/index.js';
import { connectToDb } from './database/connect.js';
import authRouter from './routes/auth.js';
import passport from './config/passport.js';

const require = createRequire(import.meta.url);
const swaggerDocument = require('./swagger.json');

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(async (req, res, next) => {
  try {
    await connectToDb();
    next();
  } catch (error) {
    next(error);
  }
});

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'change-me-in-prod',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      dbName: process.env.MONGODB_DB_NAME,
      collectionName: 'sessions',
      ttl: 60 * 60 * 24,
    }),
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

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

app.get('/', (req, res) => {
  res.status(200).json({ message: 'Finance Tracker API is running' });
});

app.use('/api/auth', authRouter);

app.use('/api', apiRouter);

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use(errorHandler);

export default app;