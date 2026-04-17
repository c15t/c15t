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
	// Framework-auto-id suffixes appended to stable prefixes. React's useId()
	// (with ':' stripped) emits tokens like "_r_0_" / "r0"; Svelte's $props.id()
	// emits tokens like "c1". The prefix portion ("c15t-preference-item-content-")
	// is identical across frameworks and stable; only the suffix differs. Replace
	// just the suffix with __AUTO__ so id/aria-controls/for attributes compare
	// equal without masking other drift.
	const AUTO_ID_SUFFIX = /-(?:_r_[0-9a-z]+_|r[0-9a-z]+|c[0-9]+)$/;
	const STRIP = new Set(['data-reactroot','data-reactid','data-svelte-h']);
	function isProviderArtifact(el){
		// <style id="c15t-theme"> is emitted by the theme provider. React renders
		// it inline inside the component tree; Svelte injects it into <head> via
		// an effect. Both are legitimate; neither contributes to component
		// structure, a11y, or user-visible behavior — it's a provider injection
		// strategy detail. Excluded from the snapshot so component-level drift
		// isn't masked by this cross-framework implementation choice.
		return el.tagName === 'STYLE' && el.id === 'c15t-theme';
	}
	function stripClasses(v){
		// Dedupe: React's theme-styling helpers occasionally concatenate the
		// same class name through multiple paths (baseClassName + themeKey
		// resolved class), producing "foo foo" in the rendered DOM. CSS
		// itself is idempotent under repeated classes, so the duplicates are
		// cosmetic — normalize them away for parity.
		const seen = new Set();
		const out = [];
		for (const tok of v.replace(SVELTE,'').replace(S_SCOPED,'').split(/\\s+/)) {
			if (!tok || seen.has(tok)) continue;
			seen.add(tok);
			out.push(tok);
		}
		out.sort();
		return out.join(' ');
	}
	function normAttr(name, value){
		if (name==='id'||name==='aria-labelledby'||name==='aria-describedby'||name==='aria-controls'||name==='for') {
			if (AUTO_ID.test(value)) return '__AUTO__';
			return value.replace(AUTO_ID_SUFFIX, '-__AUTO__');
		}
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
			if (node.nodeType===1) {
				if (isProviderArtifact(node)) continue;
				children.push(canonicalize(node));
				continue;
			}
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
