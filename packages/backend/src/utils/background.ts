import type { C15TContext } from '~/types';

/**
 * Executes non-critical work via configured background runner when available.
 * Falls back to fire-and-forget local execution.
 */
export function runInBackground(
	ctx: C15TContext,
	task: () => Promise<void>
): void {
	const wrappedTask = async () => {
		try {
			await task();
		} catch (error) {
			ctx.logger.warn('Background task failed', {
				error: error instanceof Error ? error.message : String(error),
			});
		}
	};

	if (ctx.background?.run) {
		ctx.background.run(wrappedTask);
		return;
	}

	void wrappedTask();
}
