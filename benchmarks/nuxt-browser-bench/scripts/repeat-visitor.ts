/** Seed a valid v2 record without depending on a fixed calendar date. */
export const createRepeatVisitorCookie = (now = Date.now()): string =>
	[
		'c.necessary:1',
		'c.functionality:1',
		'c.experience:1',
		'c.measurement:1',
		'c.marketing:1',
		`i.t:${now - 60_000}`,
		'i.sid:sub_2VZxR7YmNpKq3WfLs8TgHd',
	].join(',');

/** A repeat-visitor measurement requires an actual restored choice. */
export const assertRepeatVisitor = (observation: {
	hasStoredChoice: boolean | undefined;
	bannerInFirstHtml: boolean;
	bannerCount: number;
}): void => {
	if (
		observation.hasStoredChoice !== true ||
		observation.bannerInFirstHtml ||
		observation.bannerCount > 0
	) {
		throw new Error(
			'Repeat visitor did not restore a stored choice without a banner'
		);
	}
};
