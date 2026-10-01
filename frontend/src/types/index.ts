export type UserRole = 'ADMIN' | 'SRE_MANAGER' | 'RESPONDER' | 'OBSERVER';

export interface User {
  id: string;
  tenant_id: string;
  tenant_name?: string;
  email: string;
  full_name: string;
  role: UserRole;
}

export interface Incident {
  id: string;
  tenant_id: string;
  service_id: string;
  service_name?: string;
  assignee_name?: string;
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'TRIGGERED' | 'ACKNOWLEDGED' | 'RESOLVED';
  source: string;
  triggered_at: string;
  acknowledged_at?: string;
  resolved_at?: string;
}

export interface Service {
  id: string;
  name: string;
  slug: string;
  status: 'OPERATIONAL' | 'DEGRADED' | 'OUTAGE';
  tier: 'CRITICAL' | 'STANDARD' | 'LOW';
  open_incidents?: number;
}

export interface DashboardSummary {
  total: number;
  triggered: number;
  acknowledged: number;
  resolved: number;
}

export interface AnalyticsData {
  summary: DashboardSummary;
  sla_metrics: {
    mtta_minutes: number;
    mttr_minutes: number;
    sla_compliance_percent: number;
  };
  services_health: { status: string; count: number }[];
  incidents_by_severity: { severity: string; count: number }[];
}

export interface AuditLog {
  id: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  user_name?: string;
  user_email?: string;
  ip_address?: string;
  created_at: string;
}
