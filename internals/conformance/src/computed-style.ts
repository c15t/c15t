/**
 * Computed-style snapshot utilities.
 *
 * Pixel equality can pass while the underlying class contract drifts; this
 * module captures the *computed* style and CSS custom properties for each
 * element so we can assert visual-parity at the property level and diff
 * across frameworks.
 */

/**
 * Properties we care about for parity. Kept intentionally small: layout,
 * box, typography, visual. Adding more properties increases noise without
 * catching more real drift.
 */
const DEFAULT_PROPS = [
	// layout
	'display',
	'position',
	'flex-direction',
	'justify-content',
	'align-items',
	'gap',
	'grid-template-columns',
	'grid-template-rows',
	// box
	'width',
	'height',
	'padding-top',
	'padding-right',
	'padding-bottom',
	'padding-left',
	'margin-top',
	'margin-right',
	'margin-bottom',
	'margin-left',
	'border-top-width',
	'border-right-width',
	'border-bottom-width',
	'border-left-width',
	'border-radius',
	// typography
	'font-family',
	'font-size',
	'font-weight',
	'line-height',
	'letter-spacing',
	'text-align',
	'color',
	// visual
	'background-color',
	'opacity',
	'visibility',
	'z-index',
	'box-shadow',
	// accessibility-visible direction
	'direction',
] as const;

export type ComputedStyleSnapshot = {
	readonly properties: Readonly<Record<string, string>>;
	readonly customProperties: Readonly<Record<string, string>>;
};

export type ComputedStyleDiff = {
	path: string;
	kind: 'property' | 'custom-property';
	name: string;
	a: string | undefined;
	b: string | undefined;
};

export type CaptureOptions = {
	/** CSS property names to capture. Defaults to DEFAULT_PROPS. */
	properties?: readonly string[];
	/** Whether to capture CSS custom properties (`--*`). Default: true. */
	captureCustomProperties?: boolean;
};

// ---------------------------------------------------------------------------
// Value canonicalizers
//
// Two cosmetic differences show up across frameworks for identical visual
// output: color notation (React ships CSS modules that keep hex literals;
// Svelte's build emits `hsl(...)`) and animation-name hashes (bundler-scoped
// keyframe names). Both round-trip through `getComputedStyle` verbatim for
// CSS custom properties, so we normalize here before comparing. Raw values
// are preserved in the snapshot for debuggability — only the diff engine
// consults canonical form.
// ---------------------------------------------------------------------------

function parseColorComponent(s: string, max: number): number | null {
	if (s.endsWith('%')) {
		const n = Number.parseFloat(s);
		if (Number.isNaN(n)) return null;
		return max === 1 ? n / 100 : (n / 100) * max;
	}
	const n = Number.parseFloat(s);
	if (Number.isNaN(n)) return null;
	return n;
}

function parseHexColor(value: string): [number, number, number, number] | null {
	const m = value.match(/^#([0-9a-f]+)$/i);
	if (!m) return null;
	const h = m[1] as string;
	if (h.length === 3) {
		const [h0, h1, h2] = [h[0] as string, h[1] as string, h[2] as string];
		return [
			Number.parseInt(h0 + h0, 16),
			Number.parseInt(h1 + h1, 16),
			Number.parseInt(h2 + h2, 16),
			1,
		];
	}
	if (h.length === 4) {
		const [h0, h1, h2, h3] = [
			h[0] as string,
			h[1] as string,
			h[2] as string,
			h[3] as string,
		];
		return [
			Number.parseInt(h0 + h0, 16),
			Number.parseInt(h1 + h1, 16),
			Number.parseInt(h2 + h2, 16),
			Number.parseInt(h3 + h3, 16) / 255,
		];
	}
	if (h.length === 6) {
		return [
			Number.parseInt(h.slice(0, 2), 16),
			Number.parseInt(h.slice(2, 4), 16),
			Number.parseInt(h.slice(4, 6), 16),
			1,
		];
	}
	if (h.length === 8) {
		return [
			Number.parseInt(h.slice(0, 2), 16),
			Number.parseInt(h.slice(2, 4), 16),
			Number.parseInt(h.slice(4, 6), 16),
			Number.parseInt(h.slice(6, 8), 16) / 255,
		];
	}
	return null;
}

function parseRgbColor(value: string): [number, number, number, number] | null {
	const m = value.match(/^rgba?\s*\(\s*([^)]+)\s*\)$/i);
	if (!m) return null;
	const parts = (m[1] as string)
		.replace(/\//g, ',')
		.split(/[\s,]+/)
		.filter(Boolean);
	if (parts.length < 3 || parts.length > 4) return null;
	const r = parseColorComponent(parts[0] as string, 255);
	const g = parseColorComponent(parts[1] as string, 255);
	const b = parseColorComponent(parts[2] as string, 255);
	const a = parts[3] ? parseColorComponent(parts[3], 1) : 1;
	if (r === null || g === null || b === null || a === null) return null;
	return [r, g, b, a];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
	const hh = ((h % 360) + 360) % 360;
	const c = (1 - Math.abs(2 * l - 1)) * s;
	const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
	const m = l - c / 2;
	let rp = 0;
	let gp = 0;
	let bp = 0;
	if (hh < 60) {
		rp = c;
		gp = x;
	} else if (hh < 120) {
		rp = x;
		gp = c;
	} else if (hh < 180) {
		gp = c;
		bp = x;
	} else if (hh < 240) {
		gp = x;
		bp = c;
	} else if (hh < 300) {
		rp = x;
		bp = c;
	} else {
		rp = c;
		bp = x;
	}
	return [
		Math.round((rp + m) * 255),
		Math.round((gp + m) * 255),
		Math.round((bp + m) * 255),
	];
}

function parseHslColor(value: string): [number, number, number, number] | null {
	const m = value.match(/^hsla?\s*\(\s*([^)]+)\s*\)$/i);
	if (!m) return null;
	const parts = (m[1] as string)
		.replace(/\//g, ',')
		.split(/[\s,]+/)
		.filter(Boolean);
	if (parts.length < 3 || parts.length > 4) return null;
	const hueRaw = parts[0] as string;
	let h = Number.parseFloat(hueRaw);
	if (/rad$/i.test(hueRaw)) h = (h * 180) / Math.PI;
	else if (/grad$/i.test(hueRaw)) h = h * 0.9;
	else if (/turn$/i.test(hueRaw)) h = h * 360;
	if (Number.isNaN(h)) return null;
	const s = parseColorComponent(parts[1] as string, 1);
	const l = parseColorComponent(parts[2] as string, 1);
	const a = parts[3] ? parseColorComponent(parts[3], 1) : 1;
	if (s === null || l === null || a === null) return null;
	const [r, g, b] = hslToRgb(h, s, l);
	return [r, g, b, a];
}

/**
 * Canonicalize any CSS color value to `rgb(r, g, b)` / `rgba(r, g, b, a)`.
 * Returns the input untouched if it doesn't parse as a color (transparent,
 * currentColor, named colors, calc(), etc. — we'd have to carry a named-color
 * table to handle those, and they rarely differ across frameworks).
 */
function canonicalizeColor(value: string): string {
	const trimmed = value.trim();
	let parsed: [number, number, number, number] | null = null;
	if (trimmed.startsWith('#')) parsed = parseHexColor(trimmed);
	else if (/^rgba?\s*\(/i.test(trimmed)) parsed = parseRgbColor(trimmed);
	else if (/^hsla?\s*\(/i.test(trimmed)) parsed = parseHslColor(trimmed);
	if (!parsed) return value;
	const [r, g, b, a] = parsed;
	const ri = Math.round(r);
	const gi = Math.round(g);
	const bi = Math.round(b);
	if (a === 1) return `rgb(${ri}, ${gi}, ${bi})`;
	return `rgba(${ri}, ${gi}, ${bi}, ${a})`;
}

/**
 * Replace the first identifier token of an animation value with `<anim>`.
 * Used for `animation`, `animation-name`, and any custom property whose name
 * ends in `-animation`. Keyword values (`none`, `initial`, `inherit`) pass
 * through.
 */
function canonicalizeAnimation(value: string): string {
	const trimmed = value.trim();
	if (!trimmed) return trimmed;
	if (/^(none|initial|inherit|unset|normal|revert|revert-layer)$/.test(trimmed))
		return trimmed;
	return trimmed.replace(/^[A-Za-z_][\w-]*/, '<anim>');
}

function isColorPropertyName(name: string): boolean {
	const n = name.toLowerCase();
	return (
		n === 'color' ||
		n.endsWith('-color') ||
		n.includes('color') ||
		n === 'background' ||
		n === 'border' ||
		n === 'outline' ||
		n === 'fill' ||
		n === 'stroke' ||
		// CSS custom properties don't follow naming conventions universally,
		// but we can detect color-like values by prefix.
		n.startsWith('--')
	);
}

function looksLikeColor(value: string): boolean {
	return /^(#[0-9a-f]+|rgba?\s*\(|hsla?\s*\()/i.test(value.trim());
}

function isAnimationPropertyName(name: string): boolean {
	const n = name.toLowerCase();
	return (
		n === 'animation' || n === 'animation-name' || n.endsWith('-animation')
	);
}

/**
 * Canonicalize a single property value for diff comparison. Applied
 * symmetrically to both sides of every diff.
 */
export function canonicalizeStyleValue(name: string, value: string): string {
	if (isAnimationPropertyName(name)) return canonicalizeAnimation(value);
	if (isColorPropertyName(name) && looksLikeColor(value))
		return canonicalizeColor(value);
	return value;
}

function getCustomProperties(
	style: CSSStyleDeclaration
): Record<string, string> {
	const out: Record<string, string> = {};
	for (let i = 0; i < style.length; i++) {
		const name = style.item(i);
		if (name.startsWith('--')) {
			out[name] = style.getPropertyValue(name).trim();
		}
	}
	return out;
}

/**
 * Capture the computed style + CSS custom properties for a single element.
 */
export function captureComputedStyle(
	el: Element,
	options: CaptureOptions = {}
): ComputedStyleSnapshot {
	const props = options.properties ?? DEFAULT_PROPS;
	const captureCustom = options.captureCustomProperties ?? true;
	const style = getComputedStyle(el);

	const properties: Record<string, string> = {};
	for (const name of props) {
		properties[name] = style.getPropertyValue(name).trim();
	}

	return {
		properties,
		customProperties: captureCustom ? getCustomProperties(style) : {},
	};
}

/**
 * Capture computed styles for a map of elements keyed by `data-testid`.
 * Missing test-ids are silently skipped — consumers can assert presence
 * separately via the DOM contract.
 */
export function captureComputedStyleFor(
	root: ParentNode,
	testIds: readonly string[],
	options: CaptureOptions = {}
): Record<string, ComputedStyleSnapshot> {
	const out: Record<string, ComputedStyleSnapshot> = {};
	for (const id of testIds) {
		const el = root.querySelector(`[data-testid="${id}"]`);
		if (el) out[id] = captureComputedStyle(el, options);
	}
	return out;
}

/**
 * Diff two snapshots. Returns an array of divergences (empty if equal).
 */
export function diffComputedStyle(
	a: ComputedStyleSnapshot,
	b: ComputedStyleSnapshot,
	path = '$'
): ComputedStyleDiff[] {
	const diffs: ComputedStyleDiff[] = [];

	const propNames = new Set([
		...Object.keys(a.properties),
		...Object.keys(b.properties),
	]);
	for (const name of propNames) {
		const av = a.properties[name];
		const bv = b.properties[name];
		const canonAv = av === undefined ? av : canonicalizeStyleValue(name, av);
		const canonBv = bv === undefined ? bv : canonicalizeStyleValue(name, bv);
		if (canonAv !== canonBv) {
			diffs.push({ path, kind: 'property', name, a: av, b: bv });
		}
	}

	const customNames = new Set([
		...Object.keys(a.customProperties),
		...Object.keys(b.customProperties),
	]);
	for (const name of customNames) {
		const av = a.customProperties[name];
		const bv = b.customProperties[name];
		const canonAv = av === undefined ? av : canonicalizeStyleValue(name, av);
		const canonBv = bv === undefined ? bv : canonicalizeStyleValue(name, bv);
		if (canonAv !== canonBv) {
			diffs.push({ path, kind: 'custom-property', name, a: av, b: bv });
		}
	}

	return diffs;
}

/**
 * Diff two keyed snapshot maps (as produced by `captureComputedStyleFor`).
 * Each divergence carries the test-id in its `path`. Missing keys on either
 * side are reported as property diffs with `undefined` on the missing side.
 */
export function diffComputedStyleMap(
	a: Record<string, ComputedStyleSnapshot>,
	b: Record<string, ComputedStyleSnapshot>
): ComputedStyleDiff[] {
	const diffs: ComputedStyleDiff[] = [];
	const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
	for (const key of keys) {
		const av = a[key];
		const bv = b[key];
		if (!av || !bv) {
			diffs.push({
				path: key,
				kind: 'property',
				name: '<presence>',
				a: av ? 'present' : undefined,
				b: bv ? 'present' : undefined,
			});
			continue;
		}
		diffs.push(...diffComputedStyle(av, bv, key));
	}
	return diffs;
}
