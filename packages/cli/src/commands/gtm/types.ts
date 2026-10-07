/** One argument in a generated integration call. */
export interface GtmOption {
	name: string;
	value: string | number | boolean;
}

/** A c15t integration call that replaces one or more GTM tags. */
export interface GtmScriptCall {
	/** Vendor name used in warnings. */
	label: string;
	/** Exported helper, such as `hotjar` or `gtag`. */
	importName: string;
	/** Package subpath under `@c15t/integrations`. */
	packageSubpath: string;
	options: readonly GtmOption[];
	/** Events whose firing triggers added this tag. */
	firesOn: readonly string[];
}

/** A GA4 event tag. `gtag()` does not send it. */
export interface GtmGa4Event {
	name: string;
	measurementId?: string;
}

/** A tag the command deliberately does not turn into a script. */
export interface GtmIgnoredTag {
	template: string;
	name?: string;
	reason: string;
}

/** A tag the command could not match to an integration. */
export interface GtmUnmappedTag {
	template: string;
	name?: string;
	reason: string;
}

/** Replacement plan for one GTM container. */
export interface GtmMigration {
	containerId?: string;
	source: 'published' | 'export';
	/** Byte size of a published `gtm.js` file, when that file was the input. */
	bytes?: number;
	gzipBytes?: number;
	snippet: string;
	scripts: readonly GtmScriptCall[];
	events: readonly GtmGa4Event[];
	ignored: readonly GtmIgnoredTag[];
	unmapped: readonly GtmUnmappedTag[];
	warnings: readonly string[];
}

/** Tag fields the mapper needs. Names exist only on a GTM export. */
export interface ParsedGtmTag {
	template: string;
	name?: string;
	parameters: Readonly<Record<string, string>>;
	consent: readonly string[];
	paused: boolean;
	firesOn: readonly string[];
	blockedOn: readonly string[];
}

/** Container contents, independent of whether they came from `gtm.js` or an export. */
export interface ParsedGtmContainer {
	containerId?: string;
	source: 'published' | 'export';
	tags: readonly ParsedGtmTag[];
}
