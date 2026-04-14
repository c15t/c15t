export const DEMO_LEGAL_DOCUMENT_SNAPSHOT = {
	signingKey: 'demo-legal-document-snapshot-signing-key',
	tenantId: 'ins_1',
	issuer: 'c15t-demo',
	ttlSeconds: 1800,
} as const;

export const DEMO_LEGAL_DOCUMENT_SNAPSHOT_AUDIENCE = `c15t-legal-document-snapshot:${DEMO_LEGAL_DOCUMENT_SNAPSHOT.tenantId}`;
