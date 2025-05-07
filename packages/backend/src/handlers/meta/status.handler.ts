import { os } from '~/contracts';
import { version } from '../../../package.json';

// Use os.meta.status.handler to connect to the contract
export const statusHandler = os.meta.status.handler(() => {
	return {
		status: 'ok' as const, // Explicitly type as literal
		version,
		timestamp: new Date(),
		storage: {
			type: 'MemoryAdapter',
			available: true,
		},
	};
});
