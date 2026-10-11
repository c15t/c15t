import { afterEach, describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { ComponentFixtureProvider } from '~/__tests__/component-fixture-provider';
import { ConsentDevTools } from '~/devtools';
import { offline } from '~/transports/offline';

import { ConsentDialogTrigger } from '../index';
import * as ToolbarLoader from '../toolbar-loader';

// Records on-demand toolbar loads. `<ConsentDevTools>` registers the toolbar
// before it publishes its launcher, so the trigger should never need one.
vi.mock('../toolbar-loader', async (importOriginal) => {
	const actual = await importOriginal<typeof ToolbarLoader>();
	return { ...actual, loadTriggerToolbar: vi.fn(actual.loadTriggerToolbar) };
});

afterEach(() => {
	for (const host of document.querySelectorAll('[data-c15t-dev-tools-host]')) {
		host.remove();
	}
});

describe('ConsentDialogTrigger with ConsentDevTools', () => {
	test('becomes the toolbar without loading it on demand', async () => {
		await render(
			<ComponentFixtureProvider options={{ mode: offline() }}>
				<ConsentDevTools />
				<ConsentDialogTrigger showWhen="always" />
			</ComponentFixtureProvider>
		);
		await vi.waitFor(() => {
			expect(
				document.querySelector('[data-c15t-trigger-action="devtools"]')
			).toBeInTheDocument();
		});
		expect(ToolbarLoader.loadTriggerToolbar).not.toHaveBeenCalled();
	});
});
