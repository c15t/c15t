import type { CliContext } from '../context/types';

/** Keep the interactive introduction short and omit it from automation output. */
export const displayIntro = (
	context: CliContext,
	version: string
): Promise<void> => {
	if (context.flags['non-interactive'] !== true) {
		context.logger.message(`c15t ${version}`);
	}
	return Promise.resolve();
};
