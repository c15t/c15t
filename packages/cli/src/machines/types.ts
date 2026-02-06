/**
 * Shared types for CLI state machines
 *
 * Base types and interfaces used across all state machines in the CLI.
 */

import type { Snapshot } from 'xstate';

/**
 * Base context fields shared across all machines
 */
export interface BaseMachineContext {
	/** Errors accumulated during execution */
	errors: MachineError[];
	/** History of state transitions for debugging/telemetry */
	stateHistory: StateHistoryEntry[];
}

/**
 * Error tracked during machine execution
 */
export interface MachineError {
	/** State where error occurred */
	state: string;
	/** The error object */
	error: Error;
	/** Timestamp when error occurred */
	timestamp: number;
}

/**
 * Entry in state history for telemetry
 */
export interface StateHistoryEntry {
	/** State name */
	state: string;
	/** Entry timestamp */
	timestamp: number;
	/** Optional event that caused transition */
	event?: string;
}

/**
 * File modification tracking for rollback
 */
export interface FileModification {
	/** Path to the file */
	path: string;
	/** Original content (for restoring) */
	backup: string;
	/** Type of modification */
	type: 'created' | 'modified';
}

/**
 * Common events that all machines should handle
 */
export type CommonEvents =
	| { type: 'CANCEL' }
	| { type: 'RETRY' }
	| { type: 'RESET' };

/**
 * Snapshot type for persistence
 */
export type PersistedSnapshot<TContext, TStateValue> = Snapshot<unknown> & {
	context: TContext;
	value: TStateValue;
};

/**
 * Result of an async actor operation
 */
export type ActorResult<T> =
	| { success: true; data: T }
	| { success: false; error: Error };

/**
 * Configuration for state machine execution
 */
export interface MachineExecutionConfig {
	/** Enable verbose logging */
	debug?: boolean;
	/** Enable state persistence for resume */
	persist?: boolean;
	/** Path for persistence file */
	persistPath?: string;
	/** Enable telemetry tracking */
	trackTelemetry?: boolean;
}

/**
 * Result of running a state machine to completion
 */
export interface MachineExecutionResult<TContext> {
	/** Whether execution completed successfully */
	success: boolean;
	/** Final context */
	context: TContext;
	/** Final state value */
	finalState: string;
	/** Total execution time in ms */
	duration: number;
	/** Errors encountered during execution */
	errors: MachineError[];
}
