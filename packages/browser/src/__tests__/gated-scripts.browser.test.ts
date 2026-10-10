import { afterEach, describe, expect, it, vi } from 'vitest';

import { activateGatedScripts } from '../gated-scripts';
import { createScriptTagConsentClient as createConsentClient } from '../script-tag-client';

const frames: HTMLIFrameElement[] = [];
const scriptURLs: string[] = [];

const createFrame = async (src?: string): Promise<Document> => {
	const frame = document.createElement('iframe');
	frames.push(frame);
	const loaded = new Promise<void>((resolve) => {
		frame.addEventListener('load', () => resolve(), { once: true });
	});
	if (src) {
		frame.src = src;
	} else {
		frame.srcdoc = '<!doctype html><html><head></head><body></body></html>';
	}
	document.body.append(frame);
	await loaded;
	const frameDocument = frame.contentDocument;
	if (!frameDocument) {
		throw new Error('Missing script test document');
	}
	return frameDocument;
};

const appendScript = (root: Document, body: string, external = false) => {
	const script = root.createElement('script');
	script.type = 'text/plain';
	script.setAttribute('data-c15t-category', 'necessary');
	if (external) {
		const url = URL.createObjectURL(
			new Blob([body], { type: 'text/javascript' })
		);
		scriptURLs.push(url);
		script.src = url;
	} else {
		script.textContent = body;
	}
	root.body.append(script);
	return script;
};

afterEach(() => {
	for (const frame of frames.splice(0)) {
		frame.remove();
	}
	for (const url of scriptURLs.splice(0)) {
		URL.revokeObjectURL(url);
	}
});

describe('gated script execution in Chromium', () => {
	it('loads an external vendor before running its following inline setup', async () => {
		const root = await createFrame();
		appendScript(root, "document.body.dataset.vendor = 'ready';", true);
		appendScript(
			root,
			"document.body.dataset.observedVendor = document.body.dataset.vendor ?? 'missing';"
		);
		const client = createConsentClient({ ui: false });
		activateGatedScripts(client.getSnapshot(), root);
		client.dispose();

		await expect.poll(() => root.body.dataset.vendor).toBe('ready');
		await expect.poll(() => root.body.dataset.observedVendor).toBe('ready');
	});

	it('preserves a hidden nonce so CSP permits the activated script', async () => {
		const nonce = 'c15t-test-nonce';
		const root = await createFrame('/__c15t-test__/gated-script-csp');
		const script = root.querySelector('script');
		if (!script) {
			throw new Error('Missing nonce script');
		}
		// Browsers hide the content attribute when a nonced script is connected.
		expect(script.getAttribute('nonce')).toBe('');
		expect(script.nonce).toBe(nonce);
		const client = createConsentClient({ ui: false });
		activateGatedScripts(client.getSnapshot(), root);
		client.dispose();

		await expect.poll(() => root.documentElement.dataset.executed).toBe('true');
	});
});

describe("gated scripts under 'strict-dynamic'", () => {
	const openStrictDynamic = async () => {
		const root = await createFrame('/__c15t-test__/strict-dynamic');
		const client = createConsentClient({ ui: false });
		return { client, root };
	};
	const settle = () =>
		new Promise((resolve) => {
			setTimeout(resolve, 500);
		});

	it('runs injected inert tags when no nonce is configured', async () => {
		const { client, root } = await openStrictDynamic();

		activateGatedScripts(client.getSnapshot(), root);
		client.dispose();

		// Why the nonce matters: the policy trusts every script c15t creates.
		await expect.poll(() => root.documentElement.dataset.trusted).toBe('true');
		await expect
			.poll(() => root.documentElement.dataset.externalInjected)
			.toBe('true');
		expect(root.documentElement.dataset.inlineInjected).toBe('true');
	});

	it('activates only tags carrying the configured nonce', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {
			/* expected */
		});
		const { client, root } = await openStrictDynamic();

		activateGatedScripts(client.getSnapshot(), root, {
			nonce: 'c15t-test-nonce',
		});
		client.dispose();

		await expect.poll(() => root.documentElement.dataset.trusted).toBe('true');
		await settle();
		expect(root.documentElement.dataset.externalInjected).toBeUndefined();
		expect(root.documentElement.dataset.inlineInjected).toBeUndefined();
		expect(
			root.querySelectorAll('[data-c15t-activated="untrusted"]')
		).toHaveLength(2);
		warn.mockRestore();
	});
});
