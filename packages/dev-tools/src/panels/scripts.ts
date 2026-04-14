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
import { button, clearElement, div, span } from '../core/renderer';
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
const expandedScriptsByContainer = new WeakMap<HTMLElement, Set<string>>();

const CHEVRON_DOWN_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="6 9 12 15 18 9"></polyline>
</svg>`;
const CHEVRON_RIGHT_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="9 18 15 12 9 6"></polyline>
</svg>`;

function getExpandedScripts(container: HTMLElement): Set<string> {
	const existing = expandedScriptsByContainer.get(container);
	if (existing) {
		return existing;
	}

	const expanded = new Set<string>();
	expandedScriptsByContainer.set(container, expanded);
	return expanded;
}

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
			const scriptEvents = getScriptActivityEvents(events, scriptId);
			const latestActivity = scriptEvents[scriptEvents.length - 1];
			const expandedScripts = getExpandedScripts(container);
			const isExpanded = expandedScripts.has(scriptId);

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

			const header = div({
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
							...(latestActivity && scriptEvents.length > 0
								? [
										div({
											style: {
												fontSize: 'var(--c15t-devtools-font-size-xs)',
												color: 'var(--c15t-text-muted)',
												overflow: 'hidden',
												textOverflow: 'ellipsis',
												whiteSpace: 'nowrap',
											},
											text: `Activity: ${latestActivity.message} (${scriptEvents.length} event${
												scriptEvents.length === 1 ? '' : 's'
											})`,
										}),
									]
								: []),
						],
					}),
					div({
						style: {
							flexShrink: '0',
							display: 'flex',
							alignItems: 'center',
							gap: '8px',
						},
						children: [
							badge,
							...(scriptEvents.length > 0
								? [
										createAccordionToggle({
											scriptId,
											isExpanded,
											onToggle: () => {
												if (isExpanded) {
													expandedScripts.delete(scriptId);
												} else {
													expandedScripts.add(scriptId);
												}
												renderScriptsPanel(container, options);
											},
										}),
									]
								: []),
						],
					}),
				],
			});

			const details =
				isExpanded && scriptEvents.length > 0
					? createScriptActivityDetails(scriptEvents)
					: null;
			const row = div({
				style: {
					display: 'flex',
					flexDirection: 'column',
					borderBottom: '1px solid var(--c15t-border)',
				},
				children: [header, details],
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
	const date = new Date(timestamp);
	const hours = String(date.getHours()).padStart(2, '0');
	const minutes = String(date.getMinutes()).padStart(2, '0');
	const seconds = String(date.getSeconds()).padStart(2, '0');
	const milliseconds = String(date.getMilliseconds()).padStart(3, '0');
	return `${hours}:${minutes}:${seconds}.${milliseconds}`;
}

function getScriptActivityEvents(
	events: EventLogEntry[],
	scriptId: string
): EventLogEntry[] {
	return events
		.filter((event) => {
			if (event.type !== 'script') {
				return false;
			}

			const data = event.data as Record<string, unknown> | undefined;
			if (data?.scriptId !== scriptId) {
				return false;
			}

			return data?.scope === 'lifecycle' || data?.scope === 'phase';
		})
		.sort((left, right) => left.timestamp - right.timestamp);
}

function createAccordionToggle(options: {
	scriptId: string;
	isExpanded: boolean;
	onToggle: () => void;
}): HTMLButtonElement {
	const { scriptId, isExpanded, onToggle } = options;

	const toggle = button({
		ariaLabel: `${isExpanded ? 'Collapse' : 'Expand'} ${scriptId} activity`,
		ariaExpanded: isExpanded ? 'true' : 'false',
		style: {
			display: 'inline-flex',
			alignItems: 'center',
			justifyContent: 'center',
			width: '24px',
			height: '24px',
			padding: '0',
			border: '1px solid var(--c15t-border)',
			borderRadius: '6px',
			background: 'transparent',
			color: 'var(--c15t-text-muted)',
			cursor: 'pointer',
			flexShrink: '0',
		},
		onClick: onToggle,
	});

	toggle.innerHTML = isExpanded ? CHEVRON_DOWN_ICON : CHEVRON_RIGHT_ICON;
	return toggle;
}

function createScriptActivityDetails(events: EventLogEntry[]): HTMLElement {
	const groupedEvents = groupScriptActivityEvents(events.slice(-8));

	return div({
		style: {
			display: 'flex',
			flexDirection: 'column',
			gap: '6px',
			padding: '0 0 10px 0',
			marginLeft: '0',
		},
		children: groupedEvents.map(([groupName, groupEvents]) =>
			createScriptActivityGroup(groupName, groupEvents)
		),
	});
}

function createScriptActivityGroup(
	groupName: string,
	events: EventLogEntry[]
): HTMLElement {
	return div({
		style: {
			display: 'flex',
			flexDirection: 'column',
			gap: '4px',
		},
		children: [
			span({
				style: {
					fontSize: 'var(--c15t-devtools-font-size-xs)',
					fontWeight: '600',
					color: 'var(--c15t-text)',
					textTransform: 'none',
				},
				text: groupName,
			}),
			...events.map((event) => createScriptActivityRow(event)),
		],
	});
}

function createScriptActivityRow(event: EventLogEntry): HTMLElement {
	const data = (event.data ?? {}) as Record<string, unknown>;
	const scope = typeof data.scope === 'string' ? data.scope : undefined;
	const phase = typeof data.phase === 'string' ? data.phase : undefined;
	const stepType =
		typeof data.stepType === 'string' ? data.stepType : undefined;

	const metadata = [scope, phase, stepType].filter(Boolean).join(' / ');

	return div({
		style: {
			display: 'flex',
			flexDirection: 'column',
			gap: '2px',
			padding: '6px 10px',
			marginLeft: '0',
			borderLeft: '2px solid var(--c15t-border)',
			backgroundColor:
				'var(--c15t-devtools-surface-secondary, rgba(127,127,127,0.06))',
			borderRadius: '0 8px 8px 0',
		},
		children: [
			div({
				style: {
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					gap: '8px',
				},
				children: [
					span({
						style: {
							fontSize: 'var(--c15t-devtools-font-size-xs)',
							fontWeight: '600',
							color: 'var(--c15t-text)',
						},
						text: event.message,
					}),
					span({
						style: {
							fontSize: 'var(--c15t-devtools-font-size-xs)',
							color: 'var(--c15t-text-muted)',
							flexShrink: '0',
						},
						text: formatEventTime(event.timestamp),
					}),
				],
			}),
			...(metadata
				? [
						span({
							style: {
								fontSize: 'var(--c15t-devtools-font-size-xs)',
								color: 'var(--c15t-text-muted)',
							},
							text: metadata,
						}),
					]
				: []),
		],
	});
}

function groupScriptActivityEvents(
	events: EventLogEntry[]
): Array<[string, EventLogEntry[]]> {
	const groups = new Map<string, EventLogEntry[]>();

	for (const event of events) {
		const groupName = getScriptActivityGroupName(event);
		const existing = groups.get(groupName);
		if (existing) {
			existing.push(event);
		} else {
			groups.set(groupName, [event]);
		}
	}

	const orderedGroupNames = [
		'onBeforeLoad',
		'onLoad',
		'onConsentChange',
		'other',
	];

	return orderedGroupNames
		.map((groupName) => {
			const groupEvents = groups.get(groupName);
			return groupEvents
				? ([groupName, groupEvents] as [string, EventLogEntry[]])
				: null;
		})
		.filter((group): group is [string, EventLogEntry[]] => group !== null);
}

function getScriptActivityGroupName(event: EventLogEntry): string {
	const data = (event.data ?? {}) as Record<string, unknown>;
	if (typeof data.callback === 'string') {
		return data.callback;
	}

	const phase = typeof data.phase === 'string' ? data.phase : '';
	if (
		phase === 'bootstrap' ||
		phase === 'consent-default' ||
		phase === 'setup' ||
		phase === 'onBeforeLoadGranted' ||
		phase === 'onBeforeLoadDenied'
	) {
		return 'onBeforeLoad';
	}

	if (
		phase === 'afterLoad' ||
		phase === 'onLoadGranted' ||
		phase === 'onLoadDenied'
	) {
		return 'onLoad';
	}

	if (
		phase === 'consent-update' ||
		phase === 'onConsentChange' ||
		phase === 'onConsentGranted' ||
		phase === 'onConsentDenied'
	) {
		return 'onConsentChange';
	}

	return 'other';
}

function truncateText(text: string, maxLength: number): string {
	if (text.length <= maxLength) {
		return text;
	}
	return `${text.slice(0, maxLength - 3)}...`;
}
