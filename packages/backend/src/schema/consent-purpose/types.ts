import type { ActiveEntityConfig } from '../types';

/**
 * ConsentPurpose entity configuration
 * @default entityName: "consentPurpose", entityPrefix: "pur"
 */
export interface ConsentPurposeEntityConfig extends ActiveEntityConfig {
  fields?: Record<string, string> & {
    id?: string;
    name?: string;
    description?: string;
    isActive?: string;
    createdAt?: string;
    updatedAt?: string;
  };
}
