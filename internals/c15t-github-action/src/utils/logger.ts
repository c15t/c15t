import * as core from '@actions/core';
import * as github from '@actions/github';

export type LogFields = Record<string, unknown>;

export type Logger = {
	debug: (message: string, fields?: LogFields) => void;
	info: (message: string, fields?: LogFields) => void;
	warn: (message: string, fields?: LogFields) => void;
	error: (message: string, fields?: LogFields) => void;
	child: (fields: LogFields) => Logger;
};

function formatFields(fields?: LogFields): string {
	if (!fields || Object.keys(fields).length === 0) {
		return '';
	}
	try {
		return ` ${JSON.stringify(fields)}`;
	} catch {
		return '';
	}
}

export function createLogger(
	debugEnabled: boolean,
	base: LogFields = {}
): Logger {
	const baseMeta = {
		event: github.context.eventName,
		ref: github.context.ref,
		sha: github.context.sha,
		actor: github.context.actor,
		...base,
	};

	function log(
		level: 'debug' | 'info' | 'warn' | 'error',
		message: string,
		fields?: LogFields
	): void {
		const line = `[c15t] ${message}${formatFields({ ...baseMeta, ...(fields || {}) })}`;
		if (level === 'debug') {
			if (debugEnabled) {
				core.info(line);
			}
			return;
		}
		if (level === 'info') {
			core.info(line);
			return;
		}
		if (level === 'warn') {
			core.warning(line);
			return;
		}
		core.error(line);
	}

	return {
		debug: (m, f) => log('debug', m, f),
		info: (m, f) => log('info', m, f),
		warn: (m, f) => log('warn', m, f),
		error: (m, f) => log('error', m, f),
		child: (childFields: LogFields) =>
			createLogger(debugEnabled, { ...baseMeta, ...childFields }),
	};
}
