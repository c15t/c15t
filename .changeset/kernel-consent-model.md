---
'c15t': major
'@c15t/core': major
'@c15t/react': major
'@c15t/nextjs': major
'@c15t/ui': major
---

Separate explicit choice receipts, effective permissions, prompt requirements and privacy directives. Gates consume `effectivePermissions`; preferences edit a local draft. Replace `initialConsents` and `set.consent()` with `initialDraft` and `set.draft()`. Replace snapshot `consents` with `effectivePermissions` and `subjectId` with `subject?.subjectId`. Remove `initialHasConsented`, its setter, the old `Consent` interpreter, `initialPolicy`, `policyDecision`, embedded policy presentation, and policy-scope overrides to `has()`. The remaining read-only `hasConsented` diagnostic grants nothing.

Only `commands.save()` records choices. An object confirms exactly its own optional keys; `all` and `none` confirm the current policy scope. Repeating a value renews only the supplied category receipts, empty input records nothing, and queued retries keep the original confirmation time. Positive grants expire; denials and standing opt-out directives remain effective. `commands.dismissNotice()` records a local dismissal without changing permissions. Persistent rights remain available after a prompt closes.

Use `PolicyRule` for behavior and independent `presentation` options for layout. Replace `onConsentSet` and `onConsentChanged` with `onChoiceRecorded` and `onPermissionsChanged`. GPC detection remains separate from a developer override and denies only the policy's mapped categories. Detecting GPC anonymously records a local directive without creating consent or a server subject.

Hydration preserves v2 receipts, partial category coverage, identifiers and original timestamps without writes or timestamp renewal. Use `readStoredRecords` or `readStoredRecordsFromCookieHeader`; remove calls to the old consent readers and writer. Persistence stores v3 choices and separate notice/privacy records with cookie projections. `PersistenceHandle.clear()` cancels queued writes, removes all records, resets local records and cancels stale pending work.

Read policy readiness through `policyPending` and versioned `resolution`. Unconfigured, unmatched and failed outcomes retain an observable null policy and use safe opt-in permissions. A failed initialization hides the prompt and cannot retain a permissive policy. See the v3 migration guide for deployment sequencing and receipt compatibility.
