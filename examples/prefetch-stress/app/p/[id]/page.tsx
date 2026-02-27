import Link from 'next/link';
import { triggerInitProbe } from '@/lib/trigger-init';

export const dynamic = 'force-dynamic';

export default async function PrefetchTargetPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	triggerInitProbe(`target-page-${id}`);

	return (
		<main>
			<div className="panel">
				<h1>Target Page {id}</h1>
				<p className="muted">
					Visiting this page also runs the server-layout{' '}
					<code>fetchInitialData()</code> call.
				</p>
				<Link href="/">Back to stress dashboard</Link>
			</div>
		</main>
	);
}
