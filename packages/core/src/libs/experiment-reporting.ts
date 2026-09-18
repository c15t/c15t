/**
 * Reporting sink for presentation experiments.
 *
 * Turns `surface:shown`, `choice:recorded` and `notice:dismissed` kernel
 * events into flat analytics events and fans them out to the targets named in
 * `experiment.reportTo`: `window.dataLayer`, PostHog, or any function. Only
 * the arm, the surface and the decision go out; no identifiers, no user
 * properties.
 */
import type {
	ConsentKernel,
	KernelEvent,
	PromptSurface,
	SavePayload,
	SaveUISource,
	Unsubscribe,
} from '../types';
import type { ConsentExperiment, ExperimentAssignment } from './experiment';

/** Built-in reporting targets. */
export type ExperimentReporterName = 'dataLayer' | 'posthog';

/** Fields every report event carries. */
interface ExperimentReportBase {
	/** {@link ConsentExperiment.id}. */
	experimentId: string;
	/** The arm the visitor ran. */
	variant: string;
	/** Who picked the arm. */
	assignedBy: ExperimentAssignment['assignedBy'];
}

/** An impression of a prompt surface under an experiment arm. */
export interface ExperimentSurfaceShownReport extends ExperimentReportBase {
	name: 'c15t_surface_shown';
	surface: PromptSurface;
	/** Epoch milliseconds of the impression. */
	shownAt: number;
}

/** A recorded choice under an experiment arm. */
export interface ExperimentChoiceRecordedReport extends ExperimentReportBase {
	name: 'c15t_choice_recorded';
	surface: SaveUISource;
	consentAction: SavePayload['consentAction'];
	/** Categories the action confirmed. */
	confirmed: readonly string[];
	/** Milliseconds from the surface's first impression to the action, when known. */
	timeToDecisionMs?: number;
	/** Epoch milliseconds of the action. */
	actionAt: number;
}

/**
 * A dismissed opt-out notice under an experiment arm. The outcome of a
 * `notice` prompt: no choice is recorded, so this is the event to count
 * against the impression.
 */
export interface ExperimentNoticeDismissedReport extends ExperimentReportBase {
	name: 'c15t_notice_dismissed';
	/** `banner` or `dialog`, or `none` for a programmatic dismissal with no prompt open. */
	surface: SaveUISource;
	/** Milliseconds from the surface's first impression to the dismissal, when known. */
	timeToDecisionMs?: number;
	/** Epoch milliseconds of the dismissal. */
	actionAt: number;
}

/** Event handed to an {@link ExperimentReporter}. */
export type ExperimentReportEvent =
	| ExperimentSurfaceShownReport
	| ExperimentChoiceRecordedReport
	| ExperimentNoticeDismissedReport;

/**
 * Receives every report event.
 *
 * @param event - The report event.
 */
export type ExperimentReporter = (event: ExperimentReportEvent) => void;

/** The `reportTo` option on {@link ConsentExperiment}. */
export type ExperimentReportTarget = NonNullable<ConsentExperiment['reportTo']>;

/**
 * Build the report for a `surface:shown` event.
 *
 * @param event - The kernel event.
 * @returns The report, or `null` when no experiment arm is assigned.
 */
export const buildSurfaceShownReport = function buildSurfaceShownReport(
	event: Extract<KernelEvent, { type: 'surface:shown' }>
): ExperimentSurfaceShownReport | null {
	const experiment = event.experiment ?? event.snapshot.experiment;
	if (!experiment) {
		return null;
	}
	return {
		assignedBy: experiment.assignedBy,
		experimentId: experiment.id,
		name: 'c15t_surface_shown',
		shownAt: event.shownAt,
		surface: event.surface,
		variant: experiment.variant,
	};
};

/**
 * Build the report for a `choice:recorded` event.
 *
 * @param event - The kernel event.
 * @returns The report, or `null` when no experiment arm is assigned.
 */
export const buildChoiceRecordedReport = function buildChoiceRecordedReport(
	event: Extract<KernelEvent, { type: 'choice:recorded' }>
): ExperimentChoiceRecordedReport | null {
	const experiment = event.experiment ?? event.snapshot.experiment;
	if (!experiment) {
		return null;
	}
	const report: ExperimentChoiceRecordedReport = {
		actionAt: event.actionAt,
		assignedBy: experiment.assignedBy,
		confirmed: [...event.confirmed],
		consentAction: event.consentAction,
		experimentId: experiment.id,
		name: 'c15t_choice_recorded',
		surface: event.uiSource,
		variant: experiment.variant,
	};
	if (event.timeToDecisionMs !== undefined) {
		report.timeToDecisionMs = event.timeToDecisionMs;
	}
	return report;
};

/**
 * Build the report for a `notice:dismissed` event.
 *
 * @param event - The kernel event.
 * @returns The report, or `null` when no experiment arm is assigned.
 */
export const buildNoticeDismissedReport = function buildNoticeDismissedReport(
	event: Extract<KernelEvent, { type: 'notice:dismissed' }>
): ExperimentNoticeDismissedReport | null {
	const experiment = event.experiment ?? event.snapshot.experiment;
	if (!experiment) {
		return null;
	}
	const report: ExperimentNoticeDismissedReport = {
		actionAt: event.dismissal.dismissedAt,
		assignedBy: experiment.assignedBy,
		experimentId: experiment.id,
		name: 'c15t_notice_dismissed',
		surface: event.surface,
		variant: experiment.variant,
	};
	if (event.timeToDecisionMs !== undefined) {
		report.timeToDecisionMs = event.timeToDecisionMs;
	}
	return report;
};

/** Snake_case properties the built-in targets send. */
export interface ExperimentReportProperties {
	experiment_id: string;
	variant: string;
	assigned_by: ExperimentAssignment['assignedBy'];
	surface: SaveUISource;
	shown_at?: number;
	action_at?: number;
	consent_action?: SavePayload['consentAction'];
	confirmed?: readonly string[];
	time_to_decision_ms?: number;
}

/**
 * Flatten a report event into the snake_case properties the built-in
 * targets send. `name` is not included; each target carries it separately.
 *
 * @param event - The report event.
 * @returns The properties.
 */
export const toExperimentReportProperties =
	function toExperimentReportProperties(
		event: ExperimentReportEvent
	): ExperimentReportProperties {
		const properties: ExperimentReportProperties = {
			assigned_by: event.assignedBy,
			experiment_id: event.experimentId,
			surface: event.surface,
			variant: event.variant,
		};
		if (event.name === 'c15t_surface_shown') {
			properties.shown_at = event.shownAt;
			return properties;
		}
		properties.action_at = event.actionAt;
		if (event.timeToDecisionMs !== undefined) {
			properties.time_to_decision_ms = event.timeToDecisionMs;
		}
		if (event.name === 'c15t_choice_recorded') {
			properties.consent_action = event.consentAction;
			properties.confirmed = event.confirmed;
		}
		return properties;
	};

interface ReportingWindow {
	dataLayer?: unknown[];
	posthog?: {
		capture?: (name: string, properties?: Record<string, unknown>) => void;
	};
}

const reportingWindow = function reportingWindow(): ReportingWindow | null {
	if (typeof window === 'undefined') {
		return null;
	}
	return window as unknown as ReportingWindow;
};

/**
 * Pushes `{ event, ...properties }` onto `window.dataLayer`. No-op in SSR.
 *
 * @param event - The report event.
 */
export const dataLayerReporter: ExperimentReporter = function dataLayerReporter(
	event
) {
	const host = reportingWindow();
	if (!host) {
		return;
	}
	host.dataLayer ||= [];
	host.dataLayer.push({
		event: event.name,
		...toExperimentReportProperties(event),
	});
};

/** How often the PostHog reporter checks for a late-loading SDK. */
const POSTHOG_POLL_MS = 250;

/** A PostHog reporter with the disposer for its buffer and poll timer. */
export interface PosthogReporterHandle {
	/** Calls `window.posthog.capture`, holding events until the SDK loads. */
	reporter: ExperimentReporter;
	/** Stops waiting for the SDK and drops the events still held. */
	dispose: () => void;
}

/**
 * Build a PostHog reporter with its own buffer. Events captured before
 * `window.posthog.capture` exists are held and sent in order once it
 * appears. `dispose` stops the wait and drops whatever is still held, so a
 * disposed runtime never reports late. No-op in SSR.
 *
 * @returns The reporter and its disposer.
 */
export const createPosthogReporter =
	function createPosthogReporter(): PosthogReporterHandle {
		const buffer: ExperimentReportEvent[] = [];
		let poll: ReturnType<typeof setInterval> | undefined;
		const stopPolling = function stopPolling() {
			if (poll !== undefined) {
				clearInterval(poll);
				poll = undefined;
			}
		};
		/** Send every buffered event once `window.posthog.capture` exists. */
		const flush = function flush(): boolean {
			const posthog = reportingWindow()?.posthog;
			if (!posthog?.capture) {
				return false;
			}
			for (const event of buffer.splice(0)) {
				posthog.capture(event.name, { ...toExperimentReportProperties(event) });
			}
			return true;
		};
		return {
			dispose() {
				stopPolling();
				buffer.length = 0;
			},
			reporter(event) {
				if (!reportingWindow()) {
					return;
				}
				buffer.push(event);
				if (flush() || poll !== undefined) {
					return;
				}
				poll = setInterval(() => {
					if (flush()) {
						stopPolling();
					}
				}, POSTHOG_POLL_MS);
			},
		};
	};

/**
 * Calls `window.posthog.capture(name, properties)`. While PostHog is not on
 * the page yet (a consent-gated load, for example) the events are held and
 * sent in order once it appears. No-op in SSR.
 *
 * This is a shared instance for direct use. `createExperimentReporting`
 * gives each subscription its own through {@link createPosthogReporter},
 * so disposing one clears its buffer and timer.
 *
 * @param event - The report event.
 */
export const posthogReporter: ExperimentReporter =
	createPosthogReporter().reporter;

const BUILT_IN_REPORTERS: Record<ExperimentReporterName, ExperimentReporter> = {
	dataLayer: dataLayerReporter,
	posthog: posthogReporter,
};

type ReporterEntry = ExperimentReporter | ExperimentReporterName;

/**
 * Normalise `reportTo` to a list, rejecting unknown built-in names.
 *
 * @param reportTo - A reporter, a built-in name, or a list of either.
 * @returns The entries in declaration order; empty when `reportTo` is unset.
 * @throws {Error} When a name is not a built-in target.
 */
const reporterEntries = function reporterEntries(
	reportTo: ExperimentReportTarget | undefined
): ReporterEntry[] {
	if (reportTo === undefined) {
		return [];
	}
	const entries = Array.isArray(reportTo)
		? (reportTo as readonly ReporterEntry[])
		: [reportTo as ReporterEntry];
	for (const entry of entries) {
		if (typeof entry !== 'function' && !BUILT_IN_REPORTERS[entry]) {
			throw new Error(
				`c15t experiment: unknown reportTo target "${String(entry)}". Use 'dataLayer', 'posthog' or a function.`
			);
		}
	}
	return [...entries];
};

/**
 * Map `reportTo` to reporter functions. Built-in names resolve to the shared
 * instances (`dataLayerReporter`, `posthogReporter`).
 *
 * @param reportTo - A reporter, a built-in name, or a list of either.
 * @returns The reporters in declaration order; empty when `reportTo` is unset.
 * @throws {Error} When a name is not a built-in target.
 */
export const resolveExperimentReporters = function resolveExperimentReporters(
	reportTo: ExperimentReportTarget | undefined
): ExperimentReporter[] {
	return reporterEntries(reportTo).map((entry) =>
		typeof entry === 'function' ? entry : BUILT_IN_REPORTERS[entry]
	);
};

/** Options of {@link createExperimentReporting}. */
export interface ExperimentReportingOptions {
	kernel: ConsentKernel;
	/** {@link ConsentExperiment.reportTo}. */
	reportTo: ExperimentReportTarget | undefined;
	/** Receives a reporter's thrown value. Defaults to `console.error`. */
	onError?: (error: unknown, event: ExperimentReportEvent) => void;
}

/**
 * Subscribe reporters to the kernel's impression, choice and notice
 * dismissal events.
 *
 * A reporter that throws is reported through `onError` and never breaks
 * the kernel or the other reporters; an `onError` that throws is swallowed
 * for the same reason. The `'posthog'` target gets its own buffer and poll
 * timer, cleared by the returned disposer.
 *
 * @param options - Kernel, targets and error handling.
 * @returns A disposer for the subscriptions and any reporter state.
 * @throws {Error} When `reportTo` names an unknown target.
 */
export const createExperimentReporting = function createExperimentReporting(
	options: ExperimentReportingOptions
): Unsubscribe {
	const disposers: (() => void)[] = [];
	const reporters = reporterEntries(options.reportTo).map((entry) => {
		if (entry === 'posthog') {
			const handle = createPosthogReporter();
			disposers.push(handle.dispose);
			return handle.reporter;
		}
		return typeof entry === 'function' ? entry : BUILT_IN_REPORTERS[entry];
	});
	if (reporters.length === 0) {
		return () => undefined;
	}
	const onError =
		options.onError ??
		((error: unknown, event: ExperimentReportEvent) => {
			console.error(
				`c15t experiment: reporter threw while sending ${event.name}.`,
				error
			);
		});
	const send = function send(event: ExperimentReportEvent | null) {
		if (!event) {
			return;
		}
		for (const reporter of reporters) {
			try {
				reporter(event);
			} catch (error) {
				try {
					onError(error, event);
				} catch {
					// A failing error handler must not stop the remaining reporters.
				}
			}
		}
	};
	const subscriptions = [
		options.kernel.events.on('surface:shown', (event) =>
			send(buildSurfaceShownReport(event))
		),
		options.kernel.events.on('choice:recorded', (event) =>
			send(buildChoiceRecordedReport(event))
		),
		options.kernel.events.on('notice:dismissed', (event) =>
			send(buildNoticeDismissedReport(event))
		),
	];
	return () => {
		for (const dispose of subscriptions) {
			dispose();
		}
		for (const dispose of disposers) {
			dispose();
		}
	};
};
