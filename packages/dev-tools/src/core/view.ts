import type {
	ConsentKernel,
	ConsentSnapshot,
	ConsentState,
	KernelOverrides,
} from '@c15t/core';
import { CONSENT_CATEGORIES, subscribeIABControls } from '@c15t/core';

import type { RunAction } from './action-runner';
import { appendActionFeedback } from './action-runner';
import {
	createButton,
	createCodeBlock,
	createElement,
	createSection,
	createStat,
	createTextField,
} from './elements';
import { renderIABPanel } from './iab-panel';
import type { IABPanelState } from './iab-panel';
import { createLogo } from './logo';
import type {
	DevToolsPosition,
	DevToolsState,
	DevToolsTab,
	StateManager,
} from './state-manager';

const TABS: readonly { id: DevToolsTab; label: string }[] = [
	{ id: 'consents', label: 'Consents' },
	{ id: 'scripts', label: 'Scripts' },
	{ id: 'location', label: 'Location' },
	{ id: 'policy', label: 'Policy' },
	{ id: 'iab', label: 'IAB' },
	{ id: 'events', label: 'Events' },
	{ id: 'actions', label: 'Actions' },
];

let nextViewId = 0;

/** DOM view owned by a DevTools instance. */
export interface DevToolsView {
	/** Root node, or null when no DOM is available. */
	element: HTMLElement | null;
	/** Remove the view and release subscriptions. Safe to call repeatedly. */
	destroy: () => void;
}

interface ViewOptions {
	kernel: ConsentKernel;
	getConsentCategories: () => readonly (keyof ConsentState)[];
	stateManager: StateManager;
	container?: HTMLElement;
}

interface ViewState {
	scriptSearch: string;
	expandedScripts: Set<string>;
	iab: IABPanelState;
}

// oxlint-disable-next-line func-style -- Hoisted render functions keep tab dispatch compact.
function renderConsents(
	document: Document,
	container: HTMLElement,
	kernel: ConsentKernel,
	snapshot: ConsentSnapshot,
	getConsentCategories: ViewOptions['getConsentCategories'],
	run: RunAction
): void {
	const section = createSection(
		document,
		'Consent categories',
		'Changes apply immediately. Save to record your preferences.'
	);
	const list = createElement(document, 'div', 'c15t-dev-tools__control-list');

	const displayed = new Set(getConsentCategories());
	for (const name of CONSENT_CATEGORIES.filter((category) =>
		displayed.has(category)
	)) {
		const enabled = snapshot.consents[name];
		const label = createElement(document, 'label', 'c15t-dev-tools__check');
		const input = createElement(document, 'input');
		input.type = 'checkbox';
		input.setAttribute('role', 'switch');
		input.checked = enabled;
		input.disabled = name === 'necessary';
		input.disabled ||= snapshot.model === 'iab';
		input.dataset.focusKey = `consent:${name}`;
		input.addEventListener('change', () => {
			const patch: Partial<ConsentState> = {};
			patch[name] = input.checked;
			kernel.set.consent(patch);
		});
		label.append(
			createElement(
				document,
				'span',
				undefined,
				name[0]?.toUpperCase() + name.slice(1)
			)
		);
		if (name === 'necessary') {
			label.append(
				createElement(document, 'span', 'c15t-dev-tools__badge', 'Always on')
			);
		}
		label.append(input);
		list.append(label);
	}

	if (snapshot.model === 'iab') {
		section.append(
			list,
			createElement(
				document,
				'p',
				'c15t-dev-tools__muted',
				'Categories are derived from IAB choices. Use the IAB tab to edit and save vendors and purposes.'
			)
		);
		container.append(section);
		return;
	}
	const actions = createElement(document, 'div', 'c15t-dev-tools__actions');
	actions.append(
		createButton(
			document,
			'Save changes',
			() => {
				run('Saving consent…', () => kernel.commands.save(), 'Consent saved.');
			},
			'primary'
		),
		createButton(document, 'Accept all', () => {
			run(
				'Accepting displayed consents…',
				() =>
					kernel.commands.save('all', { categories: getConsentCategories() }),
				'Displayed consents accepted.'
			);
		}),
		createButton(document, 'Reject optional', () => {
			run(
				'Rejecting optional consents…',
				() =>
					kernel.commands.save('none', { categories: getConsentCategories() }),
				'Optional displayed consents rejected.'
			);
		})
	);
	section.append(list, actions);
	container.append(section);
}

const renderScripts = (
	document: Document,
	container: HTMLElement,
	state: DevToolsState,
	viewState: ViewState
): void => {
	const section = createSection(
		document,
		'Scripts',
		'Inspect configured scripts and their loading status.'
	);
	const filter = createTextField(
		document,
		'Filter scripts',
		viewState.scriptSearch
	);
	filter.input.placeholder = 'Search by name, category, or URL';
	const list = createElement(document, 'div', 'c15t-dev-tools__script-list');
	const renderList = (): void => {
		list.replaceChildren();
		const query = viewState.scriptSearch.toLowerCase();
		const scripts = state.scripts.filter((script) =>
			`${script.id} ${script.src ?? ''} ${JSON.stringify(script.category)} ${script.status}`
				.toLowerCase()
				.includes(query)
		);
		if (!scripts.length) {
			list.append(
				createElement(
					document,
					'p',
					'c15t-dev-tools__empty',
					state.scripts.length
						? 'No scripts match your search.'
						: 'No script loader is configured for this consent provider.'
				)
			);
		}
		for (const script of scripts) {
			const key = `${script.loaderId}:${script.id}`;
			const detail = createElement(
				document,
				'details',
				'c15t-dev-tools__script'
			);
			detail.open = viewState.expandedScripts.has(key);
			detail.addEventListener('toggle', () => {
				if (!detail.isConnected) {
					return;
				}
				if (detail.open) {
					viewState.expandedScripts.add(key);
				} else {
					viewState.expandedScripts.delete(key);
				}
			});
			const summary = createElement(
				document,
				'summary',
				'c15t-dev-tools__script-summary'
			);
			const name = createElement(
				document,
				'span',
				'c15t-dev-tools__script-name',
				script.id
			);
			const status = createElement(
				document,
				'span',
				'c15t-dev-tools__status',
				script.status[0]?.toUpperCase() + script.status.slice(1)
			);
			status.dataset.status = script.status;
			summary.append(name, status);
			summary.dataset.focusKey = `script:${key}`;
			const body = createElement(
				document,
				'div',
				'c15t-dev-tools__script-body'
			);
			body.append(
				createElement(
					document,
					'p',
					'c15t-dev-tools__muted',
					script.src ??
						(script.callbackOnly
							? 'Callback-only integration'
							: 'Inline script')
				)
			);
			body.append(
				createCodeBlock(document, {
					allowedToLoad: script.eligible,
					alwaysLoad: script.alwaysLoad,
					category: script.category,
					consentGranted: script.hasConsent,
					elementId: script.elementId,
					persistAfterConsentRevoked: script.persistAfterConsentRevoked,
					vendorId: script.vendorId,
				})
			);
			if (script.lastEvent) {
				body.append(
					createElement(
						document,
						'p',
						'c15t-dev-tools__muted',
						script.lastEvent.message
					)
				);
			}
			if (script.status === 'present') {
				body.append(
					createElement(
						document,
						'p',
						'c15t-dev-tools__muted',
						'An existing element was reused. Its network load result is unknown.'
					)
				);
			}
			if (script.status === 'retained') {
				body.append(
					createElement(
						document,
						'p',
						'c15t-dev-tools__muted',
						'Consent was revoked, but this script is configured to stay on the page.'
					)
				);
			}
			detail.append(summary, body);
			list.append(detail);
		}
	};
	filter.input.addEventListener('input', () => {
		viewState.scriptSearch = filter.input.value;
		renderList();
	});
	renderList();
	section.append(filter.field, list);
	container.append(section);
	const scan = createSection(
		document,
		'External resources',
		'Scripts and iframes currently in the page. Presence does not confirm successful loading.'
	);
	const results = createElement(document, 'div', 'c15t-dev-tools__script-list');
	const scanPage = (): void => {
		results.replaceChildren();
		for (const element of document.querySelectorAll<
			HTMLScriptElement | HTMLIFrameElement
		>('script[src], iframe[src]')) {
			let url: URL;
			try {
				url = new URL(element.src, document.baseURI);
			} catch {
				continue;
			}
			if (
				!['http:', 'https:'].includes(url.protocol) ||
				url.origin === document.location.origin
			) {
				continue;
			}
			const managed =
				element.tagName === 'SCRIPT'
					? state.scripts.find((script) => script.elementId === element.id)
					: undefined;
			const row = createElement(document, 'div', 'c15t-dev-tools__script-body');
			row.append(
				createElement(
					document,
					'strong',
					undefined,
					`${element.tagName.toLowerCase()} · ${managed ? managed.id : 'Not managed by this provider'}`
				),
				createElement(document, 'p', 'c15t-dev-tools__muted', url.href)
			);
			results.append(row);
		}
		if (!results.childElementCount) {
			results.append(
				createElement(
					document,
					'p',
					'c15t-dev-tools__empty',
					'No external scripts or iframes found.'
				)
			);
		}
	};
	scan.append(createButton(document, 'Scan page', scanPage), results);
	container.append(scan);
};

// oxlint-disable-next-line func-style -- Hoisted render functions keep tab dispatch compact.
function renderLocation(
	document: Document,
	container: HTMLElement,
	kernel: ConsentKernel,
	snapshot: ConsentSnapshot,
	run: RunAction
): void {
	const location = createSection(document, 'Resolved location');
	location.append(
		snapshot.location
			? createCodeBlock(document, snapshot.location)
			: createElement(
					document,
					'p',
					'c15t-dev-tools__empty',
					'No location has been resolved yet.'
				)
	);

	const overrides = createSection(
		document,
		'Overrides',
		'Test how consent changes by location, language, or privacy signal.'
	);
	const form = createElement(document, 'form', 'c15t-dev-tools__form');
	const country = createTextField(
		document,
		'Country',
		snapshot.overrides.country ?? ''
	);
	const region = createTextField(
		document,
		'Region',
		snapshot.overrides.region ?? ''
	);
	const language = createTextField(
		document,
		'Language',
		snapshot.overrides.language ?? ''
	);
	const gpcField = createElement(document, 'label', 'c15t-dev-tools__field');
	gpcField.append(createElement(document, 'span', undefined, 'GPC'));
	const gpc = createElement(document, 'select');
	gpc.dataset.focusKey = 'field:GPC';
	for (const [value, label] of [
		['default', 'Use browser signal'],
		['true', 'Enabled'],
		['false', 'Disabled'],
	] as const) {
		const option = createElement(document, 'option', undefined, label);
		option.value = value;
		gpc.append(option);
	}
	gpc.value =
		snapshot.overrides.gpc === undefined
			? 'default'
			: String(snapshot.overrides.gpc);
	gpcField.append(gpc);

	const actions = createElement(document, 'div', 'c15t-dev-tools__actions');
	const apply = createButton(
		document,
		'Apply and refresh',
		// oxlint-disable-next-line no-empty-function -- Submit handling lives on the parent form.
		() => {},
		'primary'
	);
	apply.type = 'submit';
	actions.append(
		apply,
		createButton(document, 'Clear overrides', () => {
			kernel.set.overrides({
				country: undefined,
				gpc: undefined,
				language: undefined,
				region: undefined,
			});
			run(
				'Clearing overrides…',
				() => kernel.commands.init(),
				'Overrides cleared and consent data refreshed.'
			);
		})
	);

	form.addEventListener('submit', (event) => {
		event.preventDefault();
		const nextOverrides: KernelOverrides = {
			country: country.input.value.trim() || undefined,
			gpc: gpc.value === 'default' ? undefined : gpc.value === 'true',
			language: language.input.value.trim() || undefined,
			region: region.input.value.trim() || undefined,
		};
		kernel.set.overrides(nextOverrides);
		run(
			'Applying overrides…',
			() => kernel.commands.init(),
			'Overrides applied and consent data refreshed.'
		);
	});

	form.append(country.field, region.field, language.field, gpcField, actions);
	overrides.append(form);
	container.append(location, overrides);
}

// oxlint-disable-next-line func-style -- Hoisted render functions keep tab dispatch compact.
function renderPolicy(
	document: Document,
	container: HTMLElement,
	snapshot: ConsentSnapshot
): void {
	const summary = createSection(document, 'Effective policy');
	const stats = createElement(document, 'dl', 'c15t-dev-tools__stats');
	stats.append(
		createStat(document, 'Model', snapshot.model ?? 'none'),
		createStat(document, 'Active UI', snapshot.activeUI ?? 'none'),
		createStat(document, 'Revision', String(snapshot.revision)),
		createStat(
			document,
			'Consent recorded',
			snapshot.hasConsented ? 'yes' : 'no'
		)
	);
	summary.append(stats);

	const policy = createSection(document, 'Resolved policy data');
	policy.append(
		snapshot.policy
			? createCodeBlock(document, snapshot.policy)
			: createElement(
					document,
					'p',
					'c15t-dev-tools__empty',
					'No policy is available.'
				)
	);
	if (snapshot.policyDecision) {
		const decision = createSection(document, 'Policy decision');
		decision.append(createCodeBlock(document, snapshot.policyDecision));
		container.append(summary, policy, decision);
		return;
	}
	container.append(summary, policy);
}

// oxlint-disable-next-line func-style -- Hoisted render functions keep tab dispatch compact.

// oxlint-disable-next-line func-style -- Hoisted render functions keep tab dispatch compact.
function renderEvents(
	document: Document,
	container: HTMLElement,
	state: DevToolsState,
	clearEvents: () => void
): void {
	const section = createSection(document, 'Consent events');
	section.append(createButton(document, 'Clear events', clearEvents, 'danger'));
	if (state.events.length === 0) {
		section.append(
			createElement(
				document,
				'p',
				'c15t-dev-tools__empty',
				'Consent changes and requests will appear here as they happen.'
			)
		);
		container.append(section);
		return;
	}

	const list = createElement(document, 'ol', 'c15t-dev-tools__event-list');
	for (const event of state.events) {
		const item = createElement(document, 'li', 'c15t-dev-tools__event');
		const header = createElement(
			document,
			'div',
			'c15t-dev-tools__event-header'
		);
		header.append(
			createElement(document, 'code', undefined, event.type),
			createElement(
				document,
				'time',
				undefined,
				new Date(event.timestamp).toLocaleTimeString()
			)
		);
		item.append(header, createElement(document, 'p', undefined, event.message));
		if (event.data) {
			item.append(createCodeBlock(document, event.data));
		}
		list.append(item);
	}
	section.append(list);
	container.append(section);
}

// oxlint-disable-next-line func-style -- Hoisted render functions keep tab dispatch compact.
function renderActions(
	document: Document,
	container: HTMLElement,
	kernel: ConsentKernel,
	run: RunAction
): void {
	const section = createSection(
		document,
		'Test consent flows',
		'Preview the banner and preferences, or refresh consent data.'
	);
	const actions = createElement(document, 'div', 'c15t-dev-tools__action-grid');
	actions.append(
		createButton(
			document,
			'Refresh consent data',
			() => {
				run(
					'Refreshing consent data…',
					() => kernel.commands.init(),
					'Consent data refreshed.'
				);
			},
			'primary'
		),
		createButton(document, 'Show banner', () => {
			kernel.set.activeUI('banner');
		}),
		createButton(document, 'Open preferences', () => {
			kernel.set.activeUI('dialog');
		}),
		createButton(document, 'Hide consent UI', () => {
			kernel.set.activeUI('none');
		})
	);
	section.append(actions);
	container.append(section);
}

// oxlint-disable-next-line func-style -- Hoisted render functions keep tab dispatch compact.
function renderTab(
	document: Document,
	container: HTMLElement,
	state: DevToolsState,
	kernel: ConsentKernel,
	clearEvents: () => void,
	viewState: ViewState,
	getConsentCategories: ViewOptions['getConsentCategories'],
	run: RunAction
): void {
	// oxlint-disable-next-line default-case -- DevToolsTab is handled exhaustively.
	switch (state.activeTab) {
		case 'scripts':
			renderScripts(document, container, state, viewState);
			break;
		case 'consents':
			renderConsents(
				document,
				container,
				kernel,
				state.snapshot,
				getConsentCategories,
				run
			);
			break;
		case 'location':
			renderLocation(document, container, kernel, state.snapshot, run);
			break;
		case 'policy':
			renderPolicy(document, container, state.snapshot);
			break;
		case 'iab':
			renderIABPanel(document, container, kernel, viewState.iab, run);
			break;
		case 'events':
			renderEvents(document, container, state, clearEvents);
			break;
		case 'actions':
			renderActions(document, container, kernel, run);
			break;
	}
}

// oxlint-disable-next-line func-style -- Named helpers aid stack traces.
function positionClass(position: DevToolsPosition): string {
	return `c15t-dev-tools--${position}`;
}

/**
 * Create a view for a kernel-bound state manager.
 * @param options - Kernel, scope getter, state manager, and optional container.
 * @returns A disposable view; element is null without a browser document.
 */
// oxlint-disable-next-line func-style -- Preserve the public view factory declaration.
export function createDevToolsView(options: ViewOptions): DevToolsView {
	const document = options.container?.ownerDocument ?? globalThis.document;
	if (!document) {
		return {
			// oxlint-disable-next-line no-empty-function -- Server rendering has no DOM cleanup.
			destroy() {},
			element: null,
		};
	}

	nextViewId += 1;
	const viewId = `c15t-dev-tools-${nextViewId}`;
	const panelId = `${viewId}-panel`;
	const root = createElement(
		document,
		'div',
		`c15t-dev-tools ${positionClass(options.stateManager.getState().position)}`
	);
	root.dataset.c15tDevTools = viewId;
	root.addEventListener('keydown', (event) => {
		if (
			event.key === 'Escape' &&
			!root.classList.contains('c15t-dev-tools--embedded')
		) {
			event.stopPropagation();
			options.stateManager.setOpen(false);
		}
	});
	let wasOpen = options.stateManager.getState().isOpen;
	let renderedState: DevToolsState | undefined;
	const viewState: ViewState = {
		expandedScripts: new Set(),
		iab: { group: 'vendors', page: 0, rawOpen: false, search: '' },
		scriptSearch: '',
	};
	let destroyed = false;
	let action:
		| { status: 'pending' | 'success' | 'error'; message: string }
		| undefined;
	const run: RunAction = (pending, task, success) => {
		if (destroyed || action?.status === 'pending') {
			return;
		}
		action = { message: pending, status: 'pending' };
		// oxlint-disable-next-line no-use-before-define -- Render is hoisted; commands run after the view mounts.
		render();
		void (async () => {
			try {
				const result = await task();
				if (
					typeof result === 'object' &&
					result !== null &&
					'ok' in result &&
					!result.ok
				) {
					throw new Error(
						'The request failed. Check the connection and retry.'
					);
				}
				action = { message: success, status: 'success' };
			} catch (error) {
				action = {
					message:
						error instanceof Error
							? error.message
							: 'The request failed. Retry the action.',
					status: 'error',
				};
			}
			if (!destroyed) {
				// oxlint-disable-next-line no-use-before-define -- Render is hoisted; refresh the completed command feedback.
				render();
			}
		})();
	};

	// oxlint-disable-next-line func-style -- Hoisted render helpers share view state.
	function focusAfterRender(selector: string): void {
		const focus = () => {
			const target = root.querySelector<HTMLElement>(selector);
			target?.focus();
		};
		const view = document.defaultView;
		if (view) {
			view.requestAnimationFrame(focus);
		} else {
			focus();
		}
	}

	// oxlint-disable-next-line func-style -- Hoisted render helpers share view state.
	function restoreFocusAfterRender(focusKey: string): void {
		const focus = () => {
			const candidates = root.querySelectorAll<HTMLElement>('[data-focus-key]');
			for (const candidate of candidates) {
				if (candidate.dataset.focusKey === focusKey) {
					candidate.focus({ preventScroll: true });
					return;
				}
			}
		};
		const view = document.defaultView;
		if (view) {
			view.requestAnimationFrame(focus);
		} else {
			focus();
		}
	}

	// oxlint-disable-next-line func-style -- Hoisted render helpers share view state.
	function setActiveTab(tab: DevToolsTab, moveFocus = false): void {
		options.stateManager.setActiveTab(tab);
		if (moveFocus) {
			focusAfterRender(`[data-tab="${tab}"]`);
		}
	}

	// oxlint-disable-next-line func-style -- Shared by initial render and subscriptions.
	function renderPanel(state: DevToolsState): void {
		const sameTab = renderedState?.activeTab === state.activeTab;
		const scrollTop = sameTab
			? (root.querySelector('.c15t-dev-tools__content')?.scrollTop ?? 0)
			: 0;
		const drafts = new Map<string, string>();
		if (
			sameTab &&
			renderedState?.snapshot.overrides === state.snapshot.overrides
		) {
			for (const field of root.querySelectorAll<
				HTMLInputElement | HTMLSelectElement
			>('.c15t-dev-tools__field input, .c15t-dev-tools__field select')) {
				if (field.dataset.focusKey) {
					drafts.set(field.dataset.focusKey, field.value);
				}
			}
		}
		const { activeElement } = document;
		const focusKey =
			activeElement && root.contains(activeElement)
				? activeElement.getAttribute('data-focus-key')
				: null;
		root.replaceChildren();

		const toggle = createButton(
			document,
			state.isOpen ? 'Close c15t DevTools' : 'Open c15t DevTools',
			() => options.stateManager.setOpen(!state.isOpen),
			'primary'
		);
		toggle.classList.add('c15t-dev-tools__toggle');
		toggle.replaceChildren(createLogo(document));
		toggle.setAttribute('aria-label', 'Open c15t DevTools');
		toggle.hidden = state.isOpen;
		toggle.setAttribute('aria-expanded', String(state.isOpen));
		toggle.setAttribute('aria-controls', panelId);
		root.append(toggle);

		const panel = createElement(document, 'section', 'c15t-dev-tools__panel');
		panel.id = panelId;
		panel.hidden = !state.isOpen;
		panel.setAttribute('aria-label', 'c15t consent developer tools');
		const header = createElement(document, 'header', 'c15t-dev-tools__header');
		const title = createElement(document, 'h2', 'c15t-dev-tools__title');
		title.setAttribute('aria-label', 'c15t DevTools');
		title.append(
			createLogo(document),
			createElement(document, 'span', undefined, 'DevTools')
		);
		const close = createButton(document, 'Close c15t DevTools', () => {
			options.stateManager.setOpen(false);
		});
		close.textContent = '×';
		close.setAttribute('aria-label', 'Close c15t DevTools');
		close.classList.add('c15t-dev-tools__close');
		header.append(title, close);
		panel.append(header);

		const tabList = createElement(document, 'div', 'c15t-dev-tools__tabs');
		tabList.setAttribute('role', 'tablist');
		tabList.setAttribute('aria-label', 'DevTools views');
		TABS.forEach((tab, index) => {
			const tabButton = createButton(document, tab.label, () => {
				setActiveTab(tab.id);
			});
			tabButton.dataset.tab = tab.id;
			tabButton.id = `${viewId}-tab-${tab.id}`;
			tabButton.setAttribute('role', 'tab');
			tabButton.setAttribute(
				'aria-selected',
				String(tab.id === state.activeTab)
			);
			tabButton.setAttribute('aria-controls', `${viewId}-tabpanel`);
			tabButton.tabIndex = tab.id === state.activeTab ? 0 : -1;
			tabButton.addEventListener('keydown', (event) => {
				let nextIndex: number | null = null;
				if (event.key === 'ArrowRight') {
					nextIndex = (index + 1) % TABS.length;
				} else if (event.key === 'ArrowLeft') {
					nextIndex = (index - 1 + TABS.length) % TABS.length;
				} else if (event.key === 'Home') {
					nextIndex = 0;
				} else if (event.key === 'End') {
					nextIndex = TABS.length - 1;
				}
				if (nextIndex === null) {
					return;
				}
				event.preventDefault();
				const nextTab = TABS[nextIndex];
				if (nextTab) {
					setActiveTab(nextTab.id, true);
				}
			});
			tabList.append(tabButton);
		});
		panel.append(tabList);

		const content = createElement(document, 'div', 'c15t-dev-tools__content');
		content.id = `${viewId}-tabpanel`;
		content.setAttribute('role', 'tabpanel');
		content.setAttribute('aria-labelledby', `${viewId}-tab-${state.activeTab}`);
		content.tabIndex = 0;
		if (state.isOpen) {
			renderTab(
				document,
				content,
				state,
				options.kernel,
				options.stateManager.clearEvents,
				viewState,
				options.getConsentCategories,
				run
			);
			appendActionFeedback(document, panel, content, action);
		}
		panel.append(content);
		root.append(panel);
		for (const field of root.querySelectorAll<
			HTMLInputElement | HTMLSelectElement
		>('.c15t-dev-tools__field input, .c15t-dev-tools__field select')) {
			const draft = field.dataset.focusKey
				? drafts.get(field.dataset.focusKey)
				: undefined;
			if (draft !== undefined) {
				field.value = draft;
			}
		}
		content.scrollTop = scrollTop;
		renderedState = state;

		if (state.isOpen !== wasOpen) {
			focusAfterRender(
				state.isOpen
					? `[data-tab="${state.activeTab}"]`
					: '.c15t-dev-tools__toggle'
			);
			wasOpen = state.isOpen;
		} else if (focusKey) {
			restoreFocusAfterRender(focusKey);
		}
	}

	// oxlint-disable-next-line func-style -- Hoisted render helpers share view state.
	function render(): void {
		const state = options.stateManager.getState();
		if (!state.isOpen && renderedState && !renderedState.isOpen) {
			renderedState = state;
			return;
		}
		renderPanel(state);
	}

	const unsubscribe = options.stateManager.subscribe(render);
	const unsubscribeIAB = subscribeIABControls(options.kernel, render);
	(options.container ?? document.body).append(root);
	render();

	return {
		destroy() {
			destroyed = true;
			unsubscribeIAB();
			unsubscribe();
			root.remove();
		},
		element: root,
	};
}
