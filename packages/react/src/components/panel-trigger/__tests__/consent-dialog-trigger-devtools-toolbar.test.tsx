import { useLayoutEffect } from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { ComponentFixtureProvider } from '~/__tests__/component-fixture-provider';
import { ConsentDevTools } from '~/devtools';
import { useDevToolsLauncherAvailable } from '~/devtools-launcher';
import { offline } from '~/transports/offline';

import { ConsentDialogTrigger } from '../index';

/**
 * Records, in the commit where the DevTools launcher first becomes
 * available, whether the trigger already renders as a toolbar. A trigger
 * that had to load the toolbar on demand would still show its single
 * button in that commit.
 */
const LauncherProbe = ({ seen }: { seen: boolean[] }) => {
	const available = useDevToolsLauncherAvailable();
	useLayoutEffect(() => {
		if (available) {
			seen.push(document.querySelector('[role="toolbar"]') !== null);
		}
	}, [available, seen]);
	return null;
};

afterEach(() => {
	for (const host of document.querySelectorAll('[data-c15t-dev-tools-host]')) {
		host.remove();
	}
});

describe('ConsentDialogTrigger with ConsentDevTools', () => {
	// No retries: a failed attempt loads the toolbar for the whole page, so a
	// retry would pass whether or not DevTools registered it.
	test(
		'shows the toolbar in the same commit as the launcher',
		{ retry: 0 },
		async () => {
			const seen: boolean[] = [];
			await render(
				<ComponentFixtureProvider options={{ mode: offline() }}>
					<ConsentDevTools />
					<ConsentDialogTrigger showWhen="always" />
					<LauncherProbe seen={seen} />
				</ComponentFixtureProvider>
			);
			await vi.waitFor(() => {
				expect(seen).not.toEqual([]);
			});
			expect(seen[0]).toBe(true);
		}
	);
});
