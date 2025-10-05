/**
 * @fileoverview Analytics types for c15t backend.
 * Re-exports core types and adds analytics-specific types.
 */

// Re-export core types
export * from './core-types';

/**
 * Event purpose mapping for consent validation.
 */
export const EVENT_PURPOSE_MAP = {
	track: 'measurement',
	page: 'measurement',
	identify: 'measurement',
	group: 'measurement',
	alias: 'measurement',
	consent: 'necessary', // Consent events always require necessary consent
} as const;

/**
 * Analytics event types.
 */
export type AnalyticsEventType = keyof typeof EVENT_PURPOSE_MAP;
