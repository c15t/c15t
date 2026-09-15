import { describe, expect, it, vi } from 'vitest';

import { createUserInteraction } from '../../context/user-interaction';
import { createCliLogger } from '../../utils/logger';

const prompts = { confirm: vi.fn(), isCancel: vi.fn(() => false) };
const error = {
	handleCancel: (): never => {
		throw new Error('cancelled');
	},
	handleError: (): never => {
		throw new Error('failed');
	},
};

describe('confirmation and failure handling', () => {
	it('honors --yes without opening a prompt', async () => {
		const { confirm } = createUserInteraction(
			{
				error,
				flags: { 'non-interactive': true, yes: true },
			},
			prompts
		);
		expect(await confirm('Continue?')).toBe(true);
		expect(prompts.confirm).not.toHaveBeenCalled();
	});
	it('fails with an actionable error when input is missing outside a terminal', async () => {
		const { confirm } = createUserInteraction(
			{
				error,
				flags: { 'non-interactive': true },
			},
			prompts
		);
		await expect(confirm('Continue?')).rejects.toMatchObject({
			code: 'INPUT_REQUIRED',
		});
		expect(prompts.confirm).not.toHaveBeenCalled();
	});
	it('throws failures instead of terminating the embedding process', () => {
		expect(() => createCliLogger().failed('Failed write')).toThrow(
			'Failed write'
		);
	});
});
