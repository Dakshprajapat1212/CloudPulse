import dotenv from 'dotenv';
import { Pool } from 'pg';
import Redis from 'ioredis';
import winston from 'winston';

dotenv.config();

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  defaultMeta: { service: 'cloudpulse-worker' },
  transports: [new winston.transports.Console()]
});

const dbPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'cloudpulse_db',
  user: process.env.DB_USER || 'cloudpulse_admin',
  password: process.env.DB_PASSWORD || 'cloudpulse_password',
});

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  lazyConnect: true
});

async function processSLAEscalations() {
  try {
    // Find incidents in 'TRIGGERED' state that have been unacknowledged for > 15 minutes
    const unackIncidents = await dbPool.query(`
      SELECT i.id, i.tenant_id, i.title, i.severity, i.triggered_at
      FROM incidents i
      WHERE i.status = 'TRIGGERED'
        AND i.triggered_at < NOW() - INTERVAL '15 minutes'
    `);

    for (const incident of unackIncidents.rows) {
      logger.warn(`SLA Breach Detected: Auto Escalating Incident ${incident.id} [${incident.title}]`);

      // Add automated timeline event
      await dbPool.query(`
        INSERT INTO incident_timeline_events (incident_id, actor_type, event_type, message)
        VALUES ($1, 'SYSTEM_WORKER', 'AUTO_ESCALATION_TRIGGERED', 'SLA breach (>15m unacknowledged). Auto-escalated to SRE Tier 2.')
      `, [incident.id]);

      // Record System Audit Log
      await dbPool.query(`
        INSERT INTO audit_logs (tenant_id, action, resource_type, resource_id)
        VALUES ($1, 'AUTO_ESCALATE_SLA_BREACH', 'INCIDENT', $2)
      `, [incident.tenant_id, incident.id]);
    }
  } catch (err) {
    logger.error('Worker SLA Escalation Processing Error:', err);
  }
}

async function startWorker() {
  logger.info('CloudPulse Asynchronous Escalation Worker starting up...');
  try {
    await redis.connect();
    logger.info('Connected to Redis Queue engine successfully.');
  } catch (e) {
    logger.warn('Redis connection deferred or unavailable, operating in polling mode.');
  }

  // Run SLA Escalation Loop every 30 seconds
  setInterval(processSLAEscalations, 30000);
  processSLAEscalations();
}

startWorker();
