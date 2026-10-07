'use client';

import { useSyncExternalStore } from 'react';

import styles from './revocation-notice.module.css';

const STORAGE_KEY = 'northwind:consent-revoked';

/** Called by c15t right before it reloads the page after a revocation. */
export const rememberRevocation = () => {
	sessionStorage.setItem(STORAGE_KEY, '1');
};

// Read the note once per page load, so a later reload doesn't show it again.
let pending: boolean | undefined;
const listeners = new Set<() => void>();

const readPending = () => {
	if (pending === undefined) {
		pending = sessionStorage.getItem(STORAGE_KEY) !== null;
		sessionStorage.removeItem(STORAGE_KEY);
	}
	return pending;
};

const subscribe = (listener: () => void) => {
	listeners.add(listener);
	return () => listeners.delete(listener);
};

const dismiss = () => {
	pending = false;
	for (const listener of listeners) {
		listener();
	}
};

export const RevocationNotice = () => {
	const visible = useSyncExternalStore(subscribe, readPending, () => false);

	if (!visible) {
		return null;
	}

	return (
		<output className={styles.notice}>
			<p>
				<strong>Privacy settings saved.</strong> We reloaded the page so
				anything you turned off has stopped running.
			</p>
			<button
				type="button"
				className={styles.dismiss}
				onClick={dismiss}
			>
				Dismiss
			</button>
		</output>
	);
};
