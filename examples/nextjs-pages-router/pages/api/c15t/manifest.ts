// #region docs:pages-manifest-route
import { createPagesApiHandlers } from 'c15t/next/pages';

import { consentConfig } from '@/c15t.config';

export default createPagesApiHandlers(consentConfig).manifest;
// #endregion docs:pages-manifest-route
