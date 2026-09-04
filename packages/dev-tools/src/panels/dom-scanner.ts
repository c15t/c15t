/**
 * DOM Scanner
 * Scans the DOM for external scripts and iframes, cross-referencing with the
 * scripts the c15t loader is known to manage
 */

import { createButton, createSection } from '../components/ui';
import { div, span } from '../core/renderer';
import type { ManagedScript } from '../core/script-registry';

// === Types ===

/**
 * Scripts the loader manages, used to classify scanned resources
 */
export interface DomScanSource {
	scripts: readonly ManagedScript[];
}

/**
 * Represents a scanned external resource
 */
export interface ScannedResource {
	type: 'script' | 'iframe';
	src: string;
	domain: string;
	status: 'managed' | 'unmanaged';
	/** If managed, the c15t script ID that handles it */
	managedBy?: string;
}

interface ManagedResourceMatcher {
	scriptId: string;
	domain: string;
	pathPrefix: string;
}

// Track dismissed resources (persists across scans within session)
const dismissedResources = new Set<string>();

const normalizePathname = function normalizePathname(pathname: string): string {
	const trimmed = pathname.trim();
	return trimmed.length > 0 ? trimmed : '/';
};

const findManagedScriptId = function findManagedScriptId(
	url: URL,
	managedResources: ManagedResourceMatcher[]
): string | undefined {
	const domain = url.hostname;
	const path = normalizePathname(url.pathname);
	let bestMatch: ManagedResourceMatcher | null = null;

	for (const matcher of managedResources) {
		if (matcher.domain !== domain) {
			continue;
		}

		// "/" means "any path on this domain"
		if (matcher.pathPrefix !== '/' && !path.startsWith(matcher.pathPrefix)) {
			continue;
		}

		if (!bestMatch || matcher.pathPrefix.length > bestMatch.pathPrefix.length) {
			bestMatch = matcher;
		}
	}

	return bestMatch?.scriptId;
};

/**
 * Checks a resource URL and returns ScannedResource if it's external
 */
const checkResource = function checkResource(
	src: string,
	type: 'script' | 'iframe',
	managedResources: ManagedResourceMatcher[]
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

		const managedBy = findManagedScriptId(url, managedResources);
		const isManaged = Boolean(managedBy);

		return {
			domain,
			managedBy,
			src,
			status: isManaged ? 'managed' : 'unmanaged',
			type,
		};
	} catch {
		/* invalid URL */
	}

	return null;
};

// === Core Scanning Functions ===

/**
 * Scans the DOM for external scripts and iframes, cross-referencing with c15t config
 */
export const scanDOM = function scanDOM(
	source: DomScanSource
): ScannedResource[] {
	const results: ScannedResource[] = [];

	// Get all managed script sources from c15t
	const configuredScripts = source.scripts;
	const managedResources: ManagedResourceMatcher[] = [];

	// Build matchers from configured script URLs for accurate domain + path checks.
	for (const script of configuredScripts) {
		if (script.src) {
			try {
				const url = new URL(script.src, window.location.origin);
				if (url.hostname !== window.location.hostname) {
					managedResources.push({
						domain: url.hostname,
						pathPrefix: normalizePathname(url.pathname),
						scriptId: script.id,
					});
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

		const resource = checkResource(src, 'script', managedResources);
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

		const resource = checkResource(src, 'iframe', managedResources);
		if (resource) {
			results.push(resource);
		}
	}

	return results;
};

/**
 * Creates a single-row resource item for display
 */
const createResourceRow = function createResourceRow(
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
				text: `${resource.type}:`,
			}),
			// Domain (main info)
			span({
				style: {
					color: 'var(--c15t-text)',
					flex: '1',
					fontWeight: '500',
					overflow: 'hidden',
					textOverflow: 'ellipsis',
					whiteSpace: 'nowrap',
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
		style: {
			alignItems: 'center',
			borderBottom: '1px solid var(--c15t-border)',
			display: 'flex',
			fontSize: 'var(--c15t-devtools-font-size-xs)',
			gap: '6px',
			padding: '4px 0',
		},
	});

	return row;
};

/**
 * Renders the scan results in the container
 */
const renderScanResults = function renderScanResults(
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
					color: 'var(--c15t-text-muted)',
					fontSize: 'var(--c15t-devtools-font-size-xs)',
					padding: '8px 0',
					textAlign: 'center',
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
					color: 'var(--c15t-text-muted)',
					fontSize: 'var(--c15t-devtools-font-size-xs)',
					padding: '8px 0',
					textAlign: 'center',
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
			color: 'var(--c15t-text-muted)',
			fontSize: 'var(--c15t-devtools-font-size-xs)',
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
				color: 'var(--c15t-devtools-badge-success)',
				fontSize: 'var(--c15t-devtools-font-size-xs)',
				fontWeight: '600',
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
};

// === UI Functions ===

/**
 * Creates the DOM scanner section UI
 */
export const createDomScannerSection = function createDomScannerSection(
	source: DomScanSource | null
): HTMLElement {
	let resultsContainer: HTMLElement | null = null;
	let lastScanResults: ScannedResource[] = [];

	const doRender = (): void => {
		if (!resultsContainer) {
			return;
		}
		renderScanResults(resultsContainer, lastScanResults, (src) => {
			dismissedResources.add(src);
			// Re-render after dismissing
			doRender();
		});
	};

	const handleScan = (): void => {
		if (!source || !resultsContainer) {
			return;
		}

		// Fresh scan every time
		lastScanResults = scanDOM(source);
		doRender();
	};

	const section = createSection({
		actions: [
			createButton({
				onClick: handleScan,

				small: true,
				text: 'Scan DOM',
			}),
		],
		children: [],
		title: 'DOM Scanner',
	});

	// Add placeholder content - no extra padding, section handles it
	resultsContainer = div({});

	const placeholder = div({
		style: {
			color: 'var(--c15t-text-muted)',
			fontSize: 'var(--c15t-devtools-font-size-xs)',
			padding: '8px 0',
			textAlign: 'center',
		},
		text: 'Click "Scan DOM" to check for external scripts and iframes',
	});

	resultsContainer.appendChild(placeholder);
	section.appendChild(resultsContainer);

	return section;
};

/**
 * Clears dismissed resources (for testing or reset)
 */
export const clearDismissedResources =
	function clearDismissedResources(): void {
		dismissedResources.clear();
	};
