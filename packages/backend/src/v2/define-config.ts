import type { DatabaseOptions } from './types';

export interface DatabaseConfig extends DatabaseOptions {}

export const defineConfig = (config: DatabaseConfig) => config;
