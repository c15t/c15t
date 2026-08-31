function createMockElement() {
	return {
		setAttribute: () => {
			/* empty */
		},
		getAttribute: () => null,
		appendChild: () => {
			/* empty */
		},
		removeChild: () => {
			/* empty */
		},
		remove: () => {
			/* empty */
		},
		cloneNode: () => createMockElement(),
		addEventListener: () => {
			/* empty */
		},
		removeEventListener: () => {
			/* empty */
		},
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
				Reflect.deleteProperty(store, key);
			},
			clear: () => {
				for (const key of Object.keys(store)) {
					Reflect.deleteProperty(store, key);
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
			// oxlint-disable-next-line class-methods-use-this -- Preserve declaration order, interface shape, and public compatibility.
			disconnect() {
				/* empty */
			}
			// oxlint-disable-next-line class-methods-use-this -- Preserve declaration order, interface shape, and public compatibility.
			observe(_target: Node, _options?: MutationObserverInit) {
				/* empty */
			}
			// oxlint-disable-next-line class-methods-use-this -- Preserve declaration order, interface shape, and public compatibility.
			takeRecords(): MutationRecord[] {
				return [];
			}
		} as unknown as typeof MutationObserver;
	}

	if (!globalThis.window.location) {
		globalThis.window.location = {
			hostname: 'bench.local',
			reload: () => {
				/* empty */
			},
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
