/**
 * Audit Log Entity Type Definitions
 *
 * This module contains type definitions specific to the audit log entity.
 */
import type { BaseEntityConfig } from '../types';

/**
 * Audit log entity configuration
 * @default {entityName: "auditLog", entityPrefix: "log"}
 *
 * These defaults are applied when creating an audit log entity if not explicitly specified.
 * See the entity creation utilities for implementation details.
 */
export interface AuditLogEntityConfig extends BaseEntityConfig {
  fields?: Record<string, string> & {
    id?: string;
    timestamp: string;
    action: string;
    subjectId?: string;
    resourceType: string;
    resourceId?: string;
    actor?: string;
    changes?: string;
    deviceInfo?: string;
    ipAddress?: string;
    createdAt?: string;
  };
}
