import { Response } from 'express';
import { pool } from '../db/connection';
import { AuthRequest } from '../middleware/auth';

export async function listAuditLogs(req: AuthRequest, res: Response) {
  const tenantId = req.user?.tenant_id;
  try {
    const logsRes = await pool.query(
      `SELECT a.*, u.full_name as user_name, u.email as user_email
       FROM audit_logs a
       LEFT JOIN users u ON a.user_id = u.id
       WHERE a.tenant_id = $1
       ORDER BY a.created_at DESC
       LIMIT 100`,
      [tenantId]
    );
    return res.json({ audit_logs: logsRes.rows });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
