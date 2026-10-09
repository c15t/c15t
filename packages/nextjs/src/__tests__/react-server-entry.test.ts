/// <reference types="vite/client" />
/**
 * What a Server Component gets from `c15t/next`: the `react-server` entry
 * names one `'use client'` module for the quickstart components, plus the
 * config helpers as plain functions.
 */
import { ConsentBanner } from '@c15t/react/components/consent-banner';
import { ConsentDialogLink } from '@c15t/react/components/consent-dialog-link';
import { ConsentDialog } from '@c15t/react/consent-dialog';
import { describe, expect, test } from 'vitest';

import packageJson from '../../package.json';
// oxlint-disable-next-line import/default -- Vite's `?raw` query makes the file's source the default export.
import clientComponentsSource from '../client-components.ts?raw';
import { defineConsentConfig } from '../config';
import * as reactServer from '../index.react-server';
import { ConsentRoot } from '../root';

describe('@c15t/nextjs react-server entry', () => {
	test('resolves under the react-server condition', () => {
		expect(packageJson.exports['.']).toMatchObject({
			'react-server': './dist/index.react-server.js',
		});
	});

	test('names the quickstart components through one client module', () => {
		expect(clientComponentsSource.startsWith("'use client';")).toBe(true);
		expect(reactServer).toMatchObject({
			ConsentBanner,
			ConsentDialog,
			ConsentDialogLink,
			ConsentRoot,
		});
	});

	test('exports what a Server Component layout renders or passes on', () => {
		for (const name of [
			'ConsentDialogTrigger',
			'ConsentGate',
			'ConsentProvider',
			'ConsentTheme',
			'ConsentWidget',
			'defineTheme',
		] as const) {
			expect(reactServer[name]).toBeDefined();
		}
	});

	test('exports the config helpers and the mode data factories', () => {
		expect(reactServer.defineConsentConfig).toBe(defineConsentConfig);
		expect(reactServer.manifest({ resolve: 'browser' })).toEqual({
			resolve: 'browser',
			type: 'manifest',
		});
		expect(reactServer.hosted()).toEqual({ type: 'hosted' });
		expect(reactServer.offline()).toEqual({ type: 'offline' });
	});
});
