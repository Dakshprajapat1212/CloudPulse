import { Response } from 'express';
import { pool } from '../db/connection';
import { AuthRequest } from '../middleware/auth';

export async function createIncident(req: AuthRequest, res: Response) {
  const tenantId = req.user?.tenant_id;
  const { service_id, title, severity, source, metadata } = req.body;

  if (!service_id || !title || !severity) {
    return res.status(400).json({ error: 'Missing required parameters (service_id, title, severity)' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Create Incident
    const incidentRes = await client.query(
      `INSERT INTO incidents (tenant_id, service_id, title, severity, status, source)
       VALUES ($1, $2, $3, $4, 'TRIGGERED', $5)
       RETURNING *`,
      [tenantId, service_id, title, severity, source || 'CLOUDWATCH']
    );
    const incident = incidentRes.rows[0];

    // 2. Add Initial Timeline Event
    await client.query(
      `INSERT INTO incident_timeline_events (incident_id, actor_type, actor_id, event_type, message, metadata)
       VALUES ($1, 'USER', $2, 'INCIDENT_TRIGGERED', $3, $4)`,
      [incident.id, req.user?.id, `Incident triggered manually or via webhook: ${title}`, JSON.stringify(metadata || {})]
    );

    // 3. Update Service Status if severity is CRITICAL or HIGH
    if (severity === 'CRITICAL') {
      await client.query(`UPDATE services SET status = 'OUTAGE' WHERE id = $1`, [service_id]);
    } else if (severity === 'HIGH') {
      await client.query(`UPDATE services SET status = 'DEGRADED' WHERE id = $1`, [service_id]);
    }

    // 4. Record Audit Log
    await client.query(
      `INSERT INTO audit_logs (tenant_id, user_id, action, resource_type, resource_id, ip_address)
       VALUES ($1, $2, 'TRIGGER_INCIDENT', 'INCIDENT', $3, $4)`,
      [tenantId, req.user?.id, incident.id, req.ip]
    );

    await client.query('COMMIT');
    return res.status(201).json({ incident });
  } catch (err: any) {
    await client.query('ROLLBACK');
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}

export async function acknowledgeIncident(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const userId = req.user?.id;
  const tenantId = req.user?.tenant_id;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const incidentRes = await client.query(
      `UPDATE incidents
       SET status = 'ACKNOWLEDGED', acknowledged_at = CURRENT_TIMESTAMP, assigned_to_user_id = $1
       WHERE id = $2 AND tenant_id = $3 AND status = 'TRIGGERED'
       RETURNING *`,
      [userId, id, tenantId]
    );

    if (incidentRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Incident not found or already acknowledged/resolved' });
    }

    const incident = incidentRes.rows[0];

    // Add Timeline Event
    await client.query(
      `INSERT INTO incident_timeline_events (incident_id, actor_type, actor_id, event_type, message)
       VALUES ($1, 'USER', $2, 'INCIDENT_ACKNOWLEDGED', 'Incident acknowledged and assigned to responder.')`,
      [incident.id, userId]
    );

    // Record Audit Log
    await client.query(
      `INSERT INTO audit_logs (tenant_id, user_id, action, resource_type, resource_id, ip_address)
       VALUES ($1, $2, 'ACKNOWLEDGE_INCIDENT', 'INCIDENT', $3, $4)`,
      [tenantId, userId, incident.id, req.ip]
    );

    await client.query('COMMIT');
    return res.json({ incident });
  } catch (err: any) {
    await client.query('ROLLBACK');
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}

export async function resolveIncident(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const userId = req.user?.id;
  const tenantId = req.user?.tenant_id;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const incidentRes = await client.query(
      `UPDATE incidents
       SET status = 'RESOLVED', resolved_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND tenant_id = $2 AND status IN ('TRIGGERED', 'ACKNOWLEDGED')
       RETURNING *`,
      [id, tenantId]
    );

    if (incidentRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Incident not found or already resolved' });
    }

    const incident = incidentRes.rows[0];

    // Reset Service status back to OPERATIONAL if no other active incidents remain
    const activeIncidents = await client.query(
      `SELECT count(*) FROM incidents WHERE service_id = $1 AND status IN ('TRIGGERED', 'ACKNOWLEDGED')`,
      [incident.service_id]
    );
    if (parseInt(activeIncidents.rows[0].count, 10) === 0) {
      await client.query(`UPDATE services SET status = 'OPERATIONAL' WHERE id = $1`, [incident.service_id]);
    }

    // Add Timeline Event
    await client.query(
      `INSERT INTO incident_timeline_events (incident_id, actor_type, actor_id, event_type, message)
       VALUES ($1, 'USER', $2, 'INCIDENT_RESOLVED', 'Incident marked resolved by responder.')`,
      [incident.id, userId]
    );

    // Record Audit Log
    await client.query(
      `INSERT INTO audit_logs (tenant_id, user_id, action, resource_type, resource_id, ip_address)
       VALUES ($1, $2, 'RESOLVE_INCIDENT', 'INCIDENT', $3, $4)`,
      [tenantId, userId, incident.id, req.ip]
    );

    await client.query('COMMIT');
    return res.json({ incident });
  } catch (err: any) {
    await client.query('ROLLBACK');
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}

export async function listIncidents(req: AuthRequest, res: Response) {
  const tenantId = req.user?.tenant_id;
  const { status, severity } = req.query;

  try {
    let query = `
      SELECT i.*, s.name as service_name, u.full_name as assignee_name
      FROM incidents i
      LEFT JOIN services s ON i.service_id = s.id
      LEFT JOIN users u ON i.assigned_to_user_id = u.id
      WHERE i.tenant_id = $1
    `;
    const params: any[] = [tenantId];

    if (status) {
      params.push(status);
      query += ` AND i.status = $${params.length}`;
    }
    if (severity) {
      params.push(severity);
      query += ` AND i.severity = $${params.length}`;
    }

    query += ` ORDER BY i.triggered_at DESC`;

    const resIncidents = await pool.query(query, params);
    return res.json({ incidents: resIncidents.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function getIncidentTimeline(req: AuthRequest, res: Response) {
  const { id } = req.params;
  try {
    const eventsRes = await pool.query(
      `SELECT e.*, u.full_name as actor_name
       FROM incident_timeline_events e
       LEFT JOIN users u ON e.actor_id = u.id
       WHERE e.incident_id = $1
       ORDER BY e.created_at ASC`,
      [id]
    );
    return res.json({ timeline: eventsRes.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
