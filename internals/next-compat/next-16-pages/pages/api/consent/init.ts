import { COMPAT_CONSENT_CONFIG } from '@c15t/next-compat-shared/config';
import { createPagesApiHandlers } from '@c15t/nextjs/pages';

export const config = { api: { bodyParser: false } };

export default createPagesApiHandlers(COMPAT_CONSENT_CONFIG).init;
