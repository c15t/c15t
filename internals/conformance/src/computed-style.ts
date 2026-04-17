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
		if (av !== bv) {
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
		if (av !== bv) {
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
