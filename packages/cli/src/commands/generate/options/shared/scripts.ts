import * as p from '@clack/prompts';
import type { CliContext } from '~/context/types';

interface GetScriptsToAddOptions {
	context: CliContext;
	handleCancel?: (value: unknown) => boolean;
}

export async function getScriptsToAdd({
	context,
	handleCancel,
}: GetScriptsToAddOptions) {
	context.logger.info(
		'@c15t/scripts has various prebuilt scripts for you to use. Learn more: https://c15t.com/docs/integrations'
	);

	const addScriptsSelection = await p.confirm({
		message: 'Do you want to add @c15t/scripts to your project?',
		initialValue: true,
	});

	if (handleCancel?.(addScriptsSelection)) {
		context.error.handleCancel('Setup cancelled.', {
			command: 'onboarding',
			stage: 'self_hosted_proxy_nextjs_setup',
		});
	}

	return addScriptsSelection;
}
