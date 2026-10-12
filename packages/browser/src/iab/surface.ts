import type { ConsentSnapshot, PresentationAction } from '@c15t/core';
import type { ConsentRuntimeIABHandle } from '@c15t/core/runtime';
import { resolveIABBannerSummary } from '@c15t/iab/headless';
import { setupFocusTrap, setupScrollLock } from '@c15t/ui/utils';

import { classes } from '../generated/iab-styles';
import type { ConsentUIOptions } from '../types';
import { renderActionFooter, resolveActions } from '../ui/actions';
import { renderBranding } from '../ui/branding';
import { resolveCopy } from '../ui/copy';
import { cx, h, markLateEntry, supportsStartingStyle } from '../ui/dom';
import { renderLegalLinks } from '../ui/surface';
import type { Surface, SurfaceContext } from '../ui/surface';
import { createIABPreferences } from './preferences';
import type { IABPreferences } from './preferences';

/** One IAB banner/dialog lifecycle on the client's existing kernel. */
export const createIABSurface = (
	ctx: SurfaceContext,
	options: ConsentUIOptions
): Surface => {
	const { client, noStyle, slot } = ctx;
	const bannerOptions =
		typeof options.banner === 'object' ? options.banner : {};
	const dialogOptions =
		typeof options.dialog === 'object' ? options.dialog : {};
	const {
		loadErrorText = 'Unable to load privacy settings. Reload the page to try again.',
		saveErrorText = 'Unable to save your privacy settings. Try again.',
		moreVendorsText,
	} = options.iab ?? {};
	const css = (...values: string[]): string => (noStyle ? '' : cx(...values));
	const animate = !(bannerOptions.disableAnimation ?? ctx.disableAnimation);
	let root: HTMLElement | null = null;
	let overlay: HTMLElement | null = null;
	let preferences: IABPreferences | null = null;
	let release: (() => void)[] = [];
	let disposed = false;
	let ready = false;
	let loadFailed = false;
	let busy = false;
	let saveFailed = false;
	let vendorsFirst = false;
	let rendered: {
		ui: string;
		snapshot: ConsentSnapshot;
		ready: boolean;
		loadFailed: boolean;
	} | null = null;
	let status: HTMLElement | null = null;
	const clear = (): void => {
		for (const cleanup of release) {
			cleanup();
		}
		release = [];
		root?.remove();
		overlay?.remove();
		root = null;
		overlay = null;
		preferences = null;
		rendered = null;
	};
	const updateFeedback = (): void => {
		if (!root) {
			return;
		}
		root.setAttribute('aria-busy', String(busy));
		for (const control of root.querySelectorAll<HTMLButtonElement>(
			'[data-action]'
		)) {
			control.disabled = busy || !ready;
		}
		if (status) {
			status.textContent = saveFailed ? saveErrorText : '';
			status.hidden = !saveFailed;
		}
	};
	const perform = async (action: PresentationAction): Promise<void> => {
		if (busy) {
			return;
		}
		if (action === 'customize') {
			vendorsFirst = false;
			client.openDialog();
			return;
		}
		busy = true;
		saveFailed = false;
		updateFeedback();
		const save = {
			accept: client.acceptAll,
			dismiss: client.saveIAB,
			reject: client.rejectAll,
			save: client.saveIAB,
		};
		const result = await save[action]();
		busy = false;
		// A backend failure after the choice was recorded leaves the surface
		// closed; the message is only for a surface that came back to retry.
		saveFailed = !result.ok && client.getSnapshot().activeUI !== 'none';
		client.ui?.update();
		updateFeedback();
	};
	// oxlint-disable-next-line complexity -- Banner and dialog share one lifecycle with per-surface copy, layout, and policy constraints.
	const build = (
		snapshot: ConsentSnapshot,
		dialog: boolean,
		entering: boolean
	): void => {
		const { t: all, dir, language } = resolveCopy(snapshot);
		const t = all.iab;
		const styles = dialog ? classes.dialog : classes.banner;
		const actions = resolveActions(
			snapshot,
			dialog ? 'preferences' : 'prompt',
			client.presentation,
			dialog
				? undefined
				: {
						scrollLock: bannerOptions.scrollLock,
						trapFocus: bannerOptions.trapFocus,
					}
		);
		let { position } = actions;
		if (dir === 'rtl' && actions.positionSource === 'default') {
			if (position.endsWith('-left')) {
				position = position.replace('-left', '-right') as typeof position;
			} else if (position.endsWith('-right')) {
				position = position.replace('-right', '-left') as typeof position;
			}
		}
		const prefix = dialog ? 'iab-consent-dialog' : 'iab-consent-banner';
		const surfaceOptions = dialog ? dialogOptions : bannerOptions;
		const title = dialog
			? t.preferenceCenter.title
			: (bannerOptions.title ?? t.banner.title);
		const content = slot(
			h('div', {
				'aria-describedby': dialog ? `${prefix}-description` : undefined,
				'aria-labelledby': `${prefix}-title`,
				'aria-modal': actions.blocking ? 'true' : undefined,
				class: css(styles.card),
				'data-testid': `${prefix}-card`,
				role: dialog || actions.blocking ? 'dialog' : 'region',
				tabindex: '-1',
			}),
			dialog ? 'iabConsentDialogCard' : 'iabConsentBannerCard'
		);
		const headerCopy = h(
			'div',
			{ class: dialog ? css(classes.dialog.headerContent) : '' },
			h('h2', { class: css(styles.title), id: `${prefix}-title` }, title)
		);
		const header = slot(
			h('div', { class: css(styles.header) }, headerCopy),
			dialog ? 'iabConsentDialogHeader' : 'iabConsentBannerHeader'
		);
		content.append(header);
		if (dialog) {
			header.append(
				h(
					'button',
					{
						'aria-label': all.common.close,
						class: css(classes.dialog.closeButton),
						onclick: () => client.closeDialog(),
						type: 'button',
					},
					all.common.close
				)
			);
			content.addEventListener('keydown', (event) => {
				if (event.key === 'Escape') {
					event.preventDefault();
					client.closeDialog();
				}
			});
		}
		if (!ready) {
			headerCopy.append(
				h(
					'p',
					{ role: loadFailed ? 'alert' : 'status' },
					loadFailed ? loadErrorText : t.common.loading
				)
			);
		} else if (dialog) {
			headerCopy.append(
				h(
					'p',
					{ class: css(styles.description), id: `${prefix}-description` },
					t.preferenceCenter.description
				)
			);
			preferences = createIABPreferences(ctx, vendorsFirst, moreVendorsText);
			content.append(
				h('div', { class: css(classes.dialog.body) }, preferences.element)
			);
		} else {
			const summary = resolveIABBannerSummary(snapshot.iab);
			headerCopy.append(
				h(
					'p',
					{ class: css(styles.description) },
					(bannerOptions.description ?? t.banner.description).replace(
						'{partnerCount}',
						String(summary.vendorCount)
					)
				)
			);
			headerCopy.append(
				h(
					'button',
					{
						class: css(classes.banner.partnersLink),
						'data-testid': 'iab-consent-banner-partners-link',
						onclick: () => {
							vendorsFirst = true;
							client.openDialog();
						},
						type: 'button',
					},
					t.banner.partnersLink.replace('{count}', String(summary.vendorCount))
				)
			);
			headerCopy.append(
				h(
					'ul',
					{ class: css(classes.banner.purposeList) },
					...summary.displayItems.map((name) => h('li', {}, name)),
					summary.remainingCount
						? h(
								'li',
								{},
								t.banner.andMore.replace(
									'{count}',
									String(summary.remainingCount)
								)
							)
						: null
				)
			);
			headerCopy.append(
				h(
					'p',
					{ class: css(classes.banner.legitimateInterestNotice) },
					t.banner.legitimateInterestNotice,
					' ',
					t.banner.scopeServiceSpecific
				)
			);
		}
		headerCopy.append(
			...renderLegalLinks({
				keys: surfaceOptions.legalLinks,
				labels: all.legalLinks,
				legalLinks: ctx.legalLinks,
				noStyle,
				testIdPrefix: `${prefix}-legal-link`,
			})
		);
		status = h('p', { hidden: true, role: 'alert' });
		content.append(status);
		const labels: Record<PresentationAction, string> = {
			accept: dialog
				? t.common.acceptAll
				: (bannerOptions.acceptButtonText ?? t.common.acceptAll),
			customize: bannerOptions.customizeButtonText ?? t.common.customize,
			dismiss: all.common.dismiss,
			reject: dialog
				? t.common.rejectAll
				: (bannerOptions.rejectButtonText ?? t.common.rejectAll),
			save: t.common.saveSettings,
		};
		content.append(
			renderActionFooter({
				actions,
				buttonTestId: (action) => `${prefix}-${action}-button`,
				footerClassName: styles.footer,
				footerSlot: dialog
					? 'iabConsentDialogFooter'
					: 'iabConsentBannerFooter',
				label: (action) => labels[action],
				noStyle,
				onAction: (action) => {
					void perform(action);
				},
				slot,
				subGroupTestId: `${prefix}-footer-group`,
				testId: `${prefix}-footer`,
			})
		);
		const branding = slot(
			renderBranding({
				branding: snapshot.branding,
				hide: dialog && (dialogOptions.hideBranding ?? false),
				noStyle,
				securedBy: all.common.securedBy,
				testId: `${prefix}-branding`,
				variant: dialog ? 'dialog-tag' : 'banner-tag',
			}),
			dialog ? 'iabConsentDialogTag' : 'iabConsentBannerTag'
		);
		if (dialog) {
			if (branding) {
				content.append(branding);
			}
			root = slot(
				h(
					'div',
					{
						class: css(classes.dialog.root, classes.dialog.dialogVisible),
						'data-testid': `${prefix}-root`,
						dir,
						lang: language,
					},
					content
				),
				'iabConsentDialog'
			);
		} else {
			root = slot(
				h(
					'div',
					{
						class: css(
							classes.banner.root,
							classes.banner.bannerVisible,
							animate ? classes.banner.bannerEntering : ''
						),
						'data-blocking': String(actions.blocking),
						'data-position': position,
						'data-testid': `${prefix}-root`,
						'data-variant': actions.variant,
						dir,
						lang: language,
					},
					h('div', { class: css(classes.banner.cardShell) }, branding, content)
				),
				'iabConsentBanner'
			);
		}
		if (actions.blocking) {
			overlay = slot(
				h('div', {
					'aria-hidden': 'true',
					class: css(
						styles.overlay,
						styles.overlayVisible,
						!dialog && animate ? classes.banner.overlayEntering : ''
					),
					'data-testid': `${prefix}-overlay`,
					role: 'presentation',
				}),
				dialog ? 'iabConsentDialogOverlay' : 'iabConsentBannerOverlay'
			);
		}
		// A banner that arrives after the page painted fades in. Without
		// `@starting-style` it starts hidden and flips to visible once it
		// is in the document, so the fade still runs.
		const late =
			!dialog && entering && animate && markLateEntry([root, overlay]);
		const flip = late && !noStyle && !supportsStartingStyle();
		if (flip) {
			root.classList.replace(
				classes.banner.bannerVisible,
				classes.banner.bannerHidden
			);
			overlay?.classList.replace(
				classes.banner.overlayVisible,
				classes.banner.overlayHidden
			);
		}
		if (overlay) {
			ctx.root.append(overlay);
		}
		ctx.root.append(root);
		if (flip) {
			void root.offsetHeight;
			root.classList.replace(
				classes.banner.bannerHidden,
				classes.banner.bannerVisible
			);
			overlay?.classList.replace(
				classes.banner.overlayHidden,
				classes.banner.overlayVisible
			);
		}
		if (actions.blocking) {
			release.push(
				setupScrollLock(),
				setupFocusTrap(content, {
					initialFocus: dialog ? 'first-tabbable' : 'container',
				})
			);
		}
		updateFeedback();
	};
	// oxlint-disable-next-line complexity -- Reconcile policy, readiness, and the active surface without rebuilding focused controls.
	const sync = function sync(snapshot: ConsentSnapshot): void {
		if (disposed) {
			return;
		}
		const ui =
			busy && snapshot.activeUI === 'none' && rendered
				? rendered.ui
				: snapshot.activeUI;
		if (
			snapshot.policyRule.model !== 'iab' ||
			!ui ||
			ui === 'none' ||
			(ui === 'banner' && options.banner === false) ||
			(ui === 'dialog' && options.dialog === false)
		) {
			clear();
			return;
		}
		if (
			rendered &&
			rendered.ui === ui &&
			rendered.ready === ready &&
			rendered.loadFailed === loadFailed &&
			rendered.snapshot.iab?.gvl === snapshot.iab?.gvl &&
			rendered.snapshot.translations === snapshot.translations &&
			rendered.snapshot.policyRule === snapshot.policyRule &&
			rendered.snapshot.branding === snapshot.branding &&
			rendered.snapshot.experiment === snapshot.experiment
		) {
			preferences?.sync(snapshot);
			return;
		}
		// A rebuild of the surface already on screen, such as when the
		// vendor list arrives, swaps it in place rather than entering again.
		const entering = rendered?.ui !== ui;
		clear();
		build(snapshot, ui === 'dialog', entering);
		rendered = { loadFailed, ready, snapshot, ui };
	};
	const watch = (handle: ConsentRuntimeIABHandle | null): void => {
		ready = false;
		loadFailed = false;
		if (!handle) {
			sync(client.getSnapshot());
			return;
		}
		void (async () => {
			try {
				await handle.whenReady?.();
				if (!disposed && client.runtime.iab === handle) {
					ready = Boolean(client.getSnapshot().iab?.gvl);
				}
			} catch {
				if (!disposed && client.runtime.iab === handle) {
					loadFailed = true;
				}
			}
			sync(client.getSnapshot());
		})();
	};
	const unsubscribe = client.runtime.subscribe(() => {
		watch(client.runtime.iab);
	});
	watch(client.runtime.iab);
	return {
		destroy: () => {
			disposed = true;
			unsubscribe();
			clear();
		},
		sync,
	};
};
