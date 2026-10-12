import { isProductionBuild } from '../../libs/is-production';

/**
 * Log a save outbox warning in development builds. A save that did not reach
 * the backend otherwise only shows up in `onError`, if the app set one.
 *
 * @param message - The warning, starting with `[c15t]`.
 * @param error - What failed, logged after the message when given.
 * @internal
 */
export const warnInDevelopment = function warnInDevelopment(
	message: string,
	error?: unknown
): void {
	if (isProductionBuild()) {
		return;
	}
	if (error === undefined) {
		console.warn(message);
	} else {
		console.warn(message, error);
	}
};
