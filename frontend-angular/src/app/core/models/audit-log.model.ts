import { User } from './user.model';

export interface AuditLogActor {
  _id?: string;
  name?: string;
  email?: string;
  role?: string;
}

export interface AuditLogStats {
  totalEvents: number;
  adminEvents: number;
  systemEvents: number;
  securityEvents: number;
  distinctActors: number;
}

export interface AuditLogEntry {
  _id: string;
  id?: string;
  actorId?: string | AuditLogActor | User;
  actorName?: string;
  actorEmail?: string;
  actorRole: string;
  action: string;
  resourceType?: string;
  targetType?: string;
  resourceId?: string;
  targetId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  timestamp: string | Date;
  createdAt?: string | Date;
}
