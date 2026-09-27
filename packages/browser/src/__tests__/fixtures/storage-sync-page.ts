/**
 * One page of the cross-tab storage test: a consent client with default
 * persistence, plus a log of what its subscribers saw.
 */
import { createConsentClient } from '../../client';
import type { ConsentClient } from '../../types';

/** What the test reads from each page. */
export interface StorageSyncPage {
	client: ConsentClient;
	/** `measurement` permission at every subscriber notification. */
	notifications: boolean[];
	ready: Promise<unknown>;
}

const client = createConsentClient({
	consentCategories: ['necessary', 'measurement'],
	mode: 'offline',
	overrides: { country: 'DE' },
	ui: false,
});
const notifications: boolean[] = [];
client.subscribe((snapshot) => {
	notifications.push(snapshot.effectivePermissions.measurement);
});
client.start();

const page: StorageSyncPage = { client, notifications, ready: client.ready() };
Object.assign(window, { c15tStorageSync: page });
