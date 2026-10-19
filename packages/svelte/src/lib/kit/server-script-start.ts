/**
 * Writes the provider's server start into the page as a `<script>` at the
 * end of `<body>`, where it runs before the app's JavaScript hydrates the
 * page.
 *
 * The provider hands its options to the start registered here (see
 * `../server-script-start.ts`), which keeps the code for the request it
 * renders. The page transform for that request adds it before `</body>`.
 * Nothing in the HTML decides what runs.
 */
import { getRequestEvent } from '$app/server';
import type { RequestEvent } from '@sveltejs/kit';

import { registerServerScriptStart } from '../server-script-start';
import type { ServerStartOptions } from '../server-script-start';

const NONCE = /^[\w+/=-]+$/u;
const SCRIPT_NONCE = /<script\b[^>]*\snonce="(?<nonce>[\w+/=-]+)"/u;
/**
 * A body end tag, the name in any case with space before `>`, or a comment
 * or script whose text can't hold one. A comment or script a chunk ends
 * in runs to the end of the chunk.
 */
const BODY_END =
	/<!--[\s\S]*?(?:-->|$)|<script\b[^>]*>[\s\S]*?(?:<\/script\s*>|$)|<\/body\s*>/giu;
/**
 * The most a chunk's end is held for a tag it ends partway through: more
 * than a script tag with its nonce. Text a chunk ends in, such as `a < b`
 * in a long inline script, passes through instead of piling up.
 */
const MAX_HELD = 1024;

/** The start a request's render keeps for its page transform. */
interface PageStart {
	code?: string;
	nonce?: string;
}

type Locals = RequestEvent['locals'];

/** Each request's start, by its `event.locals`. */
const pageStarts = new WeakMap<Locals, PageStart>();

/** The start for the request being rendered, if its handle made one. */
const currentPageStart = (): PageStart | undefined => {
	let locals: Locals | undefined;
	try {
		({ locals } = getRequestEvent());
	} catch {
		// Rendered outside a SvelteKit request.
	}
	return locals && pageStarts.get(locals);
};

/**
 * Registers a start that keeps the code `serverScriptStart` builds for the
 * request being rendered. The first provider on the page starts the
 * scripts.
 *
 * @param serverScriptStart - Builds the start's code from the provider's
 * options.
 * @internal
 */
export const registerPageStart = function registerPageStart(
	serverScriptStart: (options: ServerStartOptions) => string | undefined
): void {
	registerServerScriptStart((options) => {
		const start = currentPageStart();
		if (!start || start.code) {
			return;
		}
		start.code = serverScriptStart(options) || undefined;
		start.nonce = options.nonce;
	});
};

let loading: Promise<void> | undefined;

/**
 * Loads `serverScriptStart` once and registers a start for providers
 * rendering on the server. A failed import skips the start, and the loader
 * starts the scripts after hydration; the next request retries.
 *
 * @internal
 */
export const loadServerScriptStart =
	function loadServerScriptStart(): Promise<void> {
		loading ??= (async () => {
			try {
				const { serverScriptStart } =
					await import('@c15t/core/runtime/script-server-start');
				registerPageStart(serverScriptStart);
			} catch {
				loading = undefined;
			}
		})();
		return loading;
	};

/**
 * Where the last body end tag in `text` starts, else `-1`. One in a
 * comment or a script's text is not the end of the body.
 */
const lastBodyEnd = (text: string): number => {
	let last = -1;
	for (const match of text.matchAll(BODY_END)) {
		if (match[0][1] === '/') {
			last = match.index;
		}
	}
	return last;
};

/**
 * The end of `text` to hold for the next chunk: from the last `</body>`,
 * which may be the end of the body, however much follows it, else a tag
 * `text` ends partway through within its last `MAX_HELD` characters.
 */
const heldEnd = (text: string): string => {
	const body = lastBodyEnd(text);
	if (body !== -1) {
		return text.slice(body);
	}
	const tail = text.slice(-MAX_HELD);
	const start = tail.lastIndexOf('<');
	return start === -1 || tail.includes('>', start) ? '' : tail.slice(start);
};

/**
 * A page transform for one request that adds the start its render kept to
 * the end of `<body>`.
 *
 * It adds the script to the last chunk (`done`), before the last `</body>`:
 * SvelteKit's page template closes the body after everything the app
 * renders, so an earlier `</body>`, in a script's text or a comment, is
 * not the end. Until the last chunk, the transform holds the page from
 * the last `</body>`, else up to 1 KB of a tag a chunk ends partway
 * through, such as a script with its nonce.
 *
 * The script takes the provider's `nonce` option, else the nonce SvelteKit
 * put on its own scripts, so a nonce-based `script-src` admits it. The tags
 * it inserts take the same nonce.
 *
 * @param locals - The request's `event.locals`, which the render reaches
 * through `getRequestEvent()`.
 * @returns The transform, which returns each chunk with the script added
 * to the last.
 * @internal
 */
export const createServerStartInjector = function createServerStartInjector(
	locals: Locals
): (html: string, done: boolean) => string {
	const start: PageStart = {};
	pageStarts.set(locals, start);
	let pageNonce: string | undefined;
	let held = '';
	return (html, done) => {
		const text = held + html;
		pageNonce ??= SCRIPT_NONCE.exec(text)?.groups?.nonce;
		if (!done) {
			held = heldEnd(text);
			return text.slice(0, text.length - held.length);
		}
		held = '';
		const end = lastBodyEnd(text);
		if (!start.code || end === -1) {
			return text;
		}
		const nonce = start.nonce ?? pageNonce;
		const nonceAttribute =
			nonce && NONCE.test(nonce) ? ` nonce="${nonce}"` : '';
		return `${text.slice(0, end)}<script${nonceAttribute}>${start.code}</script>${text.slice(end)}`;
	};
};
