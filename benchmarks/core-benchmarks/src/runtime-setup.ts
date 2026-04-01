function createMockElement() {
	return {
		setAttribute: () => {},
		getAttribute: () => null,
		appendChild: () => {},
		removeChild: () => {},
		remove: () => {},
		cloneNode: () => createMockElement(),
		addEventListener: () => {},
		removeEventListener: () => {},
		dispatchEvent: () => true,
		querySelector: () => null,
		querySelectorAll: () => [],
		parentNode: null,
		textContent: '',
		src: '',
		async: true,
		style: {},
	} as unknown as HTMLElement;
}

export function ensureBenchmarkDom(): void {
	if (typeof globalThis.window === 'undefined') {
		globalThis.window = globalThis as unknown as Window & typeof globalThis;
	}

	if (typeof globalThis.document === 'undefined') {
		const element = createMockElement();
		globalThis.document = {
			createElement: () => createMockElement(),
			head: element,
			body: element,
			getElementById: () => null,
			querySelector: () => null,
			querySelectorAll: () => [],
			cookie: '',
		} as unknown as Document;
	}

	if (typeof globalThis.localStorage === 'undefined') {
		const store: Record<string, string> = {};
		globalThis.localStorage = {
			getItem: (key: string) => store[key] ?? null,
			setItem: (key: string, value: string) => {
				store[key] = value;
			},
			removeItem: (key: string) => {
				delete store[key];
			},
			clear: () => {
				for (const key of Object.keys(store)) {
					delete store[key];
				}
			},
			key: (index: number) => Object.keys(store)[index] ?? null,
			get length() {
				return Object.keys(store).length;
			},
		} as Storage;
	}

	if (typeof globalThis.MutationObserver === 'undefined') {
		globalThis.MutationObserver = class MutationObserver {
			constructor(_callback: MutationCallback) {}
			disconnect() {}
			observe(_target: Node, _options?: MutationObserverInit) {}
			takeRecords(): MutationRecord[] {
				return [];
			}
		} as unknown as typeof MutationObserver;
	}

	if (!globalThis.window.location) {
		globalThis.window.location = {
			hostname: 'bench.local',
			reload: () => {},
		} as Location;
	}

	if (typeof globalThis.fetch === 'undefined') {
		globalThis.fetch = (async () =>
			new Response(JSON.stringify({ ok: true }), {
				status: 200,
				headers: {
					'Content-Type': 'application/json',
				},
			})) as typeof fetch;
	}
}
