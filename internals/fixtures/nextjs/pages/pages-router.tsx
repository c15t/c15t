import { withConsentProps } from 'c15t/next/pages';

import consentConfig from '@/c15t.config';

export const getServerSideProps = withConsentProps(undefined, {
	config: consentConfig,
});

export { default } from '@/components/pages-router-demo';
