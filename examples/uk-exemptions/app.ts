import {
	accept,
	evaluate,
	freshChoices,
	readChoices,
	reject,
	savePreferences,
} from './model';
import type { Region, VisitorChoices } from './model';

const STORAGE_KEY = 'c15t-uk-exemptions-kernel-v2';
const elements = {
	advertisingToggle: document.querySelector('#advertising-toggle'),
	dialog: document.querySelector('#preferences'),
	exemptionCheckbox: document.querySelector('#exemption-enabled'),
	statisticsToggle: document.querySelector('#statistics-toggle'),
};
if (
	!(elements.dialog instanceof HTMLDialogElement) ||
	!(elements.advertisingToggle instanceof HTMLInputElement) ||
	!(elements.statisticsToggle instanceof HTMLInputElement) ||
	!(elements.exemptionCheckbox instanceof HTMLInputElement)
) {
	throw new Error('The demo controls are missing.');
}
const { advertisingToggle, dialog, exemptionCheckbox, statisticsToggle } =
	elements;
let region: Region = 'uk';
let exemptionEnabled = true;
const visits: Record<Region, VisitorChoices> = {
	eu: freshChoices(),
	uk: freshChoices(),
	unknown: freshChoices(),
};
let storageAvailable = true;
let restored = false;
let statisticsEvents = 0;
let advertisingEvents = 0;
let dialogTrigger: HTMLElement | null = null;

const setText = (id: string, value: string) => {
	const element = document.getElementById(id);
	if (element) {
		element.textContent = value;
	}
};

const persist = () => {
	try {
		localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({ exemptionEnabled, region, visits })
		);
		storageAvailable = true;
	} catch {
		storageAvailable = false;
	}
};

try {
	const raw = localStorage.getItem(STORAGE_KEY);
	const saved: unknown = raw ? JSON.parse(raw) : null;
	if (saved !== null && typeof saved === 'object') {
		const savedRegion = 'region' in saved ? saved.region : undefined;
		if (
			savedRegion === 'uk' ||
			savedRegion === 'eu' ||
			savedRegion === 'unknown'
		) {
			region = savedRegion;
		}
		const savedExemption =
			'exemptionEnabled' in saved ? saved.exemptionEnabled : undefined;
		if (typeof savedExemption === 'boolean') {
			exemptionEnabled = savedExemption;
		}
		const savedVisits = 'visits' in saved ? saved.visits : undefined;
		if (typeof savedVisits === 'object' && savedVisits !== null) {
			visits.uk = readChoices('uk' in savedVisits ? savedVisits.uk : null);
			visits.eu = readChoices('eu' in savedVisits ? savedVisits.eu : null);
			visits.unknown = readChoices(
				'unknown' in savedVisits ? savedVisits.unknown : null
			);
			restored = true;
		}
	}
} catch {
	// Invalid saved data is ignored. The demo remains usable without storage.
	storageAvailable = false;
}

const updateStatus = (id: string, permitted: boolean) => {
	const element = document.getElementById(id);
	if (!element) {
		return;
	}
	element.textContent = permitted ? 'Running' : 'Blocked';
	element.dataset.allowed = String(permitted);
};

const statisticsReason = () => {
	const choices = visits[region];
	const permissions = evaluate(choices, region, exemptionEnabled);
	if (choices.statisticsObjected) {
		return 'You turned statistics off. Your refusal is saved.';
	}
	if (permissions.exempt) {
		return 'On under the exemption. No consent was given.';
	}
	if (permissions.statistics) {
		return 'Running because you gave consent.';
	}
	return 'Waiting for consent. The exemption does not apply.';
};

const render = () => {
	const choices = visits[region];
	const permissions = evaluate(choices, region, exemptionEnabled);
	for (const button of document.querySelectorAll<HTMLButtonElement>(
		'[data-region]'
	)) {
		button.setAttribute(
			'aria-pressed',
			String(button.dataset.region === region)
		);
	}
	exemptionCheckbox.checked = exemptionEnabled;
	const banner = document.getElementById('consent-banner');
	if (banner) {
		banner.hidden = !permissions.needsChoice;
	}
	setText(
		'banner-title',
		permissions.exempt
			? 'A choice for advertising'
			: 'Your choice for optional processing'
	);
	setText(
		'banner-copy',
		permissions.exempt
			? 'We use qualifying service statistics to improve this site. You can turn them off in privacy settings. Advertising stays off unless you allow it.'
			: 'Statistics and advertising stay off until you give consent. You can allow them together or choose individually.'
	);
	setText(
		'accept',
		permissions.exempt ? 'Allow advertising' : 'Accept optional processing'
	);
	const explanations: Record<Region, string> = {
		eu: 'EU visitor. This example requires prior consent for both statistics and advertising.',
		uk: exemptionEnabled
			? 'UK visitor. Only the reviewed statistics use qualifies for an exemption.'
			: 'UK visitor. The statistics exemption has been removed; prior consent is now required.',
		unknown:
			'Unknown location. This example uses the strict opt-in fallback for both purposes.',
	};
	setText('region-explanation', explanations[region]);
	updateStatus('statistics-status', permissions.statistics);
	updateStatus('advertising-status', permissions.advertising);
	setText('statistics-reason', statisticsReason());
	let advertisingReason = 'Waiting for your explicit consent.';
	if (choices.advertisingConsent === false) {
		advertisingReason = 'You refused advertising. It stays blocked.';
	} else if (permissions.advertising) {
		advertisingReason = 'Running because you gave consent.';
	}
	setText('advertising-reason', advertisingReason);
	setText(
		'statistics-grant',
		choices.statisticsConsent === true ? 'Explicit consent' : 'None'
	);
	setText(
		'advertising-grant',
		choices.advertisingConsent === true ? 'Explicit consent' : 'None'
	);
	setText('statistics-events', String(statisticsEvents));
	setText('advertising-events', String(advertisingEvents));
	const adSlot = document.getElementById('ad-slot');
	if (adSlot) {
		adSlot.dataset.allowed = String(permissions.advertising);
	}
	setText(
		'ad-label',
		permissions.advertising ? 'Example advertisement' : 'Advertising is blocked'
	);
	setText(
		'ad-copy',
		permissions.advertising
			? 'A slower weekend. Explore the Fieldnotes print edition.'
			: 'An ad appears here only after you give consent.'
	);
	setText(
		'visit-label',
		restored ? 'Preferences restored from this browser' : 'Local demo visit'
	);
	setText(
		'try-copy',
		permissions.exempt
			? 'Allow advertising, then open privacy settings and turn statistics off. Advertising can stay on.'
			: 'Both start blocked. Open privacy settings to allow statistics while leaving advertising off.'
	);
};

const closePreferences = () => {
	dialog.close();
	if (dialogTrigger?.isConnected && !dialogTrigger.closest('[hidden]')) {
		dialogTrigger.focus();
	} else {
		document.getElementById('open-preferences')?.focus();
	}
};

const recordAction = (next: VisitorChoices, message: string) => {
	visits[region] = next;
	persist();
	render();
	setText(
		'feedback',
		storageAvailable
			? message
			: `${message} Browser storage is unavailable, so choices last only for this page.`
	);
};

const openPreferences = (event: Event) => {
	if (event.currentTarget instanceof HTMLElement) {
		dialogTrigger = event.currentTarget;
	}
	const permissions = evaluate(visits[region], region, exemptionEnabled);
	statisticsToggle.checked = permissions.statistics;
	advertisingToggle.checked = permissions.advertising;
	setText(
		'statistics-basis',
		permissions.exempt
			? 'Exempt, with a right to object'
			: 'Requires your consent'
	);
	setText(
		'statistics-description',
		permissions.exempt
			? 'Aggregate information to improve this site. Enabled by default; turn it off to object.'
			: 'Information to improve this site. Starts disabled; turn it on to give consent.'
	);
	dialog.showModal();
};

for (const id of ['open-preferences', 'manage']) {
	document.getElementById(id)?.addEventListener('click', openPreferences);
}
document
	.getElementById('close-preferences')
	?.addEventListener('click', closePreferences);
dialog.addEventListener('cancel', (event) => {
	event.preventDefault();
	closePreferences();
});
document
	.getElementById('preferences-form')
	?.addEventListener('submit', (event) => {
		event.preventDefault();
		recordAction(
			savePreferences(visits[region], region, exemptionEnabled, {
				advertising: advertisingToggle.checked,
				statistics: statisticsToggle.checked,
			}),
			'Privacy settings saved. Visit another article to test what can run.'
		);
		closePreferences();
	});

const rejectOptional = () => {
	recordAction(
		reject(visits[region], region, exemptionEnabled),
		'Optional processing is off. Your refusal will survive a reload.'
	);
	if (dialog.open) {
		closePreferences();
	} else {
		document.getElementById('open-preferences')?.focus();
	}
};
document.getElementById('reject')?.addEventListener('click', rejectOptional);
document
	.getElementById('dialog-reject')
	?.addEventListener('click', rejectOptional);
document.getElementById('accept')?.addEventListener('click', () => {
	const wasExempt = evaluate(visits[region], region, exemptionEnabled).exempt;
	recordAction(
		accept(visits[region], region, exemptionEnabled),
		wasExempt
			? 'Advertising consent saved. The statistics preference was left unchanged.'
			: 'Consent saved for statistics and advertising.'
	);
	document.getElementById('open-preferences')?.focus();
});

const changeRegion = (event: Event) => {
	if (!(event.currentTarget instanceof HTMLButtonElement)) {
		return;
	}
	const nextRegion = event.currentTarget.dataset.region;
	if (nextRegion !== 'uk' && nextRegion !== 'eu' && nextRegion !== 'unknown') {
		return;
	}
	region = nextRegion;
	statisticsEvents = 0;
	advertisingEvents = 0;
	persist();
	render();
	setText(
		'feedback',
		'Location changed. Each location has its own saved visitor choices.'
	);
};
for (const button of document.querySelectorAll<HTMLButtonElement>(
	'[data-region]'
)) {
	button.addEventListener('click', changeRegion);
}
document.getElementById('reset')?.addEventListener('click', () => {
	visits[region] = freshChoices();
	statisticsEvents = 0;
	advertisingEvents = 0;
	restored = false;
	persist();
	render();
	setText(
		'feedback',
		'Fresh visit started for this location. No consent or refusal is recorded.'
	);
});
exemptionCheckbox.addEventListener('change', () => {
	exemptionEnabled = exemptionCheckbox.checked;
	persist();
	render();
	setText(
		'feedback',
		exemptionEnabled
			? 'The UK exemption is available again. Saved refusals still apply.'
			: 'The exemption was removed. It did not create consent; statistics now need an explicit grant.'
	);
});
document.getElementById('page-view')?.addEventListener('click', () => {
	const permissions = evaluate(visits[region], region, exemptionEnabled);
	if (permissions.statistics) {
		statisticsEvents += 1;
	}
	if (permissions.advertising) {
		advertisingEvents += 1;
	}
	render();
	setText(
		'feedback',
		`Article visited. Statistics ${permissions.statistics ? 'ran' : 'blocked'}. Advertising ${permissions.advertising ? 'ran' : 'blocked'}.`
	);
});

render();
document.getElementById('page-view')?.click();
