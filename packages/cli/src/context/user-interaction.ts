import * as p from '@clack/prompts';

import { CliError } from '../core/errors';
import type { CliContext } from './types';

export const createUserInteraction = (
	context: Pick<CliContext, 'flags' | 'error'>,
	interaction = { confirm: p.confirm, isCancel: p.isCancel }
) => ({
	confirm: async (message: string, initialValue = false): Promise<boolean> => {
		if (context.flags.yes === true || context.flags.y === true) {
			return true;
		}
		if (context.flags['non-interactive'] === true) {
			throw new CliError('INPUT_REQUIRED', {
				details: `${message} Pass --yes to confirm.`,
			});
		}
		const result = await interaction.confirm({ initialValue, message });
		if (interaction.isCancel(result)) {
			return context.error.handleCancel();
		}
		return result;
	},
});
