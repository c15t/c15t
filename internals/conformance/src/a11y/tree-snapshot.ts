/**
 * Accessibility-tree snapshot utilities.
 *
 * Playwright's `page.accessibility.snapshot()` returns a tree of
 * role/name/state. This module defines the shape we normalize to so that
 * React and Svelte snapshots can be compared.
 *
 * Expected usage: `apps/parity-runner` captures the raw Playwright snapshot
 * per framework, passes it through `normalizeA11ySnapshot`, then diffs.
 */

export type RawA11yNode = {
	role?: string;
	name?: string;
	value?: string | number;
	checked?: boolean | 'mixed';
	pressed?: boolean | 'mixed';
	selected?: boolean;
	expanded?: boolean;
	disabled?: boolean;
	focused?: boolean;
	level?: number;
	children?: RawA11yNode[];
};

export type NormalizedA11yNode = {
	role: string;
	name: string;
	state: Record<string, boolean | 'mixed' | string | number>;
	children: NormalizedA11yNode[];
};

/**
 * Strip framework-specific noise (leading/trailing whitespace in names,
 * undefined states, role aliases) so snapshots can be compared by equality.
 */
export function normalizeA11ySnapshot(raw: RawA11yNode): NormalizedA11yNode {
	const state: NormalizedA11yNode['state'] = {};
	if (raw.checked !== undefined) state.checked = raw.checked;
	if (raw.pressed !== undefined) state.pressed = raw.pressed;
	if (raw.selected !== undefined) state.selected = raw.selected;
	if (raw.expanded !== undefined) state.expanded = raw.expanded;
	if (raw.disabled !== undefined) state.disabled = raw.disabled;
	if (raw.level !== undefined) state.level = raw.level;
	if (raw.value !== undefined) state.value = raw.value;

	return {
		role: raw.role ?? 'unknown',
		name: (raw.name ?? '').trim().replace(/\s+/g, ' '),
		state,
		children: (raw.children ?? []).map(normalizeA11ySnapshot),
	};
}

/**
 * Deep-equality structural diff. Returns a human-readable path of the first
 * divergence or `null` if trees match.
 */
export function diffA11yTrees(
	a: NormalizedA11yNode,
	b: NormalizedA11yNode,
	path = '$'
): string | null {
	if (a.role !== b.role) {
		return `${path}.role: '${a.role}' vs '${b.role}'`;
	}
	if (a.name !== b.name) {
		return `${path}.name: '${a.name}' vs '${b.name}'`;
	}
	const keys = new Set([...Object.keys(a.state), ...Object.keys(b.state)]);
	for (const k of keys) {
		if (a.state[k] !== b.state[k]) {
			return `${path}.state.${k}: '${String(a.state[k])}' vs '${String(b.state[k])}'`;
		}
	}
	if (a.children.length !== b.children.length) {
		return `${path}.children.length: ${a.children.length} vs ${b.children.length}`;
	}
	for (let i = 0; i < a.children.length; i++) {
		const childA = a.children[i];
		const childB = b.children[i];
		if (!childA || !childB) continue;
		const diff = diffA11yTrees(childA, childB, `${path}.children[${i}]`);
		if (diff) return diff;
	}
	return null;
}
