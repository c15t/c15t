/**
 * Record Entity Type Definitions
 *
 * This module contains type definitions specific to the record entity.
 */
import type { BaseEntityConfig } from '../types';

/**
 * Record entity configuration
 * @default entityName: "record", entityPrefix: "rec"
 */
export interface ConsentRecordEntityConfig extends BaseEntityConfig {
  fields?: Record<string, string> & {
    id?: string;
    subjectId?: string;
    consentId?: string;
    actionType?: string;
    details?: string;
    createdAt?: string;
  };
}
