/**
 * Playwright-side DOM snapshot.
 *
 * We run the normalizer inside the page so we don't need a Node-side DOM
 * (jsdom/happy-dom) just to parse captured HTML. The normalizer source
 * is inlined via a string so Playwright's `evaluate` can ship it with a
 * single RPC call; this matches what `domSnapshot` does in
 * `@c15t/conformance/dom-snapshot`.
 */

import type { Page } from '@playwright/test';

const INLINE_NORMALIZER = /* js */ `
	const SVELTE = /\\bsvelte-[a-z0-9]+\\b/g;
	const S_SCOPED = /\\bs-[a-z0-9]{6,}\\b/g;
	const AUTO_ID = /^(?::r[0-9a-z]+:|radix-[a-z0-9-]+|ark-[a-z0-9-]+)$/;
	const STRIP = new Set(['data-reactroot','data-reactid','data-svelte-h']);
	function stripClasses(v){
		return v.replace(SVELTE,'').replace(S_SCOPED,'').split(/\\s+/).filter(Boolean).sort().join(' ');
	}
	function normAttr(name, value){
		if ((name==='id'||name==='aria-labelledby'||name==='aria-describedby'||name==='aria-controls'||name==='for') && AUTO_ID.test(value)) return '__AUTO__';
		if (name==='class') return stripClasses(value);
		return value;
	}
	function canonicalize(el){
		const tag = el.tagName.toLowerCase();
		const attrs = [];
		for (const a of Array.from(el.attributes)){
			if (STRIP.has(a.name)) continue;
			const v = normAttr(a.name, a.value);
			if (a.name==='class' && v==='') continue;
			attrs.push(a.name+'="'+v+'"');
		}
		attrs.sort();
		const open = '<'+tag+(attrs.length?' '+attrs.join(' '):'')+'>';
		const children = [];
		for (const node of Array.from(el.childNodes)){
			if (node.nodeType===1) { children.push(canonicalize(node)); continue; }
			if (node.nodeType===3) {
				const t = (node.textContent||'').replace(/\\s+/g,' ').trim();
				if (t) children.push(t);
			}
		}
		return open + children.join('') + '</'+tag+'>';
	}
	return canonicalize(target);
`;

export async function captureDomSnapshot(
	page: Page,
	selector: string
): Promise<string> {
	return page.evaluate(
		(args: { sel: string; src: string }) => {
			const target = document.querySelector(args.sel);
			if (!target) throw new Error(`no element: ${args.sel}`);
			// biome-ignore lint/security/noGlobalEval: trusted inline script
			const fn = new Function('target', args.src);
			return fn(target) as string;
		},
		{ sel: selector, src: INLINE_NORMALIZER }
	);
}
