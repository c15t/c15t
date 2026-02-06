/**
 * Spinner and progress indicator utilities
 */

import * as p from '@clack/prompts';
import color from 'picocolors';

export interface TaskSpinner {
	start(message?: string): void;
	stop(message?: string): void;
	message(message: string): void;
	success(message: string): void;
	error(message: string): void;
}

/**
 * Create a spinner for long-running operations
 */
export function createTaskSpinner(initialMessage?: string): TaskSpinner {
	const spinner = p.spinner();
	let isRunning = false;

	return {
		start(message?: string): void {
			if (!isRunning) {
				spinner.start(message || initialMessage || 'Processing...');
				isRunning = true;
			}
		},

		stop(message?: string): void {
			if (isRunning) {
				spinner.stop(message || 'Done');
				isRunning = false;
			}
		},

		message(message: string): void {
			if (isRunning) {
				spinner.message(message);
			}
		},

		success(message: string): void {
			if (isRunning) {
				spinner.stop(color.green('✓') + ' ' + message);
				isRunning = false;
			}
		},

		error(message: string): void {
			if (isRunning) {
				spinner.stop(color.red('✗') + ' ' + message);
				isRunning = false;
			}
		},
	};
}

/**
 * Run an async task with a spinner
 */
export async function withTaskSpinner<T>(
	message: string,
	task: () => Promise<T>,
	options?: {
		successMessage?: string | ((result: T) => string);
		errorMessage?: string | ((error: unknown) => string);
	}
): Promise<T> {
	const spinner = createTaskSpinner(message);
	spinner.start();

	try {
		const result = await task();
		const successMsg =
			typeof options?.successMessage === 'function'
				? options.successMessage(result)
				: options?.successMessage || 'Done';
		spinner.success(successMsg);
		return result;
	} catch (error) {
		const errorMsg =
			typeof options?.errorMessage === 'function'
				? options.errorMessage(error)
				: options?.errorMessage || 'Failed';
		spinner.error(errorMsg);
		throw error;
	}
}

/**
 * Progress bar for multi-step operations
 */
export interface ProgressBar {
	update(current: number, message?: string): void;
	complete(message?: string): void;
}

/**
 * Create a progress bar
 */
export function createProgressBar(total: number, label?: string): ProgressBar {
	let lastCurrent = 0;

	function render(current: number, message?: string): string {
		const percentage = Math.round((current / total) * 100);
		const filled = Math.round((current / total) * 20);
		const empty = 20 - filled;

		const bar = color.green('█'.repeat(filled)) + color.dim('░'.repeat(empty));
		const progress = `${current}/${total}`;
		const msg = message || label || '';

		return `[${bar}] ${progress} (${percentage}%) ${msg}`;
	}

	return {
		update(current: number, message?: string): void {
			lastCurrent = current;
			p.log.step(render(current, message));
		},

		complete(message?: string): void {
			p.log.step(render(total, message || 'Complete'));
		},
	};
}

/**
 * Step indicator for multi-step workflows
 */
export interface StepIndicator {
	current: number;
	total: number;
	next(label: string): void;
	complete(): void;
}

/**
 * Create a step indicator
 */
export function createStepIndicator(steps: string[]): StepIndicator {
	let current = 0;
	const total = steps.length;

	function render(step: number, label: string): void {
		const filled = color.green('█'.repeat(step));
		const empty = color.dim('░'.repeat(total - step));
		p.log.step(`[${filled}${empty}] Step ${step}/${total}: ${label}`);
	}

	return {
		get current() {
			return current;
		},
		get total() {
			return total;
		},

		next(label: string): void {
			current++;
			render(current, label);
		},

		complete(): void {
			p.log.step(color.green(`✓ All ${total} steps completed`));
		},
	};
}

/**
 * Task group for running multiple tasks
 */
export interface TaskGroup {
	add(name: string, task: () => Promise<void>): void;
	run(): Promise<{ success: string[]; failed: string[] }>;
}

/**
 * Create a task group
 */
export function createTaskGroup(): TaskGroup {
	const tasks: Array<{ name: string; task: () => Promise<void> }> = [];

	return {
		add(name: string, task: () => Promise<void>): void {
			tasks.push({ name, task });
		},

		async run(): Promise<{ success: string[]; failed: string[] }> {
			const success: string[] = [];
			const failed: string[] = [];

			for (const { name, task } of tasks) {
				const spinner = createTaskSpinner(name);
				spinner.start();

				try {
					await task();
					spinner.success(name);
					success.push(name);
				} catch (error) {
					spinner.error(name);
					failed.push(name);
				}
			}

			return { success, failed };
		},
	};
}
