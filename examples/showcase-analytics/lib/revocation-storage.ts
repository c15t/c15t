const STORAGE_KEY = 'northwind:consent-revoked';

/** Called by c15t right before it reloads the page after a revocation. */
export const rememberRevocation = () => {
	try {
		sessionStorage.setItem(STORAGE_KEY, '1');
	} catch {
		// The optional notice must not interrupt the revocation reload.
	}
};

/** Consume the optional notice left before the previous page reloaded. */
export const consumeRevocationNotice = () => {
	try {
		const pending = sessionStorage.getItem(STORAGE_KEY) !== null;
		sessionStorage.removeItem(STORAGE_KEY);
		return pending;
	} catch {
		return false;
	}
};
