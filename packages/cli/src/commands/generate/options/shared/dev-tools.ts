/* oxlint-disable func-style -- This prompt remains an async declaration to match the option helpers around it. */
import * as p from '@clack/prompts';

import type { CliContext } from '~/context/types';

export const getDevToolsDocsPath = (
	pkg: CliContext['framework']['pkg']
): string => {
	if (pkg === 'c15t') {
		return 'frameworks/javascript/dev-tools';
	}
	return `frameworks/${pkg === 'c15t/next' ? 'next' : 'react'}/components/dev-tools`;
};

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

	context.logger.info(
		'c15t DevTools helps you inspect consent state, policy, location, and kernel events during development.'
	);
	context.logger.info(
		`Learn more: https://c15t.com/docs/${getDevToolsDocsPath(context.framework.pkg)}`
	);

	const enableDevTools = await p.select({
		initialValue: true,
		message: 'Enable c15t DevTools?',
		options: [
			{
				hint: isReactProject
					? 'Adds <DevTools /> to generated consent components'
					: 'Adds createDevTools({ kernel }) to the client configuration',
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
