import { Response } from 'express';
import { pool } from '../db/connection';
import { AuthRequest } from '../middleware/auth';

export async function listServices(req: AuthRequest, res: Response) {
  const tenantId = req.user?.tenant_id;
  try {
    const servicesRes = await pool.query(
      `SELECT s.*,
         (SELECT count(*) FROM incidents i WHERE i.service_id = s.id AND i.status IN ('TRIGGERED', 'ACKNOWLEDGED')) as open_incidents
       FROM services s
       WHERE s.tenant_id = $1
       ORDER BY s.name ASC`,
      [tenantId]
    );
    return res.json({ services: servicesRes.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function createService(req: AuthRequest, res: Response) {
  const tenantId = req.user?.tenant_id;
  const { name, tier } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Service name is required' });
  }

  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
  try {
    const serviceRes = await pool.query(
      `INSERT INTO services (tenant_id, name, slug, status, tier)
       VALUES ($1, $2, $3, 'OPERATIONAL', $4)
       RETURNING *`,
      [tenantId, name, slug, tier || 'CRITICAL']
    );
    return res.status(201).json({ service: serviceRes.rows[0] });
  } catch (err: any) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Service with this name already exists' });
    }
    return res.status(500).json({ error: err.message });
  }
}
