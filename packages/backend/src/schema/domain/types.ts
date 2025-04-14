import type { ActiveEntityConfig } from '../types';

/**
 * Domain entity configuration
 * @default entityName: "domain", entityPrefix: "dom"
 */
export interface DomainEntityConfig extends ActiveEntityConfig {
  fields?: Record<string, string> & {
    id?: string;
    domain: string;
    /**
     * Indicates if the domain is a pattern (e.g., "true"/"false")
     * When true, the domain string will be interpreted as a pattern
     */
    isPattern?: string;
    /**
     * The type of pattern matching to apply
     * Valid values: "regex", "wildcard", "prefix", "suffix", "exact"
     */
    patternType?: string;
    parentDomainId?: string;
    description?: string;
    isActive?: string;
    createdAt?: string;
    updatedAt?: string;
  };
}
