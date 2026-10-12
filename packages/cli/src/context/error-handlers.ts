import { CliError } from '../core/errors';
import { TelemetryEventName } from '../utils/telemetry';
import type { CliContext } from './types';

/** Throw errors at the command boundary; only the executable controls exit codes. */
export const createErrorHandlers = (
	context: Pick<CliContext, 'telemetry'>
) => ({
	handleCancel: (
		message = 'Operation cancelled.',
		details?: { command?: string; stage?: string }
	): never => {
		context.telemetry.trackEvent(TelemetryEventName.ONBOARDING_EXITED, {
			...details,
			reason: 'user_cancelled',
		});
		throw new CliError('CANCELLED', { details: message });
	},
	handleError: (error: unknown, _message: string): never => {
		throw CliError.from(error, 'UNKNOWN_ERROR');
	},
});
