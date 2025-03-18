import { C15TContext } from './context';
import { C15TOptions } from './options';

/**
 * Plugin interface for extending functionality
 */
export interface C15TPlugin {
	name: string;
	setup: (context: C15TContext, options: C15TOptions) => void;
}
