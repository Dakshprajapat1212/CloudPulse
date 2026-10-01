import { Router } from 'express';
import { registerUser, loginUser, getCurrentUser } from '../controllers/authController';
import { createIncident, acknowledgeIncident, resolveIncident, listIncidents, getIncidentTimeline } from '../controllers/incidentController';
import { listServices, createService } from '../controllers/serviceController';
import { getDashboardAnalytics } from '../controllers/analyticsController';
import { listAuditLogs } from '../controllers/auditController';
import { authenticateJWT, authorizeRoles } from '../middleware/auth';

const router = Router();

// --- Auth Routes ---
router.post('/auth/register', registerUser);
router.post('/auth/login', loginUser);
router.get('/auth/me', authenticateJWT, getCurrentUser);

// --- Incident Routes ---
router.get('/incidents', authenticateJWT, listIncidents);
router.post('/incidents', authenticateJWT, authorizeRoles('ADMIN', 'SRE_MANAGER', 'RESPONDER'), createIncident);
router.put('/incidents/:id/acknowledge', authenticateJWT, authorizeRoles('ADMIN', 'SRE_MANAGER', 'RESPONDER'), acknowledgeIncident);
router.put('/incidents/:id/resolve', authenticateJWT, authorizeRoles('ADMIN', 'SRE_MANAGER', 'RESPONDER'), resolveIncident);
router.get('/incidents/:id/timeline', authenticateJWT, getIncidentTimeline);

// --- Services Routes ---
router.get('/services', authenticateJWT, listServices);
router.post('/services', authenticateJWT, authorizeRoles('ADMIN', 'SRE_MANAGER'), createService);

// --- Analytics & Dashboard Routes ---
router.get('/analytics/dashboard', authenticateJWT, getDashboardAnalytics);

// --- Audit Log Routes ---
router.get('/audit-logs', authenticateJWT, authorizeRoles('ADMIN', 'SRE_MANAGER'), listAuditLogs);

export default router;
