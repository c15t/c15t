/**
 * One page of the subject-conflict test: a consent client with default
 * persistence, whose transport answers saves like a backend where another
 * tenant owns some subject ids.
 *
 * The refused ids are read from localStorage on every save, so the test can
 * mark one taken from any page and every page sees it. Loaded with `?hold`,
 * saves are held from the start, including the replay the page runs as it
 * starts.
 */
import { ConsentSaveRejectedError } from '@c15t/core';
import type { ProviderTransportFactory, SavePayload } from '@c15t/core';

import { createConsentClient } from '../../client';
import { offline } from '../../transports/offline';
import type { ConsentClient } from '../../types';

/** Subject ids the fake backend refuses, as a JSON array. */
export const TAKEN_SUBJECTS_KEY = 'c15t-test-taken-subjects';

/** What the test reads from each page. */
export interface SubjectConflictPage {
	client: ConsentClient;
	/** Subject id of every save the fake backend accepted. */
	accepted: string[];
	/** Saves waiting on {@link SubjectConflictPage.release}. */
	held: () => number;
	/** Hold every save until `release`, so pages can be refused together. */
	hold: () => void;
	release: () => void;
	ready: Promise<unknown>;
	/** Fail every save as a network error would, so it is queued. */
	setOffline: (value: boolean) => void;
	/**
	 * Record only the given categories. The input is rebuilt in this page's
	 * realm: the kernel rejects an object created by the test's realm.
	 */
	recordOnly: (values: Record<string, boolean>) => Promise<unknown>;
}

const accepted: string[] = [];
let gate: Promise<void> | null = null;
let openGate: () => void = () => {};
let waiting = 0;
let unreachable = false;

const taken = (): string[] => {
	try {
		return JSON.parse(localStorage.getItem(TAKEN_SUBJECTS_KEY) ?? '[]');
	} catch {
		return [];
	}
};

const save = async (payload: SavePayload) => {
	if (gate) {
		waiting += 1;
		await gate;
		waiting -= 1;
	}
	if (unreachable) {
		throw new Error('offline');
	}
	if (taken().includes(payload.subjectId)) {
		throw new ConsentSaveRejectedError({
			code: 'SUBJECT_CONFLICT',
			message: `subjectId "${payload.subjectId}" already belongs to another tenant`,
			status: 409,
		});
	}
	accepted.push(payload.subjectId);
	return { ok: true as const, subjectId: payload.subjectId };
};

const local = offline();
const mode: ProviderTransportFactory = Object.assign(
	(context: Parameters<ProviderTransportFactory>[0]) => ({
		...local(context),
		save,
	}),
	{ kind: 'custom' as const }
);

const hold = () => {
	gate = new Promise((resolve) => {
		openGate = resolve;
	});
};
if (new URLSearchParams(location.search).has('hold')) {
	hold();
}

const client = createConsentClient({
	consentCategories: ['necessary', 'measurement', 'marketing'],
	mode,
	overrides: { country: 'DE' },
	ui: false,
});
client.start();

const page: SubjectConflictPage = {
	accepted,
	client,
	held: () => waiting,
	hold,
	ready: client.ready(),
	recordOnly: (values) =>
		client.kernel.commands.save(Object.fromEntries(Object.entries(values))),
	release: () => {
		gate = null;
		openGate();
	},
	setOffline: (value) => {
		unreachable = value;
	},
};
Object.assign(window, { c15tSubjectConflict: page });
