/**
 * Events Panel
 * Displays chronological list of consent-related events
 */

import { createButton, createInput } from '../components/ui';
import { clearElement, div, span } from '../core/renderer';
import type { EventLogEntry } from '../core/state-manager';

import componentStyles from '../styles/components.module.css';
// oxlint-disable-next-line prefer-const -- Preserve declaration order, interface shape, and public compatibility.
let getEventColor: (type: EventLogEntry['type']) => string;

// oxlint-disable-next-line prefer-const -- Preserve declaration order, interface shape, and public compatibility.
let getEventIcon: (type: EventLogEntry['type']) => string;

// oxlint-disable-next-line prefer-const -- Preserve declaration order, interface shape, and public compatibility.
let formatTime: (timestamp: number) => string;

export interface EventsPanelOptions {
	getEvents: () => EventLogEntry[];
	onClear: () => void;
}

type EventFilter = 'all' | 'error' | 'consent' | 'network' | 'iab' | 'script';

interface EventsPanelState {
	activeFilter: EventFilter;
	selectedEventId: string | null;
	searchQuery: string;
}

const panelStateByContainer = new WeakMap<HTMLElement, EventsPanelState>();

const getPanelState = function getPanelState(
	container: HTMLElement
): EventsPanelState {
	const existing = panelStateByContainer.get(container);
	if (existing) {
		return existing;
	}
	const initialState: EventsPanelState = {
		activeFilter: 'all',
		searchQuery: '',
		selectedEventId: null,
	};
	panelStateByContainer.set(container, initialState);
	return initialState;
};

const EVENT_FILTERS: EventFilter[] = [
	'all',
	'error',
	'consent',
	'network',
	'iab',
	'script',
];

const matchesSearch = function matchesSearch(
	event: EventLogEntry,
	query: string
): boolean {
	if (!query) {
		return true;
	}
	const haystack = `${event.type} ${event.message} ${JSON.stringify(event.data ?? {})}`;
	return haystack.toLowerCase().includes(query);
};

const matchesFilter = function matchesFilter(
	event: EventLogEntry,
	filter: EventFilter
): boolean {
	if (filter === 'all') {
		return true;
	}
	if (filter === 'error') {
		return event.type === 'error';
	}
	if (filter === 'consent') {
		return (
			event.type === 'consent_set' ||
			event.type === 'consent_save' ||
			event.type === 'consent_reset'
		);
	}
	if (filter === 'network') {
		return event.type === 'network';
	}
	if (filter === 'script') {
		return event.type === 'script';
	}
	return event.type === 'iab';
};

const createFilterButton = function createFilterButton(
	filter: EventFilter,
	active: boolean,
	onClick: () => void
): HTMLElement {
	return createButton({
		onClick,
		small: true,
		text: filter.toUpperCase(),
		variant: active ? 'primary' : 'default',
	});
};

const createPayloadSection = function createPayloadSection(
	event: EventLogEntry | null
): HTMLElement {
	const payload = event?.data ? JSON.stringify(event.data, null, 2) : null;
	return div({
		children: [
			div({
				style: {
					color: 'var(--c15t-text-muted)',
					fontSize: 'var(--c15t-devtools-font-size-xs)',
					fontWeight: '600',
					letterSpacing: '0.5px',
					marginBottom: '6px',

					textTransform: 'uppercase',
				},
				text: 'Payload',
			}),
			div({
				className: componentStyles.gridCard ?? '',
				style: {
					color: 'var(--c15t-text-muted)',
					fontFamily:
						'ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, Consolas, monospace',
					fontSize: '11px',
					maxHeight: '140px',
					overflowY: 'auto',
					padding: '8px',
					whiteSpace: 'pre-wrap',
					wordBreak: 'break-word',
				},
				text: payload || 'Select an event with payload data',
			}),
		],
		style: {
			padding: '0 12px 12px',
		},
	});
};

const exportEvents = function exportEvents(events: EventLogEntry[]): void {
	const json = JSON.stringify(events, null, 2);
	const blob = new Blob([json], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const timestamp = new Date().toISOString().replace(/[:.]/gu, '-');
	const a = document.createElement('a');
	a.href = url;
	a.download = `c15t-events-${timestamp}.json`;
	a.click();
	URL.revokeObjectURL(url);
};

const createEventItem = function createEventItem(
	event: EventLogEntry,
	selected: boolean,
	onSelect: () => void
): HTMLElement {
	const time = formatTime(event.timestamp);
	const icon = getEventIcon(event.type);
	const color = getEventColor(event.type);

	return div({
		children: [
			span({
				style: {
					color,
					fontSize: '8px',
					lineHeight: '1',
				},
				text: icon,
			}),
			span({
				style: {
					color: 'var(--c15t-text-muted)',
					flexShrink: '0',

					fontFamily: 'monospace',
					fontSize: '10px',
				},
				text: time,
			}),
			span({
				style: {
					color: 'var(--c15t-text)',
					flex: '1',
				},
				text: event.message,
			}),
		],
		className: componentStyles.gridCard ?? '',
		onClick: onSelect,
		style: {
			alignItems: 'center',
			borderColor: selected
				? 'var(--c15t-devtools-badge-info, #3b82f6)'
				: 'var(--c15t-border)',
			cursor: 'pointer',
			display: 'flex',
			fontSize: 'var(--c15t-devtools-font-size-xs)',
			gap: '8px',
			padding: '6px 10px',
		},
	});
};

formatTime = (timestamp: number): string => {
	const date = new Date(timestamp);
	return date.toLocaleTimeString('en-US', {
		hour: '2-digit',
		hour12: false,
		minute: '2-digit',
		second: '2-digit',
	});
};

getEventIcon = (type: EventLogEntry['type']): string => {
	switch (type) {
		case 'consent_set':
		case 'consent_save':
			return '●';
		case 'consent_reset':
			return '○';
		case 'error':
			return '✕';
		case 'network':
			return '◉';
		case 'iab':
			return '◆';
		case 'script':
			return '⌘';
		default:
			return '○';
	}
};

getEventColor = (type: EventLogEntry['type']): string => {
	switch (type) {
		case 'consent_set':
		case 'consent_save':
			return 'var(--c15t-devtools-badge-success, #10b981)';
		case 'consent_reset':
			return 'var(--c15t-devtools-badge-warning, #f59e0b)';
		case 'error':
			return 'var(--c15t-devtools-badge-error, #ef4444)';
		case 'network':
			return 'var(--c15t-devtools-badge-warning, #f59e0b)';
		case 'iab':
			return 'var(--c15t-devtools-badge-info, #3b82f6)';
		case 'script':
			return 'var(--c15t-devtools-badge-info, #14b8a6)';
		default:
			return 'var(--c15t-text-muted)';
	}
};

/**
 * Renders the events panel content
 */
// oxlint-disable-next-line func-style -- Preserve declaration order, interface shape, and public compatibility.
export function renderEventsPanel(
	container: HTMLElement,
	options: EventsPanelOptions
): void {
	const { getEvents, onClear } = options;
	const panelState = getPanelState(container);

	clearElement(container);

	const allEvents = getEvents();
	const events = allEvents
		.filter((event) => matchesFilter(event, panelState.activeFilter))
		.filter((event) => matchesSearch(event, panelState.searchQuery));

	if (!events.some((event) => event.id === panelState.selectedEventId)) {
		panelState.selectedEventId = events[0]?.id ?? null;
	}

	const selectedEvent =
		events.find((event) => event.id === panelState.selectedEventId) ?? null;

	const header = div({
		children: [
			span({
				style: {
					color: 'var(--c15t-text-muted)',
					fontSize: 'var(--c15t-devtools-font-size-xs)',
					fontWeight: '600',
					letterSpacing: '0.5px',

					textTransform: 'uppercase',
				},
				text: `Events (${events.length}/${allEvents.length})`,
			}),
			div({
				children: [
					createButton({
						onClick: () => exportEvents(allEvents),

						small: true,
						text: 'Export',
					}),
					createButton({
						onClick: () => {
							onClear();
							panelState.selectedEventId = null;
							renderEventsPanel(container, options);
						},

						small: true,
						text: 'Clear',
					}),
				],

				style: {
					display: 'flex',
					gap: '6px',
				},
			}),
		],
		style: {
			alignItems: 'center',
			display: 'flex',
			gap: '8px',
			justifyContent: 'space-between',
			padding: '12px 16px 8px',
		},
	});

	container.appendChild(header);
	container.appendChild(
		div({
			children: EVENT_FILTERS.map((filter) =>
				createFilterButton(filter, filter === panelState.activeFilter, () => {
					panelState.activeFilter = filter;
					panelState.selectedEventId = null;
					renderEventsPanel(container, options);
				})
			),
			style: {
				display: 'flex',
				flexWrap: 'wrap',
				gap: '6px',
				padding: '0 16px 8px',
			},
		})
	);
	container.appendChild(
		div({
			children: [
				createInput({
					ariaLabel: 'Search events',
					onInput: (value) => {
						panelState.searchQuery = value.trim().toLowerCase();
						panelState.selectedEventId = null;
						renderEventsPanel(container, options);
					},

					placeholder: 'Search events…',
					small: true,
					value: panelState.searchQuery,
				}),
			],
			style: {
				padding: '0 16px 8px',
			},
		})
	);

	const eventList = div({
		style: {
			display: 'flex',
			flexDirection: 'column',
			gap: '4px',
			maxHeight: '300px',
			overflowY: 'auto',
			padding: '0 12px 12px',
		},
	});

	if (events.length === 0) {
		eventList.appendChild(
			div({
				style: {
					color: 'var(--c15t-text-muted)',
					fontSize: 'var(--c15t-devtools-font-size-sm)',
					padding: '20px 16px',
					textAlign: 'center',
				},
				text: 'No events match this filter',
			})
		);
	} else {
		for (const event of events) {
			eventList.appendChild(
				createEventItem(event, event.id === panelState.selectedEventId, () => {
					panelState.selectedEventId = event.id;
					renderEventsPanel(container, options);
				})
			);
		}
	}

	container.appendChild(eventList);
	container.appendChild(createPayloadSection(selectedEvent));
}
