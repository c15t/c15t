/**
 * @fileoverview Analytics types for c15t v2 system.
 * Re-exports analytics types for external consumption.
 */

import type {
	AnalyticsConsent,
	AnalyticsEvent,
	DestinationConfig,
} from '../handlers/analytics/types';

// Re-export analytics types from the v2 handlers
export type {
	AnalyticsConsent,
	AnalyticsEvent,
	DestinationConfig,
} from '../handlers/analytics/types';

// Additional analytics types that might be needed
export type AnalyticsEventType =
	| 'track'
	| 'page'
	| 'identify'
	| 'group'
	| 'alias';

export type ConsentPurpose =
	| 'necessary'
	| 'measurement'
	| 'marketing'
	| 'functionality'
	| 'experience';

export type TrackEventProperties = Record<string, unknown>;
export type PageEventProperties = Record<string, unknown>;
export type UserTraits = Record<string, unknown>;
export type GroupTraits = Record<string, unknown>;
export type BaseEventProperties = Record<string, unknown>;

// Analytics configuration types
export interface AnalyticsConfig {
	enabled: boolean;
	destinations: DestinationConfig[];
}

export interface AnalyticsState {
	consent: AnalyticsConsent;
	userId?: string;
	anonymousId: string;
	sessionId: string;
}

// Event options
export interface EventOptions {
	userId?: string;
	anonymousId?: string;
	sessionId?: string;
	timestamp?: string;
	context?: Record<string, unknown>;
}

// Upload types
export interface UploadRequest {
	events: AnalyticsEvent[];
	consent: AnalyticsConsent;
}

// Action types
export interface TrackAction {
	type: 'track';
	name: string;
	properties?: TrackEventProperties;
}

export interface PageAction {
	type: 'page';
	name?: string;
	properties?: PageEventProperties;
}

export interface IdentifyAction {
	type: 'identify';
	traits?: UserTraits;
}

export interface GroupAction {
	type: 'group';
	groupId: string;
	traits?: GroupTraits;
}

export interface AliasAction {
	type: 'alias';
	previousId: string;
}

export type CommonAction =
	| TrackAction
	| PageAction
	| IdentifyAction
	| GroupAction
	| AliasAction;

// Common properties
export interface CommonProperties {
	[key: string]: unknown;
}

// Uploader interface
export interface Uploader {
	upload(events: AnalyticsEvent[]): Promise<void>;
}

// Queue configuration
export interface QueueConfig {
	maxSize: number;
	flushInterval: number;
	retryAttempts: number;
}

// Constants
export const EVENT_PURPOSE_MAP = {
	track: 'measurement',
	page: 'measurement',
	identify: 'necessary',
	group: 'necessary',
	alias: 'necessary',
} as const;

export const DEFAULT_CONSENT: AnalyticsConsent = {
	necessary: true,
	measurement: false,
	marketing: false,
	functionality: false,
	experience: false,
};

export const DEFAULT_QUEUE_CONFIG: QueueConfig = {
	maxSize: 100,
	flushInterval: 10000,
	retryAttempts: 3,
};

export const DEFAULT_ANALYTICS_CONFIG: AnalyticsConfig = {
	enabled: true,
	destinations: [],
};
