import type { ConsentSnapshot, PresentationAction } from '@c15t/core';
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
/**
 * The cookie banner.
 *
 * Reuses the framework banners' stylesheet classes and test IDs.
 * Shows when the kernel requests a category choice or notice prompt.
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
	let trapFocus = false;
	let scrollLock = false;

	let element: HTMLElement | null = null;
	let overlay: HTMLElement | null = null;
	let cleanups: (() => void)[] = [];
	let hideTimer: ReturnType<typeof setTimeout> | undefined;
	let renderedFrom: {
		translations: ConsentSnapshot['translations'];
		policyRule: ConsentSnapshot['policyRule'];
		branding: ConsentSnapshot['branding'];
	} | null = null;

	// oxlint-disable-next-line complexity -- Notice copy, action labels and presentation are resolved together.
	const build = function build(snapshot: ConsentSnapshot): HTMLElement {
		const copy = resolveCopy(snapshot);
		const { t } = copy;
		const notice = snapshot.policyRule.prompt === 'notice';
		const labels: Record<PresentationAction, string> = {
			accept: options.acceptButtonText ?? t.common.acceptAll,
			customize: options.customizeButtonText ?? t.common.customize,
			dismiss: t.common.acknowledge,
			reject: options.rejectButtonText ?? t.common.rejectAll,
			save: t.common.save,
		};
		const title =
			options.title ??
			(notice ? t.cookieBanner.noticeTitle : t.cookieBanner.title);
		const description =
			options.description ??
			(notice ? t.cookieBanner.noticeDescription : t.cookieBanner.description);
		const actions = resolveActions(
			snapshot,
			'prompt',
			ctx.client.options.presentation,
			{
				scrollLock: options.scrollLock,
				trapFocus: options.trapFocus,
			}
		);
		({ trapFocus, scrollLock } = actions);
		let { position } = actions;
		if (copy.dir === 'rtl' && actions.positionSource === 'default') {
			if (position.endsWith('-left')) {
				position = position.replace('-left', '-right') as typeof position;
			} else if (position.endsWith('-right')) {
				position = position.replace('-right', '-left') as typeof position;
			}
		}

		const card = h(
			'div',
			{
				'aria-label': title,
				'aria-modal': trapFocus ? 'true' : undefined,
				class: noStyle ? '' : styles.card,
				'data-testid': 'consent-banner-card',
				role: trapFocus ? 'dialog' : 'region',
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
					} else if (action === 'dismiss') {
						void ctx.client.dismissNotice();
					} else {
						ctx.client.openDialog();
					}
				},
				subGroupTestId: 'consent-banner-footer-sub-group',
				testId: 'consent-banner-footer',
			})
		);

		for (const control of actions.preferenceControls) {
			card.append(
				h(
					'button',
					{
						class: noStyle ? '' : classes.button.button,
						'data-action': 'customize',
						'data-mode': noStyle ? undefined : 'stroke',
						'data-size': noStyle ? undefined : 'small',
						'data-testid': `consent-banner-right-${control}-button`,
						'data-variant': noStyle ? undefined : 'neutral',
						onclick: () => ctx.client.openDialog(),
						type: 'button',
					},
					control === 'opt-out' ? t.rights.optOut : t.rights.preferences
				)
			);
		}

		const root = h(
			'div',
			{
				class: noStyle ? '' : styles.root,
				'data-blocking': String(actions.blocking),
				'data-position': position,
				'data-testid': 'consent-banner-root',
				'data-variant': actions.variant,
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
			policyRule: snapshot.policyRule,
			translations: snapshot.translations,
		};
		if (scrollLock) {
			overlay = h('div', {
				'aria-hidden': 'true',
				class: noStyle ? '' : styles.overlay,
				'data-testid': 'consent-banner-overlay',
				role: 'presentation',
			});
			ctx.root.append(overlay);
		}
		ctx.root.append(element);
		const card = element.querySelector<HTMLElement>('[role="dialog"]');
		if (trapFocus && card) {
			cleanups.push(setupFocusTrap(card));
		}
		if (scrollLock) {
			cleanups.push(setupScrollLock());
		}
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
		if (!element || hideTimer !== undefined) {
			return;
		}
		for (const cleanup of cleanups) {
			cleanup();
		}
		cleanups = [];
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
				snapshot.activeUI === 'banner' &&
				snapshot.policyRule.model !== 'iab' &&
				snapshot.policyRule.prompt !== 'none';
			if (!shouldShow) {
				hide();
				return;
			}
			if (
				element &&
				hideTimer === undefined &&
				renderedFrom &&
				renderedFrom.translations === snapshot.translations &&
				renderedFrom.policyRule === snapshot.policyRule &&
				renderedFrom.branding === snapshot.branding
			) {
				return;
			}
			show(snapshot);
		},
	};
};
