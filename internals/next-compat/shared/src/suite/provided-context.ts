declare module 'vitest' {
	export interface ProvidedContext {
		compatBaseURL: string;
		compatAppDir: string;
		/**
		 * Origin of the backend stub when it runs outside the app (static
		 * export cells). Absent when the stub is mounted inside the app.
		 */
		compatBackendURL?: string;
	}
}

export {};
