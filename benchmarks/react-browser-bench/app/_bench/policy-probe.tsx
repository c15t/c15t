'use client';

import type { PolicyBenchFixtureName } from '@c15t/benchmarking/policy-fixtures';
import { useActiveUI, useSnapshot } from '@c15t/react';
import { useEffect, useRef } from 'react';

import {
	getPolicyBenchState,
	isPolicySettled,
	readPromptRequirement,
	readStoredChoice,
} from './policy-state';
import type { PolicyBenchScenario } from './policy-state';
import { hasRunningAnimations, isElementVisible } from './state';

const BANNER_ELEMENT_TIMING_NAME = 'c15t-consent-banner';

/**
 * Records when the prompt for the current policy is ready: the snapshot
 * is settled and, if a first-layer surface is required, that surface is
 * visible. Also records probe commits and the sequence of `activeUI`
 * values so the runner can count prompt flashes and unrelated renders.
 */
export const PolicyBenchmarkProbe = ({
	fixture,
	scenario,
}: {
	fixture: PolicyBenchFixtureName;
	scenario: PolicyBenchScenario;
}) => {
	const activeUI = useActiveUI();
	const snapshot = useSnapshot();
	const renderRef = useRef(0);

	useEffect(() => {
		renderRef.current += 1;
		const state = getPolicyBenchState(scenario, fixture);
		if (state) {
			state.renderCount = renderRef.current;
		}
	});

	useEffect(() => {
		const state = getPolicyBenchState(scenario, fixture);
		if (state) {
			state.mountCount += 1;
		}
	}, [fixture, scenario]);

	useEffect(() => {
		const state = getPolicyBenchState(scenario, fixture);
		if (!state) {
			return;
		}
		const ui = activeUI ?? 'none';
		state.activeUI = ui;
		if (state.activeUiHistory.at(-1) !== ui) {
			state.activeUiHistory.push(ui);
		}
		const requirement = readPromptRequirement(snapshot);
		state.promptKind = requirement.kind;
		state.promptReason = requirement.reason;
		state.hasStoredChoice = readStoredChoice(snapshot);

		if (state.promptReadyMs !== undefined || !isPolicySettled(snapshot)) {
			return;
		}

		if (ui !== 'banner' && ui !== 'dialog') {
			state.promptReadyMs = performance.now();
			state.renderCountAtReady = renderRef.current;
			return;
		}

		let frameId = 0;
		const check = () => {
			const latest = getPolicyBenchState(scenario, fixture);
			if (!latest || latest.promptReadyMs !== undefined) {
				return;
			}
			const root = document.querySelector(
				'[data-testid="consent-banner-root"], [data-testid="consent-dialog-root"]'
			);
			if (root instanceof HTMLElement) {
				root.setAttribute('elementtiming', BANNER_ELEMENT_TIMING_NAME);
			}
			const action = root?.querySelector('button');
			const ready =
				!!root &&
				!!action &&
				isElementVisible(root) &&
				isElementVisible(action) &&
				!hasRunningAnimations(root);
			if (ready) {
				latest.promptReadyMs = performance.now();
				latest.promptShown = true;
				latest.renderCountAtReady = renderRef.current;
				return;
			}
			frameId = window.requestAnimationFrame(check);
		};
		frameId = window.requestAnimationFrame(check);
		return () => window.cancelAnimationFrame(frameId);
	}, [activeUI, fixture, scenario, snapshot]);

	return null;
};
