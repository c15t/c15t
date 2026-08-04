import { type WriteReplay, writeReplaySchema } from '@c15t/schema';
import { column, idColumn, table } from 'fumadb/schema';

export const writeReplayTable = table('writeReplay', {
	/** Deterministic replay key used for atomic consumption. */
	id: idColumn('id', 'varchar(255)'),
	tenantId: column('tenantId', 'string').nullable(),
	audience: column('audience', 'string'),
	tokenId: column('tokenId', 'string'),
	requestFingerprint: column('requestFingerprint', 'string'),
	expiresAt: column('expiresAt', 'timestamp'),
	createdAt: column('createdAt', 'timestamp').defaultTo$('now'),
});

export { type WriteReplay, writeReplaySchema };
