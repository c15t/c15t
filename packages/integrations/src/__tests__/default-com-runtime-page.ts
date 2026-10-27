import { createConsentKernel } from '@c15t/core';
import { createScriptLoader } from '@c15t/core/modules/script-loader';
import type { ScriptLoaderHandle } from '@c15t/core/modules/script-loader';

import {
	defaultComFormsSdk,
	defaultComPixel,
} from '../vendors/analytics/default-com';
import type {
	DefaultComFormsSdkClient,
	DefaultComFormsSdkOptions,
} from '../vendors/analytics/default-com';

export type RuntimeOptions = DefaultComFormsSdkOptions;

const granted = {
	experience: true,
	functionality: true,
	marketing: true,
	measurement: true,
	necessary: true,
};
const denied = {
	experience: false,
	functionality: false,
	marketing: false,
	measurement: false,
	necessary: true,
};

const kernel = createConsentKernel();
const handles: ScriptLoaderHandle[] = [];
const meetings: string[] = [];
let retainedSdk: DefaultComFormsSdkClient | undefined;

const runtime = {
	addOwner(options: DefaultComFormsSdkOptions, pixel = false) {
		handles.push(
			createScriptLoader({
				kernel,
				scripts: [
					pixel ? defaultComPixel(options) : defaultComFormsSdk(options),
				],
			})
		);
	},
	cleanup() {
		for (const handle of handles) {
			handle.dispose();
		}
		kernel.dispose();
	},
	async consent(allowed: boolean) {
		await kernel.commands.save(allowed ? granted : denied);
	},
	consentCookie() {
		const cookie = document.cookie
			.split('; ')
			.find((row) => row.startsWith('_dflt_consent='));
		return cookie
			? JSON.parse(decodeURIComponent(cookie.slice('_dflt_consent='.length)))
			: null;
	},
	dispose(owner = 0) {
		handles[owner]?.dispose();
	},
	meetings,
	message(origin: string, meetingId: string) {
		window.dispatchEvent(
			new MessageEvent('message', {
				data: {
					payload: { meetingId },
					source: 'dft-scheduler',
					type: 'meeting_cancelled',
				},
				origin,
			})
		);
	},
	observeMeetings() {
		window.DefaultPixelSDK?.on('meeting_cancelled', ({ meetingId }) => {
			meetings.push(meetingId);
		});
	},
	remove(owner = 0) {
		handles[owner]?.updateScripts([]);
	},
	replace(options: DefaultComFormsSdkOptions, owner = 0) {
		handles[owner]?.updateScripts([defaultComFormsSdk(options)]);
	},
	retainSdk() {
		retainedSdk = window.DefaultPixelSDK;
	},
	async start(options: DefaultComFormsSdkOptions, pixel = false) {
		await kernel.commands.save(granted);
		handles.push(
			createScriptLoader({
				kernel,
				scripts: [
					pixel ? defaultComPixel(options) : defaultComFormsSdk(options),
				],
			})
		);
	},
	submit(display = false) {
		const sdk = window.DefaultPixelSDK;
		if (!sdk) {
			throw new Error('Expected the saved Forms SDK.');
		}
		const options = {
			formId: 'runtime-form',
			responses: { email: 'runtime@example.invalid' },
		};
		return sdk.submitForm(
			display ? options : { ...options, autoDisplayScheduler: false }
		);
	},
	submitRetained() {
		return retainedSdk?.submitForm({
			autoDisplayScheduler: false,
			formId: 'runtime-form',
			responses: { email: 'runtime@example.invalid' },
		});
	},
	async vendor(allowed: boolean) {
		await kernel.commands.save(granted, {
			vendors: { 'default-com': allowed },
		});
	},
};

declare global {
	interface Window {
		__defaultComRuntime: typeof runtime;
		__defaultPixel__logging__verbose?: boolean;
		__dft_sdk_loaded?: boolean;
		__runtimeOptions?: DefaultComFormsSdkOptions;
	}
}

window.__defaultComRuntime = runtime;
