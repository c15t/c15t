import { HTTPException } from 'hono/http-exception';
import type { AuditLog } from '../schema';
import type { Registry } from './types';
import { generateUniqueId } from './utils/generate-id';

export function auditLogRegistry({
	db,
	ctx,
}: {
	db: Registry['db'];
	ctx?: Partial<Registry['ctx']>;
}) {
	const logger: Registry['ctx']['logger'] =
		(ctx?.logger as Registry['ctx']['logger']) ??
		({
			debug: () => undefined,
			error: () => undefined,
		} as unknown as Registry['ctx']['logger']);

	return {
		createAuditLog: async (
			auditLog: Omit<AuditLog, 'id' | 'createdAt'> & Partial<AuditLog>
		) => {
			logger.debug('Creating audit log', { auditLog });

			const createdLog = await db.create('auditLog', {
				id: await generateUniqueId(db, 'auditLog', ctx),
				createdAt: new Date(),
				...auditLog,
			});

			if (!createdLog) {
				logger.error('Failed to create audit log', {
					auditLog,
				});

				throw new HTTPException(500, {
					message: 'Failed to create audit log',
					cause: { code: 'INTERNAL_SERVER_ERROR' },
				});
			}

			return createdLog;
		},
	};
}
