/**
 * One page of the cross-tab storage test: a consent client with default
 * persistence, plus a log of what its subscribers saw.
 */
import { createScriptTagConsentClient as createConsentClient } from '../../script-tag-client';
import type { ConsentClient } from '../../types';

/** What the test reads from each page. */
export interface StorageSyncPage {
	client: ConsentClient;
	/** `measurement` permission at every subscriber notification. */
	notifications: boolean[];
	ready: Promise<unknown>;
	/**
	 * Record only the given categories. The input is rebuilt in this page's
	 * realm: the kernel rejects an object created by the test's realm.
	 */
	recordOnly: (values: Record<string, boolean>) => Promise<unknown>;
}

const client = createConsentClient({
	consentCategories: ['necessary', 'measurement', 'marketing'],
	mode: 'offline',
	overrides: { country: 'DE' },
	ui: false,
});
const notifications: boolean[] = [];
client.subscribe((snapshot) => {
	notifications.push(snapshot.effectivePermissions.measurement);
});
client.start();

const page: StorageSyncPage = {
	client,
	notifications,
	ready: client.ready(),
	recordOnly: (values) =>
		client.kernel.commands.save(Object.fromEntries(Object.entries(values))),
};
Object.assign(window, { c15tStorageSync: page });
