import { Pool } from 'pg';
import { config } from '../config/env';
import { logger } from '../utils/logger';

export const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.database,
  user: config.db.user,
  password: config.db.password,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export async function initDB() {
  const client = await pool.connect();
  try {
    logger.info('Initializing PostgreSQL Schema Migrations for CloudPulse...');
    await client.query('BEGIN');

    // 1. Tenants Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tenants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Users Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL CHECK (role IN ('ADMIN', 'SRE_MANAGER', 'RESPONDER', 'OBSERVER')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Services Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS services (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'OPERATIONAL' CHECK (status IN ('OPERATIONAL', 'DEGRADED', 'OUTAGE')),
        tier VARCHAR(50) DEFAULT 'CRITICAL' CHECK (tier IN ('CRITICAL', 'STANDARD', 'LOW')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tenant_id, slug)
      );
    `);

    // 4. Escalation Policies Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS escalation_policies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. Incidents Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS incidents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
        service_id UUID REFERENCES services(id) ON DELETE CASCADE,
        policy_id UUID REFERENCES escalation_policies(id) ON DELETE SET NULL,
        assigned_to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        title VARCHAR(255) NOT NULL,
        severity VARCHAR(50) NOT NULL CHECK (severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
        status VARCHAR(50) NOT NULL DEFAULT 'TRIGGERED' CHECK (status IN ('TRIGGERED', 'ACKNOWLEDGED', 'RESOLVED')),
        source VARCHAR(100) DEFAULT 'CLOUDWATCH',
        triggered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        acknowledged_at TIMESTAMP WITH TIME ZONE,
        resolved_at TIMESTAMP WITH TIME ZONE
      );
    `);

    // 6. Incident Timeline Events Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS incident_timeline_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
        actor_type VARCHAR(50) NOT NULL CHECK (actor_type IN ('USER', 'SYSTEM_WORKER', 'WEBHOOK')),
        actor_id UUID,
        event_type VARCHAR(100) NOT NULL,
        message TEXT NOT NULL,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 7. Audit Logs Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        resource_type VARCHAR(100) NOT NULL,
        resource_id UUID,
        ip_address VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create indexes for analytical performance
    await client.query(`CREATE INDEX IF NOT EXISTS idx_incidents_tenant_status ON incidents(tenant_id, status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_incidents_service ON incidents(service_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_timeline_incident ON incident_timeline_events(incident_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs(tenant_id);`);

    await client.query('COMMIT');
    logger.info('PostgreSQL Tables & Indexes created successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Error initializing database tables:', err);
    throw err;
  } finally {
    client.release();
  }
}
