'use client';

import type { MermaidConfig } from 'mermaid';
import { useTheme } from 'next-themes';
import { useEffect, useId, useRef, useState } from 'react';

export function Mermaid({ chart }: { chart: string }) {
	const id = useId();
	const [svg, setSvg] = useState('');
	const containerRef = useRef<HTMLDivElement | null>(null);
	const { resolvedTheme } = useTheme();

	useEffect(() => {
		renderChart();

		async function renderChart() {
			const mermaidConfig: MermaidConfig = {
				startOnLoad: false,
				securityLevel: 'loose',
				fontFamily: 'inherit',
				themeCSS: 'margin: 1.5rem auto 0;',
				theme: resolvedTheme === 'dark' ? 'dark' : 'default',
			};

			const { default: mermaid } = await import('mermaid');

			try {
				mermaid.initialize(mermaidConfig);
				if (containerRef.current) {
					const { svg } = await mermaid.render(
						// strip invalid characters for `id` attribute
						id.replaceAll(':', ''),
						chart.replaceAll('\\n', '\n'),
						containerRef.current
					);
					setSvg(svg);
				}
			} catch (error) {
				// biome-ignore lint/suspicious/noConsole: <explanation>
				console.error('Error while rendering mermaid', error);
			}
		}
	}, [chart, id, resolvedTheme]);

	return (
		<div
			ref={containerRef}
			// biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
			dangerouslySetInnerHTML={{ __html: svg }}
			data-testid="mermaid-diagram"
		/>
	);
}
