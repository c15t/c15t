/**
 * Special ASCII art used to celebrate first-time contributors.
 * Wrapped in a fenced code block to preserve spacing in GitHub markdown.
 */
export const FIRST_TIME_CONTRIBUTOR_ASCII = [
	'⠀_______________',
	'|@@@@|⠀⠀⠀⠀⠀|####|',
	'|@@@@|⠀⠀⠀⠀⠀|####|',
	'|@@@@|⠀⠀⠀⠀⠀|####|',
	'\\@@@@|⠀⠀⠀⠀⠀|####/',
	'⠀\\@@@|⠀⠀⠀⠀⠀|###/',
	"⠀⠀`@@|_____|##'",
	'⠀⠀⠀⠀⠀⠀⠀(O)',
	"⠀⠀⠀⠀.-'''''-.",
	"⠀⠀.'⠀⠀*⠀*⠀*⠀⠀`.",
	'⠀:⠀⠀*⠀⠀⠀⠀⠀⠀⠀*⠀⠀:',
	':⠀~⠀F⠀I⠀R⠀S⠀T⠀~⠀:',
	':⠀⠀C⠀O⠀M⠀M⠀I⠀T⠀⠀:',
	'⠀:⠀⠀*⠀⠀⠀⠀⠀⠀⠀*⠀⠀:',
	"⠀⠀`.⠀⠀*⠀*⠀*⠀⠀.'",
	"⠀⠀⠀⠀`-.....-'",
].join('\n');

export const FIRST_TIME_CONTRIBUTOR_MARKER_START =
	'<!-- c15t-first-time-contributor -->';
export const FIRST_TIME_CONTRIBUTOR_MARKER_END =
	'<!-- /c15t-first-time-contributor -->';

export function buildFirstTimeContributorBlock(): string {
	return [
		FIRST_TIME_CONTRIBUTOR_MARKER_START,
		FIRST_TIME_CONTRIBUTOR_ASCII,
		FIRST_TIME_CONTRIBUTOR_MARKER_END,
	].join('\n');
}
