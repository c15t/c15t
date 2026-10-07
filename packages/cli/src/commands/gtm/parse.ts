import { CliError } from '~/core/errors';

import type { ParsedGtmContainer, ParsedGtmTag } from './types';

const PAGE_TRIGGER_TYPES: Readonly<Record<string, string>> = {
	consentInit: 'gtm.init_consent',
	domReady: 'gtm.dom',
	init: 'gtm.init',
	pageview: 'gtm.js',
	windowLoaded: 'gtm.load',
};

const isRecord = function isRecord(
	value: unknown
): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const stringValue = function stringValue(value: unknown): string | undefined {
	if (typeof value === 'string') {
		return value;
	}
	if (typeof value === 'number' || typeof value === 'boolean') {
		return String(value);
	}
	return undefined;
};

const asArray = function asArray(value: unknown): readonly unknown[] {
	if (Array.isArray(value)) {
		return value;
	}
	return value === undefined ? [] : [value];
};

const matchingBrace = function matchingBrace(
	text: string,
	start: number
): number {
	let depth = 0;
	let inString = false;
	let escaped = false;
	for (let index = start; index < text.length; index += 1) {
		const character = text[index];
		if (inString) {
			if (escaped) {
				escaped = false;
			} else if (character === '\\') {
				escaped = true;
			} else if (character === '"') {
				inString = false;
			}
			continue;
		}
		if (character === '"') {
			inString = true;
		} else if (character === '{') {
			depth += 1;
		} else if (character === '}') {
			depth -= 1;
			if (depth === 0) {
				return index;
			}
		}
	}
	return -1;
};

const consentTypes = function consentTypes(value: unknown): string[] {
	if (!Array.isArray(value)) {
		return [];
	}
	const types: string[] = [];
	for (const entry of value) {
		if (typeof entry === 'string' && entry !== 'list') {
			types.push(entry);
		} else if (Array.isArray(entry)) {
			types.push(...consentTypes(entry));
		}
	}
	return types;
};

const publishedParameters = function publishedParameters(
	tag: Record<string, unknown>
): Record<string, string> {
	const parameters: Record<string, string> = {};
	for (const [key, value] of Object.entries(tag)) {
		if (!key.startsWith('vtp_')) {
			continue;
		}
		const scalar = stringValue(value);
		if (scalar !== undefined) {
			parameters[key.slice(4)] = scalar;
		}
	}
	return parameters;
};

const eventFromPredicate = function eventFromPredicate(
	predicate: unknown,
	macros: readonly unknown[]
): string | undefined {
	if (!isRecord(predicate) || predicate.function !== '_eq') {
		return undefined;
	}
	const { arg0 } = predicate;
	if (!Array.isArray(arg0) || arg0[0] !== 'macro') {
		return undefined;
	}
	const [, macroIndex] = arg0;
	if (typeof macroIndex !== 'number') {
		return undefined;
	}
	const macro = macros[macroIndex];
	if (!isRecord(macro) || macro.function !== '__e') {
		return undefined;
	}
	return stringValue(predicate.arg1);
};

const eventsForRule = function eventsForRule(
	rule: readonly unknown[],
	predicates: readonly unknown[],
	macros: readonly unknown[]
): string[] {
	const events: string[] = [];
	for (const clause of rule) {
		if (!Array.isArray(clause) || clause[0] !== 'if') {
			continue;
		}
		for (const index of clause.slice(1)) {
			if (typeof index !== 'number') {
				continue;
			}
			const event = eventFromPredicate(predicates[index], macros);
			if (event && !events.includes(event)) {
				events.push(event);
			}
		}
	}
	return events;
};

interface TagFiring {
	firesOn: string[];
	blockedOn: string[];
}

/**
 * A published rule is a list of clauses: `["if", predicateIndex]`,
 * `["add", tagIndex]`, and `["block", tagIndex]`. Predicate indexes point at
 * `resource.predicates`.
 */
const firingFromRules = function firingFromRules(
	rules: readonly unknown[],
	predicates: readonly unknown[],
	macros: readonly unknown[]
): Map<number, TagFiring> {
	const firing = new Map<number, TagFiring>();
	const touch = (index: number): TagFiring => {
		const current = firing.get(index) ?? { blockedOn: [], firesOn: [] };
		firing.set(index, current);
		return current;
	};
	for (const rule of rules) {
		if (!Array.isArray(rule)) {
			continue;
		}
		const events = eventsForRule(rule, predicates, macros);
		for (const clause of rule) {
			if (!Array.isArray(clause) || clause.length < 2) {
				continue;
			}
			const [verb, ...indexes] = clause;
			if (verb !== 'add' && verb !== 'block') {
				continue;
			}
			for (const index of indexes) {
				if (typeof index !== 'number') {
					continue;
				}
				const tag = touch(index);
				const target = verb === 'add' ? tag.firesOn : tag.blockedOn;
				for (const event of events) {
					if (!target.includes(event)) {
						target.push(event);
					}
				}
			}
		}
	}
	return firing;
};

const readPublishedData = function readPublishedData(
	text: string
): Record<string, unknown> | undefined {
	const marker = text.indexOf('var data =');
	if (marker < 0) {
		return undefined;
	}
	const start = text.indexOf('{', marker);
	if (start < 0) {
		return undefined;
	}
	const end = matchingBrace(text, start);
	if (end < 0) {
		return undefined;
	}
	try {
		const value: unknown = JSON.parse(text.slice(start, end + 1));
		return isRecord(value) ? value : undefined;
	} catch {
		return undefined;
	}
};

const exportParameters = function exportParameters(
	parameters: unknown
): Record<string, string> {
	const result: Record<string, string> = {};
	for (const parameter of asArray(parameters)) {
		if (!isRecord(parameter) || typeof parameter.key !== 'string') {
			continue;
		}
		const value = stringValue(parameter.value);
		if (value !== undefined) {
			result[parameter.key] = value;
		}
	}
	return result;
};

const customEventArgument = function customEventArgument(
	filter: unknown
): string | undefined {
	for (const entry of asArray(filter)) {
		if (!isRecord(entry)) {
			continue;
		}
		const argument = exportParameters(entry.parameter).arg1;
		if (argument) {
			return argument;
		}
	}
	return undefined;
};

const exportTriggerEvent = function exportTriggerEvent(
	trigger: Record<string, unknown>
): string | undefined {
	const type = stringValue(trigger.type) ?? '';
	const pageEvent = PAGE_TRIGGER_TYPES[type];
	if (pageEvent) {
		return pageEvent;
	}
	if (type === 'customEvent') {
		const fromFilter = customEventArgument(trigger.customEventFilter);
		if (fromFilter && !fromFilter.includes('{{')) {
			return fromFilter;
		}
		const fromParameter = exportParameters(trigger.parameter).eventName;
		if (fromParameter && !fromParameter.includes('{{')) {
			return fromParameter;
		}
	}
	const name = stringValue(trigger.name);
	return name?.includes('{{') ? undefined : name;
};

const triggerEvents = function triggerEvents(
	ids: unknown,
	triggers: ReadonlyMap<string, string>
): string[] {
	const events: string[] = [];
	for (const id of asArray(ids)) {
		if (typeof id !== 'string') {
			continue;
		}
		const event = triggers.get(id);
		if (event && !events.includes(event)) {
			events.push(event);
		}
	}
	return events;
};

const exportConsent = function exportConsent(settings: unknown): string[] {
	if (!isRecord(settings)) {
		return [];
	}
	const status = stringValue(settings.consentStatus);
	if (status === 'notNeeded' || status === 'notSet') {
		return [];
	}
	const consentType = isRecord(settings.consentType)
		? settings.consentType
		: undefined;
	const types: string[] = [];
	for (const entry of asArray(consentType?.list)) {
		if (!isRecord(entry)) {
			continue;
		}
		const value = stringValue(entry.value);
		if (value) {
			types.push(value);
		}
	}
	return types;
};

const parsePublishedData = function parsePublishedData(
	data: Record<string, unknown>
): ParsedGtmContainer {
	const resource = isRecord(data.resource) ? data.resource : undefined;
	if (!resource || !Array.isArray(resource.tags)) {
		throw new CliError('FILE_READ_ERROR', {
			details: 'Published container has no resource.tags array.',
		});
	}
	const macros = Array.isArray(resource.macros) ? resource.macros : [];
	const predicates = Array.isArray(resource.predicates)
		? resource.predicates
		: [];
	const rules = Array.isArray(resource.rules) ? resource.rules : [];
	const firing = firingFromRules(rules, predicates, macros);
	const blob = isRecord(data.blob) ? data.blob : {};
	const containerId = stringValue(blob['5']) ?? stringValue(blob['10']);
	return {
		containerId,
		source: 'published',
		tags: resource.tags.flatMap((tag, index) => {
			if (!isRecord(tag) || typeof tag.function !== 'string') {
				return [];
			}
			const events = firing.get(index);
			return [
				{
					blockedOn: events?.blockedOn ?? [],
					consent: consentTypes(tag.consent),
					firesOn: events?.firesOn ?? [],
					parameters: publishedParameters(tag),
					paused: tag.paused === true || tag.function === '__paused',
					template: tag.function.replace(/^__/u, ''),
				},
			];
		}),
	};
};

const parseExport = function parseExport(
	value: Record<string, unknown>
): ParsedGtmContainer {
	const version = isRecord(value.containerVersion)
		? value.containerVersion
		: undefined;
	if (!version) {
		throw new CliError('FILE_READ_ERROR', {
			details: 'GTM export is missing containerVersion.',
		});
	}
	const container = isRecord(version.container) ? version.container : {};
	const triggers = new Map<string, string>();
	for (const trigger of asArray(version.trigger)) {
		if (!isRecord(trigger)) {
			continue;
		}
		const id = stringValue(trigger.triggerId);
		const event = exportTriggerEvent(trigger);
		if (id && event) {
			triggers.set(id, event);
		}
	}
	return {
		containerId: stringValue(container.publicId),
		source: 'export',
		tags: asArray(version.tag).flatMap((tag) => {
			if (!isRecord(tag) || typeof tag.type !== 'string') {
				return [];
			}
			const parsed: ParsedGtmTag = {
				blockedOn: triggerEvents(tag.blockingTriggerId, triggers),
				consent: exportConsent(tag.consentSettings),
				firesOn: triggerEvents(tag.firingTriggerId, triggers),
				name: stringValue(tag.name),
				parameters: exportParameters(tag.parameter),
				paused: tag.paused === true,
				template: tag.type,
			};
			return [parsed];
		}),
	};
};

const parseJsonContainer = function parseJsonContainer(
	text: string
): ParsedGtmContainer {
	let value: unknown;
	try {
		value = JSON.parse(text);
	} catch {
		throw new CliError('FILE_READ_ERROR', {
			details: 'Container JSON could not be parsed.',
		});
	}
	if (!isRecord(value)) {
		throw new CliError('FILE_READ_ERROR', {
			details: 'Container JSON must be an object.',
		});
	}
	if ('containerVersion' in value || 'exportFormatVersion' in value) {
		return parseExport(value);
	}
	if ('resource' in value) {
		return parsePublishedData(value);
	}
	throw new CliError('FILE_READ_ERROR', {
		details:
			'JSON was neither a GTM container export nor a published gtm.js data object.',
	});
};

/**
 * Read a published `gtm.js` file or a GTM container export.
 *
 * Published containers store tags on `resource` inside `var data = { ... }`.
 * An export from Admin, Export Container stores them on `containerVersion.tag`
 * and keeps tag names. Draft tags that were never published are absent from
 * `gtm.js`.
 */
export const parseGtmContainer = function parseGtmContainer(
	text: string
): ParsedGtmContainer {
	const trimmed = text.trim();
	if (trimmed.startsWith('{')) {
		return parseJsonContainer(trimmed);
	}
	const data = readPublishedData(text);
	if (!data) {
		throw new CliError('FILE_READ_ERROR', {
			details:
				'Expected a published gtm.js file or a GTM container export JSON.',
		});
	}
	return parsePublishedData(data);
};
