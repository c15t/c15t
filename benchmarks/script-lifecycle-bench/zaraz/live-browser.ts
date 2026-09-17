import { createConsentClient } from '../../../packages/browser/src/index';
import { policyRulePresets } from '../../../packages/core/src/index';
import { createScriptLoader } from '../../../packages/core/src/modules/script-loader/index';
import { cloudflareZaraz } from '../../../packages/scripts/src/vendors/tag-managers/cloudflare-zaraz';

const lifecycle = new AbortController();
const { signal } = lifecycle;

const denied = {
	experience: false,
	functionality: false,
	marketing: false,
	measurement: false,
	necessary: true,
};
const client = createConsentClient({
	consentCategories: ['measurement'],
	mode: 'offline',
	policyRules: [
		{
			...policyRulePresets.europeOptIn(),
			categories: ['measurement'],
			match: { isDefault: true },
			scopeMode: 'strict',
		},
	],
	presentation: { prompt: { position: 'bottom-right' } },
	storageConfig: { storageKey: 'c15t-zaraz-lab' },
	ui: {
		banner: {
			description:
				'Allow measurement to let our Zaraz test tool count pageviews. This demo sends no data to an analytics provider.',
			scrollLock: false,
			trapFocus: false,
		},
		colorScheme: 'light',
		trigger: true,
	},
});
client.start();
await client.ready();
const { kernel } = client;
const events: string[] = [];
const apiReadyAtMount = window.zaraz?.consent.APIReady === true;
const loader = createScriptLoader({
	kernel,
	scripts: [
		cloudflareZaraz({
			onReady: () => {
				events.push('ready');
			},
			purposes: { marketing: ['cSIK'], measurement: ['feGw'] },
		}),
	],
});
const measurementAllowed = () =>
	kernel.getSnapshot().effectivePermissions.measurement;
const savePermissions = async (measurement: boolean, marketing: boolean) => {
	signal.throwIfAborted();
	await client.save({ ...denied, marketing, measurement });
	signal.throwIfAborted();
};

// The page displays real API permissions and the counter written by Zaraz.
const element = (id: string) => document.getElementById(id);
const setText = (id: string, value: string) => {
	if (signal.aborted) {
		return;
	}
	const target = element(id);
	if (target && target.textContent !== value) {
		target.textContent = value;
	}
};
const log = (message: string) => {
	if (signal.aborted) {
		return;
	}
	const item = document.createElement('li');
	const time = document.createElement('time');
	time.textContent = new Date().toLocaleTimeString([], { hour12: false });
	const text = document.createElement('span');
	text.textContent = message;
	item.append(time, text);
	element('log')?.prepend(item);
	if ((element('log')?.childElementCount ?? 0) > 60) {
		element('log')?.lastElementChild?.remove();
	}
};
let busy = false;
let observedReady = false;
let observedRuns = 0;
const runs = () => window.__zarazMeasurementRuns ?? 0;
const render = () => {
	if (signal.aborted) {
		return;
	}
	const ready = events.includes('ready');
	setText(
		'connection',
		ready ? 'Connected to live Zaraz' : 'Connecting to Zaraz…'
	);
	setText('c15t-state', measurementAllowed() ? 'Allowed' : 'Denied');
	let zarazPermission = 'Connecting…';
	if (ready) {
		zarazPermission = window.zaraz.consent.getAll().feGw ? 'Allowed' : 'Denied';
	}
	setText('zaraz-state', zarazPermission);
	setText('tool-runs', String(runs()));
	for (const id of ['demo', 'send', 'preferences', 'banner']) {
		const button = element(id);
		if (button instanceof HTMLButtonElement) {
			button.disabled = !ready || busy;
		}
	}
	if (ready && !observedReady) {
		observedReady = true;
		log('Zaraz connected. c15t synchronized measurement permission.');
		setText(
			'result',
			'Ready. Run the demo to watch a blocked pageview execute after consent.'
		);
	}
	if (runs() !== observedRuns) {
		log(`Zaraz executed the measurement tool. Total executions: ${runs()}.`);
		observedRuns = runs();
	}
};
const pause = (milliseconds: number) =>
	new Promise<void>((resolve, reject) => {
		signal.throwIfAborted();
		const cancel = () => {
			// oxlint-disable-next-line no-use-before-define -- The handler runs only after the timer is registered.
			clearTimeout(timer);
			reject(signal.reason);
		};
		const timer = setTimeout(() => {
			signal.removeEventListener('abort', cancel);
			resolve();
		}, milliseconds);
		signal.addEventListener('abort', cancel, { once: true });
	});
const save = async (allowed: boolean) => {
	await savePermissions(allowed, false);
	log(
		allowed
			? 'c15t granted measurement. Zaraz may replay queued pageviews.'
			: 'c15t denied measurement. Zaraz blocks subsequent pageviews.'
	);
	render();
};
const send = async () => {
	signal.throwIfAborted();
	log(
		`Pageview sent to Zaraz with measurement ${measurementAllowed() ? 'allowed' : 'denied'}.`
	);
	await window.zaraz.track('Pageview');
};
const demo = async () => {
	client.closeDialog();
	setText(
		'result',
		'Step 1 of 3: deny consent and send a pageview. The tool should stay blocked.'
	);
	await save(false);
	const before = runs();
	await send();
	await pause(1000);
	if (runs() !== before) {
		throw new Error('The tool ran while measurement was denied.');
	}
	log('PASS: denied pageview did not execute the tool.');
	setText(
		'result',
		'Step 2 of 3: grant consent. Watch the queued pageview execute.'
	);
	await save(true);
	const deadline = Date.now() + 10000;
	while (runs() <= before && Date.now() < deadline) {
		// oxlint-disable-next-line no-await-in-loop -- Wait for the actual asynchronous Zaraz tool, never simulate its counter.
		await pause(100);
	}
	if (runs() <= before) {
		throw new Error(
			'Zaraz did not execute the queued pageview within 10 seconds.'
		);
	}
	render();
	log('PASS: consent grant released the queued pageview.');
	await pause(1000);
	setText(
		'result',
		'Step 3 of 3: revoke consent and send another pageview. The counter should stay unchanged.'
	);
	await save(false);
	const afterGrant = runs();
	await send();
	await pause(1000);
	if (runs() !== afterGrant) {
		throw new Error('The tool ran after consent was revoked.');
	}
	log('PASS: revocation blocked the next pageview.');
	setText(
		'result',
		'All 3 checks passed against live Zaraz. Measurement is now denied.'
	);
};
const actions: Record<string, () => Promise<void> | void> = {
	banner: () => {
		client.showBanner();
	},
	demo,
	preferences: () => {
		client.openDialog();
	},
	send,
};
Object.entries(actions).forEach(([id, action]) => {
	element(id)?.addEventListener(
		'click',
		async () => {
			busy = true;
			render();
			try {
				await action();
			} catch (error) {
				if (signal.aborted) {
					return;
				}
				const message = error instanceof Error ? error.message : String(error);
				log(`ERROR: ${message}`);
				setText('result', message);
			} finally {
				busy = false;
				render();
			}
		},
		{ signal }
	);
});
const unsubscribeConsent = client.on('consent', () => {
	log(
		`c15t consent saved. Measurement is ${measurementAllowed() ? 'allowed' : 'denied'}.`
	);
	render();
});
log(
	`c15t ${client.hasConsented() ? 'restored your saved choice' : 'started without a saved choice'}. Measurement is ${measurementAllowed() ? 'allowed' : 'denied'}. No pageview sent yet.`
);
render();
const renderInterval = setInterval(render, 200);
const connectionTimeout = setTimeout(() => {
	if (!observedReady) {
		setText(
			'result',
			'Zaraz has not connected. Check whether your browser is blocking /cdn-cgi/zaraz, then reload.'
		);
	}
}, 10000);

Object.defineProperty(window, 'c15tLab', {
	value: {
		apiReadyAtMount,
		dispose: () => {
			if (signal.aborted) {
				return;
			}
			lifecycle.abort();
			clearInterval(renderInterval);
			clearTimeout(connectionTimeout);
			unsubscribeConsent();
			loader.dispose();
			client.dispose();
		},
		events,
		save: savePermissions,
	},
});
