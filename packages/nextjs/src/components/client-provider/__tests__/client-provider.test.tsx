import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { InitialDataPromise } from '../../../types';

// Mock enrichOptions
vi.mock('../../consent-manager-provider/utils/enrich-options', () => ({
	enrichOptions: vi.fn(({ options, initialData }) => ({
		...options,
		store: {
			_initialData: initialData,
		},
	})),
}));

// Mock @c15t/react
vi.mock('@c15t/react', () => ({
	ConsentManagerProvider: vi.fn(({ children }) => children),
}));

describe('ClientConsentManagerProvider', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should pass initialData to enrichOptions', async () => {
		const { ConsentManagerProvider } = await import('../index');
		const { enrichOptions } = await import(
			'../../consent-manager-provider/utils/enrich-options'
		);

		// Use a type assertion for the mock data
		const mockInitialData = Promise.resolve({
			init: {},
			gvl: null,
		}) as InitialDataPromise;

		// Call the component function directly
		ConsentManagerProvider({
			initialData: mockInitialData,
			options: { mode: 'c15t', backendURL: '/api/c15t' },
			children: null,
		});

		expect(enrichOptions).toHaveBeenCalledWith({
			options: { mode: 'c15t', backendURL: '/api/c15t' },
			initialData: mockInitialData,
			usingAppDir: true,
		});
	});

	it('should work without initialData', async () => {
		const { ConsentManagerProvider } = await import('../index');
		const { enrichOptions } = await import(
			'../../consent-manager-provider/utils/enrich-options'
		);

		ConsentManagerProvider({
			options: { mode: 'offline' },
			children: null,
		});

		expect(enrichOptions).toHaveBeenCalledWith({
			options: { mode: 'offline' },
			initialData: undefined,
			usingAppDir: true,
		});
	});

	it('should pass options with callbacks through to enrichOptions', async () => {
		const { ConsentManagerProvider } = await import('../index');
		const { enrichOptions } = await import(
			'../../consent-manager-provider/utils/enrich-options'
		);

		const mockCallback = vi.fn();
		const options = {
			mode: 'c15t' as const,
			backendURL: '/api/c15t',
			callbacks: {
				onConsentSet: mockCallback,
			},
		};

		ConsentManagerProvider({
			options,
			children: null,
		});

		expect(enrichOptions).toHaveBeenCalledWith(
			expect.objectContaining({
				options: expect.objectContaining({
					mode: 'c15t',
					backendURL: '/api/c15t',
					callbacks: expect.objectContaining({
						onConsentSet: mockCallback,
					}),
				}),
			})
		);
	});

	it('should set usingAppDir to true', async () => {
		const { ConsentManagerProvider } = await import('../index');
		const { enrichOptions } = await import(
			'../../consent-manager-provider/utils/enrich-options'
		);

		ConsentManagerProvider({
			options: { mode: 'c15t', backendURL: '/api/test' },
			children: null,
		});

		// Verify usingAppDir is always true for client provider
		expect(enrichOptions).toHaveBeenCalledWith(
			expect.objectContaining({
				usingAppDir: true,
			})
		);
	});
});
