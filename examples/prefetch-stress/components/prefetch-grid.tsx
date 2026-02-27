'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

const COUNT = 100;

interface LogResponse {
	total: number;
	prefetchMarked: number;
	logs: Array<{
		id: number;
		at: string;
		path: string;
		purpose: string | null;
		secPurpose: string | null;
		nextRouterPrefetch: string | null;
		middlewarePrefetch: string | null;
		userAgent: string | null;
	}>;
}

export function PrefetchGrid() {
	const router = useRouter();
	const routes = useMemo(
		() => Array.from({ length: COUNT }, (_, i) => `/p/${i + 1}`),
		[]
	);
	const [prefetched, setPrefetched] = useState(0);
	const [logs, setLogs] = useState<LogResponse | null>(null);

	useEffect(() => {
		let cancelled = false;

		async function runPrefetches() {
			let sent = 0;
			for (const route of routes) {
				router.prefetch(route);
				sent += 1;
				if (!cancelled) {
					setPrefetched(sent);
				}
				await new Promise((resolve) => setTimeout(resolve, 12));
				if (cancelled) {
					break;
				}
			}
		}

		void runPrefetches();

		return () => {
			cancelled = true;
		};
	}, [router, routes]);

	useEffect(() => {
		let timer: ReturnType<typeof setInterval> | undefined;

		async function loadLogs() {
			const response = await fetch('/api/c15t/logs', { cache: 'no-store' });
			const data = (await response.json()) as LogResponse;
			setLogs(data);
		}

		void loadLogs();
		timer = setInterval(() => {
			void loadLogs();
		}, 1000);

		return () => {
			if (timer) {
				clearInterval(timer);
			}
		};
	}, []);

	async function resetLogs() {
		await fetch('/api/c15t/reset', { method: 'POST' });
		const response = await fetch('/api/c15t/logs', { cache: 'no-store' });
		const data = (await response.json()) as LogResponse;
		setLogs(data);
	}

	return (
		<>
			<div className="panel">
				<p>
					Programmatic prefetch calls sent: <strong>{prefetched}</strong> /{' '}
					{COUNT}
				</p>
				<p>
					Logged <code>/api/c15t/init</code> calls:{' '}
					<strong>{logs?.total ?? 0}</strong>
				</p>
				<p>
					Logged calls with explicit prefetch headers:{' '}
					<strong>{logs?.prefetchMarked ?? 0}</strong>
				</p>
				<button type="button" onClick={resetLogs}>
					Reset init logs
				</button>
			</div>

			<div className="panel">
				<h3>100 Prefetch Links</h3>
				<div className="grid">
					{routes.map((href) => (
						<Link key={href} className="link" href={href} prefetch>
							{href}
						</Link>
					))}
				</div>
			</div>

			<div className="panel">
				<h3>Latest init calls</h3>
				{logs?.logs.length ? (
					<pre>{JSON.stringify(logs.logs.slice(-15), null, 2)}</pre>
				) : (
					<p className="muted">No init calls logged yet.</p>
				)}
			</div>
		</>
	);
}
