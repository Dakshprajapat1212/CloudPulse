export type UserRole = 'ADMIN' | 'SRE_MANAGER' | 'RESPONDER' | 'OBSERVER';

export type ServiceStatus = 'OPERATIONAL' | 'DEGRADED' | 'OUTAGE';
export type ServiceTier = 'CRITICAL' | 'STANDARD' | 'LOW';

export type IncidentSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type IncidentStatus = 'TRIGGERED' | 'ACKNOWLEDGED' | 'RESOLVED';

export interface User {
  id: string;
  tenant_id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: UserRole;
  created_at: Date;
}

export interface Service {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  status: ServiceStatus;
  tier: ServiceTier;
  created_at: Date;
}

export interface EscalationPolicy {
  id: string;
  tenant_id: string;
  name: string;
  description: string;
  created_at: Date;
}

export interface Incident {
  id: string;
  tenant_id: string;
  service_id: string;
  policy_id?: string;
  assigned_to_user_id?: string;
  title: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  source: string;
  triggered_at: Date;
  acknowledged_at?: Date;
  resolved_at?: Date;
}

export interface IncidentTimelineEvent {
  id: string;
  incident_id: string;
  actor_type: 'USER' | 'SYSTEM_WORKER' | 'WEBHOOK';
  actor_id?: string;
  event_type: string;
  message: string;
  metadata?: any;
  created_at: Date;
}

export interface AuditLog {
  id: string;
  tenant_id: string;
  user_id?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  ip_address?: string;
  created_at: Date;
}
