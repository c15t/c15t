/**
 * Events Panel
 * Displays chronological list of consent-related events
 */

import { createButton, createInput } from '../components/ui';
import { clearElement, div, span } from '../core/renderer';
import type { EventLogEntry } from '../core/state-manager';
import componentStyles from '../styles/components.module.css';

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

function getPanelState(container: HTMLElement): EventsPanelState {
	const existing = panelStateByContainer.get(container);
	if (existing) {
		return existing;
	}
	const initialState: EventsPanelState = {
		activeFilter: 'all',
		selectedEventId: null,
		searchQuery: '',
	};
	panelStateByContainer.set(container, initialState);
	return initialState;
}

/**
 * Renders the events panel content
 */
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
		style: {
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'space-between',
			padding: '12px 16px 8px',
			gap: '8px',
		},
		children: [
			span({
				style: {
					fontSize: 'var(--c15t-devtools-font-size-xs)',
					fontWeight: '600',
					color: 'var(--c15t-text-muted)',
					textTransform: 'uppercase',
					letterSpacing: '0.5px',
				},
				text: `Events (${events.length}/${allEvents.length})`,
			}),
			div({
				style: {
					display: 'flex',
					gap: '6px',
				},
				children: [
					createButton({
						text: 'Export',
						small: true,
						onClick: () => exportEvents(allEvents),
					}),
					createButton({
						text: 'Clear',
						small: true,
						onClick: () => {
							onClear();
							panelState.selectedEventId = null;
							renderEventsPanel(container, options);
						},
					}),
				],
			}),
		],
	});

	container.appendChild(header);
	container.appendChild(
		div({
			style: {
				display: 'flex',
				flexWrap: 'wrap',
				gap: '6px',
				padding: '0 16px 8px',
			},
			children: EVENT_FILTERS.map((filter) =>
				createFilterButton(filter, filter === panelState.activeFilter, () => {
					panelState.activeFilter = filter;
					panelState.selectedEventId = null;
					renderEventsPanel(container, options);
				})
			),
		})
	);
	container.appendChild(
		div({
			style: {
				padding: '0 16px 8px',
			},
			children: [
				createInput({
					value: panelState.searchQuery,
					placeholder: 'Search events…',
					ariaLabel: 'Search events',
					small: true,
					onInput: (value) => {
						panelState.searchQuery = value.trim().toLowerCase();
						panelState.selectedEventId = null;
						renderEventsPanel(container, options);
					},
				}),
			],
		})
	);

	const eventList = div({
		style: {
			display: 'flex',
			flexDirection: 'column',
			gap: '4px',
			padding: '0 12px 12px',
			maxHeight: '300px',
			overflowY: 'auto',
		},
	});

	if (events.length === 0) {
		eventList.appendChild(
			div({
				style: {
					padding: '20px 16px',
					textAlign: 'center',
					color: 'var(--c15t-text-muted)',
					fontSize: 'var(--c15t-devtools-font-size-sm)',
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

const EVENT_FILTERS: EventFilter[] = [
	'all',
	'error',
	'consent',
	'network',
	'iab',
	'script',
];

function createFilterButton(
	filter: EventFilter,
	active: boolean,
	onClick: () => void
): HTMLElement {
	return createButton({
		text: filter.toUpperCase(),
		small: true,
		variant: active ? 'primary' : 'default',
		onClick,
	});
}

function matchesFilter(event: EventLogEntry, filter: EventFilter): boolean {
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
}

function matchesSearch(event: EventLogEntry, query: string): boolean {
	if (!query) {
		return true;
	}
	const haystack = `${event.type} ${event.message} ${JSON.stringify(event.data ?? {})}`;
	return haystack.toLowerCase().includes(query);
}

function createPayloadSection(event: EventLogEntry | null): HTMLElement {
	const payload = event?.data ? JSON.stringify(event.data, null, 2) : null;
	return div({
		style: {
			padding: '0 12px 12px',
		},
		children: [
			div({
				style: {
					fontSize: 'var(--c15t-devtools-font-size-xs)',
					fontWeight: '600',
					color: 'var(--c15t-text-muted)',
					textTransform: 'uppercase',
					letterSpacing: '0.5px',
					marginBottom: '6px',
				},
				text: 'Payload',
			}),
			div({
				className: componentStyles.gridCard ?? '',
				style: {
					padding: '8px',
					fontFamily:
						'ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, Consolas, monospace',
					fontSize: '11px',
					color: 'var(--c15t-text-muted)',
					maxHeight: '140px',
					overflowY: 'auto',
					whiteSpace: 'pre-wrap',
					wordBreak: 'break-word',
				},
				text: payload || 'Select an event with payload data',
			}),
		],
	});
}

function createEventItem(
	event: EventLogEntry,
	selected: boolean,
	onSelect: () => void
): HTMLElement {
	const time = formatTime(event.timestamp);
	const icon = getEventIcon(event.type);
	const color = getEventColor(event.type);

	return div({
		className: componentStyles.gridCard ?? '',
		style: {
			display: 'flex',
			alignItems: 'center',
			gap: '8px',
			padding: '6px 10px',
			fontSize: 'var(--c15t-devtools-font-size-xs)',
			cursor: 'pointer',
			borderColor: selected
				? 'var(--c15t-devtools-badge-info, #3b82f6)'
				: 'var(--c15t-border)',
		},
		onClick: onSelect,
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
					fontFamily: 'monospace',
					fontSize: '10px',
					flexShrink: '0',
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
	});
}

function exportEvents(events: EventLogEntry[]): void {
	const json = JSON.stringify(events, null, 2);
	const blob = new Blob([json], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
	const a = document.createElement('a');
	a.href = url;
	a.download = `c15t-events-${timestamp}.json`;
	a.click();
	URL.revokeObjectURL(url);
}

function formatTime(timestamp: number): string {
	const date = new Date(timestamp);
	return date.toLocaleTimeString('en-US', {
		hour12: false,
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
	});
}

function getEventIcon(type: EventLogEntry['type']): string {
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
}

function getEventColor(type: EventLogEntry['type']): string {
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
}
