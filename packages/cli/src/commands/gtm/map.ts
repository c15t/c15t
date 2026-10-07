import {
	fingerprintText,
	gtagCategory,
	nestedContainerId,
	numericId,
} from './fingerprint';
import { renderSnippet } from './snippet';
import type {
	GtmGa4Event,
	GtmIgnoredTag,
	GtmMigration,
	GtmScriptCall,
	GtmUnmappedTag,
	ParsedGtmContainer,
	ParsedGtmTag,
} from './types';

/** Events a direct integration already covers by loading with the page. */
const PAGE_EVENTS = new Set([
	'All Pages',
	'Consent Initialization - All Pages',
	'DOM Ready',
	'Initialization - All Pages',
	'Page View',
	'Window Loaded',
	'consent-update',
	'gtm.dom',
	'gtm.init',
	'gtm.init_consent',
	'gtm.js',
	'gtm.load',
]);

const LISTENERS = new Set([
	'cl',
	'evl',
	'fsl',
	'hl',
	'jel',
	'lcl',
	'sdl',
	'tl',
	'ytl',
]);

interface TagMapping {
	scripts: GtmScriptCall[];
	events: GtmGa4Event[];
	ignored?: GtmIgnoredTag;
	unmapped?: GtmUnmappedTag;
	warnings: string[];
}

const scriptKey = function scriptKey(script: GtmScriptCall): string {
	return `${script.packageSubpath}:${JSON.stringify(script.options)}`;
};

const mergeFiresOn = function mergeFiresOn(
	current: readonly string[],
	extra: readonly string[]
): string[] {
	const events = [...current];
	for (const event of extra) {
		if (!events.includes(event)) {
			events.push(event);
		}
	}
	return events;
};

const variableWarnings = function variableWarnings(
	scripts: readonly GtmScriptCall[]
): string[] {
	const warnings: string[] = [];
	for (const script of scripts) {
		for (const option of script.options) {
			if (typeof option.value === 'string' && option.value.includes('{{')) {
				warnings.push(
					`${script.label} ${option.name} "${option.value}" is a GTM variable. Replace it before the script can load.`
				);
			}
		}
	}
	return warnings;
};

const hotjarCall = function hotjarCall(
	siteId: string,
	firesOn: readonly string[]
): GtmScriptCall {
	return {
		firesOn,
		importName: 'hotjar',
		label: 'Hotjar',
		options: [{ name: 'siteId', value: numericId(siteId.trim()) }],
		packageSubpath: 'hotjar',
	};
};

const googleTagMapping = function googleTagMapping(
	id: string,
	tag: ParsedGtmTag
): TagMapping {
	const trimmed = id.trim();
	const warnings = /^(?:G|GT|AW|DC)-[A-Za-z0-9]+$/u.test(trimmed)
		? []
		: [`Google tag id "${trimmed}" is not a G-, AW-, DC-, or GT- id.`];
	return {
		events: [],
		scripts: [
			{
				firesOn: tag.firesOn,
				importName: 'gtag',
				label: 'Google tag',
				options: [
					{ name: 'id', value: trimmed },
					{
						name: 'category',
						value: gtagCategory(trimmed, tag.consent),
					},
				],
				packageSubpath: 'google-tag',
			},
		],
		warnings,
	};
};

const fingerprintParameters = function fingerprintParameters(
	tag: ParsedGtmTag
): GtmScriptCall[] {
	const text = Object.values(tag.parameters).join('\n');
	if (text.trim().length === 0) {
		return [];
	}
	return fingerprintText(text).map((script) => ({
		...script,
		firesOn: tag.firesOn,
	}));
};

const customEventWarnings = function customEventWarnings(
	tag: ParsedGtmTag,
	scripts: readonly GtmScriptCall[]
): string[] {
	const custom = tag.firesOn.filter((event) => !PAGE_EVENTS.has(event));
	if (custom.length === 0 || scripts.length === 0) {
		return [];
	}
	const names = scripts.map((script) => script.label).join(', ');
	const events = custom.map((event) => `"${event}"`).join(', ');
	return [
		`${names} fired on ${events}. The helper loads with the page and does not wait for that event.`,
	];
};

const posthogWarnings = function posthogWarnings(
	scripts: readonly GtmScriptCall[]
): string[] {
	return scripts.some(
		(script) =>
			script.importName === 'posthog' &&
			!script.options.some((option) => option.name === 'region')
	)
		? ['PostHog region was not in the container. posthog() defaults to eu.']
		: [];
};

const unmappedTag = function unmappedTag(
	tag: ParsedGtmTag,
	containerId: string | undefined
): GtmUnmappedTag {
	const text = Object.values(tag.parameters).join('\n');
	const nested = nestedContainerId(text);
	if (nested && nested !== containerId) {
		return {
			name: tag.name,
			reason: `Loads ${nested}. Run c15t gtm on that container.`,
			template: tag.template,
		};
	}
	if (tag.template === 'flc' || tag.template === 'fls') {
		return {
			name: tag.name,
			reason: 'There is no separate helper. Load it with gtag() and a DC- id.',
			template: tag.template,
		};
	}
	const src = /src=['"](?<id>[^'"]+)['"]/u.exec(text)?.groups?.id;
	const reason = src
		? `No c15t integration matched this tag. Script: ${src.slice(0, 120)}`
		: 'No c15t integration matched this tag.';
	return { name: tag.name, reason, template: tag.template };
};

const mapKnownTemplate = function mapKnownTemplate(
	tag: ParsedGtmTag
): TagMapping | undefined {
	switch (tag.template) {
		case 'hjtc': {
			const siteId = tag.parameters.hotjar_site_id;
			if (!siteId) {
				return undefined;
			}
			return {
				events: [],
				scripts: [hotjarCall(siteId, tag.firesOn)],
				warnings: [],
			};
		}
		case 'googtag':
		case 'gaawc': {
			const tagId = tag.parameters.tagId ?? tag.parameters.measurementId;
			if (!tagId) {
				return undefined;
			}
			return googleTagMapping(tagId, tag);
		}
		case 'gaawe': {
			const name = tag.parameters.eventName;
			if (!name || name.includes('{{')) {
				return {
					events: [],
					scripts: [],
					unmapped: {
						name: tag.name,
						reason:
							'The event name is a GTM variable, so the command cannot tell which event it sends.',
						template: tag.template,
					},
					warnings: [],
				};
			}
			const measurementId = tag.parameters.measurementIdOverride;
			const event: GtmGa4Event = { name };
			if (measurementId) {
				event.measurementId = measurementId;
			}
			return {
				events: [event],
				scripts: [],
				warnings: [],
			};
		}
		case 'awct':
		case 'sp': {
			const { conversionId } = tag.parameters;
			if (!conversionId) {
				return undefined;
			}
			const id = /^AW-/iu.test(conversionId)
				? conversionId
				: `AW-${conversionId}`;
			const mapping = googleTagMapping(id, tag);
			const { conversionLabel } = tag.parameters;
			if (conversionLabel) {
				mapping.warnings.push(
					`Google Ads conversion label "${conversionLabel}" is not a script. gtag() loads ${id}; send the conversion from the app.`
				);
			}
			if (tag.template === 'sp') {
				mapping.warnings.push(
					`Remarketing for ${id} is loaded by gtag(). Audience lists stay in Google Ads.`
				);
			}
			return mapping;
		}
		default:
			return undefined;
	}
};

const mapTag = function mapTag(
	tag: ParsedGtmTag,
	containerId: string | undefined
): TagMapping {
	if (tag.paused) {
		return {
			events: [],
			ignored: {
				name: tag.name,
				reason: 'Paused in GTM, so it does not run.',
				template: tag.template,
			},
			scripts: [],
			warnings: [],
		};
	}
	if (LISTENERS.has(tag.template)) {
		return {
			events: [],
			ignored: {
				name: tag.name,
				reason: 'It does not load a vendor.',
				template: tag.template,
			},
			scripts: [],
			warnings: [],
		};
	}
	if (tag.template === 'gclidw') {
		return {
			events: [],
			ignored: {
				name: tag.name,
				reason: 'It is part of the Google tag.',
				template: tag.template,
			},
			scripts: [],
			warnings: [],
		};
	}
	if (tag.template === 'ua') {
		return {
			events: [],
			scripts: [],
			unmapped: {
				name: tag.name,
				reason: 'It is shut down. Use a GA4 measurement id with gtag().',
				template: tag.template,
			},
			warnings: [],
		};
	}

	const mapped = mapKnownTemplate(tag);
	const scripts = mapped?.scripts ?? fingerprintParameters(tag);
	const warnings = [
		...(mapped?.warnings ?? []),
		...customEventWarnings(tag, scripts),
		...posthogWarnings(scripts),
	];
	if (mapped?.unmapped) {
		return {
			events: mapped.events,
			scripts,
			unmapped: mapped.unmapped,
			warnings,
		};
	}
	if (scripts.length > 0 || (mapped?.events.length ?? 0) > 0) {
		return { events: mapped?.events ?? [], scripts, warnings };
	}
	if (mapped?.ignored) {
		return { events: [], ignored: mapped.ignored, scripts: [], warnings };
	}
	return {
		events: [],
		scripts: [],
		unmapped: unmappedTag(tag, containerId),
		warnings,
	};
};

/** Turn parsed tags into the scripts, leftovers, and warnings to print. */
export const migrateContainer = function migrateContainer(
	container: ParsedGtmContainer
): GtmMigration {
	const scripts: GtmScriptCall[] = [];
	const events: GtmGa4Event[] = [];
	const ignored: GtmIgnoredTag[] = [];
	const unmapped: GtmUnmappedTag[] = [];
	const warnings: string[] = [];
	const seenEvents = new Set<string>();

	for (const tag of container.tags) {
		const mapped = mapTag(tag, container.containerId);
		for (const script of mapped.scripts) {
			const key = scriptKey(script);
			const index = scripts.findIndex(
				(candidate) => scriptKey(candidate) === key
			);
			const existing = index >= 0 ? scripts[index] : undefined;
			if (existing) {
				scripts[index] = {
					...existing,
					firesOn: mergeFiresOn(existing.firesOn, tag.firesOn),
				};
				continue;
			}
			scripts.push({ ...script, firesOn: [...tag.firesOn] });
		}
		for (const event of mapped.events) {
			const key = `${event.name}:${event.measurementId ?? ''}`;
			if (seenEvents.has(key)) {
				continue;
			}
			seenEvents.add(key);
			events.push(event);
		}
		if (mapped.ignored) {
			ignored.push(mapped.ignored);
		}
		if (mapped.unmapped) {
			unmapped.push(mapped.unmapped);
		}
		warnings.push(...mapped.warnings);
	}
	warnings.push(...variableWarnings(scripts));

	if (
		events.length > 0 &&
		!scripts.some((script) => script.importName === 'gtag')
	) {
		warnings.push(
			'This container sends GA4 events but has no Google tag. Add gtag() with the measurement id.'
		);
	}
	for (const event of events) {
		if (
			event.measurementId &&
			!scripts.some((script) =>
				script.options.some((option) => option.value === event.measurementId)
			)
		) {
			warnings.push(
				`GA4 event "${event.name}" sends to ${event.measurementId}, which is not a Google tag in this container.`
			);
		}
	}

	return {
		containerId: container.containerId,
		events,
		ignored,
		scripts,
		snippet: renderSnippet(scripts),
		source: container.source,
		unmapped,
		warnings: [...new Set(warnings)],
	};
};
