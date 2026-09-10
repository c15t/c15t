import type { ConsentSnapshot, PresentationAction } from '@c15t/core';
import type { ConsentRuntimeIABHandle } from '@c15t/core/runtime';
import { resolveIABBannerSummary } from '@c15t/iab/headless';
import { setupFocusTrap, setupScrollLock } from '@c15t/ui/utils';

import { classes } from '../generated/iab-styles';
import type { ConsentUIOptions } from '../types';
import { renderActionFooter, resolveActions } from '../ui/actions';
import { renderBranding } from '../ui/branding';
import { resolveCopy } from '../ui/copy';
import { cx, h } from '../ui/dom';
import { renderLegalLinks } from '../ui/surface';
import type { Surface, SurfaceContext } from '../ui/surface';
import { createIABPreferences } from './preferences';
import type { IABPreferences } from './preferences';

/** One IAB banner/dialog lifecycle on the client's existing kernel. */
export const createIABSurface = (
	ctx: SurfaceContext,
	options: ConsentUIOptions
): Surface => {
	const { client, noStyle } = ctx;
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
		saveFailed = !result.ok;
		client.ui?.update();
		updateFeedback();
	};
	// oxlint-disable-next-line complexity -- Banner and dialog share one lifecycle with per-surface copy, layout, and policy constraints.
	const build = (snapshot: ConsentSnapshot, dialog: boolean): void => {
		const { t: all, dir, language } = resolveCopy(snapshot);
		const t = all.iab;
		const styles = dialog ? classes.dialog : classes.banner;
		const actions = resolveActions(
			snapshot,
			dialog ? 'preferences' : 'prompt',
			client.options.presentation,
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
		const content = h('div', {
			'aria-labelledby': `${prefix}-title`,
			'aria-modal': actions.blocking ? 'true' : undefined,
			class: css(styles.card),
			'data-testid': `${prefix}-card`,
			role: dialog || actions.blocking ? 'dialog' : 'region',
			tabindex: '-1',
		});
		const headerCopy = h(
			'div',
			{ class: dialog ? css(classes.dialog.headerContent) : '' },
			h('h2', { class: css(styles.title), id: `${prefix}-title` }, title)
		);
		const header = h('div', { class: css(styles.header) }, headerCopy);
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
					{ class: css(styles.description) },
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
				label: (action) => labels[action],
				noStyle,
				onAction: (action) => {
					void perform(action);
				},
				subGroupTestId: `${prefix}-footer-group`,
				testId: `${prefix}-footer`,
			})
		);
		const branding = renderBranding({
			branding: snapshot.branding,
			hide: dialog && (dialogOptions.hideBranding ?? false),
			noStyle,
			securedBy: all.common.securedBy,
			testId: `${prefix}-branding`,
			variant: dialog ? 'dialog-tag' : 'banner-tag',
		});
		if (dialog) {
			if (branding) {
				content.append(branding);
			}
			root = h(
				'div',
				{
					class: css(classes.dialog.root, classes.dialog.dialogVisible),
					'data-testid': `${prefix}-root`,
					dir,
					lang: language,
				},
				content
			);
		} else {
			root = h(
				'div',
				{
					class: css(classes.banner.root, classes.banner.bannerVisible),
					'data-blocking': String(actions.blocking),
					'data-position': position,
					'data-testid': `${prefix}-root`,
					'data-variant': actions.variant,
					dir,
					lang: language,
				},
				h('div', { class: css(classes.banner.cardShell) }, branding, content)
			);
		}
		if (actions.blocking) {
			overlay = h('div', {
				'aria-hidden': 'true',
				class: css(styles.overlay, styles.overlayVisible),
				'data-testid': `${prefix}-overlay`,
				role: 'presentation',
			});
			ctx.root.append(overlay);
		}
		ctx.root.append(root);
		if (actions.blocking) {
			release.push(setupScrollLock(), setupFocusTrap(content));
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
			rendered.snapshot.branding === snapshot.branding
		) {
			preferences?.sync(snapshot);
			return;
		}
		clear();
		build(snapshot, ui === 'dialog');
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
	const unsubscribe = client.runtime.onIABChange(watch);
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
