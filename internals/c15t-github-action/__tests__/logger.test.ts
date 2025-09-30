import * as core from '@actions/core';
import { describe, expect, it, vi } from 'vitest';
import { createLogger } from '../src/utils/logger';

vi.mock('@actions/core');

describe('logger', () => {
	it('respects debug flag', () => {
		const infoSpy = vi.spyOn(core, 'info');
		const logger = createLogger(true);
		logger.debug('hello', { k: 'v' });
		expect(infoSpy).toHaveBeenCalled();
	});

	it('logs info/warn/error with metadata', () => {
		const infoSpy = vi.spyOn(core, 'info');
		const warnSpy = vi.spyOn(core, 'warning');
		const errSpy = vi.spyOn(core, 'error');
		const logger = createLogger(false);
		logger.info('i', { a: 1 });
		logger.warn('w', { b: 2 });
		logger.error('e', { c: 3 });
		expect(infoSpy).toHaveBeenCalled();
		expect(warnSpy).toHaveBeenCalled();
		expect(errSpy).toHaveBeenCalled();
	});
});
