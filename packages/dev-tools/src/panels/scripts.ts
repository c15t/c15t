/**
 * Scripts Panel
 * Displays script loading status and configuration
 */

import type { ConsentStoreState } from 'c15t';
import {
	createBadge,
	createButton,
	createEmptyState,
	createInfoRow,
	createListItem,
	createSection,
} from '../components/ui';
import { clearElement, div, span } from '../core/renderer';

// Icons
const CODE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="16 18 22 12 16 6"></polyline>
  <polyline points="8 6 2 12 8 18"></polyline>
</svg>`;

// === DOM Scanner Types ===

interface ScannedResource {
	type: 'script' | 'iframe';
	src: string;
	domain: string;
	status: 'managed' | 'unmanaged';
	/** If managed, the c15t script ID that handles it */
	managedBy?: string;
}

export interface ScriptsPanelOptions {
	getState: () => ConsentStoreState | null;
}

/**
 * Renders the scripts panel content
 */
export function renderScriptsPanel(
	container: HTMLElement,
	options: ScriptsPanelOptions
): void {
	const { getState } = options;

	clearElement(container);

	const state = getState();

	if (!state) {
		container.appendChild(
			div({
				style: {
					padding: '24px',
					textAlign: 'center',
					color: 'var(--c15t-text-muted)',
					fontSize: 'var(--c15t-devtools-font-size-sm)',
				},
				text: 'Store not connected',
			})
		);
		return;
	}

	const scripts = state.scripts || [];
	const loadedScripts = state.loadedScripts || {};
	const networkBlocker = state.networkBlocker;

	// Scripts section
	if (scripts.length === 0) {
		const emptyState = createEmptyState({
			icon: CODE_ICON,
			text: 'No scripts configured',
		});
		container.appendChild(emptyState);
	} else {
		const scriptsList = div({});

		for (const script of scripts) {
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

			const item = createListItem({
				title: scriptId,
				description: `Category: ${categoryDisplay}`,
				actions: [badge],
			});

			scriptsList.appendChild(item);
		}

		container.appendChild(scriptsList);
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

	// Simple string category
	if (typeof category === 'string') {
		const consents = state.consents || {};
		return (consents as Record<string, boolean>)[category] === true;
	}

	// Complex condition - use the store's has() method if available
	// For now, just return false for complex conditions
	return false;
}

// === DOM Scanner Functions ===

/**
 * Scans the DOM for external scripts and iframes, cross-referencing with c15t config
 */
function scanDOM(state: ConsentStoreState): ScannedResource[] {
	const results: ScannedResource[] = [];

	// Get all configured script sources from c15t
	const configuredScripts = state.scripts || [];
	const managedDomains = new Map<string, string>(); // domain -> script ID

	// Build a map of managed domains from c15t config
	for (const script of configuredScripts) {
		if (script.src) {
			try {
				const url = new URL(script.src, window.location.origin);
				if (url.hostname !== window.location.hostname) {
					managedDomains.set(url.hostname, script.id);
				}
			} catch {
				/* inline script or invalid URL */
			}
		}
	}

	// Scan all script tags with external src
	const scriptElements = document.querySelectorAll('script[src]');
	for (const el of scriptElements) {
		const src = el.getAttribute('src');
		if (!src) {
			continue;
		}

		const resource = checkResource(src, 'script', managedDomains);
		if (resource) {
			results.push(resource);
		}
	}

	// Scan all iframe tags with external src
	const iframeElements = document.querySelectorAll('iframe[src]');
	for (const el of iframeElements) {
		const src = el.getAttribute('src');
		if (!src) {
			continue;
		}

		const resource = checkResource(src, 'iframe', managedDomains);
		if (resource) {
			results.push(resource);
		}
	}

	return results;
}

/**
 * Checks a resource URL and returns ScannedResource if it's external
 */
function checkResource(
	src: string,
	type: 'script' | 'iframe',
	managedDomains: Map<string, string>
): ScannedResource | null {
	try {
		const url = new URL(src, window.location.origin);
		const domain = url.hostname;

		// Skip first-party (same origin)
		if (domain === window.location.hostname) {
			return null;
		}

		// Skip data: and blob: URLs
		if (url.protocol === 'data:' || url.protocol === 'blob:') {
			return null;
		}

		// Check if this domain is managed by c15t
		const managedBy = managedDomains.get(domain);
		const isManaged = Boolean(managedBy);

		return {
			type,
			src,
			domain,
			status: isManaged ? 'managed' : 'unmanaged',
			managedBy,
		};
	} catch {
		/* invalid URL */
	}

	return null;
}

// Track dismissed resources (persists across scans within session)
const dismissedResources = new Set<string>();

/**
 * Creates the DOM scanner section UI
 */
function createDomScannerSection(state: ConsentStoreState | null): HTMLElement {
	let resultsContainer: HTMLElement | null = null;
	let lastScanResults: ScannedResource[] = [];

	const doRender = (): void => {
		if (!resultsContainer) return;
		renderScanResults(resultsContainer, lastScanResults, (src) => {
			dismissedResources.add(src);
			doRender(); // Re-render after dismissing
		});
	};

	const handleScan = (): void => {
		if (!state || !resultsContainer) {
			return;
		}

		// Fresh scan every time
		lastScanResults = scanDOM(state);
		doRender();
	};

	const section = createSection({
		title: 'DOM Scanner',
		actions: [
			createButton({
				text: 'Scan DOM',
				small: true,
				onClick: handleScan,
			}),
		],
		children: [],
	});

	// Add placeholder content
	resultsContainer = div({
		style: {
			padding: '0 8px 12px',
		},
	});

	const placeholder = div({
		style: {
			fontSize: 'var(--c15t-devtools-font-size-xs)',
			color: 'var(--c15t-text-muted)',
			textAlign: 'center',
			padding: '12px 8px',
		},
		text: 'Click "Scan DOM" to check for external scripts and iframes',
	});

	resultsContainer.appendChild(placeholder);
	section.appendChild(resultsContainer);

	return section;
}

/**
 * Renders the scan results in the container
 */
function renderScanResults(
	container: HTMLElement,
	results: ScannedResource[],
	onDismiss: (src: string) => void
): void {
	// Clear container
	while (container.firstChild) {
		container.removeChild(container.firstChild);
	}

	// Filter out dismissed resources
	const activeResults = results.filter((r) => !dismissedResources.has(r.src));

	if (activeResults.length === 0 && results.length === 0) {
		container.appendChild(
			div({
				style: {
					fontSize: 'var(--c15t-devtools-font-size-xs)',
					color: 'var(--c15t-text-muted)',
					textAlign: 'center',
					padding: '12px 8px',
				},
				text: 'No external scripts or iframes found',
			})
		);
		return;
	}

	if (activeResults.length === 0 && results.length > 0) {
		container.appendChild(
			div({
				style: {
					fontSize: 'var(--c15t-devtools-font-size-xs)',
					color: 'var(--c15t-text-muted)',
					textAlign: 'center',
					padding: '12px 8px',
				},
				text: `All ${results.length} alerts dismissed`,
			})
		);
		return;
	}

	// Separate managed and unmanaged
	const unmanaged = activeResults.filter((r) => r.status === 'unmanaged');
	const managed = activeResults.filter((r) => r.status === 'managed');
	const dismissedCount = results.length - activeResults.length;

	// Summary
	const summaryText =
		dismissedCount > 0
			? `Found: ${managed.length} managed, ${unmanaged.length} unmanaged (${dismissedCount} dismissed)`
			: `Found: ${managed.length} managed, ${unmanaged.length} unmanaged`;

	const summary = div({
		style: {
			fontSize: 'var(--c15t-devtools-font-size-xs)',
			color: 'var(--c15t-text-muted)',
			marginBottom: '8px',
		},
		text: summaryText,
	});
	container.appendChild(summary);

	// Unmanaged section (action needed)
	if (unmanaged.length > 0) {
		for (const resource of unmanaged) {
			container.appendChild(createResourceRow(resource, 'warning', onDismiss));
		}
	}

	// Managed section
	if (managed.length > 0) {
		const managedHeader = div({
			style: {
				fontSize: 'var(--c15t-devtools-font-size-xs)',
				fontWeight: '600',
				color: 'var(--c15t-devtools-badge-success)',
				marginBottom: '4px',
				marginTop: '8px',
			},
			text: 'MANAGED',
		});
		container.appendChild(managedHeader);

		for (const resource of managed) {
			container.appendChild(createResourceRow(resource, 'success', onDismiss));
		}
	}
}

/**
 * Creates a single-row resource item for display
 */
function createResourceRow(
	resource: ScannedResource,
	variant: 'warning' | 'success',
	onDismiss: (src: string) => void
): HTMLElement {
	const icon = variant === 'warning' ? '⚠' : '✓';
	const iconColor =
		variant === 'warning'
			? 'var(--c15t-devtools-badge-warning)'
			: 'var(--c15t-devtools-badge-success)';

	const row = div({
		style: {
			display: 'flex',
			alignItems: 'center',
			gap: '6px',
			padding: '4px 0',
			fontSize: 'var(--c15t-devtools-font-size-xs)',
			borderBottom: '1px solid var(--c15t-border)',
		},
		children: [
			// Icon
			span({
				style: {
					color: iconColor,
					flexShrink: '0',
				},
				text: icon,
			}),
			// Type label
			span({
				style: {
					color: 'var(--c15t-text-muted)',
					flexShrink: '0',
				},
				text: resource.type + ':',
			}),
			// Domain (main info)
			span({
				style: {
					fontWeight: '500',
					color: 'var(--c15t-text)',
					overflow: 'hidden',
					textOverflow: 'ellipsis',
					whiteSpace: 'nowrap',
					flex: '1',
				},
				text: resource.domain,
				title: resource.src,
			}),
			// Dismiss button (only for unmanaged)
			variant === 'warning'
				? (() => {
						const dismissBtn = document.createElement('button');
						dismissBtn.textContent = '✕';
						dismissBtn.title = 'Dismiss this alert';
						dismissBtn.style.cssText = `
						background: none;
						border: none;
						color: var(--c15t-text-muted);
						cursor: pointer;
						padding: 2px 4px;
						font-size: 10px;
						opacity: 0.6;
						flex-shrink: 0;
					`;
						dismissBtn.onmouseenter = () => {
							dismissBtn.style.opacity = '1';
						};
						dismissBtn.onmouseleave = () => {
							dismissBtn.style.opacity = '0.6';
						};
						dismissBtn.onclick = (e) => {
							e.stopPropagation();
							onDismiss(resource.src);
						};
						return dismissBtn;
					})()
				: null,
		].filter(Boolean) as HTMLElement[],
	});

	return row;
}
