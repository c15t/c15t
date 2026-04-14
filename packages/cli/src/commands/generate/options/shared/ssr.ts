import * as p from '@clack/prompts';
import type { CliContext } from '~/context/types';

interface GetSSROptionOptions {
	context: CliContext;
	handleCancel?: (value: unknown) => boolean;
	onCancel?: () => void;
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
	onCancel,
}: GetSSROptionOptions): Promise<boolean> {
	context.logger.info(
		'SSR consent prefetch starts data loading on the server for faster banner visibility.'
	);
	context.logger.info(
		'Tradeoff: this uses Next.js headers() and makes the route dynamic (not fully static).'
	);
	context.logger.info(
		'On slow backends or cross-region setups, SSR can increase TTFB. Measure both TTFB and banner visibility.'
	);
	context.logger.info(
		'Learn more: https://v2.c15t.com/docs/frameworks/nextjs/ssr'
	);

	const enableSSR = await p.select({
		message:
			'Enable SSR consent prefetch? (faster first banner visibility, dynamic route)',
		options: [
			{
				value: true,
				label: 'Yes (Recommended)',
				hint: 'Fetch consent data on server and stream to client',
			},
			{
				value: false,
				label: 'No',
				hint: 'Client-only fetch after hydration (better for fully static pages)',
			},
		],
		initialValue: true,
	});

	const cancelled = handleCancel?.(enableSSR) ?? p.isCancel(enableSSR);

	if (cancelled) {
		if (onCancel) {
			onCancel();
		}

		context.error.handleCancel('Setup cancelled.', {
			command: 'onboarding',
			stage: 'ssr_option',
		});
	}

	return enableSSR as boolean;
}
