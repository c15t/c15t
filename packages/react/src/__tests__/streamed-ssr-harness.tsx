/**
 * Streams a server render into an iframe the way a browser receives it:
 * each chunk goes through `document.write`, so React's inline scripts run
 * and reveal streamed boundaries before any JavaScript of the app does.
 * `hydrateRoot` then hydrates that document, as Next.js does.
 *
 * A timeline records the banner after every task that changed the page,
 * which is what a visitor could see painted: `none`, or `banner:<n>` where
 * `n` numbers each distinct markup the banner had.
 */
import type { ReactElement } from 'react';
import { act } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToReadableStream } from 'react-dom/server';

export const BANNER = '[data-testid="consent-banner-root"]';

export interface HydratedPage {
	recoverableErrors: unknown[];
	unmount: () => Promise<void>;
}

export interface StreamedPage {
	doc: Document;
	/** Banner states after each DOM-changing task, repeats dropped. */
	timeline: string[];
	/** Marks a point in the timeline as `@label`. */
	mark: (label: string) => void;
	/** Waits for the server to finish, writes the rest, waits for reveals. */
	finish: () => Promise<void>;
	hasBanner: () => boolean;
	/** Hydrates inside `act`, effects flushed. */
	hydrate: (element: ReactElement) => Promise<HydratedPage>;
	/** Starts hydration and returns in the same task, effects not flushed. */
	hydrateNow: (element: ReactElement) => HydratedPage;
	serverErrors: unknown[];
	dispose: () => void;
}

const wait = (ms: number) =>
	new Promise<void>((resolve) => {
		setTimeout(resolve, ms);
	});

type Read = ReadableStreamReadResult<string>;

/** The next chunk, or `idle` when the server has none ready. */
const readWithin = async function readWithin(
	reader: ReadableStreamDefaultReader<string>,
	pending: { read?: Promise<Read> },
	ms: number
): Promise<Read | 'idle'> {
	pending.read ??= reader.read();
	const idle = async () => {
		await wait(ms);
		return 'idle' as const;
	};
	const result = await Promise.race([pending.read, idle()]);
	if (result !== 'idle') {
		pending.read = undefined;
	}
	return result;
};

const tracked = function tracked(
	recoverableErrors: unknown[],
	root: () => ReturnType<typeof hydrateRoot> | undefined
): HydratedPage {
	return {
		recoverableErrors,
		unmount: async () => {
			await act(() => {
				root()?.unmount();
			});
		},
	};
};

/**
 * Renders `element` to a stream and writes what the server has ready (the
 * shell) into a fresh iframe.
 */
export const streamPage = async function streamPage(
	element: ReactElement
): Promise<StreamedPage> {
	const frame = document.createElement('iframe');
	document.body.append(frame);
	const doc = frame.contentDocument as Document;
	doc.open();
	const serverErrors: unknown[] = [];
	const stream = await renderToReadableStream(element, {
		onError: (error) => {
			serverErrors.push(error);
		},
	});
	const reader = stream.pipeThrough(new TextDecoderStream()).getReader();
	const pending: { read?: Promise<Read> } = {};
	const timeline: string[] = [];
	const markups: string[] = [];
	// React parks a streamed boundary in a hidden element until its inline
	// script reveals it: only a banner outside one is on screen.
	const visibleBanner = () => {
		const banner = doc.querySelector(BANNER);
		return banner && !banner.closest('[hidden]') ? banner : null;
	};
	let last = '';
	const observe = () => {
		// The branding link adds the site as `?ref=` once hydrated; that is
		// not a change anyone sees.
		const html = visibleBanner()?.outerHTML.replace(/\?ref=[^"]*/gu, '');
		let entry = 'none';
		if (html) {
			if (!markups.includes(html)) {
				markups.push(html);
			}
			entry = `banner:${markups.indexOf(html) + 1}`;
		}
		if (entry !== last) {
			timeline.push(entry);
			last = entry;
		}
	};
	const progress = { done: false };
	const write = (result: Read) => {
		if (result.done) {
			progress.done = true;
			doc.close();
			return;
		}
		doc.write(result.value);
		observe();
	};
	// React 19.2 reveals a completed boundary on a later frame, and
	// throttles reveals after the first, so wait until none is parked.
	const revealed = async () => {
		const started = performance.now();
		while (doc.querySelector('[hidden][id^="S:"]')) {
			if (performance.now() - started > 3000) {
				throw new Error('a streamed boundary was never revealed');
			}
			// oxlint-disable-next-line no-await-in-loop -- Polls the page between frames.
			await wait(16);
		}
		observe();
	};
	const Observer = frame.contentWindow?.MutationObserver ?? MutationObserver;
	const observer = new Observer(observe);
	observer.observe(doc, { attributes: true, childList: true, subtree: true });

	// The shell: every chunk the server writes before it waits on data.
	while (!progress.done) {
		// oxlint-disable-next-line no-await-in-loop -- A stream is read in order.
		const result = await readWithin(reader, pending, 30);
		if (result === 'idle') {
			break;
		}
		write(result);
	}

	return {
		dispose: () => {
			observer.disconnect();
			frame.remove();
		},
		doc,
		async finish() {
			while (!progress.done) {
				// oxlint-disable-next-line no-await-in-loop -- A stream is read in order.
				const result = await (pending.read ?? reader.read());
				pending.read = undefined;
				write(result);
			}
			await revealed();
		},
		hasBanner: () => visibleBanner() !== null,
		async hydrate(app) {
			const recoverableErrors: unknown[] = [];
			let root: ReturnType<typeof hydrateRoot> | undefined;
			await act(() => {
				root = hydrateRoot(doc, app, {
					onRecoverableError: (error) => recoverableErrors.push(error),
				});
			});
			return tracked(recoverableErrors, () => root);
		},
		hydrateNow(app) {
			const recoverableErrors: unknown[] = [];
			const root = hydrateRoot(doc, app, {
				onRecoverableError: (error) => recoverableErrors.push(error),
			});
			return tracked(recoverableErrors, () => root);
		},
		mark: (label) => {
			timeline.push(`@${label}`);
			last = '';
			observe();
		},
		serverErrors,
		timeline,
	};
};

/** A promise whose settlement the test controls. */
export interface Deferred<Value> {
	promise: Promise<Value>;
	resolve: (value: Value) => void;
	reject: (reason?: unknown) => void;
}

export const deferred = function deferred<Value>(): Deferred<Value> {
	const { promise, reject, resolve } = Promise.withResolvers<Value>();
	return { promise, reject, resolve };
};

/**
 * A promise already settled the way React Flight hands one to a client
 * component whose chunk arrived before hydration: it records its value, so
 * `use()` reads it without suspending.
 */
export const fulfilledThenable = function fulfilledThenable<Value>(
	value: Value
): Promise<Value> {
	return Object.assign(Promise.resolve(value), {
		status: 'fulfilled',
		value,
	});
};
