// utils.ts

// Top-level regex patterns for performance
const MERGE_DIGITS_PATTERN = /^\d+$/;
const UPPER_RUN_ONLY_PATTERN = /^[A-Z]+$/;
const SPLIT_UPPER_RUN_PATTERN = /^[A-Z]+$/;

/**
 * Generate the lucide-static filename for a given Lucide React component.
 * If `available` is provided, returns the first candidate that exists.
 */
/** Tokenize PascalCase component name into parts */
function tokenizeName(name: string): string[] {
	const re = /(\d+d)|([A-Z]+(?![a-z]))|([A-Z][a-z]+)|(\d+)|([a-z])/g;
	const raw: string[] = [];
	let m: RegExpExecArray | null = re.exec(name);
	while (m !== null) {
		const [, dPlusD, upperRun, capWord, digits, lowerRun] = m;
		if (dPlusD) {
			raw.push(dPlusD.toLowerCase());
		} else if (upperRun) {
			raw.push(upperRun); // keep run for now, lower later
		} else if (capWord) {
			raw.push(capWord);
		} else if (digits) {
			raw.push(digits);
		} else if (lowerRun) {
			raw.push(lowerRun);
		}
		m = re.exec(name);
	}
	return raw;
}

/** Merge DIGITS 'x' DIGITS patterns like "2x2" */
function mergeDigitXDigit(tokens: string[]): string[] {
	const merged: string[] = [];
	for (let i = 0; i < tokens.length; i++) {
		const a = tokens[i];
		const b = tokens[i + 1];
		const c = tokens[i + 2];
		if (
			a &&
			b === 'x' &&
			c &&
			MERGE_DIGITS_PATTERN.test(a) &&
			MERGE_DIGITS_PATTERN.test(c)
		) {
			merged.push(`${a}x${c}`);
			i += 2;
		} else {
			merged.push(a);
		}
	}
	return merged;
}

/** Helper transform functions for tokens */
const lowerTransform = (t: string) => t.toLowerCase();
const splitUpperRun = (t: string) =>
	SPLIT_UPPER_RUN_PATTERN.test(t) ? t.toLowerCase().split('') : [t];
const splitDigits = (t: string) =>
	MERGE_DIGITS_PATTERN.test(t) ? t.split('') : [t];
const keepDigits = (t: string) => [t];
const keepUpperRun = (t: string) =>
	UPPER_RUN_ONLY_PATTERN.test(t) ? [t.toLowerCase()] : [t];

/** Build candidate variants for icon name */
function buildCandidates(merged: string[]): string[] {
	// Primary matches ArrowUp10 (1-0) & AZ (a-z) & 2x2 merged
	const v1 = merged
		.flatMap(splitUpperRun)
		.flatMap(splitDigits)
		.map(lowerTransform)
		.join('-');
	// Keep digit groups (Clock10 -> 10), split caps (AZ -> a-z)
	const v2 = merged
		.flatMap(splitUpperRun)
		.flatMap(keepDigits)
		.map(lowerTransform)
		.join('-');
	// Split digits, keep cap runs (AZ -> az)
	const v3 = merged
		.flatMap(keepUpperRun)
		.flatMap(splitDigits)
		.map(lowerTransform)
		.join('-');
	// Keep both caps & digits
	const v4 = merged
		.flatMap(keepUpperRun)
		.flatMap(keepDigits)
		.map(lowerTransform)
		.join('-');

	return dedupe([v1, v2, v3, v4]);
}

/** Find first available candidate or return the first one */
function selectCandidate(
	candidates: string[],
	available?: Set<string>
): string {
	if (available?.size) {
		for (const id of candidates) {
			if (available.has(id)) {
				return id;
			}
		}
	}
	return candidates[0]; // deterministic fallback
}

export function componentNameToStaticId(
	name: string,
	available?: Set<string>
): string {
	const raw = tokenizeName(name);
	const merged = mergeDigitXDigit(raw);
	const candidates = buildCandidates(merged);
	return selectCandidate(candidates, available);
}

function dedupe<T>(arr: T[]): T[] {
	const s = new Set<T>();
	const out: T[] = [];
	for (const x of arr) {
		if (!s.has(x)) {
			s.add(x);
			out.push(x);
		}
	}
	return out;
}
