import { H3Event } from 'h3';
import { C15TContext } from './context';

/**
 * Extended H3Event with C15T context
 */
export interface C15TEvent extends H3Event {
	context: C15TContext;
}
