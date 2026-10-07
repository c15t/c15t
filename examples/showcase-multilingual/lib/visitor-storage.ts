// Remembered for the tab, so the preview survives a reload or a language
// switch the way a real visitor's location would.
const STORAGE_KEY = 'northwind-preview-visitor';

export const readPreviewVisitor = () => {
	try {
		return sessionStorage.getItem(STORAGE_KEY);
	} catch {
		return null;
	}
};

export const rememberPreviewVisitor = (key: string) => {
	try {
		sessionStorage.setItem(STORAGE_KEY, key);
	} catch {
		// Remembering the selection is optional when storage is unavailable.
	}
};
