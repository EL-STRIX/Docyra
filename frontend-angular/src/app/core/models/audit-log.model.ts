import { User } from './user.model';

export interface AuditLogEntry {
  _id: string;
  actorId?: string | User;
  actorRole: string;
  actorEmail?: string;
  action: string;
  targetType: string;
  targetId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}
