# Independent review resolutions

Resolved against the working tree on 8 September 2026. The independent report
is a historical review of the preceding implementation. This note records
which findings changed code and which recommendations were not adopted.

## Runtime corrections

| Finding | Resolution |
| --- | --- |
| EU territories fell through to the world default | Add AX, GF, GP, MQ, MF, RE and YT to EU/EEA country matching. Include GI explicitly in both Europe presets, without classifying it as EEA or UK. Bump matcher dataset to 2026-09-08. |
| Missing state bypassed an explicit country rule | Match the explicit country rule before falling back. Without one, retain fallback or insufficient-inputs failure. Document the resulting choice banner and provide a US country-rule example. |
| Policy edits re-solicited consent after refusal | Suppress automatic choice prompts whenever an in-scope refusal applies. This also covers new categories and expired grants, which could otherwise trigger Accept All and solicit reversal indirectly. Permissions still expire. User-initiated preferences remain available. |

The refusal rule is a c15t product decision, not a claim that every law bans
all later requests. It avoids a new per-jurisdiction flag or timer. It also
honors active GPC and recorded opt-out directives. A refusal outside the
requested scope does not suppress a choice for that scope. Notice delivery
is independent because dismissal grants no permission.

Regression tests cover territory resolution with an explicit world default,
country/region precedence, missing-state fallback, legacy/current refusals,
mixed grants and denials, new categories, grant expiry, and both US opt-in
presets through kernel init and user-initiated preferences.

Sources: [EU outermost regions](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=LEGISSUM%3Aoutermost_regions),
[Åland's EU status](https://valtioneuvosto.fi/en/finlands-eu-policy/finland-in-the-european-union),
[Gibraltar GN28](https://www.gra.gi/uploads/documents/data-protection/Documents/Guidance/GN28%20Cookies.pdf),
[California AG, opt-in request waiting period](https://oag.ca.gov/privacy/ccpa).

## Preset and source corrections

- UK statistics now cites PECR Schedule A1 paragraph 5 separately from ICO
  interpretation. Document sole purpose, sharing limits, information,
  objection, automatically emitted device-information exclusion, processor
  restrictions and the separate UK GDPR lawful-basis assessment.
- Keep both Malaysia helpers as editable recipes. Explain establishment,
  equipment and overseas-processing scope under sections 2 and 3. Do not
  infer that a foreign server excludes a site from the Act. The statistics
  recipe retains Security, Retention and Data Integrity duties. Include the
  2026 Data Protection by Design cookie example and replace the obsolete
  General Code download URL with its official landing page.
- The Swiss no-prompt recipe now explicitly excludes third-party advertising
  networks and unexpected tracking on sensitive political, religious or
  trade-union sites. This is a deliberately limited recipe; the guide does
  not claim every third-party cookie categorically requires consent.
- Record Louisiana and Vermont as future laws, alongside Oklahoma and Alabama.
  Do not add them to the currently effective state matcher early. Add
  Connecticut's July 2026 minors prohibition. Record Maryland Chapter 874
  separately from the unenacted SB569 proposal.
- Clarify Japan's covered-service scope. Add India's actual commencement
  notification and final Rules. Correct the Iceland and Liechtenstein
  research wording and distinguish UAE Articles 28 and 29.

Primary sources and applicability conditions are linked in each regional
research note and the public preset guides. The Malaysia design example was
read from the regulator's official PDF; it is guidance, not an amendment
abolishing every statutory exemption.

## Recommendations not adopted as bug fixes

- Removing Malaysia statistics solely because applicability is business-based
  would be inconsistent with the other presets. All helpers are explicit
  deployment configuration; their editable country matchers do not adjudicate
  legal scope. Clarifying that contract resolves the misleading documentation.
- New behavioral constructors, pack helpers, appearance exceptions and mixed
  per-category defaults are feature proposals. Do not add API layers as a
  remedy for matching or refusal defects. The existing mixed-purpose and
  timed-deemed-consent limitations remain explicit.
- A new US-specific translation profile is optional copy work. The short
  sale/sharing control opens preferences; it is not presented as satisfying
  every statutory website-link requirement. Host disclosure must describe
  the actual sale, sharing and targeted-advertising processing.
- Do not adopt the report's assertion that GPC automatically exercises the
  sensitive-information limitation right. CalPrivacy describes GPC as a
  sale/sharing opt-out. Sensitive-data limits and other requests remain
  separate application duties. See [CalPrivacy's explanation](https://cppa.ca.gov/announcements/2025/20250909.html).
- Claims inferred from redlined regulations or unverified future amendments
  are not reasons to change active permission defaults. The report's
  additional Japan/Korea/Australia/Canada amendment claims are not represented
  here as verified legal changes. The preset review dates remain maintenance
  reminders, not automatic legal updates.

The catalog still does not claim worldwide legal coverage. New territories
and processing-specific exemptions require their own source review; an
explicit world default must be assessed against that deployment's scope.

## Validation

- Package build, type-check and test run: 5,251 tests passed across 19 packages,
  with task concurrency set to 3. Existing skipped tests remain skipped.
- Full workspace type check: 74 tasks passed.
- Demo: 74 tests passed. Repository tooling: 132 tests passed.
- Repository lint, formatting check and diff whitespace check passed.
- Public preset docs linted and package docs regenerated.

The initial highly parallel run exposed outdated mixed-refusal expectations,
which were corrected while retaining all-grant expiry coverage. Svelte SSR
and a build-watcher test also timed out under contention. Both passed in the
final runs without raising timeouts or changing their assertions.
