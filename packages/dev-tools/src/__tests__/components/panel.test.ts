import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPanel, type PanelInstance } from '../../components/panel';
import { createStateManager } from '../../core/state-manager';
import type { StoreConnector } from '../../core/store-connector';
import animationStyles from '../../styles/animations.module.css';

function createDisconnectedStoreConnector(): StoreConnector {
	return {
		getState: () => null,
		getStore: () => null,
		isConnected: () => false,
		subscribe: () => () => {},
		getDiagnostics: () => ({
			namespace: 'c15tStore',
			reconnectAttempts: 0,
			nextRetryInMs: null,
			lastError: null,
			isPolling: false,
			disconnectNotified: false,
		}),
		subscribeDiagnostics: () => () => {},
		retryConnection: () => {},
		destroy: () => {},
	};
}

function getCloseButton(): HTMLButtonElement {
	const closeButton = document.querySelector<HTMLButtonElement>(
		'button[aria-label="Close DevTools"]'
	);
	if (!closeButton) {
		throw new Error('Close button not rendered');
	}
	return closeButton;
}

/**
 * Gives the exit animation classes a real animation, the way the bundled CSS
 * does when the user has not asked for reduced motion.
 */
function enableExitAnimations(): void {
	const style = document.createElement('style');
	style.textContent = `.${animationStyles.animateExit} { animation-name: devtoolsExit; }`;
	document.head.appendChild(style);
}

describe('panel', () => {
	let panel: PanelInstance | null = null;

	beforeEach(() => {
		document.head.innerHTML = '';
		document.body.innerHTML = '';
		sessionStorage.clear();
	});

	afterEach(() => {
		panel?.destroy();
		panel = null;
		vi.useRealTimers();
	});

	function openPanel() {
		const stateManager = createStateManager();
		panel = createPanel({
			stateManager,
			storeConnector: createDisconnectedStoreConnector(),
			onRenderContent: () => {},
			enableUnifiedMode: false,
		});
		stateManager.setOpen(true);
		return { stateManager, floatingButton: panel.floatingButton };
	}

	it('closes immediately when no exit animation runs (reduced motion)', () => {
		const { stateManager, floatingButton } = openPanel();
		expect(document.querySelector('[role="dialog"]')).not.toBeNull();

		getCloseButton().click();

		expect(stateManager.getState().isOpen).toBe(false);
		expect(document.querySelector('[role="dialog"]')).toBeNull();
		expect(floatingButton.style.display).toBe('');
	});

	it('can reopen and close again when no exit animation runs', () => {
		const { stateManager } = openPanel();

		getCloseButton().click();
		stateManager.setOpen(true);
		expect(document.querySelector('[role="dialog"]')).not.toBeNull();

		getCloseButton().click();
		expect(stateManager.getState().isOpen).toBe(false);
		expect(document.querySelector('[role="dialog"]')).toBeNull();
	});

	it('waits for the exit animation before removing the panel', () => {
		enableExitAnimations();
		const { stateManager } = openPanel();
		const dialog = document.querySelector('[role="dialog"]');

		getCloseButton().click();

		expect(dialog?.isConnected).toBe(true);
		expect(stateManager.getState().isOpen).toBe(true);

		dialog?.dispatchEvent(new Event('animationend'));

		expect(dialog?.isConnected).toBe(false);
		expect(stateManager.getState().isOpen).toBe(false);
	});

	it('ignores animationend events bubbling up from child elements', () => {
		enableExitAnimations();
		const { stateManager } = openPanel();
		const dialog = document.querySelector('[role="dialog"]');

		getCloseButton().click();
		dialog?.firstElementChild?.dispatchEvent(
			new Event('animationend', { bubbles: true })
		);

		expect(dialog?.isConnected).toBe(true);
		expect(stateManager.getState().isOpen).toBe(true);
	});

	it('finishes closing if animationend never fires', () => {
		vi.useFakeTimers();
		enableExitAnimations();
		const { stateManager } = openPanel();
		const dialog = document.querySelector('[role="dialog"]');

		getCloseButton().click();
		expect(dialog?.isConnected).toBe(true);

		vi.runAllTimers();

		expect(dialog?.isConnected).toBe(false);
		expect(stateManager.getState().isOpen).toBe(false);
	});
});
