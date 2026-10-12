# Consent policy decisions

Research date: 8 September 2026. These are proposed preset decisions based on
the linked legislation and regulator guidance. The implementation follow-up adds the regional variants and statistics-only
presets, generic preference labels and missing-subdivision handling.
The [verification resolutions](verification-resolutions.md) record the subsequent
matcher, refusal and source corrections. The
[public preset guide](../../../docs/frameworks/javascript/concepts/policy-presets.mdx)
describes current behavior. Mixed-purpose defaults, timed deemed consent
and independent legal permissions remain outside these presets. It replaces the earlier assumption that adding an
opt-in country helper amounts to establishing that country's banner rules.

The earlier catalog overprescribed banners. Several countries permit some
processing without a consent request. The useful unit is a country plus a
defined use, such as advertising or service statistics. A country name alone
cannot establish the processing basis.

## Coverage

The notes cover all countries discussed in this task, Canada's federal and
provincial distinctions, the current 20-state US group, and UAE free zones.
The Europe matcher now includes separately geocoded EU territories AX, GF, GP,
MQ, MF, RE and YT, plus Gibraltar under its own law. The Europe review covers
the EEA baseline and selected national differences,
not a separate audit of every national implementation. This is not a complete
worldwide privacy-law inventory. For example, Hong Kong, Macao, Taiwan,
New Zealand, South Africa, Israel, Mexico and other Latin American and Gulf
jurisdictions require separate reviews before claiming worldwide coverage.

- [Europe, UK, Switzerland and Türkiye](europe.md)
- [United States, Canada and Brazil](americas.md)
- [Singapore, Malaysia, Thailand, Indonesia, Philippines, Vietnam, Brunei and Laos](southeast-asia.md)
- [China, Japan, Korea, India, Australia, UAE and Saudi Arabia](asia-pacific.md)

Each regional note records the legal conditions, primary sources, effective
dates and unresolved points. A proposed opt-in starter is a supported consent
workflow, not a finding that every use of cookies requires consent.

## Recommended catalog

In this table, **choice** means a consent request before consent-dependent
tracking. **No prompt** means no automatic CMP banner, with any required host
disclosures and controls still present. **Both** means offer opt-in and opt-out
variants, each with stated processing assumptions. It never means an opt-out
variant can replace a legally required consent.

| Country or region | Main regulation | Recommended presets | Automatic UI |
| --- | --- | --- | --- |
| EEA | ePrivacy + GDPR, national implementation | Opt-in; optional IAB integration | Choice |
| United Kingdom | PECR + UK GDPR, 2026 amendments | Opt-in; separate service-statistics option | Choice / no prompt |
| Switzerland | FADP + TCA Article 45c | Both | Choice / no prompt with adequate host notice |
| Türkiye | KVKK | Opt-in; first-party cookie-statistics recipe | Choice / host information at entry |
| US privacy states | State privacy laws | Both | Choice / no prompt |
| California | CCPA/CPRA | Both, retain specific override | Choice / no prompt |
| Other known US states | Sector/state-specific laws still apply | No general cookie prompt; apply relevant rights | No prompt |
| Québec | Private-sector Act, Law 25 amendments | Opt-in for optional identification/profiling | Choice |
| Canada outside Québec | PIPEDA, Alberta/BC PIPA | Both | Choice / notice by default |
| Brazil | LGPD | Opt-in; assessed audience-measurement recipe | Choice / no prompt |
| Australia | Privacy Act, APPs | Both | Choice / no prompt |
| Japan | APPI + Telecom external-transmission rules | Both | Choice / no prompt |
| China mainland | PIPL + network-data rules | Opt-in; independent additional permissions | Choice |
| South Korea | PIPA | Opt-in; assessed non-consent analytics recipe | Choice / no prompt |
| India | Current IT/SPDI rules; phased DPDP | Opt-in; dated current-law custom recipe | Depends on processing and commencement |
| Singapore | PDPA | Opt-in; assessed exception recipe | Choice / no prompt |
| Malaysia | PDPA 2010, amendments and applicable codes | Opt-in; statistics-only and reviewed implied-consent recipes | Choice / depends on recipe |
| Thailand | PDPA | Opt-in; assessed alternative-basis recipe | Choice / no prompt |
| Indonesia | Law 27/2022 | Opt-in; assessed alternative-basis recipe | Choice / no prompt |
| Philippines | Data Privacy Act + NPC circulars | Opt-in; assessed alternative-basis recipe | Choice / no prompt |
| Vietnam | Law 91/2025 + Decree 356/2025 | Opt-in for personal tracking/behavioral ads | Choice |
| Brunei | PDPO 2025, substantive duties from 2026 | Opt-in; assessed exception recipe | Choice / depends on recipe |
| Laos | Electronic Data Protection Law | Approval-based starter, local interpretation needed | Choice |
| UAE federal | Federal Decree-Law 45/2021 | Federal opt-in starter, transition status unresolved | Choice |
| DIFC | DIFC Data Protection Law + Regulation 9 | Separate business-selected opt-in profile | Choice |
| ADGM | Data Protection Regulations 2021 | Separate business-selected profiles, assessed opt-out available | Choice / no prompt |
| Saudi Arabia | PDPL + implementing regulation | Opt-in for marketing; assessed analytics recipe | Choice / no prompt |

France, the Netherlands and Liechtenstein also have narrow audience/statistics
routes described in the Europe note. Do not turn these into Europe-wide
advertising opt-out rules. A necessary-only or truly nonpersonal deployment
may need no consent request even where the table lists choice. EEA device
access still needs its own exemption, and Laos's broad electronic-data rules
need further local interpretation.

## Decisions that change the earlier proposal

### US banners should be optional

Change the proposed `usPrivacyStatesOptOut()` default from `notice` to `none`.
Retain `usPrivacyStatesOptIn()` and allow an explicit `prompt: 'notice'`
override. Existing California variants remain useful. The host must supply
timely disclosure and effective persistent rights controls.

Keep the 20-state group for currently effective coverage. Louisiana and Oklahoma
start 1 January 2027, Alabama 1 May 2027 and Vermont 1 January 2028.
Review before those dates; the group does not activate future laws early. Nevada's
online-sale opt-out and Washington's health-data law show why a state outside
the group cannot be described as having no privacy obligations.

Honor GPC across the group as a product choice. Do not say every included
state mandates it or that denying two cookie categories stops every sale.
Maryland minimization and sensitive/minor prohibitions require application
processing controls. An additional opt-in preset cannot waive a prohibition.

### Add useful opt-out variants

Add `australiaOptOut()`, `japanOptOut()` and `canadaOptOut()` alongside opt-in
variants. Retain Switzerland's existing opt-out helper. Prefer one helper
with configurable prompt over separate notice/no-notice country aliases.

Australia and Japan can default to no prompt for the documented eligible
processing and host disclosure. Canada should default to a notice for the
OPC's nonsensitive behavioral-advertising route, with no prompt available
where the host already provides equally prominent information and immediate
persistent refusal. Place Québec before Canada and handle a missing province
explicitly.

Use generic preference/withdrawal wording outside the US. The permission model
does not establish a sale/sharing right. Preserve the banner's semantic button
that opens preferences, while documenting any separate statutory website-link
requirements. Do not describe its current shortened label as prescribed
California wording.

### Singapore and Malaysia need distinct explanations

Singapore permits requested operations, nonpersonal processing and statutory
exceptions. PDPC's cookie guidance requires consent for personal-data ad
targeting. Notification-based deemed consent requires assessment, effective
notice and a reasonable refusal period before processing begins. Immediate
page-load permission does not implement that process.

Malaysia permits forms of implied consent in applicable codes and has a
specific statistics-only exemption in section 45(2)(c). Those are real routes
to fewer consent requests. A general notice does not itself establish proper
consent for every third-party advertising SDK. The statistical exemption
requires sole statistics/research use and nonidentifying published results;
advertising or vendor reuse defeats that premise.

Keep a consent-choice option for both countries. Document the alternative
routes separately, with their actual conditions. A broad immediate-allow
country helper would hide the distinction between prior permission, contextual
implied consent and a statutory exception.

### Ship narrow analytics recipes before more country aliases

Document a UK service-statistics profile and a Malaysia statistics-only
profile. Include the verified French, Dutch, Liechtenstein and Turkish cookie
recipes. Brazil, South Korea, Saudi Arabia and other legitimate-interest
regimes can use an assessed analytics configuration, but the assessment remains
specific to the deployment.

An analytics-only site can use `opt-out`, `prompt: 'none'` and strict category
scope, with only reviewed measurement scripts included. That configuration
provides a refusal mechanism; the law may call the underlying basis an
exemption or legitimate interest rather than opt-out consent. Retain information
and objection controls wherever required. Türkiye requires information at
entry even for its qualifying cookie-statistics route.

Do not ship `brazilOptOut()` or `malaysiaOptOut()` as unqualified allow-all
alternatives. State the use in the recipe name. The same restriction applies
to any country where only a narrow exception has been verified.

## Keep the engine small, but fix the actual gaps

The existing separation of permission model, prompt and presentation is useful.
Keep `opt-in`/`opt-out` permission behavior and `choice`/`notice`/`none` prompts.
Keep layout, position, blocking and button styling separate from legal bases.
Do not create one runtime model per law or turn source notes into executable
legislation. A notice dismissal labelled `OK` records dismissal, not consent.

The research does expose behavior the current engine cannot fully represent:

1. **Mixed-purpose defaults.** A site may allow exempt statistics immediately
   while waiting for advertising consent. One model per rule cannot provide
   this complete reversible preference flow. Permissive outside-scope handling
   lets scripts run, but rejects positive saves outside scope even after a
   saved denial. Resolve that before advertising a mixed analytics/ads recipe.
2. **Independent permissions.** China's recipient/sensitive/transfer consent,
   child/guardian permissions, and prohibited processing need independent
   application gates. A five-category Accept All cannot cover them automatically.
3. **Timing.** Singapore/Brunei deemed-notification waiting periods and
   California's restriction on asking an opted-out user to opt back in need
   durable state. c15t now suppresses automatic choice prompts while any
   in-scope refusal applies. Hosts must preserve those refusals across their
   storage/identity boundaries and avoid their own premature opt-in requests.
4. **Location uncertainty.** A known unmatched location can use the no-prompt
   default. Missing US state or Canadian province does not prove that a stricter
   regional rule is inapplicable. An explicit country rule handles a missing
   subdivision. Without one, use the configured fallback or fail with denied
   optional categories and a choice prompt for a visitor without refusals.
5. **Dates.** Review metadata does not schedule runtime changes. India's main
   DPDP obligations start 13 May 2027. Keep the current-law no-banner route a
   dated custom configuration until transition handling exists.

The preset's documentation should name permitted uses, excluded uses, required
host controls, primary sources and review date. These are deployment
prerequisites, not additional switches that pretend to validate the business.

## Remaining source limits

Do not publish an exhaustive worldwide-coverage claim from these notes. The
federal UAE executive-regulation transition remains unverified from a current
primary publication. DIFC's latest extraterritorial scope requires a current
consolidated-law check before making residency-based claims. Laos needs local
interpretation of exceptions. Some US amendments and Rhode Island disclosure
detail warrant the specific follow-ups recorded in the Americas note.

These limits do not prevent the preset decisions above. They do prevent
labelling any geographic helper a complete implementation of the named law.
