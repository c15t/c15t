import { getIABControls } from '@c15t/core';
import type { ConsentKernel, KernelIABControls } from '@c15t/core';

import type { RunAction } from './action-runner';
import {
	createButton,
	createCodeBlock,
	createElement,
	createSection,
	createTextField,
} from './elements';

export interface IABPanelState {
	search: string;
	group: 'vendors' | 'purposes' | 'features';
	page: number;
	rawOpen: boolean;
}

interface Choice {
	id: string | number;
	name: string;
	custom?: boolean;
	consent?: boolean;
	legitimateInterest?: boolean;
	setConsent: (controls: KernelIABControls, value: boolean) => void;
	setLegitimateInterest?: (controls: KernelIABControls, value: boolean) => void;
}

const PAGE_SIZE = 20;

const createSwitch = (
	document: Document,
	label: string,
	key: string,
	checked: boolean,
	disabled: boolean,
	onChange: (value: boolean) => void
): HTMLElement => {
	const row = createElement(document, 'label', 'c15t-dev-tools__check');
	const input = createElement(document, 'input');
	input.type = 'checkbox';
	input.setAttribute('role', 'switch');
	input.setAttribute('aria-label', label);
	input.dataset.focusKey = key;
	input.checked = checked;
	input.disabled = disabled;
	input.addEventListener('change', () => onChange(input.checked));
	row.append(
		createElement(document, 'span', undefined, label.split(':')[0]),
		input
	);
	return row;
};

export const renderIABPanel = (
	document: Document,
	container: HTMLElement,
	kernel: ConsentKernel,
	state: IABPanelState,
	run: RunAction
): void => {
	const snapshot = kernel.getSnapshot();
	const { iab } = snapshot;
	if (!iab?.enabled || !iab.gvl || snapshot.model !== 'iab') {
		container.append(
			createSection(
				document,
				'IAB consent',
				iab?.enabled
					? 'IAB controls are available when the current policy uses IAB and its vendor list has loaded.'
					: 'IAB is not enabled for this provider. Configure IAB and refresh consent data to inspect it.'
			)
		);
		return;
	}
	const controls = getIABControls(kernel);
	const summary = createSection(
		document,
		'IAB consent',
		'Edits apply immediately to script gating. Save IAB consent to generate a fresh TC string and record these choices.'
	);
	if (!controls) {
		summary.append(
			createElement(
				document,
				'p',
				'c15t-dev-tools__muted',
				'Read-only: waiting for this provider’s IAB module.'
			)
		);
	}
	const actions = createElement(document, 'div', 'c15t-dev-tools__actions');
	const save = createButton(
		document,
		'Save IAB consent',
		() => {
			if (controls) {
				run('Saving IAB consent…', () => controls.save(), 'IAB consent saved.');
			}
		},
		'primary'
	);
	const accept = createButton(document, 'Accept all IAB', () =>
		controls?.acceptAll()
	);
	const reject = createButton(document, 'Reject all IAB', () =>
		controls?.rejectAll()
	);
	for (const button of [save, accept, reject]) {
		button.disabled = !controls;
	}
	actions.append(save, accept, reject);
	summary.append(actions);
	container.append(summary);

	const filter = createTextField(
		document,
		'Search IAB names or IDs',
		state.search
	);
	filter.input.type = 'search';
	const groupField = createElement(document, 'label', 'c15t-dev-tools__field');
	const group = createElement(document, 'select');
	group.dataset.focusKey = 'iab:group';
	for (const [value, label] of [
		['vendors', 'Vendors'],
		['purposes', 'Purposes'],
		['features', 'Special features'],
	] as const) {
		const option = createElement(document, 'option', undefined, label);
		option.value = value;
		group.append(option);
	}
	group.value = state.group;
	groupField.append(
		createElement(document, 'span', undefined, 'IAB view'),
		group
	);
	const list = createElement(document, 'div', 'c15t-dev-tools__iab-list');
	const selections = createSection(document, 'Choices');
	selections.append(groupField, filter.field, list);
	container.append(selections);

	const vendors = [
		...Object.values(iab.gvl.vendors).map((vendor) => ({
			...vendor,
			custom: false,
		})),
		...iab.customVendors.map((vendor) => ({ ...vendor, custom: true })),
	];
	const choicesForGroup = (): Choice[] => {
		if (state.group === 'vendors') {
			return vendors.map((vendor) => ({
				consent: vendor.purposes.length
					? (iab.vendorConsents[String(vendor.id)] ?? false)
					: undefined,
				custom: vendor.custom,
				id: vendor.id,
				legitimateInterest: vendor.legIntPurposes?.length
					? (iab.vendorLegitimateInterests[String(vendor.id)] ?? false)
					: undefined,
				name: vendor.name,
				setConsent: (api, value) => api.setVendorConsent(vendor.id, value),
				setLegitimateInterest: (api, value) =>
					api.setVendorLegitimateInterest(vendor.id, value),
			}));
		}
		if (state.group === 'features') {
			return Object.values(iab.gvl?.specialFeatures ?? {}).map((feature) => ({
				consent: iab.specialFeatureOptIns[feature.id] ?? false,
				id: feature.id,
				name: feature.name,
				setConsent: (api, value) =>
					api.setSpecialFeatureOptIn(feature.id, value),
			}));
		}
		return Object.values(iab.gvl?.purposes ?? {}).map((purpose) => ({
			consent: iab.purposeConsents[purpose.id] ?? false,
			id: purpose.id,
			legitimateInterest: vendors.some((vendor) =>
				vendor.legIntPurposes?.includes(purpose.id)
			)
				? (iab.purposeLegitimateInterests[purpose.id] ?? false)
				: undefined,
			name: purpose.name,
			setConsent: (api, value) => api.setPurposeConsent(purpose.id, value),
			setLegitimateInterest: (api, value) =>
				api.setPurposeLegitimateInterest(purpose.id, value),
		}));
	};
	const renderList = (): void => {
		list.replaceChildren();
		const query = state.search.trim().toLowerCase();
		const choices = choicesForGroup().filter((choice) =>
			`${choice.id} ${choice.name} ${choice.custom ? 'custom' : ''}`
				.toLowerCase()
				.includes(query)
		);
		state.page = Math.max(
			0,
			Math.min(state.page, Math.ceil(choices.length / PAGE_SIZE) - 1)
		);
		const offset = state.page * PAGE_SIZE;
		if (!choices.length) {
			list.append(
				createElement(
					document,
					'p',
					'c15t-dev-tools__empty',
					query
						? 'No IAB choices match your search.'
						: 'No choices are configured in this group.'
				)
			);
			return;
		}
		list.append(
			createElement(
				document,
				'p',
				'c15t-dev-tools__muted',
				`${choices.filter((choice) => choice.consent).length} of ${choices.length} matching choices enabled`
			)
		);
		for (const choice of choices.slice(offset, offset + PAGE_SIZE)) {
			const item = createElement(document, 'div', 'c15t-dev-tools__iab-choice');
			item.append(
				createElement(
					document,
					'strong',
					undefined,
					`${choice.name} · ${choice.id}`
				)
			);
			if (choice.custom) {
				item.append(
					createElement(
						document,
						'span',
						'c15t-dev-tools__badge',
						'Custom vendor'
					)
				);
			}
			const name = state.group === 'features' ? 'Opt in' : 'Consent';
			if (choice.consent !== undefined) {
				item.append(
					createSwitch(
						document,
						`${name}: ${choice.name}`,
						`iab:${state.group}:${choice.id}:consent`,
						choice.consent,
						!controls,
						(value) => {
							if (controls) {
								choice.setConsent(controls, value);
							}
						}
					)
				);
			}
			if (choice.legitimateInterest !== undefined) {
				item.append(
					createSwitch(
						document,
						`Legitimate interest: ${choice.name}`,
						`iab:${state.group}:${choice.id}:li`,
						choice.legitimateInterest,
						!controls,
						(value) => {
							if (controls) {
								choice.setLegitimateInterest?.(controls, value);
							}
						}
					)
				);
			}
			list.append(item);
		}
		if (choices.length > PAGE_SIZE) {
			const pagination = createElement(
				document,
				'div',
				'c15t-dev-tools__actions'
			);
			const previous = createButton(document, 'Previous IAB page', () => {
				state.page -= 1;
				renderList();
			});
			const next = createButton(document, 'Next IAB page', () => {
				state.page += 1;
				renderList();
			});
			previous.disabled = state.page === 0;
			next.disabled = offset + PAGE_SIZE >= choices.length;
			pagination.append(
				previous,
				createElement(
					document,
					'span',
					undefined,
					`Page ${state.page + 1} of ${Math.ceil(choices.length / PAGE_SIZE)}`
				),
				next
			);
			list.append(pagination);
		}
	};
	filter.input.addEventListener('input', () => {
		state.search = filter.input.value;
		state.page = 0;
		renderList();
	});
	group.addEventListener('change', () => {
		if (
			group.value === 'vendors' ||
			group.value === 'purposes' ||
			group.value === 'features'
		) {
			state.group = group.value;
		}
		state.page = 0;
		renderList();
	});
	renderList();

	const tc = createSection(document, 'TC string');
	tc.append(
		createElement(
			document,
			'p',
			'c15t-dev-tools__muted',
			'Last generated string. Unsaved edits are not reflected here.'
		)
	);
	if (iab.tcString) {
		const { tcString } = iab;
		tc.append(
			createCodeBlock(document, tcString),
			createButton(document, 'Copy TC string', () => {
				run(
					'Copying TC string…',
					async () => {
						const clipboard = document.defaultView?.navigator.clipboard;
						if (!clipboard) {
							throw new Error(
								'Clipboard is unavailable in this browser. Select and copy the TC string.'
							);
						}
						await clipboard.writeText(tcString);
					},
					'TC string copied.'
				);
			})
		);
	} else {
		tc.append(
			createElement(
				document,
				'p',
				'c15t-dev-tools__empty',
				'No TC string generated yet. Save IAB consent to generate one.'
			)
		);
	}
	const raw = createElement(document, 'details', 'c15t-dev-tools__script');
	const rawContent = createElement(document, 'div');
	const updateRaw = (): void => {
		rawContent.replaceChildren(
			...(raw.open ? [createCodeBlock(document, iab)] : [])
		);
	};
	raw.open = state.rawOpen;
	raw.addEventListener('toggle', () => {
		if (raw.isConnected) {
			state.rawOpen = raw.open;
			updateRaw();
		}
	});
	raw.append(
		createElement(
			document,
			'summary',
			'c15t-dev-tools__script-summary',
			'Raw IAB state'
		),
		rawContent
	);
	updateRaw();
	container.append(tc, raw);
};
