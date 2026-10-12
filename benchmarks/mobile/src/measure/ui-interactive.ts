/**
 * Time until the consent UI can actually be acted on.
 *
 * The issue asks how long a subject waits before the banner answers a tap. Nothing
 * in this harness answered that: the rerender rows count render passes and never
 * render the package's UI, and the JavaScript rows stop at the client. So the
 * measurement mounts the real `ConsentBanner` under react-test-renderer against the
 * same fake module the rest of the harness drives, and times four spans:
 *
 * - the first mount in a process, with the provider's attach underneath it;
 * - a warm mount, which is what a screen that shows a banner later pays;
 * - the core saying a prompt is owed to a live control, which is the common case,
 *   because a policy usually resolves after first paint;
 * - tap to acknowledged commit, where the React layer's cost lands on top of the
 *   client span `commit_ack_no_network_ms` already reports.
 *
 * "Interactive" gets a definition rather than a vibe: a rendered element carrying a
 * live `onPress` that is not disabled. That is only readable because the bench stub
 * hands a host component's props to the element it renders.
 *
 * It runs in its own process. The package caches one consent client per process, so a
 * banner mounted after any other measurement would be mounted against that
 * measurement's consent state, and the cold mount is a launch number a warm process
 * cannot produce. See `support/ui-interactive-subject.ts`.
 *
 * The honest limit: this is the JavaScript half of interactivity. react-test-renderer
 * runs no layout pass, no platform `Modal`, and no font loading, and the stub's
 * `Animated` finishes on the spot, so a device adds its own frames to every number
 * here. They say what c15t's render costs, not what a phone's first frame costs.
 */

import { spawnSubject } from '../support/spawn-subject';
import type { UiInteractiveResult } from '../support/ui-interactive-subject';

export type { UiInteractiveResult } from '../support/ui-interactive-subject';

/**
 * Run the interactivity measurement in a fresh process.
 *
 * @param iterations - Warm mounts to sample, after the one cold mount.
 * @returns The spans, or `unavailable` with the reason none of them mean anything.
 */
export const measureUiInteractive = function measureUiInteractive(
	iterations: number
): UiInteractiveResult {
	const { reason, report } = spawnSubject<UiInteractiveResult>({
		args: [String(Math.max(1, Math.round(iterations)))],
		name: 'ui-interactive-subject',
		timeoutMs: 180_000,
	});

	if (reason) {
		return {
			actionToCommitMs: 0,
			coldMountMs: 0,
			controls: 0,
			controlsAfterAccept: 0,
			mountMs: 0,
			openMs: 0,
			openTicks: 0,
			samples: 0,
			unavailable: reason,
		};
	}

	if (report === undefined) {
		return {
			actionToCommitMs: 0,
			coldMountMs: 0,
			controls: 0,
			controlsAfterAccept: 0,
			mountMs: 0,
			openMs: 0,
			openTicks: 0,
			samples: 0,
			unavailable: 'the banner process reported nothing',
		};
	}

	return report;
};
