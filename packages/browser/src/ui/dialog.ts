import { resolveConsentPresentation } from '@c15t/core';
import type { ConsentSnapshot } from '@c15t/core';
import { setupFocusTrap, setupScrollLock } from '@c15t/ui/utils';

import { classes } from '../generated/styles';
import type { ConsentDialogOptions } from '../types';
import { renderBranding } from './branding';
import { resolveCopy } from './copy';
import { h, readDurationMs } from './dom';
import { renderLegalLinks } from './surface';
import type { Surface, SurfaceContext } from './surface';
import { createWidget } from './widget';

const DEFAULT_DURATION_MS = 200;

/**
 * The preference centre dialog.
 *
 * Opens when the kernel says `activeUI === 'dialog'`. Modal: focus is
 * trapped, the page stops scrolling, Escape closes. Clicking the backdrop
 * does not, matching the other adapters.
 *
 * @param ctx - The mount context.
 * @param options - Dialog options.
 * @returns The surface.
 */
// oxlint-disable-next-line max-lines-per-function -- Build, open, close and reconcile are one lifecycle.
export const createDialog = function createDialog(
	ctx: SurfaceContext,
	options: ConsentDialogOptions
): Surface {
	const styles = classes.dialog;
	const { noStyle } = ctx;

	let overlay: HTMLElement | null = null;
	let positioner: HTMLElement | null = null;
	let content: HTMLElement | null = null;
	let cleanups: (() => void)[] = [];
	let closeTimer: ReturnType<typeof setTimeout> | undefined;
	let widget: ReturnType<typeof createWidget> | null = null;
	let renderedFrom: {
		translations: ConsentSnapshot['translations'];
		branding: ConsentSnapshot['branding'];
		policyRule: ConsentSnapshot['policyRule'];
	} | null = null;

	const onKeyDown = function onKeyDown(event: KeyboardEvent): void {
		if (event.key === 'Escape') {
			event.preventDefault();
			ctx.client.closeDialog();
		}
	};

	const build = function build(snapshot: ConsentSnapshot): void {
		const copy = resolveCopy(snapshot);
		const { t } = copy;
		widget = createWidget(ctx, { hideBranding: true });
		widget.sync(snapshot);

		content = h(
			'div',
			{
				'aria-describedby': 'consent-dialog-description',
				'aria-labelledby': 'consent-dialog-title',
				'aria-modal': resolveConsentPresentation({
					policy: snapshot.policyRule,
					presentation: ctx.client.options.presentation,
					surface: 'preferences',
				}).blocking
					? 'true'
					: undefined,
				class: noStyle ? '' : styles.container,
				'data-state': 'open',
				'data-testid': 'consent-dialog-root',
				dir: copy.dir,
				lang: copy.language,
				onkeydown: onKeyDown as EventListener,
				role: 'dialog',
			},
			h(
				'div',
				{
					class: noStyle ? '' : styles.card,
					'data-testid': 'consent-dialog-card',
					tabindex: '-1',
				},
				h(
					'div',
					{
						class: noStyle ? '' : styles.header,
						'data-testid': 'consent-dialog-header',
					},
					h(
						'h2',
						{
							class: noStyle ? '' : styles.title,
							'data-testid': 'consent-dialog-title',
							id: 'consent-dialog-title',
						},
						t.consentManagerDialog.title
					),
					h(
						'div',
						{
							class: noStyle ? '' : styles.description,
							'data-context': 'dialog',
							'data-testid': 'consent-dialog-description',
							id: 'consent-dialog-description',
						},
						t.consentManagerDialog.description,
						...renderLegalLinks({
							keys: options.legalLinks,
							labels: t.legalLinks,
							legalLinks: ctx.legalLinks,
							noStyle,
							testIdPrefix: 'consent-dialog-legal-link',
						})
					)
				),
				h(
					'div',
					{
						class: noStyle ? '' : styles.content,
						'data-testid': 'consent-dialog-content',
					},
					widget.element
				),
				renderBranding({
					branding: snapshot.branding,
					hide: options.hideBranding ?? false,
					noStyle,
					securedBy: t.common.securedBy,
					testId: 'consent-dialog-branding',
					variant: 'dialog-tag',
				})
			)
		);
		positioner = h(
			'div',
			{ class: noStyle ? '' : styles.root, 'data-state': 'open' },
			content
		);
		overlay = h('div', {
			'aria-hidden': 'true',
			class: noStyle ? '' : styles.overlay,
			'data-state': 'open',
			'data-testid': 'consent-dialog-overlay',
		});
		renderedFrom = {
			branding: snapshot.branding,
			policyRule: snapshot.policyRule,
			translations: snapshot.translations,
		};
	};

	const removeNow = function removeNow(): void {
		if (closeTimer !== undefined) {
			clearTimeout(closeTimer);
			closeTimer = undefined;
		}
		for (const cleanup of cleanups) {
			cleanup();
		}
		cleanups = [];
		overlay?.remove();
		positioner?.remove();
		overlay = null;
		positioner = null;
		content = null;
		widget = null;
		renderedFrom = null;
	};

	const setVisible = function setVisible(visible: boolean): void {
		if (noStyle || !(overlay && positioner && content)) {
			return;
		}
		const state = visible ? 'open' : 'closed';
		overlay.setAttribute('data-state', state);
		positioner.setAttribute('data-state', state);
		content.setAttribute('data-state', state);
		overlay.classList.toggle(styles.overlayVisible, visible);
		overlay.classList.toggle(styles.overlayHidden, !visible);
		positioner.classList.toggle(styles.dialogVisible, visible);
		positioner.classList.toggle(styles.dialogHidden, !visible);
		content.classList.toggle(styles.contentVisible, visible);
		content.classList.toggle(styles.contentHidden, !visible);
	};

	const open = function open(snapshot: ConsentSnapshot): void {
		removeNow();
		build(snapshot);
		if (!(overlay && positioner && content)) {
			return;
		}
		ctx.root.append(overlay, positioner);
		const { blocking } = resolveConsentPresentation({
			policy: snapshot.policyRule,
			presentation: ctx.client.options.presentation,
			surface: 'preferences',
		});
		if (blocking) {
			cleanups.push(setupScrollLock(), setupFocusTrap(content));
		} else {
			overlay.hidden = true;
		}
		if (noStyle) {
			return;
		}
		if (ctx.disableAnimation) {
			setVisible(true);
			return;
		}
		setVisible(false);
		void positioner.offsetHeight;
		setVisible(true);
	};

	const close = function close(): void {
		if (!positioner || closeTimer !== undefined) {
			return;
		}
		for (const cleanup of cleanups) {
			cleanup();
		}
		cleanups = [];
		widget?.resetDraft();
		if (noStyle || ctx.disableAnimation) {
			removeNow();
			return;
		}
		const duration = readDurationMs(
			positioner,
			'--consent-dialog-animation-duration',
			DEFAULT_DURATION_MS
		);
		setVisible(false);
		closeTimer = setTimeout(removeNow, duration);
	};

	return {
		destroy() {
			removeNow();
		},
		sync(snapshot) {
			const shouldShow =
				snapshot.activeUI === 'dialog' && snapshot.model !== 'iab';
			if (!shouldShow) {
				close();
				return;
			}
			if (
				positioner &&
				closeTimer === undefined &&
				renderedFrom &&
				renderedFrom.translations === snapshot.translations &&
				renderedFrom.branding === snapshot.branding &&
				renderedFrom.policyRule === snapshot.policyRule
			) {
				widget?.sync(snapshot);
				return;
			}
			open(snapshot);
		},
	};
};
