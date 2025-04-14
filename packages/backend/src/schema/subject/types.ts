/**
 * Subject Entity Type Definitions
 *
 * This module contains type definitions specific to the subject entity.
 */
import type { TimestampedEntityConfig } from '../types';

/**
 * Subject entity configuration
 * @default entityName: "subject", entityPrefix: "sub"
 */
export interface SubjectEntityConfig extends TimestampedEntityConfig {
  fields?: Record<string, string> & {
    id?: string;
    isIdentified?: string;
    externalId?: string;
    identityProvider?: string;
    lastIpAddress?: string;
    createdAt?: string;
    updatedAt?: string;
  };
}
