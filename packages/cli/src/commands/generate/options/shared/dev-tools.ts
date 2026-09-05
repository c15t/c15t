/* oxlint-disable func-style -- This prompt remains an async declaration to match the option helpers around it. */
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
		context.framework.pkg === 'c15t/react' ||
		context.framework.pkg === 'c15t/next';
	const docsFramework =
		context.framework.pkg === 'c15t/next' ? 'next' : 'react';

	context.logger.info(
		'c15t DevTools helps you inspect consent state, policy, location, and kernel events during development.'
	);
	context.logger.info(
		`Learn more: https://c15t.com/docs/frameworks/${docsFramework}/components/dev-tools`
	);

	const enableDevTools = await p.select({
		initialValue: true,
		message: 'Enable c15t DevTools?',
		options: [
			{
				hint: isReactProject
					? 'Adds <DevTools /> to generated consent components'
					: 'Adds the framework DevTools adapter',
				label: 'Yes (Recommended)',
				value: true,
			},
			{
				hint: 'Skip DevTools setup',
				label: 'No',
				value: false,
			},
		],
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
