import type { Script } from './types';

/**
 * Resolve whether a script can use its callbacks without an element.
 * @param script - The current script configuration.
 * @returns Whether the script currently needs only callbacks.
 * @internal
 */
export const isCallbackOnly = (script: Script): boolean => {
	const { callbackOnly } = script;
	return typeof callbackOnly === 'function'
		? callbackOnly()
		: callbackOnly === true;
};
