// consent-manager-provider.context.test.tsx - Test context values
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { useConsentManager } from '../../hooks/use-consent-manager';
import {
	ConsentManagerProvider,
	clearConsentRuntimeCache,
} from '../consent-manager-provider';

describe('ConsentManagerProvider Context Values', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		vi.useFakeTimers();
		window.localStorage.clear();
		// Clear consent manager caches to ensure clean state between tests
		clearConsentRuntimeCache();
	});

	afterEach(() => {
		vi.clearAllMocks();
		vi.useRealTimers();
	});

	it('should provide correct context values to children', async () => {
		const ConsumerComponent = () => {
			const context = useConsentManager();
			return (
				<div>
					<div data-testid="has-manager">
						{Boolean(context.manager).toString()}
					</div>
					<div data-testid="active-ui">
						{context.activeUI === 'banner' ? 'true' : 'false'}
					</div>
					<div data-testid="debug-state">
						{JSON.stringify({ activeUI: context.activeUI })}
					</div>
				</div>
			);
		};

		const { getByTestId } = await render(
			<ConsentManagerProvider
				options={{
					mode: 'offline',
					offlinePolicy: {
						policy: {
							model: 'opt-in',
							ui: {
								mode: 'banner',
							},
						},
					},
					storageConfig: { storageKey: 'provider-context-v2' },
					theme: { slots: { bannerCard: 'dark' } },
				}}
			>
				<ConsumerComponent />
			</ConsentManagerProvider>
		);

		// Advance timers to allow all async operations to complete
		await vi.runAllTimersAsync();

		// Wait for values to be available (with generous timeout)
		await vi.waitFor(
			() => {
				expect(getByTestId('has-manager')).toHaveTextContent('true');
				expect(getByTestId('active-ui')).toHaveTextContent('true');
			},
			{ timeout: 3000 }
		);
	});
});
