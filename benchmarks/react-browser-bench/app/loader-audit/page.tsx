import { LoaderAudit } from './audit';

const Page = async ({
	searchParams,
}: {
	searchParams: Promise<{ variant?: string }>;
}) => {
	const { variant = 'compound' } = await searchParams;
	return <LoaderAudit variant={variant} />;
};
export default Page;
