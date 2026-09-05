declare module 'vitest' {
	export interface ProvidedContext {
		compatBaseURL: string;
		compatAppDir: string;
	}
}

export {};
