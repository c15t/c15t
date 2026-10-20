/**
 * Starts granted scripts from a server render, before hydration.
 *
 * The script loader inserts a script only after the page hydrates and the
 * loader's own chunk arrives. When the server has resolved a returning
 * visitor's consent, it can run a granted script's setup and insert its
 * element from the HTML instead; the loader adopts the element when it
 * mounts.
 *
 * Starting a script sends a request to the vendor, so it happens only for
 * a script the loader would run with the state the server resolved:
 * `alwaysLoad`, or consent for its category and vendor. A host must not
 * call these for HTML that is cached or prerendered: that HTML carries no
 * one visitor's consent.
 */
import { writePolicyResolutionWire } from '@c15t/schema/types';

import type { Script } from '../libs/script-loader/types';
import {
	deniedVendorIds,
	evaluateConsent,
	getEffectiveGateState,
} from '../modules/has';
import { resolveStorageKeys } from '../modules/persistence/record-storage';
import {
	CATEGORY_CODES,
	IAB_CODES,
	SUBJECT_CODES,
} from '../modules/persistence/writer/encode';
import type { ConsentSnapshot } from '../types';
import { storageFor } from './assemble';
import { createRuntimeKernel } from './runtime-kernel';
import type { ConsentRuntimeOptions, RuntimePrefetch } from './types';

type ServerScriptOptions = ConsentRuntimeOptions & {
	prefetch?: RuntimePrefetch;
};

interface ServerRunnable {
	/** Each script the loader would run, and whether it has consent. */
	scripts: { hasConsent: boolean; script: Script }[];
	snapshot?: ConsentSnapshot;
}

/**
 * The scripts in `scripts` the loader would run with the server-resolved
 * `prefetch`: `alwaysLoad`, or consent for their category and vendor, and
 * the snapshot that decided it. None without a server-resolved policy or
 * a request clock, under a `consentSource`, or when anything throws.
 */
const serverRunnableScripts = function serverRunnableScripts(
	options: ServerScriptOptions,
	scripts: Script[]
): ServerRunnable {
	const { prefetch } = options;
	// A shared render, for prerendered or cached HTML, carries no request
	// clock: its state is no one visitor's.
	if (
		scripts.length === 0 ||
		options.consentSource ||
		// The client then replaces the server's records with whatever the
		// browser stores, even an older decision, which the inline check
		// can't tell apart.
		(typeof options.persistence === 'object' &&
			options.persistence.skipHydration === false) ||
		!prefetch?.initialPolicyResolution ||
		prefetch.now === undefined
	) {
		return { scripts: [] };
	}
	let kernel: ReturnType<typeof createRuntimeKernel> | undefined;
	try {
		const resolution = prefetch.initialPolicyResolution;
		kernel = createRuntimeKernel(
			Object.assign(Object.create(options) as ConsentRuntimeOptions, {
				// Never asked: the kernel is only read, never initialized.
				mode: (() => ({
					init: () =>
						Promise.resolve({
							policyResolution: writePolicyResolutionWire(resolution),
						}),
				})) as unknown as ConsentRuntimeOptions['mode'],
				prefetch,
			})
		);
		const snapshot = kernel.getSnapshot();
		const now = Date.now();
		return {
			scripts: scripts.flatMap((script) => {
				const hasConsent = evaluateConsent(script, snapshot, now);
				return script.alwaysLoad === true || hasConsent
					? [{ hasConsent, script }]
					: [];
			}),
			snapshot,
		};
	} catch {
		return { scripts: [] };
	} finally {
		kernel?.dispose();
	}
};

/** JSON safe inside a `<script>` element. */
const inlineJSON = function inlineJSON(value: unknown): string {
	return JSON.stringify(value)
		.replace(/</gu, '\\u003c')
		.replace(/\u2028/gu, '\\u2028')
		.replace(/\u2029/gu, '\\u2029');
};

/**
 * How long the start waits for the page's priority images before it
 * inserts the scripts anyway, in milliseconds.
 */
const PRIORITY_IMAGE_WAIT_MS = 3000;

/**
 * Calls `f` once every `<img fetchpriority="high">` still loading has
 * finished, or after {@link PRIORITY_IMAGE_WAIT_MS}. Vendor downloads
 * share the connection with the page's LCP image and push it back;
 * request priority doesn't help across origins.
 */
const AFTER_PRIORITY_IMAGES = `function(f){var h=[].filter.call(document.querySelectorAll('img[fetchpriority=high]'),function(x){return!x.complete}),l=h.length,d=function(){if(f){var g=f;f=null;g()}};if(!l)return d();setTimeout(d,${PRIORITY_IMAGE_WAIT_MS});h.forEach(function(x){var c=function(){if(!--l)d()};x.addEventListener('load',c);x.addEventListener('error',c)})}`;

/**
 * Creates one script the way the loader does and leaves the element for
 * the loader to adopt under `__c15tStarted[key]`, keyed like the loader's
 * element id by `resourceKey ?? id`, then inserts it after the page's
 * priority images; until then `__c15tInsert` holds the insert, and the
 * loader cancels it by deleting it. Until a loader adopts it, the insert
 * checks the stored consent again first: when it changed during the wait,
 * it sets `__c15tHeld` and leaves the insert to a loader that runs the
 * script. An adopted element skips that check, since its loader decides
 * consent and cancels a revoked insert itself. `__c15tConsent`
 * records whether its setup ran with consent, and `__c15tScript` for
 * which script. The script's own `nonce`
 * wins over the inline script's. No DOM id or marker, so the anonymized id
 * the loader gives it later is the only one it has.
 */
const INSERT_SCRIPT = `function(id,src,o){var e=document.createElement('script');e.src=src;e.__c15tConsent=o.consent;e.__c15tScript=o.script;if(o.async!=null)e.async=o.async;if(o.defer)e.defer=true;if(o.fetchPriority)e.fetchPriority=o.fetchPriority;if(o.nonce||n)e.nonce=o.nonce||n;for(var k in o.attributes||{})e.setAttribute(k,o.attributes[k]);e.addEventListener('load',function(){e.__c15tDone='load'});e.addEventListener('error',function(){e.__c15tDone='error'});s[id]=e;var g=e.__c15tInsert=function(){if(e.__c15tInsert!==g)return;delete e.__c15tInsert;if(!e.__c15tAdopted&&z()){e.__c15tHeld=true;return}(o.target==='body'?document.body||document.head:document.head).appendChild(e)};w(g)}`;

/**
 * Runs `r` in a task after the next frame. The start script streams in
 * with the page, often in the task that paints it first; setup and
 * inserts there push first paint back. A hidden document paints no
 * frames, so it runs `r` at once.
 */
const AFTER_FIRST_PAINT =
	'document.hidden?r():requestAnimationFrame(function(){setTimeout(r)})';

/**
 * What the client seeds from the server's records: each category's
 * decision as `[value, confirmedAt]`, the vendor choice's time, and the
 * earliest of those times.
 */
const seedOf = function seedOf(snapshot: ConsentSnapshot): {
	categories: Record<string, [boolean, number]>;
	earliest: number | null;
	vendorsAt: number;
} {
	const categories: Record<string, [boolean, number]> = {};
	const times: number[] = [];
	for (const [category, decision] of Object.entries(
		snapshot.explicitChoice?.categories ?? {}
	)) {
		if (decision) {
			categories[category] = [decision.value, decision.confirmedAt];
			times.push(decision.confirmedAt);
		}
	}
	const vendorsAt = snapshot.vendorChoice?.confirmedAt ?? -1;
	if (snapshot.vendorChoice) {
		times.push(vendorsAt);
	}
	return {
		categories,
		earliest: times.length > 0 ? Math.min(...times) : null,
		vendorsAt,
	};
};

/**
 * Skips everything when the browser holds a record that would change what
 * the client runs with. The client seeds its state from the records the
 * server read, then applies a stored category decision only when it is a
 * denial newer than the seed's for that category, or from the same
 * millisecond as a seeded grant, and a stored vendor choice only when it
 * is newer than the seed's (`applyNewerStoredRecords`). The code applies
 * the same tests to the cookie and `localStorage` copies of the consent
 * and vendor records. It also skips for a clear at or after the earliest
 * seeded decision, and for a record it can't read, such as an older
 * format: the loader then decides from the stored state, as it would
 * without this script. A record under the legacy key skips too, unless
 * the server read a decision from the consent cookie: the client falls
 * back to the legacy record when the configured one doesn't decode.
 *
 * Two things change the state without a stored record: the browser's
 * Global Privacy Control signal, when the server didn't see one and no
 * override decides it, and the time passing the snapshot's
 * `nextDeadline`, when a decision expires.
 */
const newerStoredDecision = function newerStoredDecision(
	snapshot: ConsentSnapshot,
	keys: ReturnType<typeof resolveStorageKeys>
): string {
	const seed = seedOf(snapshot);
	const { gpc } = snapshot.privacySignals;
	// The client honors a browser signal the server didn't see.
	const gpcCheck =
		gpc.override === undefined && !gpc.active
			? 'try{if(navigator.globalPrivacyControl===true)return true}catch(x){}'
			: '';
	const names = Object.fromEntries(
		CATEGORY_CODES.map(([category, code]) => [code, category])
	);
	const subject = SUBJECT_CODES.map(([, code]) => code);
	const fields = {
		c: [...subject, ...IAB_CODES.map(([, code]) => code), 'b'],
		v: [...subject, 'd'],
	};
	// `z()` is true when the stored state differs. `c(name)` reads a
	// cookie, unwrapping one URI-encoding layer as the client does; `l(key)`
	// reads localStorage. `d` tests one decision against the seed, `p` the
	// fields of a compact record, `o` a parsed JSON one. `p` is also true
	// for a field the client's decoder rejects: a field without a value,
	// a repeated one, a malformed decision, or one outside `F`, the other
	// fields each record may hold. `D` is the time the server's decisions
	// can next change.
	return `var D=${inlineJSON(snapshot.nextDeadline)},S=${inlineJSON(seed.categories)},V=${seed.vendorsAt},M=${inlineJSON(seed.earliest)},N=${inlineJSON(names)},F=${inlineJSON(fields)},K=${inlineJSON({ consent: keys.consent, epoch: keys.epoch, legacyConsent: keys.legacyConsent, vendors: keys.vendors })},z=function(){${gpcCheck}if(D!==null&&!(Date.now()<D))return true;var c=function(n){try{for(var a=document.cookie.split(/;\\s*/),j=0;j<a.length;j++){var m=a[j].indexOf('=');if(a[j].slice(0,m)===n){var v=a[j].slice(m+1);if(v.indexOf('v=')&&v.indexOf('%')>=0)try{v=decodeURIComponent(v)}catch(x){}return v}}}catch(x){}return null},l=function(n){try{return localStorage.getItem(n)}catch(x){return null}},d=function(n,v,t){var s=S[n];return v!==true&&(!s||!(t<=s[1])||t===s[1]&&s[0])},e=function(t){return M!==null&&!(+t<M)},o=function(v,f){try{v=JSON.parse(v)}catch(x){return true}return!v||typeof v!=='object'||f(v)},p=function(v,h,f){if(v===null||v==='')return false;v=v.split('&');if(v[0]!==h)return true;for(var u=[],j=1;j<v.length;j++){var m=v[j].indexOf('='),k=v[j].slice(0,m);if(m<1||u.indexOf(k)>=0||f(k,v[j].slice(m+1)))return true;u.push(k)}return false},r=function(v,f){return v!==null&&v!==''&&o(v,f)},a=c(K.consent),b=l(K.consent),g;if(p(a,'v=3',function(k,v){if(k==='e')return e(v);if(N.hasOwnProperty(k)){if(!/^[01]\\.\\d+\\.\\d+$/.test(v))return true;v=v.split('.');return d(N[k],v[0]==='1',+v[1])}return F.c.indexOf(k)<0})||r(b,function(v){if(v.version!==3||v.epoch&&e(v.epoch))return true;for(g in v.categories||{})if(v.categories[g]&&d(g,v.categories[g].value,+v.categories[g].confirmedAt))return true})||!(a&&M!==null)&&K.legacyConsent&&l(K.legacyConsent))return true;if(p(c(K.vendors),'v=1',function(k,v){return k==='t'?!(+v<=V):F.v.indexOf(k)<0})||r(l(K.vendors),function(v){return v.version!==1||!(+v.confirmedAt<=V)}))return true;a=[c(K.epoch),l(K.epoch)];for(g=0;g<2;g++)if(a[g]&&e(a[g]))return true;return false};if(z())return;`;
};

/** The loader's element identity for `script`. */
const resourceOf = (script: Script): string => script.resourceKey ?? script.id;

/**
 * The resources two scripts with different ids share. On an element it
 * inserts, the loader runs the `onBeforeLoad` of every script that shares
 * it, but on one it adopts, only the first script's, so these are left to
 * the loader.
 */
const sharedResources = function sharedResources(
	scripts: ServerRunnable['scripts']
): Set<string> {
	const owners = new Map<string, string>();
	const shared = new Set<string>();
	for (const { script } of scripts) {
		const owner = owners.get(resourceOf(script));
		if (owner === undefined) {
			owners.set(resourceOf(script), script.id);
		} else if (owner !== script.id) {
			shared.add(resourceOf(script));
		}
	}
	return shared;
};

/**
 * The scripts a server start considers: every element script when one of
 * them can start from the HTML, and none when the app turns it off.
 */
const serverStartCandidates = function serverStartCandidates(
	options: ServerScriptOptions
): Script[] {
	if (options.scriptLoader?.serverStart === false) {
		return [];
	}
	const elementScripts = (options.scripts ?? []).filter(
		(script) => !script.callbackOnly
	);
	return elementScripts.some((script) => script.serverStart && script.src)
		? elementScripts
		: [];
};

/**
 * One inline script that runs the setup of every script the loader would
 * run with the server-resolved `prefetch` and that has a `serverStart`,
 * then inserts its element once the page's priority images have loaded.
 * An `alwaysLoad` script without consent runs its setup without consent,
 * as the loader would. Nothing starts while the policy asks the visitor
 * to choose: the banner needs the main thread then. The loader adopts those elements instead of
 * inserting its own. Each script's setup runs in its own `try` block; one
 * that throws is skipped and left to the loader.
 *
 * The server can't see a decision stored only in the browser, so the code
 * checks `localStorage` and the consent cookies first and does nothing
 * when they hold a decision newer than the server's, and checks them
 * again before each insert. It does the same for a Global Privacy Control
 * signal the server didn't see and for a decision that expired since the
 * render. Scripts that share a `resourceKey` start from the loader, which
 * runs each one's setup. A host must not call this for cached or prerendered
 * HTML; a state from a shared render carries no `now` and starts nothing.
 *
 * The work waits until after first paint. When the loader mounts first,
 * it sets `__c15tLoaderRan` and the code does nothing: the loader has
 * started those scripts itself.
 *
 * @param options - The runtime's options, with a resolved `prefetch`.
 * @returns The script's code, or `undefined` when no script starts.
 * @internal
 */
export const serverScriptStart = function serverScriptStart(
	options: ServerScriptOptions
): string | undefined {
	const { scripts, snapshot } = serverRunnableScripts(
		options,
		serverStartCandidates(options)
	);
	// A visitor the policy asks to choose sees the banner as the page
	// hydrates, and a script's first run would hold the main thread while
	// they tap it. The loader starts those scripts once it mounts instead.
	if (
		!snapshot ||
		scripts.length === 0 ||
		snapshot.promptRequirement.kind !== 'none'
	) {
		return;
	}
	const consents = getEffectiveGateState(snapshot).effectivePermissions;
	const denied = snapshot.model === 'iab' ? null : deniedVendorIds(snapshot);
	const preludes = new Set<string>();
	const starts: string[] = [];
	const shared = sharedResources(scripts);
	const keys = new Set<string>();
	for (const { hasConsent, script } of scripts) {
		const key = resourceOf(script);
		if (keys.has(key) || shared.has(key)) {
			continue;
		}
		keys.add(key);
		if (!(script.serverStart && script.src)) {
			continue;
		}
		let start: ReturnType<NonNullable<Script['serverStart']>>;
		try {
			start = script.serverStart?.(
				{
					consents,
					hasConsent,
					id: script.id,
					vendor:
						script.vendor && snapshot.model !== 'iab'
							? { granted: !denied?.has(script.vendor), id: script.vendor }
							: undefined,
				},
				script
			);
		} catch {
			continue;
		}
		if (!start) {
			continue;
		}
		if (start.prelude) {
			preludes.add(start.prelude);
		}
		const insertOptions = {
			async: script.async,
			attributes: script.attributes,
			consent: hasConsent,
			defer: script.defer,
			fetchPriority: script.fetchPriority,
			nonce: script.nonce,
			script: script.id,
			target: script.target,
		};
		starts.push(
			`try{if(!s[${inlineJSON(key)}]){${start.code};i(${inlineJSON(key)},${inlineJSON(script.src)},${inlineJSON(insertOptions)})}}catch(x){}`
		);
	}
	if (starts.length === 0) {
		return;
	}
	// `document.currentScript` is only set while the script first runs.
	return `(function(){var n=document.currentScript&&document.currentScript.nonce,r=function(){if(window.__c15tLoaderRan)return;${newerStoredDecision(snapshot, resolveStorageKeys(storageFor(options)))}var s=window.__c15tStarted=window.__c15tStarted||{},w=${AFTER_PRIORITY_IMAGES},i=${INSERT_SCRIPT};${[...preludes].join(';')};${starts.join('')}};${AFTER_FIRST_PAINT}})()`;
};
