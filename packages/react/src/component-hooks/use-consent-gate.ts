'use client';

import type { AllConsentNames, Translations } from '@c15t/core';
import { useCallback, useEffect, useMemo } from 'react';

import { useRegisterConsentCategories, useSetActiveUI } from '../hooks';
import { useIsHydrated } from '../hooks/use-is-hydrated';
import { useCategoryAllowed, useKernelSelector } from '../kernel-selector';
import { useTranslations } from './use-translations';

/**
 * What a consent gate should render for its category.
 *
 * - `'granted'`: consent is given and the page has hydrated. Render the
 *   children.
 * - `'pending'`: consent is given but the page hasn't hydrated yet. Render
 *   nothing.
 * - `'denied'`: consent isn't given. Render a placeholder with a grant
 *   action.
 * - `'policy-blocked'`: strict policy scope excludes this category. Render
 *   the policy message and no grant action.
 */
export type ConsentGateState =
	| 'granted'
	| 'pending'
	| 'denied'
	| 'policy-blocked';

/**
 * The state, copy and grant action for one consent-gated category.
 */
export interface UseConsentGateResult {
	/** What to render. See {@link ConsentGateState}. */
	state: ConsentGateState;
	/** Translated category title, falling back to the category name. */
	categoryTitle: string;
	/** Translated placeholder title with `{category}` filled in. */
	title: string | undefined;
	/** Translated grant-button label with `{category}` filled in. */
	actionLabel: string | undefined;
	/** Translated policy-blocked message, with the English fallback. */
	policyBlockedMessage: string;
	/**
	 * Opens the consent dialog on its usual view. Unlike the stock gate
	 * button, it doesn't start loading a deferred `ConsentDialog` on hover,
	 * focus or idle time.
	 */
	requestConsent: () => void;
}

/**
 * Shown when the translations have no `consentGate.policyBlocked` message.
 *
 * @internal
 */
export const DEFAULT_POLICY_BLOCKED_MESSAGE =
	"This content is unavailable under your region's consent policy.";

/**
 * The translated copy for a gate on one category. The stock `ConsentGate`
 * parts read their default text from here, so the hook and the parts
 * always agree.
 *
 * @param translations - The active translation bundle.
 * @param category - The gated category.
 * @returns The category title, placeholder title, button label and
 * policy-blocked message.
 * @internal
 */
export const resolveConsentGateCopy = function resolveConsentGateCopy(
	translations: Translations,
	category: AllConsentNames
): Omit<UseConsentGateResult, 'state' | 'requestConsent'> {
	const { consentGate, consentTypes } = translations;
	const categoryTitle =
		consentTypes?.[category as keyof typeof consentTypes]?.title ?? category;
	return {
		actionLabel: consentGate?.actionButton?.replace(
			'{category}',
			categoryTitle
		),
		categoryTitle,
		policyBlockedMessage:
			consentGate?.policyBlocked ?? DEFAULT_POLICY_BLOCKED_MESSAGE,
		title: consentGate?.title
			? consentGate.title.replace('{category}', categoryTitle)
			: undefined,
	};
};

/**
 * Reads what a consent gate on one category should render, with its
 * translated copy and an action that opens the consent dialog.
 *
 * Use it to build a custom gate around an iframe or widget. The stock
 * `ConsentGate` uses the same hook, so a custom gate follows the same
 * rules:
 *
 * - The state follows the category's effective permission, the value
 *   `useConsent(category)` returns.
 * - Granted content waits for hydration. The server HTML never contains
 *   it, so an iframe inside a streamed `Suspense` boundary loads once.
 * - Under a policy with `scopeMode: 'strict'`, a category outside the
 *   policy scope is `'policy-blocked'`. `necessary` is always in scope.
 * - Server rendering and hydration evaluate the snapshot at its own
 *   evaluation time and never read the clock, so the gate can sit in a
 *   statically prerendered page.
 *
 * On mount the hook registers the category with the provider, so the
 * consent dialog lists it.
 *
 * @param category - The consent category the content needs, such as
 * `'marketing'`.
 * @returns The gate state, the translated copy and `requestConsent`.
 * @throws {Error} When called outside a `ConsentProvider`.
 *
 * @example
 * ```tsx
 * import { useConsentGate } from 'c15t/react/headless';
 * import type { ReactNode } from 'react';
 *
 * function VideoGate({ children }: { children: ReactNode }) {
 * 	const { state, title, actionLabel, policyBlockedMessage, requestConsent } =
 * 		useConsentGate('marketing');
 * 	if (state === 'granted') return children;
 * 	if (state === 'pending') return null;
 * 	if (state === 'policy-blocked') return <p>{policyBlockedMessage}</p>;
 * 	return (
 * 		<div>
 * 			<p>{title}</p>
 * 			<button type="button" onClick={requestConsent}>
 * 				{actionLabel}
 * 			</button>
 * 		</div>
 * 	);
 * }
 * ```
 */
export const useConsentGate = function useConsentGate(
	category: AllConsentNames
): UseConsentGateResult {
	const isAllowed = useCategoryAllowed(category);
	const isHydrated = useIsHydrated();
	const isPolicyBlocked = useKernelSelector(
		(snap) =>
			snap.policyRule.scopeMode === 'strict' &&
			category !== 'necessary' &&
			// A normalized scope lists categories; a raw wildcard covers them all.
			!(snap.policyRule.scope as readonly string[]).includes('*') &&
			!snap.policyRule.scope.includes(category)
	);
	const registerConsentCategories = useRegisterConsentCategories();
	const setActiveUI = useSetActiveUI();
	const translations = useTranslations();

	useEffect(() => {
		registerConsentCategories([category]);
	}, [category, registerConsentCategories]);

	const copy = useMemo(
		() => resolveConsentGateCopy(translations, category),
		[translations, category]
	);

	// The dialog has no per-category view, so this opens its usual view.
	const requestConsent = useCallback(() => {
		setActiveUI('dialog');
	}, [setActiveUI]);

	let state: ConsentGateState;
	if (isAllowed) {
		// Granted content mounts after hydration, never in the server HTML.
		// When the gate streams inside a Suspense boundary, React parses that
		// HTML into a hidden segment and then moves it into place, and moving
		// an iframe reloads it: an embed in the server HTML would load twice.
		state = isHydrated ? 'granted' : 'pending';
	} else {
		state = isPolicyBlocked ? 'policy-blocked' : 'denied';
	}

	return useMemo(
		() => ({ ...copy, requestConsent, state }),
		[copy, requestConsent, state]
	);
};
