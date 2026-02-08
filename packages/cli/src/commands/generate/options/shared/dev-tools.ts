import * as p from '@clack/prompts';
import type { CliContext } from '~/context/types';

interface GetDevToolsOptionOptions {
	context: CliContext;
	handleCancel?: (value: unknown) => boolean;
	onCancel?: () => void;
}

export async function getDevToolsOption({
	context,
	handleCancel,
	onCancel,
}: GetDevToolsOptionOptions): Promise<boolean> {
	const isReactProject =
		context.framework.pkg === '@c15t/react' ||
		context.framework.pkg === '@c15t/nextjs';

	context.logger.info(
		'c15t DevTools helps you inspect consent state, scripts, and location overrides during development.'
	);
	context.logger.info('Learn more: https://c15t.com/docs/dev-tools/overview');

	const enableDevTools = await p.select({
		message: 'Install and enable c15t DevTools?',
		options: [
			{
				value: true,
				label: 'Yes (Recommended)',
				hint: isReactProject
					? 'Adds <C15TDevTools /> to generated consent components'
					: 'Adds createDevTools() setup to c15t.config.ts',
			},
			{
				value: false,
				label: 'No',
				hint: 'Skip DevTools installation and setup',
			},
		],
		initialValue: true,
	});

	const cancelled =
		handleCancel?.(enableDevTools) ?? p.isCancel(enableDevTools);

	if (cancelled) {
		if (onCancel) {
			onCancel();
		}

		context.error.handleCancel('Setup cancelled.', {
			command: 'onboarding',
			stage: 'dev_tools_option',
		});
	}

	return enableDevTools as boolean;
}
