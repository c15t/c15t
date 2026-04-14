# Legal Document Snapshot Integration

This guide defines the 2.0 groundwork for legal-document consent flows such as terms and conditions, privacy policies, and DPAs.

## Goal

The client should be able to record acceptance for the exact document release the user saw without needing to know c15t's internal `policyId`.

That means the preferred client contract is:

1. A terms server renders or resolves the active legal document release.
2. The terms server issues a signed `documentSnapshotToken` for that release.
3. The client sends that token back when the user accepts or rejects the document.
4. c15t verifies the token and stores append-only consent evidence against the matching legal-document release.

## System Responsibilities

### Terms Server

The terms server is the source of truth for the document release that was shown to the user.

It is responsible for:

- resolving the current legal document release
- knowing the release metadata:
  - `type`
  - `hash`
  - `version`
  - `effectiveDate`
- minting a signed `documentSnapshotToken`
- returning the rendered document and token to the client

The terms server should own signing. c15t should not expose a production-safe browser helper that can mint these tokens because doing that would require shipping the signing key to the client.

### Client SDK / UI

The client should:

- render the document content from the terms server
- hold the `documentSnapshotToken` returned for that rendered release
- call c15t accept or reject primitives with that token when the user acts

The client may know `policyHash`, but it should not need to know `policyId`.

### c15t Backend

The c15t backend is responsible for:

- verifying the signed `documentSnapshotToken`
- extracting authoritative release metadata from the token
- resolving the matching legal-document policy row
- storing append-only consent evidence for the subject and document release

## Preferred Request Contract

For legal-document consent writes, the preferred lookup order is:

1. `documentSnapshotToken`
2. `policyHash`
3. `policyId` as a compatibility fallback only

`documentSnapshotToken` is the auditable path because it proves which release the user saw without forcing the client to understand c15t internals.

`policyHash` remains useful as a lightweight fallback for integrations that can identify the rendered document release but do not yet have a signing service.

`policyId` should not be the long-term client contract.

## Snapshot Token Claims

The signed token should carry enough metadata for c15t to verify and resolve the document release:

- `iss`: token issuer
- `aud`: intended c15t audience
- `sub`: release hash
- `tenantId`: tenant that owns the release, when applicable
- `type`: legal document type
- `version`: release version string
- `hash`: stable release hash
- `effectiveDate`: ISO timestamp for the effective date
- `iat`: issued-at timestamp
- `exp`: expiration timestamp

The current demo helper uses that shape so the wire contract is established now, even though real issuance should move to a dedicated server flow.

## Auditability and Compliance

For a fully auditable flow:

- the rendered release must be versioned
- the release must have stable metadata, especially `hash`
- acceptance must be append-only
- the evidence should tie the subject, action, time, and exact release together
- signed snapshot tokens should be issued by a trusted server, not the browser

This gives c15t a defensible record of what document release was accepted and when.

## What Ships in 2.0

This PR is groundwork, not the full terms-platform rollout.

Included now:

- token-first legal-document consent inputs in c15t
- `policyHash` fallback support
- an example terms demo that identifies the user first and then records acceptance
- a demo-only unsafe browser signer in `examples/demo` for local testing when no real terms server exists yet

Deferred until the next phase:

- a production terms server that owns rendering and token issuance
- automatic release resolution from a real document service
- signed snapshot delivery from server to client as part of document rendering

## Demo-Only Unsafe Signer

`examples/demo/lib/unsafe-demo-legal-document-snapshot.ts` exists only to let the example app exercise the contract before the real terms server lands.

It is intentionally unsafe for production use because it requires exposing a signing key to the browser bundle.

Use it only for local development or temporary internal demos.

## If You Already Have a Privacy Policy Without a Hash

That is not a blocker for 2.0 groundwork, but it is not the end state either.

Short term:

- you can continue using existing legal-document records
- `policyId` compatibility can still exist server-side
- `policyHash` fallback can be added once release hashing exists

Long term:

- every rendered legal-document release should have a stable hash
- the terms server should issue snapshot tokens using that hash

Without a stable release hash, the audit trail is weaker because the acceptance cannot be tied as precisely to the rendered document version.
