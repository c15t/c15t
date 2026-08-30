import type {
	ConsentKernel,
	ConsentSnapshot,
	ConsentState,
	KernelOverrides,
} from '@c15t/core/v3';
import { CONSENT_CATEGORIES } from '@c15t/core/v3';

import type {
	DevToolsPosition,
	DevToolsState,
	DevToolsTab,
	StateManager,
} from './state-manager';

const TABS: readonly { id: DevToolsTab; label: string }[] = [
	{ id: 'consents', label: 'Consents' },
	{ id: 'location', label: 'Location' },
	{ id: 'policy', label: 'Policy' },
	{ id: 'iab', label: 'IAB' },
	{ id: 'events', label: 'Events' },
	{ id: 'actions', label: 'Actions' },
];

let nextViewId = 0;

export interface DevToolsView {
	element: HTMLElement | null;
	destroy: () => void;
}

interface ViewOptions {
	kernel: ConsentKernel;
	stateManager: StateManager;
	container?: HTMLElement;
}

// oxlint-disable-next-line func-style -- Hoisted DOM helpers keep render functions readable.
function createElement<K extends keyof HTMLElementTagNameMap>(
	document: Document,
	tag: K,
	className?: string,
	text?: string
): HTMLElementTagNameMap[K] {
	const element = document.createElement(tag);
	if (className) {
		element.className = className;
	}
	if (text !== undefined) {
		element.textContent = text;
	}
	return element;
}

// oxlint-disable-next-line func-style -- Hoisted DOM helpers keep render functions readable.
function createButton(
	document: Document,
	label: string,
	onClick: () => void,
	variant: 'primary' | 'secondary' | 'danger' = 'secondary'
): HTMLButtonElement {
	const button = createElement(
		document,
		'button',
		`c15t-dev-tools__button c15t-dev-tools__button--${variant}`,
		label
	);
	button.type = 'button';
	button.dataset.focusKey = `button:${label}`;
	button.addEventListener('click', onClick);
	return button;
}

// oxlint-disable-next-line func-style -- Hoisted DOM helpers keep render functions readable.
function createSection(
	document: Document,
	title: string,
	description?: string
): HTMLElement {
	const section = createElement(document, 'section', 'c15t-dev-tools__section');
	section.append(createElement(document, 'h3', undefined, title));
	if (description) {
		section.append(
			createElement(document, 'p', 'c15t-dev-tools__muted', description)
		);
	}
	return section;
}

// oxlint-disable-next-line func-style -- Hoisted DOM helpers keep render functions readable.
function createCodeBlock(document: Document, value: unknown): HTMLElement {
	const output = createElement(document, 'pre', 'c15t-dev-tools__code');
	output.textContent = JSON.stringify(value, null, 2) ?? 'null';
	return output;
}

// oxlint-disable-next-line func-style -- Hoisted DOM helpers keep render functions readable.
function createStat(
	document: Document,
	label: string,
	value: string
): HTMLElement {
	const row = createElement(document, 'div', 'c15t-dev-tools__stat');
	row.append(
		createElement(document, 'dt', undefined, label),
		createElement(document, 'dd', undefined, value)
	);
	return row;
}

// oxlint-disable-next-line func-style -- Hoisted render functions keep tab dispatch compact.
function renderConsents(
	document: Document,
	container: HTMLElement,
	kernel: ConsentKernel,
	snapshot: ConsentSnapshot
): void {
	const section = createSection(
		document,
		'Consent categories',
		'Toggles update the kernel immediately. Save to run the configured transport.'
	);
	const list = createElement(document, 'div', 'c15t-dev-tools__control-list');

	for (const name of CONSENT_CATEGORIES) {
		const enabled = snapshot.consents[name];
		const label = createElement(document, 'label', 'c15t-dev-tools__check');
		const input = createElement(document, 'input');
		input.type = 'checkbox';
		input.checked = enabled;
		input.disabled = name === 'necessary';
		input.dataset.focusKey = `consent:${name}`;
		input.addEventListener('change', () => {
			const patch: Partial<ConsentState> = {};
			patch[name] = input.checked;
			kernel.set.consent(patch);
		});
		label.append(input, createElement(document, 'span', undefined, name));
		list.append(label);
	}

	const actions = createElement(document, 'div', 'c15t-dev-tools__actions');
	actions.append(
		createButton(
			document,
			'Save current',
			() => {
				void kernel.commands.save();
			},
			'primary'
		),
		createButton(document, 'Accept all', () => {
			void kernel.commands.save('all');
		}),
		createButton(document, 'Reject optional', () => {
			void kernel.commands.save('none');
		})
	);
	section.append(list, actions);
	container.append(section);
}

// oxlint-disable-next-line func-style -- Hoisted DOM helpers keep render functions readable.
function createTextField(
	document: Document,
	labelText: string,
	value: string
): { field: HTMLElement; input: HTMLInputElement } {
	const field = createElement(document, 'label', 'c15t-dev-tools__field');
	field.append(createElement(document, 'span', undefined, labelText));
	const input = createElement(document, 'input');
	input.type = 'text';
	input.value = value;
	input.autocomplete = 'off';
	input.spellcheck = false;
	input.dataset.focusKey = `field:${labelText}`;
	field.append(input);
	return { field, input };
}

// oxlint-disable-next-line func-style -- Hoisted render functions keep tab dispatch compact.
function renderLocation(
	document: Document,
	container: HTMLElement,
	kernel: ConsentKernel,
	snapshot: ConsentSnapshot
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
		'Apply test inputs, then rerun initialization against the active transport.'
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
			void kernel.commands.init();
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
		void kernel.commands.init();
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
function renderIab(
	document: Document,
	container: HTMLElement,
	snapshot: ConsentSnapshot
): void {
	const section = createSection(
		document,
		'IAB state',
		'This view is read-only. The active IAB module remains the only writer.'
	);
	section.append(
		snapshot.iab
			? createCodeBlock(document, snapshot.iab)
			: createElement(
					document,
					'p',
					'c15t-dev-tools__empty',
					'IAB mode is not active for this kernel.'
				)
	);
	container.append(section);
}

// oxlint-disable-next-line func-style -- Hoisted render functions keep tab dispatch compact.
function renderEvents(
	document: Document,
	container: HTMLElement,
	state: DevToolsState,
	clearEvents: () => void
): void {
	const section = createSection(document, 'Kernel events');
	section.append(createButton(document, 'Clear events', clearEvents, 'danger'));
	if (state.events.length === 0) {
		section.append(
			createElement(
				document,
				'p',
				'c15t-dev-tools__empty',
				'Kernel events will appear here as they happen.'
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
	kernel: ConsentKernel
): void {
	const section = createSection(
		document,
		'Kernel actions',
		'Only commands and synchronous UI setters exposed by the kernel are available.'
	);
	const actions = createElement(document, 'div', 'c15t-dev-tools__action-grid');
	actions.append(
		createButton(
			document,
			'Refresh initialization',
			() => {
				void kernel.commands.init();
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
	clearEvents: () => void
): void {
	// oxlint-disable-next-line default-case -- DevToolsTab is handled exhaustively.
	switch (state.activeTab) {
		case 'consents':
			renderConsents(document, container, kernel, state.snapshot);
			break;
		case 'location':
			renderLocation(document, container, kernel, state.snapshot);
			break;
		case 'policy':
			renderPolicy(document, container, state.snapshot);
			break;
		case 'iab':
			renderIab(document, container, state.snapshot);
			break;
		case 'events':
			renderEvents(document, container, state, clearEvents);
			break;
		case 'actions':
			renderActions(document, container, kernel);
			break;
	}
}

// oxlint-disable-next-line func-style -- Named helpers aid stack traces.
function positionClass(position: DevToolsPosition): string {
	return `c15t-dev-tools--${position}`;
}

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
	let wasOpen = options.stateManager.getState().isOpen;

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
					candidate.focus();
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

	// oxlint-disable-next-line func-style -- Hoisted render helpers share view state.
	function render(): void {
		const state = options.stateManager.getState();
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
		toggle.setAttribute('aria-expanded', String(state.isOpen));
		toggle.setAttribute('aria-controls', panelId);
		root.append(toggle);

		const panel = createElement(document, 'section', 'c15t-dev-tools__panel');
		panel.id = panelId;
		panel.hidden = !state.isOpen;
		panel.setAttribute('aria-label', 'c15t consent developer tools');
		panel.append(
			createElement(document, 'h2', 'c15t-dev-tools__title', 'Consent DevTools')
		);

		const tabList = createElement(document, 'div', 'c15t-dev-tools__tabs');
		tabList.setAttribute('role', 'tablist');
		tabList.setAttribute('aria-label', 'DevTools views');
		TABS.forEach((tab, index) => {
			const tabButton = createButton(document, tab.label, () => {
				setActiveTab(tab.id);
			});
			tabButton.dataset.tab = tab.id;
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
		content.tabIndex = 0;
		renderTab(
			document,
			content,
			state,
			options.kernel,
			options.stateManager.clearEvents
		);
		panel.append(content);
		root.append(panel);

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

	const unsubscribe = options.stateManager.subscribe(render);
	(options.container ?? document.body).append(root);
	render();

	return {
		destroy() {
			unsubscribe();
			root.remove();
		},
		element: root,
	};
}
