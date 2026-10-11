import { useContext, useEffect } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { ComponentFixtureProvider } from '~/__tests__/component-fixture-provider';
import { KernelContext } from '~/context';
import { publishDevToolsLauncher } from '~/devtools-launcher';
import { offline } from '~/transports/offline';

import { ConsentDialogTrigger } from '../index';

// This file never imports `~/devtools`, so nothing registers the toolbar
// ahead of time: the trigger has to load it on demand.
const PublishLauncher = () => {
	const kernel = useContext(KernelContext);
	useEffect(() => {
		if (!kernel) {
			return;
		}
		return publishDevToolsLauncher(kernel, {
			dock: () => undefined,
			getState: () => ({ isOpen: false }),
			subscribe: () => () => undefined,
			toggle: () => undefined,
		});
	}, [kernel]);
	return null;
};

describe('ConsentDialogTrigger toolbar loading', () => {
	test('keeps the single button until a launcher is published', async () => {
		await render(
			<ComponentFixtureProvider options={{ mode: offline() }}>
				<ConsentDialogTrigger showWhen="always" />
			</ComponentFixtureProvider>
		);
		await vi.waitFor(() => {
			expect(
				document.querySelector('[data-testid="consent-dialog-trigger"]')
			).toBeInTheDocument();
		});
		expect(document.querySelector('[role="toolbar"]')).toBeNull();
	});

	test('loads the toolbar when a launcher appears without the DevTools adapter', async () => {
		await render(
			<ComponentFixtureProvider options={{ mode: offline() }}>
				<PublishLauncher />
				<ConsentDialogTrigger showWhen="always" />
			</ComponentFixtureProvider>
		);
		await vi.waitFor(() => {
			expect(
				document.querySelector('[data-c15t-trigger-action="devtools"]')
			).toBeInTheDocument();
		});
		expect(
			document.querySelector('[data-c15t-trigger-action="preferences"]')
		).toBeInTheDocument();
	});
});
