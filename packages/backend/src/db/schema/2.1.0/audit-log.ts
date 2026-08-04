import { type AuditLog, auditLogSchema } from '@c15t/schema';
import { auditLogTable as previousAuditLogTable } from '../2.0.0/audit-log';

export const auditLogTable = previousAuditLogTable.clone();

export { type AuditLog, auditLogSchema };
