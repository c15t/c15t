import { describe, expect, it } from 'vitest';

import { commands } from '../../commands/registry';
import { parseCliArgs } from '../../context/parser';

describe('command parsing', () => {
	it('rejects unknown commands instead of opening a menu', () => {
		expect(() => parseCliArgs(['setpu'], commands)).toThrow('Unknown command');
	});
	it('preserves positional arguments even when they equal command names', () => {
		expect(
			parseCliArgs(['projects', 'select', 'projects'], commands).commandArgs
		).toEqual(['select', 'projects']);
	});
	it('supports inline flag values and parses resume and yes', () => {
		expect(
			parseCliArgs(['setup', '--resume', '--logger=debug', '-y'], commands)
				.parsedFlags
		).toMatchObject({ logger: 'debug', resume: true, y: true, yes: true });
	});
	it('rejects missing values and command-inappropriate flags', () => {
		expect(() =>
			parseCliArgs(['projects', '--organization'], commands)
		).toThrow('Flag requires a value');
		expect(() => parseCliArgs(['status', '--resume'], commands)).toThrow(
			'Unknown flag'
		);
		expect(() => parseCliArgs(['setup', '--wat'], commands)).toThrow(
			'Unknown flag'
		);
	});
	it('respects the positional argument separator', () => {
		expect(
			parseCliArgs(['projects', 'select', '--', '--strange-name'], commands)
				.commandArgs
		).toEqual(['select', '--strange-name']);
	});
	it('supports every registered authentication command and the generate alias', () => {
		for (const command of ['login', 'logout', 'status', 'generate']) {
			expect(parseCliArgs([command], commands).commandName).toBe(command);
		}
	});
});
