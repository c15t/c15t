/**
 * Frontend UI options composer
 * Composes all frontend UI-related prompts based on detected framework
 */

import type { CliContext } from '~/context/types';
import {
	type ExpandedTheme,
	promptForExpandedTheme,
	promptForUIStyle,
	type UIStyle,
} from '../../prompts';
import { getDevToolsOption } from './dev-tools';
import { getSSROption } from './ssr';

interface FrontendUIOptionsInput {
	context: CliContext;
	/**
	 * Whether the mode has a backend URL.
	 * SSR is only relevant when there's a backend to fetch initial data from.
	 */
	hasBackend?: boolean;
	handleCancel?: (value: unknown) => boolean;
}

interface FrontendUIOptionsResult {
	enableSSR?: boolean;
	enableDevTools?: boolean;
	uiStyle?: UIStyle;
	expandedTheme?: ExpandedTheme;
}

/**
 * Composes all frontend UI-related prompts based on detected framework:
 *
 * @c15t/nextjs (with backend):
 *   - SSR option (fetchInitialData)
 *   - UI style (prebuilt vs expanded)
 *   - Expanded theme (if expanded selected)
 *
 * @c15t/nextjs (without backend - offline/custom):
 *   - UI style (prebuilt vs expanded)
 *   - Expanded theme (if expanded selected)
 *
 * @c15t/react:
 *   - UI style (prebuilt vs expanded)
 *   - Expanded theme (if expanded selected)
 *   - DevTools option
 *
 * c15t (core):
 *   - DevTools option
 */
export async function getFrontendUIOptions({
	context,
	hasBackend = false,
	handleCancel,
}: FrontendUIOptionsInput): Promise<FrontendUIOptionsResult> {
	let enableSSR: boolean | undefined;
	let enableDevTools: boolean | undefined;
	let uiStyle: UIStyle | undefined;
	let expandedTheme: ExpandedTheme | undefined;

	const pkg = context.framework.pkg;

	// Next.js: SSR (only with backend) + UI style + theme
	if (pkg === '@c15t/nextjs') {
		// SSR only makes sense when there's a backend to fetch data from
		if (hasBackend) {
			enableSSR = await getSSROption({ context, handleCancel });
		}

		uiStyle = await promptForUIStyle(context, handleCancel);

		if (uiStyle === 'expanded') {
			expandedTheme = await promptForExpandedTheme(context, handleCancel);
		}
	}

	// React: UI style + theme (no SSR - it's client-side only)
	if (pkg === '@c15t/react') {
		uiStyle = await promptForUIStyle(context, handleCancel);

		if (uiStyle === 'expanded') {
			expandedTheme = await promptForExpandedTheme(context, handleCancel);
		}
	}

	// Core c15t: no UI prompts
	if (pkg === 'c15t' || pkg === '@c15t/react' || pkg === '@c15t/nextjs') {
		enableDevTools = await getDevToolsOption({
			context,
			handleCancel,
		});
	}

	return {
		enableSSR,
		enableDevTools,
		uiStyle,
		expandedTheme,
	};
}
