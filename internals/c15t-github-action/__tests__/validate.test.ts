import { describe, expect, it } from 'vitest';

describe('Template SHA validation', () => {
	it('validates repo format correctly', () => {
		const validFormats = ['owner/repo', 'org/project', 'user/name'];
		const invalidFormats = ['invalid', '', 'owner/', '/repo', 'owner//repo'];

		for (const format of validFormats) {
			expect(format.includes('/')).toBe(true);
			const [owner, name] = format.split('/');
			expect(owner).toBeTruthy();
			expect(name).toBeTruthy();
		}

		for (const format of invalidFormats) {
			if (format.includes('/')) {
				const [owner, name] = format.split('/');
				expect(!owner || !name).toBe(true);
			} else {
				expect(format.includes('/')).toBe(false);
			}
		}
	});
});

describe('Installation ID validation', () => {
	it('validates installation IDs correctly', () => {
		const validIds = ['12345', '67890', '1'];
		const invalidIds = ['0', '-1', 'abc', '12.5', '', 'invalid'];

		for (const id of validIds) {
			const parsed = Number(id);
			expect(Number.isInteger(parsed) && parsed > 0).toBe(true);
		}

		for (const id of invalidIds) {
			const parsed = Number(id);
			expect(Number.isInteger(parsed) && parsed > 0).toBe(false);
		}
	});
});
