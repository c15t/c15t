import type { Adapter } from '~/pkgs/db-adapters/types';
import type { createRegistry } from '~/schema/create-registry';
import type { C15TOptions } from '~/types';

interface Context {
	adapter: Adapter;
	trustedOrigins: string[];
	registry: ReturnType<typeof createRegistry>;
}

export interface RouterProps {
	options: C15TOptions;
	context: Context;
}
