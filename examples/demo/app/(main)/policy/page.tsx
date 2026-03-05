import { PolicyWorkspace } from '../../../components/policy/policy-workspace';

interface PolicyPageProps {
	searchParams: Promise<{
		tab?: string;
	}>;
}

export default async function PolicyPage({ searchParams }: PolicyPageProps) {
	const { tab } = await searchParams;
	const initialTab =
		tab === 'builder' || tab === 'headless' ? tab : 'scenarios';
	return <PolicyWorkspace initialTab={initialTab} />;
}
