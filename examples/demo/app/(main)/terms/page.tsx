import { TermsDemo } from '../../../components/terms/terms-demo';
import { getDemoTermsRelease } from '../../../lib/demo-c15t-instance';

export default function TermsPage() {
	const policy = getDemoTermsRelease();

	return (
		<TermsDemo
			policy={{
				title: policy.title,
				version: policy.version,
				hash: policy.hash,
				effectiveDate: policy.effectiveDate,
			}}
		/>
	);
}
