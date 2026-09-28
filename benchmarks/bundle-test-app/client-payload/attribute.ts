/**
 * Maps the bytes of a minified chunk back to the source modules that
 * produced them, using the chunk's source map. Turbopack production builds
 * emit no module stats, so this is how the client-payload bench attributes
 * chunk bytes to packages.
 *
 * Every mapping segment owns the generated text from its column up to the
 * next segment on the same line (or the end of the line). Text before a
 * line's first segment, segments without a source, and newlines count as
 * unmapped. Sizes are UTF-8 bytes of the generated text, so the per-source
 * totals plus `unmapped` add up to the chunk's byte length.
 */

const BASE64 =
	'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const BASE64_VALUES = new Map([...BASE64].map((char, index) => [char, index]));
const VLQ_CONTINUATION = 32;
/** `//# sourceMappingURL=x` (JS) or `/*# sourceMappingURL=x *\/` (CSS). */
const SOURCE_MAPPING_URL =
	/\n*(?:\/\/[#@] sourceMappingURL=[^\s*]+|\/\*[#@] sourceMappingURL=[^\s*]+\s*\*\/)\s*$/u;
const SOURCE_MAPPING_KEY = 'sourceMappingURL=';

/** A regular (non-index) source map, version 3. */
export interface BasicSourceMap {
	mappings: string;
	sources: (string | null)[];
	sourceRoot?: string;
}

/** An index source map made of offset sections. */
export interface IndexSourceMap {
	sections: {
		map: SourceMapInput;
		offset: { column: number; line: number };
	}[];
}

export type SourceMapInput = BasicSourceMap | IndexSourceMap;

/** Bytes per source module, plus bytes no mapping claims. */
export interface ChunkAttribution {
	bySource: Map<string, number>;
	totalBytes: number;
	unmappedBytes: number;
}

/**
 * Read the trailing `sourceMappingURL` of a chunk. Turbopack hashes map files
 * separately, so `a.js` may point at `b.js.map`.
 */
export const sourceMappingURLOf = (code: string): string | null => {
	const comment = code.match(SOURCE_MAPPING_URL)?.[0];
	if (!comment) {
		return null;
	}
	return (
		comment
			.slice(comment.indexOf(SOURCE_MAPPING_KEY) + SOURCE_MAPPING_KEY.length)
			.replace(/\*\/\s*$/u, '')
			.trim() || null
	);
};

/** Remove the trailing `sourceMappingURL` comment that source maps add. */
export const stripSourceMappingComment = (code: string): string =>
	code.replace(SOURCE_MAPPING_URL, '');

/**
 * Decode one line of a `mappings` string into segments of
 * `[generatedColumn, sourceIndex?, ...]`, with running state carried across
 * lines by the caller.
 */
const decodeSegment = function decodeSegment(segment: string): number[] {
	const values: number[] = [];
	let value = 0;
	let shift = 0;
	for (const char of segment) {
		const digit = BASE64_VALUES.get(char);
		if (digit === undefined) {
			throw new Error(`Invalid base64 VLQ character: ${char}`);
		}
		// Base64 VLQ, in arithmetic form: the low five bits carry data, the
		// sixth is the continuation flag, and the first group's lowest data bit
		// is the sign.
		value += (digit % VLQ_CONTINUATION) * VLQ_CONTINUATION ** (shift / 5);
		if (digit >= VLQ_CONTINUATION) {
			shift += 5;
			continue;
		}
		const magnitude = Math.floor(value / 2);
		values.push(value % 2 === 1 ? -magnitude : magnitude);
		value = 0;
		shift = 0;
	}
	return values;
};

interface Segment {
	column: number;
	source: string | null;
}

/**
 * Decode a basic source map into per-line segments. Only the generated column
 * and source index matter for attribution; the other fields are skipped but
 * their running state is still tracked by position.
 */
const decodeMappings = function decodeMappings(
	map: BasicSourceMap
): Segment[][] {
	const lines: Segment[][] = [];
	let sourceIndex = 0;
	for (const line of map.mappings.split(';')) {
		let column = 0;
		const segments: Segment[] = [];
		if (line) {
			for (const raw of line.split(',')) {
				if (!raw) {
					continue;
				}
				const fields = decodeSegment(raw);
				column += fields[0] ?? 0;
				if (fields.length >= 4) {
					sourceIndex += fields[1] ?? 0;
					const source = map.sources[sourceIndex] ?? null;
					segments.push({
						column,
						source: source ? `${map.sourceRoot ?? ''}${source}` : null,
					});
				} else {
					segments.push({ column, source: null });
				}
			}
		}
		segments.sort((left, right) => left.column - right.column);
		lines.push(segments);
	}
	return lines;
};

const isIndexMap = (map: SourceMapInput): map is IndexSourceMap =>
	'sections' in map && Array.isArray(map.sections);

/**
 * Flatten a (possibly index) source map into absolute per-line segments.
 * Section offsets shift the section's first line by `offset.column`.
 */
const flattenSegments = function flattenSegments(
	map: SourceMapInput
): Segment[][] {
	if (!isIndexMap(map)) {
		return decodeMappings(map);
	}
	const lines: Segment[][] = [];
	for (const section of map.sections) {
		const sectionLines = flattenSegments(section.map);
		for (const [index, segments] of sectionLines.entries()) {
			const lineNumber = section.offset.line + index;
			const shift = index === 0 ? section.offset.column : 0;
			const target = lines[lineNumber] ?? [];
			for (const segment of segments) {
				target.push({ column: segment.column + shift, source: segment.source });
			}
			lines[lineNumber] = target;
		}
	}
	for (const segments of lines) {
		segments?.sort((left, right) => left.column - right.column);
	}
	return lines;
};

/**
 * Attribute every byte of `code` to a source module or to `unmapped`.
 *
 * @param code - The chunk text with its `sourceMappingURL` comment removed.
 * @param map - The chunk's parsed source map (basic or index form).
 * @returns Bytes per source, unmapped bytes, and the total.
 */
export const attributeChunk = function attributeChunk(
	code: string,
	map: SourceMapInput
): ChunkAttribution {
	const segmentsByLine = flattenSegments(map);
	const bySource = new Map<string, number>();
	let unmappedBytes = 0;
	const add = (source: string | null, text: string) => {
		const bytes = Buffer.byteLength(text, 'utf8');
		if (!bytes) {
			return;
		}
		if (source === null) {
			unmappedBytes += bytes;
			return;
		}
		bySource.set(source, (bySource.get(source) ?? 0) + bytes);
	};
	const lines = code.split('\n');
	for (const [lineIndex, line] of lines.entries()) {
		const segments = segmentsByLine[lineIndex] ?? [];
		const firstColumn = segments[0]?.column ?? line.length;
		add(null, line.slice(0, firstColumn));
		for (const [index, segment] of segments.entries()) {
			const end = segments[index + 1]?.column ?? line.length;
			add(segment.source, line.slice(segment.column, end));
		}
		if (lineIndex < lines.length - 1) {
			unmappedBytes += 1;
		}
	}
	return {
		bySource,
		totalBytes: Buffer.byteLength(code, 'utf8'),
		unmappedBytes,
	};
};

/**
 * Name the npm package a bundler source path belongs to, or a bucket for
 * first-party and framework-runtime code.
 *
 * @example
 * packageOf('turbopack:///[project]/node_modules/@c15t/react/dist/index.js');
 * // => '@c15t/react'
 */
export const packageOf = function packageOf(source: string): string {
	const marker = 'node_modules/';
	const index = source.lastIndexOf(marker);
	if (index !== -1) {
		const rest = source.slice(index + marker.length).split('/');
		const [scope, name] = rest;
		if (scope?.startsWith('@') && name) {
			return `${scope}/${name}`;
		}
		return scope ?? '(unknown)';
	}
	if (source.includes('[turbopack]')) {
		return '(turbopack runtime)';
	}
	if (source.includes('[project]/')) {
		return '(app)';
	}
	return '(other)';
};

/**
 * The path of a module inside its package, for module-level tables.
 *
 * @example
 * moduleOf('turbopack:///[project]/node_modules/@c15t/ui/dist/theme/index.js');
 * // => '@c15t/ui/dist/theme/index.js'
 */
export const moduleOf = function moduleOf(source: string): string {
	const marker = 'node_modules/';
	const index = source.lastIndexOf(marker);
	if (index !== -1) {
		return source.slice(index + marker.length);
	}
	const project = source.indexOf('[project]/');
	if (project !== -1) {
		return source.slice(project + '[project]/'.length);
	}
	return source.replace(/^turbopack:\/\/\//u, '');
};
