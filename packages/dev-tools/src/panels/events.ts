/**
 * Events Panel
 * Displays chronological list of consent-related events
 */

import { createButton } from '../components/ui';
import { clearElement, div, span } from '../core/renderer';
import type { EventLogEntry } from '../core/state-manager';
import componentStyles from '../styles/components.module.css';

export interface EventsPanelOptions {
	getEvents: () => EventLogEntry[];
	onClear: () => void;
}

/**
 * Renders the events panel content
 */
export function renderEventsPanel(
	container: HTMLElement,
	options: EventsPanelOptions
): void {
	const { getEvents, onClear } = options;

	clearElement(container);

	const events = getEvents();

	// Header with title and clear button
	const header = div({
		style: {
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'space-between',
			padding: '12px 16px 8px',
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
				text: `Events (${events.length})`,
			}),
			createButton({
				text: 'Clear',
				small: true,
				onClick: onClear,
			}),
		],
	});

	container.appendChild(header);

	// Event list container
	const eventList = div({
		style: {
			display: 'flex',
			flexDirection: 'column',
			gap: '4px',
			padding: '0 12px 12px',
			maxHeight: '400px',
			overflowY: 'auto',
		},
	});

	if (events.length === 0) {
		const emptyState = div({
			style: {
				padding: '32px 16px',
				textAlign: 'center',
				color: 'var(--c15t-text-muted)',
				fontSize: 'var(--c15t-devtools-font-size-sm)',
			},
			text: 'No events recorded yet',
		});
		eventList.appendChild(emptyState);
	} else {
		for (const event of events) {
			const eventItem = createEventItem(event);
			eventList.appendChild(eventItem);
		}
	}

	container.appendChild(eventList);
}

/**
 * Creates an event list item
 */
function createEventItem(event: EventLogEntry): HTMLElement {
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
		},
		children: [
			// Icon indicator
			span({
				style: {
					color,
					fontSize: '8px',
					lineHeight: '1',
				},
				text: icon,
			}),
			// Time
			span({
				style: {
					color: 'var(--c15t-text-muted)',
					fontFamily: 'monospace',
					fontSize: '10px',
					flexShrink: '0',
				},
				text: time,
			}),
			// Message
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

/**
 * Formats timestamp to HH:MM:SS
 */
function formatTime(timestamp: number): string {
	const date = new Date(timestamp);
	return date.toLocaleTimeString('en-US', {
		hour12: false,
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
	});
}

/**
 * Gets icon for event type
 */
function getEventIcon(type: EventLogEntry['type']): string {
	switch (type) {
		case 'consent_set':
		case 'consent_save':
			return '●';
		case 'consent_reset':
			return '○';
		case 'error':
			return '✕';
		case 'info':
		default:
			return '○';
	}
}

/**
 * Gets color for event type
 */
function getEventColor(type: EventLogEntry['type']): string {
	switch (type) {
		case 'consent_set':
		case 'consent_save':
			return 'var(--c15t-devtools-badge-success, #10b981)';
		case 'consent_reset':
			return 'var(--c15t-devtools-badge-warning, #f59e0b)';
		case 'error':
			return 'var(--c15t-devtools-badge-error, #ef4444)';
		case 'info':
		default:
			return 'var(--c15t-text-muted)';
	}
}
