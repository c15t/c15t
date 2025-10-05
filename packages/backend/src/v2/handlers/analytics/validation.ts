/**
 * @fileoverview Validation utilities for c15t analytics destinations.
 * Provides runtime validation without circular dependencies.
 */

import { z } from 'zod';
import type {
	AnalyticsConfig,
	DestinationConfig,
	DestinationFactory,
} from './core-types';

/**
 * Schema for validating destination registry.
 */
export const destinationRegistrySchema = z.record(z.string(), z.any());

/**
 * Schema for validating destination configuration.
 */
export const destinationConfigSchema = z.object({
	type: z.string().min(1, 'Destination type is required'),
	enabled: z.boolean(),
	settings: z.record(z.string(), z.unknown()),
});

/**
 * Schema for validating analytics configuration.
 */
export const analyticsConfigSchema = z.object({
	destinations: z.array(destinationConfigSchema),
	registry: z.record(z.string(), z.any()).optional(),
});

/**
 * Validate destination registry at runtime.
 */
export function validateDestinationRegistry(
	registry: unknown
): Record<string, DestinationFactory> {
	const result = destinationRegistrySchema.safeParse(registry);

	if (!result.success) {
		throw new Error(
			`Invalid destination registry: ${result.error.message}. ` +
				'Registry must be an object with string keys and factory function values.'
		);
	}

	return result.data as Record<string, DestinationFactory>;
}

/**
 * Validate destination configuration at runtime.
 */
export function validateDestinationConfig(config: unknown): DestinationConfig {
	const result = destinationConfigSchema.safeParse(config);

	if (!result.success) {
		throw new Error(
			`Invalid destination configuration: ${result.error.message}. ` +
				'Configuration must have type (string), enabled (boolean), and settings (object).'
		);
	}

	return result.data;
}

/**
 * Validate analytics configuration at runtime.
 */
export function validateAnalyticsConfig(config: unknown): AnalyticsConfig {
	const result = analyticsConfigSchema.safeParse(config);

	if (!result.success) {
		throw new Error(
			`Invalid analytics configuration: ${result.error.message}. ` +
				'Configuration must have destinations array and optional registry.'
		);
	}

	return result.data;
}

/**
 * Check if a destination type exists in the registry.
 */
export function destinationExists(
	type: string,
	registry: Record<string, DestinationFactory>
): boolean {
	return type in registry;
}

/**
 * Get available destination types from registry.
 */
export function getAvailableDestinationTypes(
	registry: Record<string, DestinationFactory>
): string[] {
	return Object.keys(registry);
}
