import { os } from '~/contracts';
import type { C15TContext } from '~/types';
import { version } from '../../../package.json';

// Use os.meta.status.handler to connect to the contract
export const statusHandler = os.meta.status.handler(({ context }) => {
	const typedContext = context as C15TContext;

	return {
		status: 'ok' as const, // Explicitly type as literal
		version,
		timestamp: new Date(),
		storage: {
			type: typedContext.adapter?.id ?? 'MemoryAdapter',
			available: !!typedContext.adapter,
		},
	};
});
