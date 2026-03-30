import type { PhrasingContent } from 'mdast';
import { createLink, normalizeWhitespace } from '../../remark-libs';
import type { ObjectType } from './types';

const OPTION_LEAD_IN_PATTERNS = [
	/^example use cases:?$/i,
	/^this is useful for:?$/i,
	/^use ['"`]/i,
] as const;

export type DetailParts = {
	inline: string;
	bullets: string[];
};

export function getNodeText(
	value: ObjectType['description'] | ObjectType['typeDescription']
) {
	if (!value) {
		return '';
	}
	return typeof value === 'string' ? value : String(value);
}

export function splitDetailParts(
	value: string | null | undefined
): DetailParts {
	if (!value) {
		return { inline: '-', bullets: [] };
	}

	const normalized = value
		.replace(/&#xA;/g, '\n')
		.replace(/\r\n/g, '\n')
		.trim();
	const lines = normalized
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean);
	if (lines.length === 0) {
		return { inline: '-', bullets: [] };
	}

	const bulletLines = lines.filter((line) => /^[-*]\s+/.test(line));
	const nonBulletLines = lines.filter((line) => !/^[-*]\s+/.test(line));
	const summaryLines = nonBulletLines.filter(
		(line) =>
			!/:\s*$/.test(line) &&
			!OPTION_LEAD_IN_PATTERNS.some((pattern) => pattern.test(line))
	);
	const summary = normalizeWhitespace(summaryLines.join(' '));

	if (bulletLines.length === 0) {
		return { inline: normalizeWhitespace(normalized), bullets: [] };
	}

	const bulletItems = bulletLines.map((line) =>
		normalizeWhitespace(line.replace(/^[-*]\s+/, ''))
	);
	const shortBullets =
		bulletItems.length <= 4 && bulletItems.every((item) => item.length <= 60);

	if (shortBullets) {
		const prefix = summary.length > 0 ? `${summary} Options:` : 'Options:';
		return {
			inline: normalizeWhitespace(`${prefix} ${bulletItems.join('; ')}`),
			bullets: [],
		};
	}

	const optionBullets = bulletItems.filter((item) =>
		/^(['"`].+['"`]|\d+):/.test(item)
	);

	if (
		optionBullets.length > 0 &&
		optionBullets.length <= 3 &&
		optionBullets.every((item) => item.length <= 80)
	) {
		const prefix = summary.length > 0 ? `${summary} Options:` : 'Options:';
		return {
			inline: normalizeWhitespace(`${prefix} ${optionBullets.join('; ')}`),
			bullets: bulletItems.filter((item) => !optionBullets.includes(item)),
		};
	}

	return {
		inline: summary.length > 0 ? summary : (bulletItems[0] ?? '-'),
		bullets: summary.length > 0 ? bulletItems : bulletItems.slice(1),
	};
}

export function normalizeLinkTarget(url: string): string {
	if (url.startsWith('http://') || url.startsWith('https://')) {
		return url;
	}
	if (url.startsWith('//')) {
		return `https:${url}`;
	}
	if (url.startsWith('://')) {
		return `https${url}`;
	}
	if (url.startsWith('/')) {
		return `https://v2.c15t.com${url}`;
	}
	return url;
}

export function compactTableText(value: string | null | undefined) {
	return splitDetailParts(value).inline;
}

export function normalizeTypeName(type: string): string | null {
	const normalized = normalizeWhitespace(type)
		.replace(/\s*\|\s*undefined/g, '')
		.replace(/\s*\|\s*null/g, '')
		.replace(/\[\]$/, '')
		.trim();

	const wrappedMatch = normalized.match(
		/^(?:Partial|Readonly|Required|Pick|Omit)<(.+)>$/
	);
	if (wrappedMatch?.[1]) {
		return normalizeTypeName(wrappedMatch[1]);
	}

	const typeNameMatch = normalized.match(/[A-Z][A-Za-z0-9_]+$/);
	return typeNameMatch?.[0] ?? null;
}

export function summarizeTypeLabel(
	type: string,
	property?: ObjectType
): string {
	const normalized = normalizeWhitespace(type);
	const compact = compactTableText(type);
	const namedType = normalizeTypeName(normalized);

	if (namedType) {
		const suffixes: string[] = [];
		if (/\|\s*undefined/.test(normalized)) {
			suffixes.push('undefined');
		}
		if (/\|\s*null/.test(normalized)) {
			suffixes.push('null');
		}
		const suffixText = suffixes.length > 0 ? ` | ${suffixes.join(' | ')}` : '';
		return `${namedType}${suffixText}`;
	}

	const isLargeAnonymousType =
		normalized.length > 80 ||
		(normalized.includes('{') && (normalized.match(/;/g) ?? []).length >= 2);

	if (property?.nestedProperties || isLargeAnonymousType) {
		const arrayPrefix =
			/^(?:ReadonlyArray|Array)</.test(normalized) ||
			/\[\](?:\s*\|\s*(?:undefined|null))*$/.test(normalized)
				? 'Array<Object>'
				: 'Object';
		const suffixes: string[] = [];
		if (/\|\s*undefined/.test(normalized)) {
			suffixes.push('undefined');
		}
		if (/\|\s*null/.test(normalized)) {
			suffixes.push('null');
		}
		const suffixText = suffixes.length > 0 ? ` | ${suffixes.join(' | ')}` : '';
		return `${arrayPrefix}${suffixText}`;
	}

	return compact;
}

export function formatPropertyDescription(property: ObjectType): string {
	const parts: string[] = [];

	if (property.description) {
		parts.push(getNodeText(property.description));
	}

	if (property.typeDescription) {
		parts.push(getNodeText(property.typeDescription));
	}

	return splitDetailParts(parts.join('\n').trim()).inline || '-';
}

export function formatPropertyType(
	property: ObjectType
): string | PhrasingContent[] {
	let type = property.type;

	if (property.deprecated) {
		type = `~~${type}~~ (deprecated)`;
	}

	const compactType = summarizeTypeLabel(type, property) || '-';
	if (property.typeDescriptionLink) {
		return [
			createLink(
				normalizeLinkTarget(property.typeDescriptionLink),
				compactType
			),
		];
	}

	return compactType;
}

export function formatPropertyDefault(property: ObjectType): string {
	return splitDetailParts(
		property.default === '' ? '-' : (property.default ?? '-')
	).inline;
}

export function formatPropertyRequired(property: ObjectType): string {
	return property.required ? '✅ Required' : 'Optional';
}
