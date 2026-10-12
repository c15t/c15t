import {
	appendInitParams,
	appendJourneyParams,
	CONSENT_JOURNEY_PARAM,
	CONSENT_JOURNEY_SCOPE_PARAM,
	CONSENT_JOURNEY_STORED_PARAM,
	INIT_EXPERIMENT_PARAM,
} from '@c15t/schema/types';
import type { InitOutput } from '@c15t/schema/types';

import type { SSRInitialData } from '../../options/ssr';
import { c15tProtocolParams } from '../../transports/version-header';
import type { InitContext, KernelJourney } from '../../types';
import {
	claimEarlyExperimentArm,
	experimentArmNames,
	experimentArmWeights,
	experimentConfigError,
} from '../experiment';
import type { ConsentExperiment } from '../experiment';
import { EXPERIMENT_WINDOW_KEY } from '../experiment-storage';
import {
	claimEarlyJourney,
	detectJourneyOption,
	hasStoredConsentRecord,
	JOURNEY_WINDOW_KEY,
	storedAnswerKeys,
} from '../journey';
import {
	buildRequestContextParams,
	buildRequestContextSentHeaders,
	createBrowserRequestContext,
	createRuntimeRequestContextMatcher,
	matchesStoredRequestContext,
} from '../request-context';
import { DEFAULT_INIT_CREDENTIALS } from '../request-context-headers';
import {
	EXPERIMENT_STORAGE_KEY,
	JOURNEY_STORAGE_KEY,
	STORAGE_KEY_V2,
} from '../storage-keys';
import type { PrefetchOptions } from './types';
import { PREFETCH_WINDOW_KEY } from './window-key';

const WINDOW_PROMISES_KEY = PREFETCH_WINDOW_KEY;

/** Raw init response and producer declaration retained until transport initialization. */
export interface PrefetchedInitialData extends SSRInitialData {
	producerPolicyContract?: string | null;
}
type PrefetchPromise = Promise<PrefetchedInitialData | undefined>;
interface PrefetchEntry {
	promise: PrefetchPromise;
	requestContext: NonNullable<SSRInitialData['metadata']>['requestContext'];
}

type BrowserWindow = Window & {
	[WINDOW_PROMISES_KEY]?: Record<string, PrefetchEntry>;
};

/**
 * The init query string, without the journey: the version, the policy
 * contract and the country, region and GPC overrides. Query parameters
 * rather than headers, so a cross-origin `/init` stays a CORS simple
 * request with no preflight. The inline script appends it as text.
 */
const buildInitQuery = function buildInitQuery(
	overrides: PrefetchOptions['overrides']
): string {
	return appendInitParams('', {
		...c15tProtocolParams,
		...buildRequestContextParams(overrides),
	});
};

interface PrefetchConfig {
	url: string;
	credentials: RequestCredentials;
	headers: Record<string, string>;
	requestContext: NonNullable<SSRInitialData['metadata']>['requestContext'];
	cacheKey: string;
}

const compareHeaderKeys = function compareHeaderKeys(
	left: string,
	right: string
): number {
	if (left < right) {
		return -1;
	}
	return left > right ? 1 : 0;
};

const buildPrefetchCacheKey = function buildPrefetchCacheKey(options: {
	url: string;
	credentials: RequestCredentials;
	headers: Record<string, string>;
	gpc: boolean;
}): string {
	// Code-point order: header names are ASCII, and the inline script below
	// must build the same key without a collator or an import.
	const sortedHeaders = Object.entries(options.headers)
		.sort(([leftKey], [rightKey]) => compareHeaderKeys(leftKey, rightKey))
		.map(([key, value]) => `${key}:${value}`)
		.join('|');

	return `${options.url}|${options.credentials}|gpc:${options.gpc}|${sortedHeaders}`;
};

const buildPrefetchConfig = function buildPrefetchConfig(
	options: PrefetchOptions
): PrefetchConfig {
	const requestContext = createBrowserRequestContext({
		...options,
		gpc: options.overrides?.gpc,
	});
	if (!requestContext) {
		throw new Error(`Invalid backend URL: ${options.backendURL}`);
	}

	const url = `${requestContext.backendURL}/init${buildInitQuery(options.overrides)}`;
	const credentials = requestContext.credentials ?? DEFAULT_INIT_CREDENTIALS;
	// CORS-safelisted only. A detected GPC signal is not sent: browsers
	// refuse `Sec-GPC` from scripts and send their own; it stays in the
	// cache key and the request context.
	const headers = buildRequestContextSentHeaders(options.overrides);

	return {
		cacheKey: buildPrefetchCacheKey({
			credentials,
			gpc: requestContext.gpc,
			headers,
			url,
		}),
		credentials,
		headers,
		requestContext,
		url,
	};
};

const toInitialData = function toInitialData(
	config: Pick<PrefetchConfig, 'requestContext'>,
	init: InitOutput | undefined,
	producerPolicyContract: string | null,
	journey: KernelJourney | undefined,
	experiment: InitContext['experiment']
): PrefetchedInitialData | undefined {
	if (!init) {
		return undefined;
	}

	return {
		gvl: init.gvl,
		init,
		metadata: {
			experiment: experiment ?? null,
			journey: journey ?? null,
			requestContext: config.requestContext,
		},
		producerPolicyContract,
	};
};

const getBrowserWindow = function getBrowserWindow():
	| BrowserWindow
	| undefined {
	if (typeof window === 'undefined') {
		return undefined;
	}

	return window as BrowserWindow;
};

const getPromiseMap = function getPromiseMap(
	browserWindow: BrowserWindow
): Record<string, PrefetchEntry> {
	if (!browserWindow[WINDOW_PROMISES_KEY]) {
		browserWindow[WINDOW_PROMISES_KEY] = {};
	}

	return browserWindow[WINDOW_PROMISES_KEY];
};

const createPrefetchEntry = function createPrefetchEntry(
	config: PrefetchConfig,
	journey: KernelJourney | undefined,
	experiment: InitContext['experiment']
): PrefetchEntry {
	const promise = (async () => {
		try {
			// The cache key stays the bare URL; only the request carries the
			// experiment arm and journey, as the inline script does.
			const withArm = experiment
				? appendInitParams(config.url, { experiment })
				: config.url;
			const url = journey ? appendJourneyParams(withArm, journey) : withArm;
			const response = await fetch(url, {
				credentials: config.credentials,
				headers: config.headers,
				method: 'GET',
			});
			const init = response.ok
				? ((await response.json()) as InitOutput)
				: undefined;
			return toInitialData(
				config,
				init,
				response.headers.get('x-c15t-policy-contract'),
				journey,
				experiment
			);
		} catch {
			return undefined;
		}
	})();

	return {
		promise,
		requestContext: config.requestContext,
	};
};

const getMatchingPrefetchEntry = function getMatchingPrefetchEntry(options: {
	backendURL: string;
	overrides?: PrefetchOptions['overrides'];
	credentials?: RequestCredentials;
}): PrefetchEntry | undefined {
	const browserWindow = getBrowserWindow();
	if (!browserWindow) {
		return undefined;
	}

	const matcher = createRuntimeRequestContextMatcher({
		backendURL: options.backendURL,
		credentials: options.credentials,
		overrides: options.overrides,
	});
	if (!matcher) {
		return undefined;
	}

	const entries = Object.values(browserWindow[WINDOW_PROMISES_KEY] ?? {});
	const matches = entries.filter((entry) => {
		const { requestContext } = entry;
		// An omitted browser override is a request input, not a wildcard for
		// a prefetched response resolved with an explicit override.
		return (
			!!requestContext &&
			matchesStoredRequestContext(requestContext, matcher) &&
			requestContext.country === (matcher.country ?? null) &&
			requestContext.region === (matcher.region ?? null) &&
			requestContext.language === (matcher.language ?? null)
		);
	});

	return matches.length === 1 ? matches[0] : undefined;
};

export const getMatchingPrefetchedInitialData =
	function getMatchingPrefetchedInitialData(options: {
		backendURL: string;
		overrides?: PrefetchOptions['overrides'];
		credentials?: RequestCredentials;
	}): PrefetchPromise | undefined {
		return getMatchingPrefetchEntry(options)?.promise;
	};

/**
 * Take one matching browser prefetch during initialization, never rendering.
 * @param options - Request identity that must match the early fetch.
 * @returns Its pending response, or undefined when no unambiguous match exists.
 */
export const consumePrefetchedInitialData = (
	options: Parameters<typeof getMatchingPrefetchedInitialData>[0]
): PrefetchPromise | undefined => {
	const entry = getMatchingPrefetchEntry(options);
	const browser = getBrowserWindow();
	if (!entry || !browser) {
		return undefined;
	}
	const entries = browser[WINDOW_PROMISES_KEY];
	for (const [key, candidate] of Object.entries(entries ?? {})) {
		if (candidate === entry && entries) {
			Reflect.deleteProperty(entries, key);
		}
	}
	return entry.promise;
};

/**
 * What the inline script needs to pick an arm as {@link pickExperimentArm}
 * does: the arm names and their weights. A host `arm` is the only arm.
 * An invalid definition gives `null`, and the runtime reports it.
 */
const scriptExperiment = function scriptExperiment(
	experiment: ConsentExperiment
): { id: string; arms: string[]; weights: number[] } | null {
	if (experimentConfigError(experiment)) {
		return null;
	}
	if (experiment.arm !== undefined) {
		return { arms: [experiment.arm], id: experiment.id, weights: [1] };
	}
	const arms = experimentArmNames(experiment);
	return {
		arms,
		id: experiment.id,
		weights: experimentArmWeights(experiment, arms),
	};
};

/**
 * Generates a self-contained inline script that starts the `/init`
 * prefetch before framework hydration.
 *
 * @remarks
 * The returned string is safe for inline `<script>` injection — all
 * `<` characters are escaped to `\u003c` to prevent XSS via
 * `</script>` breakout.
 *
 * Framework adapters should inject this script as early as possible
 * (e.g. `beforeInteractive` in Next.js, `<script>` in `<head>` for
 * vanilla HTML).
 */
export const buildPrefetchScript = function buildPrefetchScript(
	options: PrefetchOptions
): string {
	const payload = {
		backendURL: options.backendURL,
		credentials: options.credentials ?? DEFAULT_INIT_CREDENTIALS,
		experiment: options.experiment
			? scriptExperiment(options.experiment)
			: null,
		// An explicit override wins over the browser signal, and travels as
		// `gpc` inside `query`; `null` means detect at runtime.
		gpc: options.overrides?.gpc ?? null,
		headers: buildRequestContextSentHeaders(options.overrides),
		// `'auto'`: continue a `'tab'` journey this tab holds, else `'page'`.
		journey: options.journey === false ? null : (options.journey ?? 'auto'),
		query: buildInitQuery(options.overrides),
		requestContext: {
			country: options.overrides?.country ?? null,
			language: options.overrides?.language ?? null,
			region: options.overrides?.region ?? null,
		},
		stored: storedAnswerKeys(options.storageKey || STORAGE_KEY_V2),
	};

	const json = JSON.stringify(payload).replace(/</gu, '\\u003c');

	// Hand-minified: this text ships in the HTML of every page that starts
	// `/init` early. It builds the same cache key and request context as
	// `primePrefetchedInitialData`; the prefetch tests run it.
	//
	// Server bundlers rewrite `typeof window` as text, inside strings too
	// (Nitro's replace plugin turns it into `"undefined"`), which would make
	// this script return at once. It reads `globalThis.window` instead.
	//
	// The journey part mirrors `claimEarlyJourney`; it goes on the request
	// only, never in the cache key. Everything but `Accept-Language` is in
	// the query string, so a cross-origin `/init` needs no preflight.
	return `(()=>{var w=globalThis.window;if(w===void 0)return;var p=${json},t=v=>v!=="/"&&v.endsWith("/")?v.slice(0,-1):v,b;try{b=t(p.backendURL);b=/^https?:\\/\\//.test(b)?t(new URL(b)+""):b.startsWith("/")?t(new URL(b,w.location.origin)+""):void 0}catch{}if(!b)return;var g=p.gpc;if(g===null)try{g=w.navigator.globalPrivacyControl===true}catch{g=false}var h=p.headers,c=p.credentials,r=p.requestContext,x={backendURL:b,country:r.country,region:r.region,language:r.language,gpc:g,credentials:c},u=b+"/init"+p.query,k=u+"|"+c+"|gpc:"+g+"|"+Object.entries(h).sort(([l],[n])=>l<n?-1:l>n?1:0).map(([l,v])=>l+":"+v).join("|"),m=w["${WINDOW_PROMISES_KEY}"]=w["${WINDOW_PROMISES_KEY}"]||{};if(m[k])return;var q="",Q=(n,v)=>{q+=(p.query||q?"&":"?")+n+"="+v},d=z=>{var f=false,C=p.stored.cookies,L=p.stored.local;if(z)C=C.concat(p.stored.notice),L=L.concat(p.stored.notice);try{f=w.document.cookie.split("; ").some(e=>C.some(n=>e.startsWith(n+"=")&&e.length>n.length+1))}catch{}if(!f)try{f=L.some(e=>w.localStorage.getItem(e)!==null)}catch{}return f},R=/^[\\da-f]{8}-[\\da-f]{4}-[\\da-f]{4}-[\\da-f]{4}-[\\da-f]{12}$/i,J=w["${JOURNEY_WINDOW_KEY}"],y=p.journey,E=p.experiment,X;if(y&&!(J&&R.test(J.id)&&(J.scope==="page"||J.scope==="tab")&&typeof J.storedChoice==="boolean")){var S=y,o;if(S!=="page")try{o=w.sessionStorage.getItem("${JOURNEY_STORAGE_KEY}");if(!R.test(o))o=void 0}catch{S="page"}if(S==="auto")S=o?"tab":"page";if(!o)try{o=w.crypto.randomUUID()}catch{try{var a=w.crypto.getRandomValues(new Uint8Array(16));a[6]=a[6]%16+64;a[8]=a[8]%64+128;o=Array.from(a,e=>e.toString(16).padStart(2,"0")).join("").replace(/^(.{8})(.{4})(.{4})(.{4})/,"$1-$2-$3-$4-")}catch{}}J=o?w["${JOURNEY_WINDOW_KEY}"]={id:o,scope:S,storedChoice:d(1)}:void 0}if(E){var A=w["${EXPERIMENT_WINDOW_KEY}"];if(!(A&&A.id===E.id&&E.arms.includes(A.arm))){var s,K="${EXPERIMENT_STORAGE_KEY}",P=Math.random()*E.weights.reduce((l,n)=>l+n,0);try{s=JSON.parse(w.localStorage.getItem(K))}catch{}if(!(s&&typeof s.id=="string"&&typeof s.arm=="string"))try{s=w.document.cookie.split(";").map(e=>e.trim()).find(e=>e.startsWith(K+"="));s=s&&JSON.parse(decodeURIComponent(s.slice(K.length+1)))}catch{s=void 0}A=w["${EXPERIMENT_WINDOW_KEY}"]={id:E.id,arm:s&&s.id===E.id&&E.arms.includes(s.arm)?s.arm:E.arms.find((n,i)=>(P-=E.weights[i])<0)||E.arms[E.arms.length-1]}}if(!d())X=A}if(X)Q("${INIT_EXPERIMENT_PARAM}",encodeURIComponent(encodeURIComponent(X.id)+"="+encodeURIComponent(X.arm)));if(y&&J)Q("${CONSENT_JOURNEY_PARAM}",J.id),Q("${CONSENT_JOURNEY_SCOPE_PARAM}",J.scope),Q("${CONSENT_JOURNEY_STORED_PARAM}",J.storedChoice?1:0);m[k]={promise:fetch(u+q,{method:"GET",credentials:c,headers:h}).then(async s=>{if(!s.ok)return;var i=await s.json();return i?{init:i,gvl:i.gvl,producerPolicyContract:s.headers.get("x-c15t-policy-contract"),metadata:{requestContext:x,journey:y&&J||null,experiment:X||null}}:void 0}).catch(()=>{}),requestContext:x}})();`;
};

export const primePrefetchedInitialData = function primePrefetchedInitialData(
	options: PrefetchOptions
): PrefetchPromise | undefined {
	const browserWindow = getBrowserWindow();
	if (!browserWindow) {
		return undefined;
	}

	const config = buildPrefetchConfig(options);
	const promises = getPromiseMap(browserWindow);

	if (!promises[config.cacheKey]) {
		const storageKey = options.storageKey || STORAGE_KEY_V2;
		const arm = options.experiment
			? claimEarlyExperimentArm(options.experiment)
			: undefined;
		promises[config.cacheKey] = createPrefetchEntry(
			config,
			claimEarlyJourney({
				option: options.journey ?? detectJourneyOption(),
				storedChoice: hasStoredConsentRecord(storageKey),
			}),
			// Until the visitor makes a choice, as the runtime does: a notice
			// dismissal alone still counts toward the arm.
			hasStoredConsentRecord(storageKey, false) ? undefined : arm
		);
	}

	return promises[config.cacheKey]?.promise;
};
