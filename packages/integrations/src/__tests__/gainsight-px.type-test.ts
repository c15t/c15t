/**
 * Type-only checks for the public Gainsight PX options. Compiled by
 * `check-types`; not collected by Vitest.
 */
import { gainsightPx } from '../vendors/analytics/gainsight-px';

gainsightPx({ productKey: 'AP-KEY-2' });
gainsightPx({ productKey: 'AP-KEY-2', user: { id: 'user' } });
gainsightPx({
	account: { id: 'account' },
	productKey: 'AP-KEY-2',
	user: { id: 'user' },
});
// @ts-expect-error PX sends an account only with a user identify call.
gainsightPx({ account: { id: 'account' }, productKey: 'AP-KEY-2' });
