import type { ConsentSnapshot, PolicyUiAction } from '@c15t/core';
import { setupFocusTrap, setupScrollLock } from '@c15t/ui/utils';

import { classes } from '../generated/styles';
import type { ConsentBannerOptions } from '../types';
import { renderActionFooter, resolveActions } from './actions';
import { renderBranding } from './branding';
import { resolveCopy } from './copy';
import { h, readDurationMs } from './dom';
import { renderLegalLinks } from './surface';
import type { Surface, SurfaceContext } from './surface';

const DEFAULT_DURATION_MS = 200;
const BANNER_MODELS: ReadonlySet<ConsentSnapshot['model']> = new Set([
	'opt-in',
]);

/**
 * The cookie banner.
 *
 * Same DOM shape and `data-testid`s as the React, Svelte and Astro
 * banners, so cross-framework tests and the shared stylesheet both hold.
 * Shows when the kernel says `activeUI === 'banner'` under an opt-in
 * model; an opt-out policy shows nothing until the visitor asks.
 *
 * @param ctx - The mount context.
 * @param options - Copy and behaviour overrides.
 * @returns The surface.
 */
// oxlint-disable-next-line max-lines-per-function -- Build, show, hide and reconcile are one lifecycle.
export const createBanner = function createBanner(
	ctx: SurfaceContext,
	options: ConsentBannerOptions
): Surface {
	const styles = classes.banner;
	const { noStyle } = ctx;
	const trapFocus = options.trapFocus ?? true;
	const scrollLock = options.scrollLock ?? false;

	let element: HTMLElement | null = null;
	let overlay: HTMLElement | null = null;
	let cleanups: (() => void)[] = [];
	let hideTimer: ReturnType<typeof setTimeout> | undefined;
	let renderedFrom: {
		translations: ConsentSnapshot['translations'];
		policyBanner: ConsentSnapshot['policyBanner'];
		branding: ConsentSnapshot['branding'];
	} | null = null;

	const build = function build(snapshot: ConsentSnapshot): HTMLElement {
		const copy = resolveCopy(snapshot);
		const { t } = copy;
		const labels: Record<PolicyUiAction, string> = {
			accept: options.acceptButtonText ?? t.common.acceptAll,
			customize: options.customizeButtonText ?? t.common.customize,
			reject: options.rejectButtonText ?? t.common.rejectAll,
		};
		const title = options.title ?? t.cookieBanner.title;
		const description = options.description ?? t.cookieBanner.description;
		const actions = resolveActions(snapshot.policyBanner, {
			primary: ['customize'],
		});

		const card = h(
			'div',
			{
				'aria-label': title,
				'aria-modal': trapFocus ? 'true' : undefined,
				class: noStyle ? '' : styles.card,
				'data-testid': 'consent-banner-card',
				role: trapFocus ? 'dialog' : undefined,
				tabindex: trapFocus ? '-1' : undefined,
			},
			h(
				'div',
				{
					class: noStyle ? '' : styles.header,
					'data-testid': 'consent-banner-header',
				},
				h(
					'h2',
					{
						class: noStyle ? '' : styles.title,
						'data-testid': 'consent-banner-title',
					},
					title
				),
				h(
					'div',
					{
						class: noStyle ? '' : styles.description,
						'data-context': 'banner',
						'data-testid': 'consent-banner-description',
					},
					description,
					...renderLegalLinks({
						keys: options.legalLinks,
						labels: t.legalLinks,
						legalLinks: ctx.legalLinks,
						noStyle,
						testIdPrefix: 'consent-banner-legal-link',
					})
				)
			),
			renderActionFooter({
				actions,
				buttonTestId: (action) => `consent-banner-${action}-button`,
				footerClassName: styles.footer,
				label: (action) => labels[action],
				noStyle,
				onAction: (action) => {
					if (action === 'accept') {
						void ctx.client.acceptAll();
					} else if (action === 'reject') {
						void ctx.client.rejectAll();
					} else {
						ctx.client.openDialog();
					}
				},
				subGroupTestId: 'consent-banner-footer-sub-group',
				testId: 'consent-banner-footer',
			})
		);

		const root = h(
			'div',
			{
				class: noStyle ? '' : styles.root,
				'data-position': copy.dir === 'ltr' ? 'bottom-left' : 'bottom-right',
				'data-testid': 'consent-banner-root',
				dir: copy.dir,
				lang: copy.language,
			},
			h(
				'div',
				{ class: noStyle ? '' : styles.cardShell },
				renderBranding({
					branding: snapshot.branding,
					hide: options.hideBranding ?? false,
					noStyle,
					securedBy: t.common.securedBy,
					testId: 'consent-banner-branding',
					variant: 'banner-tag',
				}),
				card
			)
		);

		if (trapFocus) {
			cleanups.push(setupFocusTrap(card));
		}
		if (scrollLock) {
			cleanups.push(setupScrollLock());
		}
		return root;
	};

	const removeNow = function removeNow(): void {
		if (hideTimer !== undefined) {
			clearTimeout(hideTimer);
			hideTimer = undefined;
		}
		for (const cleanup of cleanups) {
			cleanup();
		}
		cleanups = [];
		element?.remove();
		overlay?.remove();
		element = null;
		overlay = null;
		renderedFrom = null;
	};

	const show = function show(snapshot: ConsentSnapshot): void {
		removeNow();
		element = build(snapshot);
		renderedFrom = {
			branding: snapshot.branding,
			policyBanner: snapshot.policyBanner,
			translations: snapshot.translations,
		};
		if (scrollLock) {
			overlay = h('div', {
				'aria-hidden': 'true',
				class: noStyle ? '' : styles.overlay,
				'data-testid': 'consent-banner-overlay',
			});
			ctx.root.append(overlay);
		}
		ctx.root.append(element);
		if (noStyle) {
			return;
		}
		if (ctx.disableAnimation) {
			element.classList.add(styles.bannerVisible);
			overlay?.classList.add(styles.overlayVisible);
			return;
		}
		element.classList.add(styles.bannerHidden);
		overlay?.classList.add(styles.overlayHidden);
		// Force layout so the browser observes the hidden state before the
		// flip; otherwise a fresh mount can skip the entry transition.
		void element.offsetHeight;
		element.classList.replace(styles.bannerHidden, styles.bannerVisible);
		overlay?.classList.replace(styles.overlayHidden, styles.overlayVisible);
	};

	const hide = function hide(): void {
		if (!element) {
			return;
		}
		if (noStyle || ctx.disableAnimation) {
			removeNow();
			return;
		}
		const duration = readDurationMs(
			element,
			'--consent-banner-animation-duration',
			DEFAULT_DURATION_MS
		);
		element.classList.replace(styles.bannerVisible, styles.bannerHidden);
		overlay?.classList.replace(styles.overlayVisible, styles.overlayHidden);
		hideTimer = setTimeout(removeNow, duration);
	};

	return {
		destroy() {
			removeNow();
		},
		sync(snapshot) {
			const shouldShow =
				snapshot.activeUI === 'banner' && BANNER_MODELS.has(snapshot.model);
			if (!shouldShow) {
				hide();
				return;
			}
			if (
				element &&
				hideTimer === undefined &&
				renderedFrom &&
				renderedFrom.translations === snapshot.translations &&
				renderedFrom.policyBanner === snapshot.policyBanner &&
				renderedFrom.branding === snapshot.branding
			) {
				return;
			}
			show(snapshot);
		},
	};
};
