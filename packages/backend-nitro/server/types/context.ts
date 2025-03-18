export interface C15TContext {
	// Core properties
	baseURL: string;
	secret: string;
	logger: ReturnType<typeof logger>;
	// Add other properties as needed from the original implementation
}
