import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config/env';
import { initDB, pool } from './db/connection';
import { logger } from './utils/logger';
import apiRoutes from './routes/api';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// Security Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate Limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' }
});
app.use('/api/', limiter);

// --- Health & Readiness Endpoints ---
app.get('/health', (req, res) => {
  res.json({ status: 'UP', service: 'cloudpulse-backend', timestamp: new Date().toISOString() });
});

app.get('/ready', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'READY', db: 'CONNECTED', timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(503).json({ status: 'UNREADY', db: 'DISCONNECTED', error: err.message });
  }
});

// API Routes
app.use('/api/v1', apiRoutes);

// Error Middleware
app.use(errorHandler);

// Start Server
if (process.env.NODE_ENV !== 'test') {
  initDB()
    .then(() => {
      app.listen(config.port, () => {
        logger.info(`CloudPulse Backend listening on port ${config.port} [${config.nodeEnv}]`);
      });
    })
    .catch((err) => {
      logger.error('Failed to start CloudPulse Backend:', err);
      process.exit(1);
    });
}

export default app;
