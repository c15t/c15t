import { TermsDemo } from '../../../components/terms/terms-demo';
import { TermsProvider } from '../../../components/terms/terms-provider';
import { getDemoTermsRelease } from '../../../lib/demo-c15t-instance';

/**
 * Renders the demo-only terms page for the active release returned by
 * `getDemoTermsRelease()`.
 *
 * The page passes the current release metadata into `TermsDemo` so the demo can
 * identify a user and record consent against the current terms version.
 *
 * @returns {JSX.Element} The `/terms` demo page.
 *
 * @example
 * This route is mounted at `/terms` in the demo app and is intended only as an
 * integration example.
 */
const TermsPage = () => {
	const policy = getDemoTermsRelease();

	return (
		<TermsProvider>
			<TermsDemo
				policy={{
					effectiveDate: policy.effectiveDate,
					hash: policy.hash,
					title: policy.title,
					version: policy.version,
				}}
			/>
		</TermsProvider>
	);
};

export default TermsPage;
