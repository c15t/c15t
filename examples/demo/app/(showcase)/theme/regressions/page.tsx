'use client';

import {
	ConsentBanner,
	ConsentManagerProvider,
	ConsentWidget,
	type Theme,
	useConsentManager,
} from '@c15t/react';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

interface RegressionCheck {
	description: string;
	key: string;
	previewKind: 'banner' | 'widget';
	snippet: string;
	theme: Theme;
}

const regressionChecks: RegressionCheck[] = [
	{
		key: 'slot-no-style',
		previewKind: 'banner',
		description:
			'Per-slot noStyle strips the default header styling without leaking an attribute.',
		snippet:
			"slots: { consentBannerHeader: { noStyle: true, className: 'border-2 border-emerald-500 bg-emerald-50 rounded-xl px-4 py-3' } }",
		theme: {
			slots: {
				consentBannerHeader: {
					noStyle: true,
					className:
						'rounded-xl border-2 border-emerald-500 bg-emerald-50 px-4 py-3 text-emerald-950',
				},
			},
		},
	},
	{
		key: 'slot-style',
		previewKind: 'banner',
		description:
			'Slot style objects now apply inline styles on the rendered footer element.',
		snippet:
			"slots: { consentBannerFooter: { style: { background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', borderRadius: '0.875rem', padding: '0.75rem' } } }",
		theme: {
			slots: {
				consentBannerFooter: {
					style: {
						background:
							'linear-gradient(135deg, rgb(239, 246, 255), rgb(219, 234, 254))',
						borderRadius: '0.875rem',
						padding: '0.75rem',
						border: '1px solid rgb(147, 197, 253)',
					},
				},
			},
		},
	},
	{
		key: 'switch-tokens',
		previewKind: 'widget',
		description:
			'Provider switch tokens now drive unchecked and checked track colors without overrides.',
		snippet:
			"colors: { switchTrack: '#dbeafe', switchTrackActive: '#2563eb', switchThumb: '#ffffff' }",
		theme: {
			colors: {
				switchTrack: '#dbeafe',
				switchTrackActive: '#2563eb',
				switchThumb: '#ffffff',
			},
		},
	},
	{
		key: 'accordion-slot',
		previewKind: 'widget',
		description:
			'The documented consentWidgetAccordion slot now styles the actual accordion wrapper.',
		snippet:
			"slots: { consentWidgetAccordion: { className: 'rounded-2xl border border-amber-300', style: { background: 'linear-gradient(180deg, #fffbeb, #fef3c7)', padding: '0.75rem' } } }",
		theme: {
			slots: {
				consentWidgetAccordion: {
					className: 'rounded-2xl border border-amber-300 shadow-sm',
					style: {
						background:
							'linear-gradient(180deg, rgb(255, 251, 235), rgb(254, 243, 199))',
						padding: '0.75rem',
					},
				},
			},
		},
	},
];

export default function ThemeRegressionPage() {
	const [activeKey, setActiveKey] = useState(regressionChecks[0]?.key ?? '');
	const activeCheck = useMemo(
		() =>
			regressionChecks.find((check) => check.key === activeKey) ??
			regressionChecks[0],
		[activeKey]
	);

	return (
		<div className="min-h-screen bg-background">
			<header className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-8 py-8 lg:flex-row lg:items-center lg:justify-between">
				<div className="max-w-3xl">
					<h1 className="text-4xl font-bold text-foreground">
						Regression Checks
					</h1>
					<p className="mt-2 max-w-3xl text-muted-foreground">
						Focused previews for the theming fixes landed in the rc regression
						pass. Banner checks render the stock <code>ConsentBanner</code>;
						widget checks render the full <code>ConsentWidget</code>.
					</p>
				</div>
				<Link
					href="/theme"
					className="inline-flex items-center rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent"
				>
					Back To Theme Showcase
				</Link>
			</header>

			<section className="mx-auto w-full max-w-6xl px-8 pb-6">
				<LiveRegressionPreview check={activeCheck} />
			</section>

			<section className="mx-auto w-full max-w-6xl px-8 pb-10">
				<div className="grid gap-4 md:grid-cols-2">
					{regressionChecks.map((check) => (
						<RegressionCheckCard
							key={check.key}
							check={check}
							isActive={check.key === activeCheck.key}
							onSelect={() => setActiveKey(check.key)}
						/>
					))}
				</div>
			</section>
		</div>
	);
}

function RegressionCheckCard({
	check,
	isActive,
	onSelect,
}: {
	check: RegressionCheck;
	isActive: boolean;
	onSelect: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onSelect}
			className={`rounded-2xl border bg-background/85 p-4 text-left shadow-sm transition-colors ${
				isActive
					? 'border-foreground/30 ring-2 ring-foreground/10'
					: 'border-border hover:border-foreground/20 hover:bg-accent/30'
			}`}
		>
			<div className="mb-4 space-y-2">
				<div className="flex items-center justify-between gap-3">
					<h2 className="font-medium text-foreground">{check.key}</h2>
					<span className="rounded-full border border-border px-2 py-1 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
						{check.previewKind}
					</span>
				</div>
				<p className="text-sm text-muted-foreground">{check.description}</p>
				<pre className="overflow-x-auto rounded-xl bg-muted/70 p-3 text-xs text-muted-foreground">
					<code>{check.snippet}</code>
				</pre>
			</div>
		</button>
	);
}

function LiveRegressionPreview({ check }: { check: RegressionCheck }) {
	const stageRef = useRef<HTMLDivElement | null>(null);
	const [stageRect, setStageRect] = useState<{
		height: number;
		left: number;
		top: number;
		width: number;
	} | null>(null);

	useEffect(() => {
		if (check.previewKind !== 'banner') {
			setStageRect(null);
			return;
		}

		const element = stageRef.current;
		if (!element) {
			return;
		}

		const updateStageRect = () => {
			const rect = element.getBoundingClientRect();
			setStageRect({
				top: rect.top,
				left: rect.left,
				width: rect.width,
				height: rect.height,
			});
		};

		updateStageRect();

		const resizeObserver = new ResizeObserver(() => {
			updateStageRect();
		});

		resizeObserver.observe(element);
		window.addEventListener('resize', updateStageRect);
		window.addEventListener('scroll', updateStageRect, true);

		return () => {
			resizeObserver.disconnect();
			window.removeEventListener('resize', updateStageRect);
			window.removeEventListener('scroll', updateStageRect, true);
		};
	}, [check.key, check.previewKind]);

	return (
		<div className="overflow-hidden rounded-[2rem] border border-border/70 bg-card/50 shadow-sm">
			<div className="border-b border-border/70 px-6 py-5">
				<div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
					<div>
						<p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
							Live Preview
						</p>
						<h2 className="mt-2 text-2xl font-semibold text-foreground">
							{check.key}
						</h2>
					</div>
					<p className="max-w-2xl text-sm text-muted-foreground">
						{check.previewKind === 'banner'
							? 'This uses the stock ConsentBanner component. The preview stage measures its own bounds and pins the portaled banner inside that area.'
							: 'This uses the full ConsentWidget component with the active regression theme applied.'}
					</p>
				</div>
			</div>
			<div
				ref={stageRef}
				className="relative min-h-[38rem] bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.95),_rgba(246,248,251,0.92)_45%,_rgba(238,242,247,0.9))] px-6 py-8"
			>
				<div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.12)_1px,transparent_1px)] bg-[size:28px_28px] opacity-40" />
				<div className="relative z-10 flex min-h-[32rem] items-center justify-center">
					<ConsentManagerProvider
						key={check.key}
						options={{
							mode: 'offline',
							consentCategories: [
								'necessary',
								'functionality',
								'experience',
								'marketing',
								'measurement',
							],
							theme:
								check.previewKind === 'banner'
									? positionedBannerTheme(check.theme, stageRect)
									: check.theme,
						}}
					>
						{check.previewKind === 'banner' ? (
							<>
								<ForceBannerShow />
								<ConsentBanner
									layout={[['reject', 'accept'], 'customize']}
									legalLinks={['privacyPolicy', 'termsOfService']}
								/>
							</>
						) : (
							<div className="w-full max-w-3xl rounded-[1.75rem] border border-white/70 bg-white/85 p-5 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.35)] backdrop-blur">
								<ConsentWidget />
							</div>
						)}
					</ConsentManagerProvider>
				</div>
			</div>
		</div>
	);
}

function ForceBannerShow() {
	const { setActiveUI } = useConsentManager();

	useEffect(() => {
		setActiveUI('banner', { force: true });
	}, [setActiveUI]);

	return null;
}

function positionedBannerTheme(
	baseTheme: Theme,
	stageRect: {
		height: number;
		left: number;
		top: number;
		width: number;
	} | null
): Theme {
	const baseSlots = baseTheme.slots || {};
	const baseBanner =
		typeof baseSlots.consentBanner === 'object' ? baseSlots.consentBanner : {};
	const baseBannerStyle = 'style' in baseBanner ? baseBanner.style : {};
	const baseBannerCard =
		typeof baseSlots.consentBannerCard === 'object'
			? baseSlots.consentBannerCard
			: {};
	const baseBannerCardStyle =
		'style' in baseBannerCard ? baseBannerCard.style : {};
	const previewWidth = stageRect
		? Math.max(Math.min(stageRect.width - 48, 430), 280)
		: 430;
	const bannerTop = stageRect
		? Math.max(stageRect.top + stageRect.height * 0.62, 120)
		: 0;
	const bannerLeft = stageRect ? stageRect.left + stageRect.width / 2 : 0;

	return {
		...baseTheme,
		slots: {
			...baseSlots,
			consentBanner: {
				style: {
					position: 'fixed',
					top: stageRect ? `${bannerTop}px` : '-9999px',
					left: stageRect ? `${bannerLeft}px` : '-9999px',
					bottom: 'auto',
					right: 'auto',
					transform: 'translate(-50%, -50%)',
					margin: '0',
					width: `${previewWidth}px`,
					maxWidth: `${previewWidth}px`,
					...baseBannerStyle,
				},
			},
			consentBannerCard: {
				style: {
					...baseBannerCardStyle,
				},
			},
			consentBannerOverlay: {
				style: {
					display: 'none',
				},
			},
		},
	};
}
