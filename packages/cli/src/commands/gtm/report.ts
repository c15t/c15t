import type { GtmIgnoredTag, GtmMigration, GtmUnmappedTag } from './types';

const TEMPLATE_LABELS: Readonly<Record<string, string>> = {
	awct: 'Google Ads conversion',
	cl: 'Click listener',
	evl: 'Element visibility listener',
	flc: 'Floodlight counter',
	fls: 'Floodlight sales',
	fsl: 'Form submit listener',
	gaawc: 'Google tag',
	gaawe: 'GA4 event',
	gclidw: 'Conversion Linker',
	googtag: 'Google tag',
	hjtc: 'Hotjar',
	hl: 'History listener',
	html: 'Custom HTML',
	img: 'Custom image',
	jel: 'JavaScript error listener',
	lcl: 'Link click listener',
	paused: 'Paused tag',
	sdl: 'Scroll listener',
	sp: 'Google Ads remarketing',
	tl: 'Timer listener',
	ua: 'Universal Analytics',
	ytl: 'YouTube listener',
};

const templateLabel = function templateLabel(template: string): string {
	return TEMPLATE_LABELS[template] ?? template;
};

const describeTag = function describeTag(
	tag: GtmIgnoredTag | GtmUnmappedTag
): string {
	const label = templateLabel(tag.template);
	const title = tag.name ? `${label} "${tag.name}"` : label;
	return `${title}. ${tag.reason}`;
};

const appendSection = function appendSection(
	lines: string[],
	heading: string,
	entries: readonly string[]
): void {
	if (entries.length === 0) {
		return;
	}
	lines.push('', heading);
	for (const entry of entries) {
		lines.push(`- ${entry}`);
	}
};

/** Human report. JSON callers use the migration object instead. */
export const formatGtmReport = function formatGtmReport(
	migration: GtmMigration
): string {
	const lines = [migration.containerId ?? 'GTM container', ''];
	if (migration.scripts.length === 0) {
		lines.push(
			'This container has no tags to replace. Remove the Google Tag Manager snippet.'
		);
	} else {
		lines.push(
			'Remove the Google Tag Manager snippet and register these scripts instead.',
			'',
			migration.snippet.trimEnd()
		);
	}
	if (migration.bytes !== undefined && migration.gzipBytes !== undefined) {
		lines.push(
			'',
			`The published container script is ${migration.bytes} bytes (${migration.gzipBytes} bytes gzipped).`
		);
	}
	if (migration.events.length > 0) {
		const names = migration.events.map((event) => event.name).join(', ');
		lines.push(
			'',
			`GA4 events stay in the app: ${names}. gtag() does not send them.`
		);
	}
	appendSection(lines, 'Warnings', migration.warnings);
	appendSection(lines, 'Left out', migration.ignored.map(describeTag));
	appendSection(lines, 'Not converted', migration.unmapped.map(describeTag));
	return `${lines.join('\n')}\n`;
};
