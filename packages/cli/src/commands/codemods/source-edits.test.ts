import { Project, SyntaxKind } from 'ts-morph';
import { describe, expect, it } from 'vitest';

import { applyEdits, elementRemovals, findProperty } from './source-edits';

const removeKeys = function removeKeys(source: string, keys: string[]): string {
	const project = new Project({ useInMemoryFileSystem: true });
	const sourceFile = project.createSourceFile('file.ts', source);
	const object = sourceFile.getFirstDescendantByKindOrThrow(
		SyntaxKind.ObjectLiteralExpression
	);
	const properties = keys.map((key) => findProperty(object, key));
	applyEdits(
		sourceFile,
		elementRemovals(properties.filter((property) => property !== undefined))
	);
	return sourceFile.getFullText();
};

describe('elementRemovals', () => {
	it('removes adjacent keys on one line without touching the brace', () => {
		const source = 'const o = { a: 1, b: 2, c: 3 };\n';
		expect(removeKeys(source, ['b', 'c'])).toBe('const o = { a: 1 };\n');
		expect(removeKeys(source, ['a', 'b'])).toBe('const o = { c: 3 };\n');
		expect(removeKeys(source, ['a', 'c'])).toBe('const o = { b: 2 };\n');
		expect(removeKeys(source, ['a', 'b', 'c'])).toBe('const o = { };\n');
	});

	it('removes adjacent keys on their own lines', () => {
		const source = 'const o = {\n\ta: 1,\n\tb: 2,\n\tc: 3,\n};\n';
		expect(removeKeys(source, ['b', 'c'])).toBe('const o = {\n\ta: 1,\n};\n');
		expect(removeKeys(source, ['a', 'b'])).toBe('const o = {\n\tc: 3,\n};\n');
	});

	it('removes adjacent keys when several share a line', () => {
		const source = 'const o = {\n\ta: 1, b: 2,\n\tc: 3, d: 4\n};\n';
		expect(removeKeys(source, ['b', 'c'])).toBe(
			'const o = {\n\ta: 1, d: 4\n};\n'
		);
		expect(removeKeys(source, ['c', 'd'])).toBe(
			'const o = {\n\ta: 1, b: 2,\n};\n'
		);
	});
});

describe('applyEdits', () => {
	it('fails instead of applying overlapping edits', () => {
		const project = new Project({ useInMemoryFileSystem: true });
		const sourceFile = project.createSourceFile('file.ts', 'const a = 1;\n');
		expect(() =>
			applyEdits(sourceFile, [
				{ end: 8, start: 4, text: '' },
				{ end: 10, start: 6, text: '' },
			])
		).toThrow('overlapping edits');
		expect(sourceFile.getFullText()).toBe('const a = 1;\n');
	});
});
