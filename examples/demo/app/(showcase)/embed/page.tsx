'use client';

import type { EmbedRuntime } from '@c15t/embed';
import Link from 'next/link';
import { useEffect, useState } from 'react';

type LoadState = 'idle' | 'loading' | 'loaded' | 'error';

type EmbedWindow = Window & {
	c15tEmbed?: EmbedRuntime;
	__c15tEmbedPayload?: unknown;
};

const EMBED_SCRIPT_ID = 'c15t-embed-demo-script';
const EMBED_SCRIPT_SRC = '/api/self-host/embed.js?country=GB';
const EMBED_DEVTOOLS_SCRIPT_ID = 'c15t-embed-devtools-demo-script';
const EMBED_DEVTOOLS_SCRIPT_SRC = '/c15t-embed.devtools.iife.js';
const EMBED_BACKEND_URL = '/api/self-host';
const EMBED_MOUNT_TARGET = '#c15t-embed-demo-root';

function getEmbedRuntime() {
	return (window as EmbedWindow).c15tEmbed;
}

export default function EmbedShowcasePage() {
	const [state, setState] = useState<LoadState>('idle');

	useEffect(() => {
		let disposed = false;

		const bootstrap = () => {
			if (disposed) {
				return;
			}

			getEmbedRuntime()?.bootstrap({
				backendURL: EMBED_BACKEND_URL,
				mountTarget: EMBED_MOUNT_TARGET,
			});
			setState('loaded');
		};

		const load = async () => {
			setState('loading');

			await import('@c15t/embed');

			if (!document.getElementById(EMBED_DEVTOOLS_SCRIPT_ID)) {
				const devToolsScript = document.createElement('script');
				devToolsScript.id = EMBED_DEVTOOLS_SCRIPT_ID;
				devToolsScript.src = EMBED_DEVTOOLS_SCRIPT_SRC;
				devToolsScript.async = true;
				devToolsScript.dataset.c15tNamespace = 'c15tStore';
				document.body.appendChild(devToolsScript);
			}

			const existingScript = document.getElementById(
				EMBED_SCRIPT_ID
			) as HTMLScriptElement | null;
			if (existingScript) {
				bootstrap();
				return;
			}

			const script = document.createElement('script');
			script.id = EMBED_SCRIPT_ID;
			script.src = EMBED_SCRIPT_SRC;
			script.async = true;
			script.onload = () => bootstrap();
			script.onerror = () => {
				if (disposed) {
					return;
				}
				setState('error');
			};

			document.body.appendChild(script);
		};

		load().catch(() => {
			if (disposed) {
				return;
			}
			setState('error');
		});

		return () => {
			disposed = true;
			getEmbedRuntime()?.unmount();
		};
	}, []);

	return (
		<main className="min-h-screen bg-slate-50 text-slate-900">
			<section className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-16">
				<div className="flex items-center justify-between">
					<h1 className="text-2xl font-semibold">c15t/embed Script-Tag Demo</h1>
					<Link
						href="/"
						className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100"
					>
						Back Home
					</Link>
				</div>

				<p className="text-sm text-slate-600">
					This page loads <code>/api/self-host/embed.js</code> and mounts the
					React-parity consent UI through <code>@c15t/embed</code> using a
					single backend request.
				</p>

				<div className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
					<div>
						Status:{' '}
						<span className="font-medium">
							{state === 'loading' && 'Loading embed runtime...'}
							{state === 'loaded' && 'Embed runtime mounted'}
							{state === 'error' && 'Failed to load embed script'}
							{state === 'idle' && 'Idle'}
						</span>
					</div>
					<div className="mt-1 text-xs text-slate-500">
						Runtime target: <code>{EMBED_MOUNT_TARGET}</code>
					</div>
				</div>

				<div
					id="c15t-embed-demo-root"
					className="relative min-h-[180px] rounded-lg border border-dashed border-slate-300 bg-white"
				/>
			</section>
		</main>
	);
}
