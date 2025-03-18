import type { H3Event } from 'h3';
import { logger } from '../utils/logger';
/**
 * Core context type for the C15T application
 */
export interface C15TContext {
	// Core properties
	baseURL: string;
	secret: string;
	logger: ReturnType<typeof logger>;
	// Add other properties as needed from the original implementation
}

/**
 * Configuration options for the C15T system
 */
export interface C15TOptions {
	// Basic configuration
	secret: string;
	baseURL?: string;
	// Add other configuration options as needed
}

/**
 * Plugin interface for extending functionality
 */
export interface C15TPlugin {
	name: string;
	setup: (context: C15TContext, options: C15TOptions) => void;
}

/**
 * Extended H3Event with C15T context
 */
export interface C15TEvent extends H3Event {
	context: C15TContext;
}
