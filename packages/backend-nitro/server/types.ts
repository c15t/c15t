import { logger } from './utils/logger';

export interface C15TOptions {
	baseURL?: string;
	secret: string;
	logger: ReturnType<typeof logger>;
}

export interface C15TContext {
	baseURL: string;
	secret: string;
	logger: ReturnType<typeof logger>;
}
