import type {
	LiveProbePhase,
	LiveVendorReport,
	LiveVendorResult,
} from './types';

/**
 * Title prefix used to dedupe monitor issues on GitHub.
 */
export const MONITOR_ISSUE_TITLE_PREFIX = '[vendor-script-monitor]';

const PHASE_ORDER: LiveProbePhase[] = [
	'consent',
	'bootstrap',
	'load',
	'runtime',
	'network',
];

/**
 * Builds the canonical monitor issue title for a vendor.
 *
 * @example
 * ```ts
 * buildMonitorIssueTitle('microsoft-clarity');
 * // "[vendor-script-monitor] microsoft-clarity live script contract failed"
 * ```
 */
export function buildMonitorIssueTitle(vendor: string): string {
	return `${MONITOR_ISSUE_TITLE_PREFIX} ${vendor} live script contract failed`;
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const MONITOR_ISSUE_TITLE_PATTERN = new RegExp(
	`^${escapeRegExp(MONITOR_ISSUE_TITLE_PREFIX)} (\\S+) live script contract failed$`
);

const SIGNATURE_MARKER_PATTERN = /<!-- c15t-monitor-signature: ([a-z, ]*) -->/;

/**
 * Escapes third-party text (vendor URLs, error messages, probe details)
 * before it is interpolated into GitHub-flavored Markdown, so a hostile or
 * malformed vendor response cannot inject links, references, or formatting.
 *
 * @param value - Untrusted text destined for an issue body.
 * @returns A single-line, backtick-free, length-capped string.
 */
function sanitizeInline(value: string): string {
	const flattened = value
		.replaceAll('`', "'")
		// Neutralize Markdown/HTML syntax that would render outside code spans:
		// links, images, autolinks, mentions, and issue references.
		.replace(/[[\]<>*_~#@!\\]/g, (match) => `\\${match}`)
		.replace(/\s+/g, ' ')
		.trim();

	if (flattened.length <= 300) {
		return flattened;
	}

	return `${flattened.slice(0, 300)}…`;
}

/**
 * Extracts the vendor id from a monitor issue title.
 *
 * @returns The vendor id, or `undefined` when the title is not a monitor
 * issue title.
 */
export function vendorFromMonitorIssueTitle(title: string): string | undefined {
	const match = MONITOR_ISSUE_TITLE_PATTERN.exec(title.trim());

	return match?.[1];
}

/**
 * Builds the stable failure signature for a result — the ordered list of
 * failing phases. Embedded in issue bodies so subsequent runs can tell
 * "still failing the same way" apart from "failing differently".
 */
export function buildMonitorSignature(result: LiveVendorResult): string {
	return failedPhases(result).join(',');
}

/**
 * Reads the failure signature marker out of an existing issue body.
 *
 * @returns The signature, or `undefined` when the body has no marker.
 */
export function signatureFromIssueBody(
	body: string | undefined
): string | undefined {
	if (!body) {
		return undefined;
	}

	return SIGNATURE_MARKER_PATTERN.exec(body)?.[1]?.trim();
}

/**
 * Lists the phases that failed for a probe result, in probe order.
 */
export function failedPhases(result: LiveVendorResult): LiveProbePhase[] {
	return PHASE_ORDER.filter((phase) => result.phases[phase]?.ok === false);
}

function formatPhaseLines(result: LiveVendorResult): string {
	return PHASE_ORDER.filter((phase) => result.phases[phase] !== undefined)
		.map((phase) => {
			const check = result.phases[phase];
			const status = check?.ok ? '✅' : '❌';
			const detail = check?.detail ? ` — ${sanitizeInline(check.detail)}` : '';
			return `- ${status} \`${phase}\`${detail}`;
		})
		.join('\n');
}

function formatErrorList(heading: string, errors: string[]): string {
	if (errors.length === 0) {
		return '';
	}

	const shown = errors.slice(0, 10);
	const items = shown
		.map((error) => `- \`${sanitizeInline(error)}\``)
		.join('\n');
	let overflow = '';
	if (errors.length > shown.length) {
		overflow = `\n- …and ${errors.length - shown.length} more`;
	}

	return `\n### ${heading}\n\n${items}${overflow}\n`;
}

/**
 * Builds the monitor issue body for a failing vendor probe.
 *
 * Includes the failing phases, expected vs actual detail, loader status, page
 * errors, run metadata, and a local reproduction command.
 */
export function buildMonitorIssueBody(
	result: LiveVendorResult,
	report: LiveVendorReport
): string {
	const signature = buildMonitorSignature(result);
	const failing = failedPhases(result).join(', ') || 'unknown';
	const loaderLine = result.loader
		? `\`${sanitizeInline(result.loader.url)}\` → HTTP ${result.loader.status}${
				result.loader.contentType
					? ` (${sanitizeInline(result.loader.contentType)})`
					: ''
			}`
		: 'No loader response captured.';

	const metadataLines = [
		`- **Vendor**: \`${result.vendor}\` (\`@c15t/scripts/${result.packageSubpath}\`)`,
		`- **Probe tier**: \`${result.tier}\``,
		`- **Failed phase(s)**: ${failing}`,
		`- **Attempts**: ${result.attempts}`,
		`- **Loader**: ${loaderLine}`,
	];

	if (report.commitSha) {
		metadataLines.push(`- **Commit**: ${report.commitSha}`);
	}

	if (report.runUrl) {
		metadataLines.push(`- **Workflow run**: ${report.runUrl}`);
	}

	const notes = result.notes ? `\n> ${sanitizeInline(result.notes)}\n` : '';

	return `<!-- c15t-monitor-signature: ${signature} -->
The daily live vendor monitor detected a contract failure for **${result.label}**.

${metadataLines.join('\n')}
${notes}
### Phase results

${formatPhaseLines(result)}
${formatErrorList('Console errors', result.consoleErrors)}${formatErrorList(
		'Page errors',
		result.pageErrors
	)}
### Reproduce locally

\`\`\`sh
bun run --filter @c15t/scripts test:live-vendors -- --vendor ${result.vendor}
\`\`\`

<sub>Opened automatically by the script vendor monitor. This issue closes automatically once the vendor passes again.</sub>`;
}

/**
 * Comment body posted when a previously failing vendor recovers.
 */
export function buildMonitorRecoveryComment(
	result: LiveVendorResult,
	report: LiveVendorReport
): string {
	const runLine = report.runUrl ? ` in ${report.runUrl}` : '';

	return `\`${result.vendor}\` passed the live vendor probes again${runLine}. Closing this monitor issue automatically.`;
}

/**
 * Open GitHub issue candidate considered during dedupe planning.
 */
export interface ExistingMonitorIssue {
	/** GitHub issue number. */
	number: number;
	/** Issue title, matched against the monitor title format. */
	title: string;
	/** Issue body, used to compare failure signatures across runs. */
	body?: string;
}

/**
 * One planned GitHub issue mutation.
 */
export interface MonitorIssueAction {
	vendor: string;
	/** Present for `update` and `close` actions. */
	issueNumber?: number;
	title?: string;
	body: string;
}

/**
 * Issue mutations required to reconcile GitHub with a monitor report.
 */
export interface MonitorIssuePlan {
	/** New issues for failing vendors without an open monitor issue. */
	create: MonitorIssueAction[];
	/**
	 * Body edits for vendors that are still failing but whose failure
	 * signature changed. Sustained identical failures produce no action, so
	 * long-running incidents do not accumulate daily comment noise.
	 */
	update: MonitorIssueAction[];
	/** Close actions for recovered vendors with an open monitor issue. */
	close: MonitorIssueAction[];
}

/**
 * Plans issue actions from a monitor report and the currently open issues.
 *
 * Only vendors present in the report are reconciled, so focused runs
 * (`--vendor`) never close issues for vendors they did not probe. Skipped
 * vendors are left untouched.
 */
export function planMonitorIssueActions(
	report: LiveVendorReport,
	existingIssues: ExistingMonitorIssue[]
): MonitorIssuePlan {
	const openIssueByVendor = new Map<string, ExistingMonitorIssue>();

	for (const issue of existingIssues) {
		const vendor = vendorFromMonitorIssueTitle(issue.title);
		if (vendor && !openIssueByVendor.has(vendor)) {
			openIssueByVendor.set(vendor, issue);
		}
	}

	const plan: MonitorIssuePlan = { create: [], update: [], close: [] };

	for (const result of report.results) {
		if (result.skipped) {
			continue;
		}

		const openIssue = openIssueByVendor.get(result.vendor);

		if (!result.ok) {
			const body = buildMonitorIssueBody(result, report);

			if (openIssue) {
				// Sustained failures with an unchanged signature stay silent —
				// only a different failure shape is worth a fresh notification.
				const previousSignature = signatureFromIssueBody(openIssue.body);
				if (previousSignature !== buildMonitorSignature(result)) {
					plan.update.push({
						vendor: result.vendor,
						issueNumber: openIssue.number,
						body,
					});
				}
			} else {
				plan.create.push({
					vendor: result.vendor,
					title: buildMonitorIssueTitle(result.vendor),
					body,
				});
			}

			continue;
		}

		if (openIssue) {
			plan.close.push({
				vendor: result.vendor,
				issueNumber: openIssue.number,
				body: buildMonitorRecoveryComment(result, report),
			});
		}
	}

	return plan;
}
