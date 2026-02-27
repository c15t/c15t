import { PrefetchGrid } from '@/components/prefetch-grid';
import { triggerInitProbe } from '@/lib/trigger-init';

export default function HomePage() {
	triggerInitProbe('home-page');

	return (
		<main>
			<h1>c15t Next.js Prefetch Stress App</h1>
			<p className="panel muted">
				This app intentionally calls <code>fetchInitialData()</code> in the root
				server layout and prefetches 100 routes to reproduce server-side{' '}
				<code>/init</code> request behavior.
			</p>
			<PrefetchGrid />
		</main>
	);
}
