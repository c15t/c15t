import * as p from '@clack/prompts';
import type { CliContext } from '~/context/types';

interface GetSSROptionOptions {
	context: CliContext;
	handleCancel?: (value: unknown) => boolean;
}

/**
 * Prompts the user to enable SSR data fetching for Next.js App Router.
 *
 * @remarks
 * SSR data fetching uses `fetchInitialData()` which requires Next.js `headers()` API.
 * This is a dynamic API that:
 * - Works in dynamic routes and server components
 * - Forces the route to be dynamically rendered
 * - Is not available during static generation
 *
 * @returns true if SSR should be enabled, false otherwise
 */
export async function getSSROption({
	context,
	handleCancel,
}: GetSSROptionOptions): Promise<boolean> {
	context.logger.info(
		'SSR data fetching pre-loads consent data on the server for faster hydration.'
	);
	context.logger.info(
		'Learn more: https://c15t.com/docs/frameworks/nextjs/ssr'
	);

	const enableSSR = await p.select({
		message: 'Enable SSR data fetching? (uses Next.js headers() API)',
		options: [
			{
				value: true,
				label: 'Yes (Recommended)',
				hint: 'Pre-fetch consent data on server for faster hydration',
			},
			{
				value: false,
				label: 'No',
				hint: 'Client-side only (for static sites or if headers() causes issues)',
			},
		],
		initialValue: true,
	});

	if (handleCancel?.(enableSSR)) {
		context.error.handleCancel('Setup cancelled.', {
			command: 'onboarding',
			stage: 'ssr_option',
		});
	}

	return enableSSR as boolean;
}
