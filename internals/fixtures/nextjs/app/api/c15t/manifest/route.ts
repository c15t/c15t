import { createConsentRoute } from 'c15t/next/api';

import consentConfig from '@/c15t.config';

export const { GET } = createConsentRoute({ config: consentConfig });
