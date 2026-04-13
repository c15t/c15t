'use client';

import { useConsentManager } from '@c15t/react';
import {
	Check,
	FileText,
	Fingerprint,
	ShieldCheck,
	UserRound,
} from 'lucide-react';
import { useMemo, useState, useTransition } from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

type TermsPolicySummary = {
	title: string;
	version: string;
	hash: string;
	effectiveDate: string;
};

type IdentityState = {
	externalId: string;
	identityProvider: string;
};

type AcceptanceState = IdentityState & {
	subjectId: string;
	consentId: string;
	policyVersion: string;
	policyHash: string;
	acceptedAt: string;
};

const termsHighlights = [
	'Users agree that consent evidence is stored with the active legal-document release.',
	'Future releases can be versioned without overwriting the previous acceptance trail.',
	'The write can target a legal-document release by hash instead of requiring the policy ID in the UI.',
];

function formatDate(value: string) {
	return new Intl.DateTimeFormat('en', {
		dateStyle: 'medium',
		timeStyle: 'short',
	}).format(new Date(value));
}

export function TermsDemo({ policy }: { policy: TermsPolicySummary }) {
	const { consentInfo, identifyUser, unstable_acceptPolicyConsent, user } =
		useConsentManager();
	const [form, setForm] = useState({
		externalId: 'demo-user-123',
		identityProvider: 'demo-auth',
	});
	const [identified, setIdentified] = useState<IdentityState | null>(null);
	const [acceptance, setAcceptance] = useState<AcceptanceState | null>(null);
	const [feedback, setFeedback] = useState<{
		tone: 'neutral' | 'success' | 'error';
		message: string;
	} | null>(null);
	const [isPending, startTransition] = useTransition();
	const defaultIdentityProvider = form.identityProvider.trim() || 'demo-auth';
	const identifiedUser =
		identified ??
		(user?.id
			? {
					externalId: user.id,
					identityProvider:
						user.identityProvider ??
						consentInfo?.identityProvider ??
						defaultIdentityProvider,
				}
			: consentInfo?.externalId
				? {
						externalId: consentInfo.externalId,
						identityProvider:
							consentInfo.identityProvider ?? defaultIdentityProvider,
					}
				: null);

	const statusRows = useMemo(
		() => [
			{
				label: 'Policy version',
				value: policy.version,
			},
			{
				label: 'Effective date',
				value: formatDate(policy.effectiveDate),
			},
			{
				label: 'Policy hash',
				value: acceptance?.policyHash || policy.hash,
			},
			{
				label: 'Subject ID',
				value:
					acceptance?.subjectId ||
					consentInfo?.subjectId ||
					'Created when terms are accepted',
			},
		],
		[
			acceptance?.policyHash,
			acceptance?.subjectId,
			consentInfo?.subjectId,
			policy.effectiveDate,
			policy.hash,
			policy.version,
		]
	);

	const feedbackClassName =
		feedback?.tone === 'error'
			? 'border-destructive/30 bg-destructive/10 text-destructive'
			: feedback?.tone === 'success'
				? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
				: 'border-border bg-muted/70 text-muted-foreground';

	return (
		<div className="relative overflow-hidden bg-background text-foreground">
			<div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_28%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.14),transparent_24%),linear-gradient(180deg,rgba(15,23,42,0.04),transparent_48%)]" />
			<div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

			<div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-10 px-4 pt-28 pb-16 sm:px-6 lg:px-8">
				<section className="grid gap-6 lg:grid-cols-[1.25fr_0.95fr]">
					<div className="space-y-6">
						<div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs uppercase tracking-[0.18em] backdrop-blur">
							<FileText className="size-3.5" />
							c15t legal-document example
						</div>

						<div className="max-w-3xl space-y-4">
							<h1 className="max-w-2xl text-balance font-semibold text-4xl tracking-tight sm:text-5xl">
								Identify a user first, then capture a terms acceptance with the
								active c15t release.
							</h1>
							<p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
								This demo creates or links a subject, then records a
								<code className="mx-1 rounded bg-muted px-1.5 py-0.5 text-sm">
									terms_and_conditions
								</code>
								consent against a legal-document release hash.
							</p>
						</div>

						<div className="grid gap-4 sm:grid-cols-3">
							<div className="rounded-2xl border border-border/70 bg-background/75 p-4 backdrop-blur">
								<p className="text-muted-foreground text-xs uppercase tracking-[0.18em]">
									Step 1
								</p>
								<p className="mt-2 font-medium">Identify the subject</p>
								<p className="mt-1 text-muted-foreground text-sm">
									Link the c15t subject to an authenticated external user ID.
								</p>
							</div>
							<div className="rounded-2xl border border-border/70 bg-background/75 p-4 backdrop-blur">
								<p className="text-muted-foreground text-xs uppercase tracking-[0.18em]">
									Step 2
								</p>
								<p className="mt-2 font-medium">Resolve the current release</p>
								<p className="mt-1 text-muted-foreground text-sm">
									The page carries the current terms release hash instead of a
									precomputed policy ID.
								</p>
							</div>
							<div className="rounded-2xl border border-border/70 bg-background/75 p-4 backdrop-blur">
								<p className="text-muted-foreground text-xs uppercase tracking-[0.18em]">
									Step 3
								</p>
								<p className="mt-2 font-medium">Append acceptance evidence</p>
								<p className="mt-1 text-muted-foreground text-sm">
									Consent is written as an append-only record with subject and
									release evidence.
								</p>
							</div>
						</div>
					</div>

					<div className="rounded-[28px] border border-border/70 bg-background/85 p-6 shadow-sm backdrop-blur">
						<div className="flex items-start justify-between gap-4">
							<div>
								<p className="text-muted-foreground text-xs uppercase tracking-[0.18em]">
									Current release
								</p>
								<h2 className="mt-2 font-semibold text-2xl">{policy.title}</h2>
							</div>
							<Badge variant="outline">Active</Badge>
						</div>

						<div className="mt-6 grid gap-4 sm:grid-cols-2">
							{statusRows.map((row) => (
								<div
									key={row.label}
									className="rounded-2xl border border-border/70 bg-muted/45 p-4"
								>
									<p className="text-muted-foreground text-xs uppercase tracking-[0.18em]">
										{row.label}
									</p>
									<p className="mt-2 break-all font-medium text-sm">
										{row.value}
									</p>
								</div>
							))}
						</div>

						<div className="mt-6 rounded-2xl border border-border border-dashed bg-muted/30 p-4">
							<p className="text-muted-foreground text-xs uppercase tracking-[0.18em]">
								Release hash
							</p>
							<p className="mt-2 font-mono text-sm">{policy.hash}</p>
						</div>
					</div>
				</section>

				<section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
					<Card className="border-border/70 bg-background/90 shadow-sm">
						<CardHeader>
							<div className="flex items-center gap-3">
								<div className="rounded-2xl bg-primary/10 p-3 text-primary">
									<UserRound className="size-5" />
								</div>
								<div>
									<CardTitle>Identify the user</CardTitle>
									<CardDescription>
										Use c15t's identify flow to store the external account and
										link immediately if a subject already exists.
									</CardDescription>
								</div>
							</div>
						</CardHeader>
						<CardContent className="space-y-5">
							<div className="space-y-2">
								<Label htmlFor="external-id">External user ID</Label>
								<Input
									id="external-id"
									value={form.externalId}
									onChange={(event) =>
										setForm((current) => ({
											...current,
											externalId: event.target.value,
										}))
									}
									placeholder="user_123"
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="identity-provider">Identity provider</Label>
								<Input
									id="identity-provider"
									value={form.identityProvider}
									onChange={(event) =>
										setForm((current) => ({
											...current,
											identityProvider: event.target.value,
										}))
									}
									placeholder="clerk"
								/>
							</div>

							<Button
								className="w-full"
								disabled={isPending}
								onClick={() => {
									setFeedback(null);
									startTransition(async () => {
										const externalId = form.externalId.trim();
										const identityProvider =
											form.identityProvider.trim() || 'demo-auth';

										if (!externalId) {
											setFeedback({
												tone: 'error',
												message:
													'External user ID is required before you can identify the subject.',
											});
											return;
										}

										const hasExistingSubject = Boolean(consentInfo?.subjectId);

										try {
											await identifyUser({
												id: externalId,
												identityProvider,
											});

											setIdentified({
												externalId,
												identityProvider,
											});
											setAcceptance(null);
											setFeedback({
												tone: 'success',
												message: hasExistingSubject
													? `c15t linked subject ${consentInfo.subjectId} to ${externalId}.`
													: `c15t stored ${externalId} in client state. The first consent write will create or reuse the subject and attach the user identity.`,
											});
										} catch (error) {
											setFeedback({
												tone: 'error',
												message:
													error instanceof Error
														? error.message
														: 'Unable to identify the user with c15t.',
											});
										}
									});
								}}
							>
								{isPending ? 'Linking subject...' : 'Identify user'}
							</Button>

							<div className="rounded-2xl border border-border/70 bg-muted/35 p-4 text-sm">
								<p className="font-medium">What this step does</p>
								<p className="mt-2 text-muted-foreground">
									This button now uses the consent manager's
									<code className="mx-1 rounded bg-background px-1.5 py-0.5 text-xs">
										identifyUser()
									</code>
									flow. If a subject already exists, c15t patches it
									immediately. If not, c15t keeps the user identity in client
									state and applies it on the first consent write.
								</p>
							</div>
						</CardContent>
					</Card>

					<div className="space-y-6">
						<section className="rounded-[28px] border border-border/70 bg-background/90 p-6 shadow-sm">
							<div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
								<div className="max-w-2xl">
									<div className="flex items-center gap-3">
										<div className="rounded-2xl bg-emerald-500/12 p-3 text-emerald-700 dark:text-emerald-300">
											<ShieldCheck className="size-5" />
										</div>
										<div>
											<p className="text-muted-foreground text-xs uppercase tracking-[0.18em]">
												Terms excerpt
											</p>
											<h2 className="mt-1 font-semibold text-2xl">
												PigeonPost messaging terms
											</h2>
										</div>
									</div>

									<div className="mt-6 max-w-2xl space-y-4 text-muted-foreground text-sm leading-7 sm:text-base">
										<p>
											By accepting these terms you authorize PigeonPost to store
											a versioned legal-document consent for your authenticated
											account, including the subject ID, release hash,
											timestamp, and source metadata required for audit
											evidence.
										</p>
										<p>
											The acceptance is append-only. A future release can
											supersede this one without erasing the fact that version
											<code className="mx-1 rounded bg-muted px-1.5 py-0.5 text-sm">
												{policy.version}
											</code>
											was accepted today.
										</p>
									</div>
								</div>

								<div className="min-w-0 flex-1 rounded-3xl border border-border/70 bg-muted/35 p-5">
									<p className="text-muted-foreground text-xs uppercase tracking-[0.18em]">
										Implementation notes
									</p>
									<div className="mt-4 space-y-3">
										{termsHighlights.map((item) => (
											<div
												key={item}
												className="flex items-start gap-3 text-sm"
											>
												<Check className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-300" />
												<p className="text-muted-foreground">{item}</p>
											</div>
										))}
									</div>
								</div>
							</div>

							<div className="mt-8 flex flex-col gap-4 rounded-3xl border border-border/70 bg-muted/20 p-5 sm:flex-row sm:items-center sm:justify-between">
								<div>
									<p className="font-medium text-sm">
										{identifiedUser
											? `Ready to record acceptance for ${identifiedUser.externalId}`
											: 'Identify the user before recording acceptance'}
									</p>
									<p className="mt-1 text-muted-foreground text-sm">
										c15t will store the acceptance with subject, consent, and
										policy evidence through the unstable
										<code className="mx-1 rounded bg-background px-1.5 py-0.5 text-xs">
											unstable_acceptPolicyConsent()
										</code>
										store primitive.
									</p>
								</div>
								<Button
									size="lg"
									disabled={!identifiedUser || isPending}
									onClick={() => {
										if (!identifiedUser) {
											setFeedback({
												tone: 'error',
												message:
													'Identify the user first so c15t has a subject to attach the terms consent to.',
											});
											return;
										}

										setFeedback(null);
										startTransition(async () => {
											try {
												const result = await unstable_acceptPolicyConsent({
													type: 'terms_and_conditions',
													policyHash: policy.hash,
													uiSource: 'terms-demo',
													metadata: {
														source: 'examples/demo/terms',
														release: policy.version,
													},
												});

												setAcceptance({
													subjectId: result.subjectId,
													externalId: identifiedUser.externalId,
													identityProvider: identifiedUser.identityProvider,
													consentId: result.consentId,
													policyVersion: policy.version,
													policyHash: policy.hash,
													acceptedAt: new Date(result.givenAt).toISOString(),
												});
												setFeedback({
													tone: 'success',
													message: `Terms accepted and stored as consent ${result.consentId}.`,
												});
											} catch (error) {
												setFeedback({
													tone: 'error',
													message:
														error instanceof Error
															? error.message
															: 'Unable to record the terms acceptance with c15t.',
												});
											}
										});
									}}
								>
									{isPending
										? 'Recording acceptance...'
										: 'Accept terms and conditions'}
								</Button>
							</div>
						</section>

						<section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
							<div
								className={`rounded-[24px] border p-5 text-sm shadow-sm ${feedbackClassName}`}
							>
								<p className="text-xs uppercase tracking-[0.18em]">
									Request status
								</p>
								<p className="mt-2 leading-7">
									{feedback?.message ||
										'No write has been sent yet. Identify a user to begin the flow.'}
								</p>
							</div>

							<div className="rounded-[24px] border border-border/70 bg-background/90 p-5 shadow-sm">
								<p className="text-muted-foreground text-xs uppercase tracking-[0.18em]">
									Latest acceptance
								</p>
								<div className="mt-4 space-y-4">
									<div className="flex items-start gap-3">
										<Fingerprint className="mt-0.5 size-4 text-muted-foreground" />
										<div className="min-w-0">
											<p className="font-medium text-sm">Consent ID</p>
											<p className="break-all text-muted-foreground text-sm">
												{acceptance?.consentId || 'Pending'}
											</p>
										</div>
									</div>
									<div className="flex items-start gap-3">
										<FileText className="mt-0.5 size-4 text-muted-foreground" />
										<div className="min-w-0">
											<p className="font-medium text-sm">
												Stored against release
											</p>
											<p className="text-muted-foreground text-sm">
												{acceptance
													? `${acceptance.policyVersion} at ${formatDate(acceptance.acceptedAt)}`
													: 'No acceptance has been recorded yet'}
											</p>
										</div>
									</div>
								</div>
							</div>
						</section>
					</div>
				</section>
			</div>
		</div>
	);
}
