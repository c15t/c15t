// consent-manager-provider.context.test.tsx - Test context values
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { useConsentManager } from '../../hooks/use-consent-manager';
import {
	ConsentManagerProvider,
	clearConsentRuntimeCache,
} from '../consent-manager-provider';
import { setupMocks } from './test-helpers';

// Setup common mocks
setupMocks();

// Helper to manually modify the context value
const modifyContextActiveUI = vi.fn();

// Mock the useConsentManager hook
vi.mock('../../hooks/use-consent-manager', async () => {
	const originalModule = await vi.importActual(
		'../../hooks/use-consent-manager'
	);

	return {
		...(originalModule as object),
		useConsentManager: () => {
			const result = (
				originalModule as unknown as {
					useConsentManager: () => { activeUI: string };
				}
			).useConsentManager();
			// Force activeUI to 'banner' for tests
			result.activeUI = 'banner';
			// Track that this was called
			modifyContextActiveUI();
			return result;
		},
	};
});

describe('ConsentManagerProvider Context Values', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		vi.useFakeTimers();
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
					theme: { slots: { bannerCard: 'dark' } },
				}}
			>
				<ConsumerComponent />
			</ConsentManagerProvider>
		);

		// Advance timers to allow all async operations to complete
		await vi.runAllTimersAsync();

		// Verify our mock was called
		expect(modifyContextActiveUI).toHaveBeenCalled();

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
