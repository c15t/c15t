// #region docs:pages-manifest-route
import { createPagesApiHandlers } from 'c15t/next/pages';

import { consentOptions } from '@/c15t.server';

export default createPagesApiHandlers(consentOptions).manifest;
// #endregion docs:pages-manifest-route
