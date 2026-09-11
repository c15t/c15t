import * as p from '@clack/prompts';
import color from 'picocolors';

export {
	createCliLogger,
	formatLogMessage,
	logMessage,
	validLogLevels as LOG_LEVELS,
	type LogLevel,
} from '../utils/logger';
export { color };
export const colors = {
	bold: color.bold,
	error: color.red,
	highlight: color.cyan,
	info: color.blue,
	muted: color.dim,
	success: color.green,
	underline: color.underline,
	warning: color.yellow,
} as const;
export const formatStep = (
	current: number,
	total: number,
	label: string
): string => `Step ${current}/${total}: ${label}`;
export interface Spinner {
	start: (message?: string) => void;
	stop: (message?: string) => void;
	message: (message: string) => void;
}
export const createSpinner = (initialMessage?: string): Spinner => {
	const spinner = p.spinner();
	return {
		message: (message) => spinner.message(message),
		start: (message) =>
			spinner.start(message ?? initialMessage ?? 'Processing...'),
		stop: (message) => spinner.stop(message ?? 'Done'),
	};
};
export const withSpinner = async <Value>(
	message: string,
	task: () => Promise<Value>,
	options?: { successMessage?: string; errorMessage?: string }
): Promise<Value> => {
	const spinner = createSpinner(message);
	spinner.start();
	try {
		const value = await task();
		spinner.stop(options?.successMessage);
		return value;
	} catch (error) {
		spinner.stop(options?.errorMessage ?? 'Failed');
		throw error;
	}
};
