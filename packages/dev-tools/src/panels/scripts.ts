/**
 * Scripts Panel
 * Displays script loading status and configuration
 */

import type { ConsentStoreState } from 'c15t';
import {
	createBadge,
	createDisconnectedState,
	createEmptyState,
	createInfoRow,
	createInput,
	createSection,
} from '../components/ui';
import { clearElement, div } from '../core/renderer';
import type { EventLogEntry } from '../core/state-manager';
import { createDomScannerSection } from './dom-scanner';

// Icons
const CODE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="16 18 22 12 16 6"></polyline>
  <polyline points="8 6 2 12 8 18"></polyline>
</svg>`;

export interface ScriptsPanelOptions {
	getState: () => ConsentStoreState | null;
	getEvents?: () => EventLogEntry[];
}

const scriptsSearchByContainer = new WeakMap<HTMLElement, string>();

/**
 * Renders the scripts panel content
 */
export function renderScriptsPanel(
	container: HTMLElement,
	options: ScriptsPanelOptions
): void {
	const { getState, getEvents } = options;

	clearElement(container);

	const state = getState();

	if (!state) {
		container.appendChild(createDisconnectedState());
		return;
	}

	const scripts = state.scripts || [];
	const loadedScripts = state.loadedScripts || {};
	const networkBlocker = state.networkBlocker;
	const events = getEvents?.() ?? [];
	const searchQuery = scriptsSearchByContainer.get(container) ?? '';
	const filteredScripts = scripts.filter((script) => {
		if (!searchQuery) {
			return true;
		}
		const category =
			typeof script.category === 'string'
				? script.category
				: JSON.stringify(script.category);
		return `${script.id} ${category}`.toLowerCase().includes(searchQuery);
	});

	if (scripts.length > 4) {
		container.appendChild(
			createSection({
				title: 'Filter',
				children: [
					createInput({
						value: searchQuery,
						placeholder: 'Filter scripts…',
						ariaLabel: 'Filter scripts',
						small: true,
						onInput: (value) => {
							scriptsSearchByContainer.set(
								container,
								value.trim().toLowerCase()
							);
							renderScriptsPanel(container, options);
						},
					}),
				],
			})
		);
	}

	// Scripts section with heading
	if (scripts.length === 0) {
		const scriptsSection = createSection({
			title: 'Configured Scripts',
			children: [
				createEmptyState({
					icon: CODE_ICON,
					text: 'No scripts configured',
				}),
			],
		});
		container.appendChild(scriptsSection);
	} else {
		const scriptsList = div({
			style: {
				display: 'flex',
				flexDirection: 'column',
				borderTop: '1px solid var(--c15t-border)',
				borderBottom: '1px solid var(--c15t-border)',
			},
		});

		if (filteredScripts.length === 0) {
			scriptsList.appendChild(
				div({
					style: {
						padding: '10px 0',
						fontSize: 'var(--c15t-devtools-font-size-xs)',
						color: 'var(--c15t-text-muted)',
					},
					text: 'No matching scripts',
				})
			);
		}

		for (const script of filteredScripts) {
			const scriptId = script.id;
			const isLoaded = loadedScripts[scriptId] === true;

			// Get the category - can be a string or a complex condition object
			const category = script.category;
			const categoryDisplay =
				typeof category === 'string' ? category : JSON.stringify(category);

			// Determine status
			let status: 'loaded' | 'pending' | 'blocked' = 'pending';
			let statusVariant: 'success' | 'warning' | 'neutral' = 'neutral';

			if (isLoaded) {
				status = 'loaded';
				statusVariant = 'success';
			} else {
				// Check if consent is granted
				const hasConsent = checkScriptConsent(state, category);
				if (hasConsent) {
					status = 'pending';
					statusVariant = 'warning';
				} else {
					status = 'blocked';
					statusVariant = 'neutral';
				}
			}

			const badge = createBadge({
				text: status.charAt(0).toUpperCase() + status.slice(1),
				variant: statusVariant,
			});

			const row = div({
				style: {
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					gap: '8px',
					padding: '8px 0',
					borderBottom: '1px solid var(--c15t-border)',
				},
				children: [
					div({
						style: {
							display: 'flex',
							flexDirection: 'column',
							gap: '2px',
							minWidth: '0',
							flex: '1',
						},
						children: [
							div({
								style: {
									fontSize: 'var(--c15t-font-size-sm)',
									fontWeight: '500',
									color: 'var(--c15t-text)',
									overflow: 'hidden',
									textOverflow: 'ellipsis',
									whiteSpace: 'nowrap',
								},
								text: scriptId,
							}),
							div({
								style: {
									fontSize: 'var(--c15t-devtools-font-size-xs)',
									color: 'var(--c15t-text-muted)',
									overflow: 'hidden',
									textOverflow: 'ellipsis',
									whiteSpace: 'nowrap',
								},
								text: `Category: ${categoryDisplay}`,
							}),
						],
					}),
					div({
						style: {
							flexShrink: '0',
						},
						children: [badge],
					}),
				],
			});

			scriptsList.appendChild(row);
		}

		const lastRow = scriptsList.lastElementChild as HTMLElement | null;
		if (lastRow) {
			lastRow.style.borderBottom = 'none';
		}

		const scriptsSection = createSection({
			title: `Configured Scripts (${filteredScripts.length}/${scripts.length})`,
			children: [scriptsList],
		});

		container.appendChild(scriptsSection);
	}

	// Network blocker section
	const networkSection = createSection({
		title: 'Network Blocker',
		children: networkBlocker
			? [
					createInfoRow({
						label: 'Status',
						value: 'Active',
					}),
					createInfoRow({
						label: 'Blocked Domains',
						value: String(networkBlocker.rules?.length || 0),
					}),
				]
			: [
					div({
						style: {
							fontSize: 'var(--c15t-devtools-font-size-xs)',
							color: 'var(--c15t-devtools-text-muted)',
						},
						text: 'Network blocker not configured',
					}),
				],
	});

	container.appendChild(networkSection);

	const blockedRequestEvents = events.filter(
		(event) => event.type === 'network'
	);
	const networkEventsSection = createSection({
		title: `Blocked Requests (${blockedRequestEvents.length})`,
		children:
			blockedRequestEvents.length === 0
				? [
						div({
							style: {
								fontSize: 'var(--c15t-devtools-font-size-xs)',
								color: 'var(--c15t-devtools-text-muted)',
							},
							text: 'No blocked network requests recorded in this session',
						}),
					]
				: createBlockedRequestContent(blockedRequestEvents),
	});
	container.appendChild(networkEventsSection);

	// Loaded scripts summary
	const loadedCount = Object.values(loadedScripts).filter(Boolean).length;
	const totalCount = scripts.length;

	const summarySection = createSection({
		title: 'Summary',
		children: [
			createInfoRow({
				label: 'Total Scripts',
				value: String(totalCount),
			}),
			createInfoRow({
				label: 'Loaded',
				value: String(loadedCount),
			}),
			createInfoRow({
				label: 'Pending/Blocked',
				value: String(totalCount - loadedCount),
			}),
		],
	});

	container.appendChild(summarySection);

	// DOM Scanner section
	const scannerSection = createDomScannerSection(state);
	container.appendChild(scannerSection);
}

/**
 * Checks if consent is granted for a script category
 * Simplified check - for complex conditions, just assume pending
 */
function checkScriptConsent(
	state: ConsentStoreState,
	category: unknown
): boolean {
	if (!category) {
		return true;
	}

	if (typeof state.has === 'function') {
		try {
			return state.has(category as Parameters<ConsentStoreState['has']>[0]);
		} catch {
			// Fall through to simple checks for malformed conditions.
		}
	}

	// Simple string category fallback
	if (typeof category === 'string') {
		const consents = state.consents || {};
		return (consents as Record<string, boolean>)[category] === true;
	}

	return false;
}

function createBlockedRequestContent(events: EventLogEntry[]): HTMLElement[] {
	const stats = new Map<string, number>();
	for (const event of events) {
		const ruleId = getEventRuleId(event) ?? 'unknown';
		stats.set(ruleId, (stats.get(ruleId) ?? 0) + 1);
	}

	const statsList = div({
		style: {
			display: 'flex',
			flexDirection: 'column',
			gap: '4px',
			marginBottom: '8px',
		},
		children: [...stats.entries()]
			.sort((a, b) => b[1] - a[1])
			.map(([ruleId, count]) =>
				createInfoRow({
					label: ruleId === 'unknown' ? 'Unknown Rule' : `Rule: ${ruleId}`,
					value: `${count}`,
				})
			),
	});

	const latestEvents = events.slice(0, 5);
	const latestList = div({
		style: {
			display: 'flex',
			flexDirection: 'column',
			gap: '4px',
		},
		children: latestEvents.map((event) =>
			createInfoRow({
				label: `${formatEventTime(event.timestamp)} ${getEventMethod(event)}`,
				value: truncateText(getEventUrl(event), 38),
			})
		),
	});

	return [statsList, latestList];
}

function getEventRuleId(event: EventLogEntry): string | undefined {
	const data = event.data as Record<string, unknown> | undefined;
	const rule = data?.rule as Record<string, unknown> | undefined;
	const ruleId = rule?.id ?? data?.ruleId;
	return typeof ruleId === 'string' || typeof ruleId === 'number'
		? String(ruleId)
		: undefined;
}

function getEventMethod(event: EventLogEntry): string {
	const data = event.data as Record<string, unknown> | undefined;
	const method = data?.method;
	return typeof method === 'string' ? method.toUpperCase() : 'REQ';
}

function getEventUrl(event: EventLogEntry): string {
	const data = event.data as Record<string, unknown> | undefined;
	const url = data?.url;
	return typeof url === 'string' ? url : event.message;
}

function formatEventTime(timestamp: number): string {
	return new Date(timestamp).toLocaleTimeString('en-US', {
		hour12: false,
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
	});
}

function truncateText(text: string, maxLength: number): string {
	if (text.length <= maxLength) {
		return text;
	}
	return `${text.slice(0, maxLength - 3)}...`;
}
