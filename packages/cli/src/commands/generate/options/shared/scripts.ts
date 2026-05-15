import { promptConfirm } from 'hexbus';
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

	const addScriptsSelection = await promptConfirm({
		cancel: 'silent',
		message: 'Do you want to add @c15t/scripts to your project?',
		initialValue: true,
		stage: 'scripts_addition',
		telemetry: context.telemetry,
	});

	if (handleCancel?.(addScriptsSelection)) {
		context.error.handleCancel('Setup cancelled.', {
			command: 'onboarding',
			stage: 'scripts_addition',
		});
	}

	return addScriptsSelection;
}
