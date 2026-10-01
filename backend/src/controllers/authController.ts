import { Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db/connection';
import { config } from '../config/env';
import { AuthRequest } from '../middleware/auth';

export async function registerUser(req: AuthRequest, res: Response) {
  const { tenant_name, email, password, full_name, role } = req.body;

  if (!email || !password || !full_name || !tenant_name) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Create Tenant
    const slug = tenant_name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const tenantRes = await client.query(
      `INSERT INTO tenants (name, slug) VALUES ($1, $2)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
       RETURNING id, name`,
      [tenant_name, slug]
    );
    const tenantId = tenantRes.rows[0].id;

    // 2. Hash Password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 3. Create User
    const userRole = role || 'ADMIN';
    const userRes = await client.query(
      `INSERT INTO users (tenant_id, email, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, tenant_id, email, full_name, role, created_at`,
      [tenantId, email, passwordHash, full_name, userRole]
    );

    const user = userRes.rows[0];

    // Seed default service & escalation policy for new tenant
    const serviceRes = await client.query(
      `INSERT INTO services (tenant_id, name, slug, status, tier)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [tenantId, 'Payment Gateway API', 'payment-gateway-api', 'OPERATIONAL', 'CRITICAL']
    );

    await client.query(
      `INSERT INTO escalation_policies (tenant_id, name, description)
       VALUES ($1, $2, $3)`,
      [tenantId, 'Default Critical Infrastructure Policy', 'Auto escalates P1 incidents to SRE Leads']
    );

    await client.query('COMMIT');

    const token = jwt.sign(
      { id: user.id, tenant_id: user.tenant_id, email: user.email, role: user.role },
      config.jwtSecret,
      { expiresIn: '24h' }
    );

    return res.status(201).json({
      message: 'Registration successful',
      token,
      user,
      tenant: tenantRes.rows[0]
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      return res.status(409).json({ error: 'User with this email already exists' });
    }
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}

export async function loginUser(req: AuthRequest, res: Response) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    const userRes = await pool.query(
      `SELECT u.*, t.name as tenant_name FROM users u
       JOIN tenants t ON u.tenant_id = t.id
       WHERE u.email = $1`,
      [email]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = userRes.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, tenant_id: user.tenant_id, email: user.email, role: user.role },
      config.jwtSecret,
      { expiresIn: '24h' }
    );

    return res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        tenant_id: user.tenant_id,
        tenant_name: user.tenant_name,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function getCurrentUser(req: AuthRequest, res: Response) {
  try {
    const userRes = await pool.query(
      `SELECT u.id, u.tenant_id, u.email, u.full_name, u.role, t.name as tenant_name
       FROM users u JOIN tenants t ON u.tenant_id = t.id
       WHERE u.id = $1`,
      [req.user?.id]
    );
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json({ user: userRes.rows[0] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
