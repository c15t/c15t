# Independent verification of the consent-policy presets

Implementation follow-up: see [verification resolutions](verification-resolutions.md)
for fixes and recommendations not adopted. Findings below describe the earlier
working tree and are retained as the original review.

Verification date: 8 September 2026. Reviewer: Claude (Fable 5.1), acting as an
independent check on the decisions in `policy-rule-presets.ts`, the kernel
evaluator, the React banner and toolbar, the public preset guide and the four
regional research notes in this directory. Working tree reviewed, including
uncommitted and untracked files; HEAD was not assumed to be the implementation.

This is a source-verification review, not legal advice. Every conclusion below
names the primary document it rests on. Where I could not read the operative
text, the item says INACCESSIBLE or UNTRANSLATED. Statutory requirement,
regulator guidance, c15t product default and my own inference are labelled as
such. Nothing was changed in runtime code, docs or research notes.

## Method

I fetched statutes, gazettes, regulator guidance and enforcement decisions
directly. Several official hosts block automated clients (ico.org.uk, EUR-Lex,
legisquebec, pib.gov.in, meity.gov.in, uaelegislation.gov.ae, sdaia.gov.sa,
privacy.gov.ph); for those I used a browser user agent, a reader proxy, or a
substitute primary host, and say so in the item. PDFs were extracted locally.
Law-firm and vendor summaries were used only to locate primary URLs, never as
authority. I also ran the schema preset test file against the current working
tree: 119 tests pass.

## High-severity findings

Ordered by consequence. "Defect" means the code or docs produce a wrong or
unsupported result today. "Prerequisite" means the preset is defensible only if
the deployment meets a condition the preset cannot check.

### 1. EU outermost regions, Åland and Gibraltar fall to the allow-all world default (defect)

**Behavior.** `policyMatchers.eea()` lists the 27 member states plus IS, LI, NO;
`uk()` lists GB. `worldOptOutNoPrompt()` allows every optional category with
no prompt for any known country that matches nothing else. The public guide's
first example ends with `worldOptOutNoPrompt()`.

**Why wrong.** Geo-IP providers return separate ISO 3166-1 codes for
territories where EU law applies in full. MaxMind's GeoLite2 country table
lists `AX` (Åland), `RE` (Réunion), `YT` (Mayotte), `GF` (French Guiana), `MQ`
(Martinique), `MF` (Saint-Martin) and `GP` (Guadeloupe) as their own countries,
each flagged `is_in_european_union=1`. Article 355(1) TFEU applies the Treaties
to Guadeloupe, French Guiana, Martinique, Réunion, Saint-Martin, Mayotte, the
Azores, Madeira and the Canary Islands. The ePrivacy consent rule and the GDPR
apply there, and the CNIL is the competent authority for the French ones. A
visitor from Réunion (about 870,000 people) therefore gets advertising cookies
with no prompt under the documented example pack.

Gibraltar (`GI`) is outside the EU since Brexit but has its own Gibraltar GDPR
and the Communications (Personal Data and Privacy) Regulations 2006. The
Gibraltar Regulatory Authority's Guidance Note GN28 (23 May 2023) says
Regulation 5 requires organisations to "tell individuals which cookies will be
set; explain what the cookies will do; and obtain consent from individuals to
store a cookie on their device", with only the communication and strictly
necessary exemptions. The `GI` code also falls to the world default.

**Location.** `packages/schema/src/shared/policy-runtime.ts` (`EU_COUNTRY_CODES`,
`EEA_COUNTRY_CODES`, `UK_COUNTRY_CODES`); `docs/frameworks/*/concepts/policy-presets.mdx`
"No banner and unknown locations".

**Sources.** TFEU Art. 355(1), https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:12016E355 ;
GeoLite2 country locations table (mirror of MaxMind CSV, rows AX/RE/YT/GF/MQ/MF/GP/GI);
MaxMind field docs for `iso_code` and `is_in_european_union`,
https://dev.maxmind.com/geoip/docs/databases/city-and-country/country-binary/ ;
Cloudflare `CF-IPCountry` is documented as ISO 3166-1 alpha-2,
https://developers.cloudflare.com/fundamentals/reference/http-headers/ ;
GRA GN28 Cookies, https://www.gra.gi/uploads/documents/data-protection/Documents/Guidance/GN28%20Cookies.pdf .

**Correction.** Add `AX`, `GF`, `GP`, `MQ`, `MF`, `RE`, `YT` to the EU list
(they are EU territory, not merely "European"). Add `GI` to a UK-style or
separate consent group; it is not EEA and not GB, but its rule is the same
shape as PECR. Bump `POLICY_MATCH_DATASET_VERSION`. Document in the guide that
the world default is reached by real EU visitors if the dataset is stale, and
list the codes. Unverified in this review and worth a follow-up before claiming
Europe-wide coverage: Faroe Islands (`FO`), Greenland (`GL`), Svalbard (`SJ`),
Jersey (`JE`), Guernsey (`GG`), Isle of Man (`IM`), Monaco (`MC`), Andorra
(`AD`), San Marino (`SM`), Vatican (`VA`), the Western Balkans, Ukraine and
Moldova. Secondary sources say Guernsey and the Isle of Man have cookie
consent rules; I did not read their statutes and do not assert it.

### 2. A missing subdivision without a fallback shows a full consent banner, and country-level rules cannot handle it (design gap, documented incompletely)

**Behavior.** `matchPolicyRules` treats a missing region as insufficient input
whenever any rule in the pack has region matchers for that country. It then
uses the pack's `fallback` rule or returns `insufficient-inputs`. The kernel
turns any non-matched resolution into `safeFallbackPolicyRule()`: opt-in,
`prompt: 'choice'`, strict scope over every optional category.

**Why this matters.** The guide says the failure "denies optional categories".
It does not say the visitor also gets an EU-style choice banner. A pack with
only `californiaOptOut()` and `worldOptOutNoPrompt()` shows that banner to
every US visitor whose geo lookup lacks a state, which is common on mobile
carriers and privacy relays. That is the opposite of the "avoid unnecessary
banners" goal, and it is not a legal requirement anywhere in the US. Country
rules are bypassed entirely on the missing-region path, so an author cannot
write a `US` country rule meaning "any US state I have not listed".

**Location.** `packages/schema/src/shared/policy-resolution.ts` (`matchPolicyRules`,
`safeFallbackPolicyRule`); guide section "No banner and unknown locations".

**Correction.** Two options, both simpler than a per-law model. (a) Let a
country rule serve as the missing-region result when one exists, and use the
fallback only when it does not; document that the author's country rule is
their explicit answer for unknown subdivisions. (b) Keep current behavior and
say in the guide that the safe fallback shows a choice prompt, so a pack with
US state rules must include a fallback rule the author is happy to show to
US visitors without a state. Either way, update the doc sentence.

### 3. Opt-in variants re-prompt opted-out Californians on any policy change (defect for `californiaOptIn` and `usPrivacyStatesOptIn`)

**Behavior.** `deriveChoiceRequirement` returns a `policy-changed` choice
prompt whenever a stored decision's fingerprint no longer matches, regardless
of whether the stored decision was a grant or a denial. The choice fingerprint
changes on `copyRevision`, scope, model and action edits.

**Why wrong.** Civil Code 1798.135(a)(4): for consumers who opt out, the
business must "refrain from selling or sharing the consumer's personal
information ... and wait for at least 12 months before requesting that the
consumer authorize the sale or sharing". A choice banner with Accept All is a
request for authorization. The AG page (updated 28 August 2026) restates the
rule. Colorado is stricter still: after a universal opt-out signal, a
controller may only re-enable sale or targeted advertising through consent
given after "a clear and conspicuous notice" describing the data, purposes and
how to withdraw (CRS 6-1-1306(1)(a)(IV)(C)), and CPA Rule 5.09 says the
absence of a signal after one was sent is not consent. The opt-out variants
with
`prompt: 'none'` are not affected because they never prompt. The guide already
says a receipt lifetime "alone does not prevent policy-change reprompts", so
the limitation is acknowledged, but the opt-in presets ship it as a default.

**Location.** `packages/core/src/consent-record/evaluate.ts`
(`deriveChoiceRequirement`); `policy-rule-presets.ts` (`californiaRule('opt-in')`,
`usPrivacyStatesRule('opt-in')`).

**Sources.** https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.135
(current text, amended by Stats. 2024 ch. 121, effective 1 January 2025);
https://oag.ca.gov/privacy/ccpa (updated 28 August 2026): "Businesses must wait
at least 12 months before asking you to opt back in to the sale or sharing of
your personal information."

**Correction.** Smallest engine change: under a `policy-changed` mismatch,
treat an existing denial as still covering the category and do not raise a
choice prompt for it; only missing or expired grants prompt. If that is too
broad, add a per-rule `reprompt: 'never-after-denial'` flag and set it on the
US opt-in presets. Until then, the US opt-in presets' assumptions should state
the re-prompt behavior and the 12-month rule as an unresolved conflict rather
than a host duty.

### 4. The UK statistics preset cites guidance as if it were statute and omits two statutory limits (docs defect; preset itself defensible)

**Claim.** `ukStatistics()` assumptions: "PECR service-statistics exception
only: aggregate service improvement, no advertising, individual histories or
cross-site tracking. A processor may act solely for this purpose."

**What the statute says.** PECR Schedule A1 paragraph 5, inserted by the Data
(Use and Access) Act 2025 s.112 and Sch. 12, in force 5 February 2026 (SI
2026/82 reg. 2). Conditions: (a) the person provides an information society
service; (b) the sole purpose is to collect information "for statistical
purposes about how the service is used with a view to making improvements to
the service" (or the website); (c) the collected information "is not shared
with any other person except for the purpose of enabling that other person to
assist with making improvements"; (d) clear and comprehensive information;
(e) "a simple means of objecting, free of charge ... and does not object".
Paragraph 5(2): the exception does not cover "collecting or monitoring
information automatically emitted by the terminal equipment" (fingerprinting-
type signals).

**What is guidance.** "No advertising", "no cross-site tracking", "no
individual histories", "aggregate ... cannot use to identify people",
"provider must be a processor, not a joint controller" and "must not link it
with other information" are ICO interpretations in the final Storage and
Access Technologies guidance (April 2026). They are the right reading and the
preset should keep them, but label them as ICO guidance. The ICO also says the
UK GDPR still needs a lawful basis for the personal data involved, and that
individual-level data must not be retained after aggregation.

**Verdict on the preset.** Genuine and reusable. The ICO expressly endorses the
exact UI shape the preset produces: "having your 'statistical purposes' or
'appearance' toggles on by default, with the ability for users to change them
to off at any time", and users may toggle back on. It is a prerequisite, not a
defect, that every included script meets the conditions; GA4 with Google
Signals or ads linking, session-replay tools, conversion attribution and any
provider that uses the data for its own purposes fail them per the ICO
examples table.

**Corrections.** Add the statute as a source
(https://www.legislation.gov.uk/uksi/2003/2426/schedule/A1) beside the ICO
page, which returns 403 to non-browser clients. Rewrite the assumption to
separate statute from guidance. Add the 5(2) exclusion and the UK GDPR lawful-
basis point. Consider a fourth preset or recipe for the paragraph 6 appearance
exception (website-only), since `functionality`/`experience` scripts commonly
qualify and the preset currently denies them.

### 5. Malaysia presets are matched by visitor location, but the PDPA is a business-establishment law (scope defect in docs; preset is still a valid recipe)

**Claim.** `malaysiaStatistics()` and `malaysiaOptIn()` match `MY` visitors.

**What the Act says.** Section 2(1): the Act applies to processing of personal
data "in respect of commercial transactions". Section 2(2): it applies to a
person "established in Malaysia" or a person "not established in Malaysia, but
uses equipment in Malaysia for processing". Section 3(2): "This Act shall not
apply to any personal data processed outside Malaysia unless that personal
data is intended to be further processed in Malaysia." A foreign site serving
Malaysian visitors from foreign infrastructure is generally outside the Act.

**Section 45(2)(c), verified from the official consolidated text.** Personal
data "processed for preparing statistics or carrying out research shall be
exempted from the General Principle, Notice and Choice Principle, Disclosure
Principle and Access Principle and other related provisions of this Act,
provided that such personal data is not processed for any other purpose and
that the resulting statistics or the results of the research are not made
available in a form which identifies the data subject". The Security,
Retention and Data Integrity Principles are not exempted. "Not processed for
any other purpose" is stricter than the UK test: a vendor that reuses the raw
data for its own products breaks it, and the exemption is measured on the data,
not on the output alone.

**Verdict.** The preset encodes a real statutory exemption and its two
conditions correctly. It is not a location rule. It belongs with the DIFC and
ADGM material as a business-regime configuration, selected because the
operator is a Malaysian data user, not because the visitor is in Malaysia.
Keep the object, present it as a documented recipe, and say the applicability
test in the guide.

**Sources.** Act 709 consolidated (Malay and English), sections 2, 3 and 45,
https://www.pdp.gov.my/ppdpv1/wp-content/uploads/2024/07/UNDANG-UNDANG-MALAYSIA_AKTA_PERLINDUNGAN_DATA_PERIBADI_2010_709_MALAY_AND-ENG_V2022.pdf .
Amendment commencement and the General Code are covered in the Southeast Asia
section below.

### 6. The US group notes are already stale on upcoming laws (docs defect)

**Claim.** "Oklahoma starts 1 January 2027 and Alabama 1 May 2027."

**Verified.** Both dates are right. Two more laws were enacted after the
research date the notes assumed and are missing: Louisiana SB 386 (Act 502,
signed 29 May 2026), Section 2: "This Act shall become effective on January 1,
2027"; Vermont Act 145 (S.71, signed 16 June 2026), effective 1 January 2028.
Connecticut SB 1295 took effect 1 July 2026 and, per the enacted text reported
by multiple sources, prohibits targeted advertising and sale of minors' data
regardless of consent and lowers the applicability threshold to 35,000
consumers. The effective 20-state list itself is confirmed correct as of today
(Louisiana, Oklahoma, Alabama and Vermont are all future-dated). Arkansas HB
1717 (1 July 2026) is a children's and teens' law, not a comprehensive law,
and is correctly excluded.

**Sources.** Louisiana enrolled SB 386,
https://www.legis.la.gov/Legis/ViewDocument.aspx?d=1475339 ; Vermont Act 145
summary, https://legislature.vermont.gov/Documents/2026/Docs/ACTS/ACT145/ACT145%20Act%20Summary.pdf ;
Oklahoma and Alabama as cited in `americas.md` (not re-fetched; dates match
independent reports).

**Correction.** Add Louisiana and Vermont to the preset assumption and the
guide's review paragraph. Add the Connecticut minors prohibition to the list
of things consent cannot cure, beside Maryland.

### 7. Switzerland no-prompt preset needs two more exclusions (prerequisite, documented incompletely)

**Verified from the FDPIC guide v1.1 (6 October 2025).** Section 3.10.2:
unexpected use on sites with political, religious or trade-union content
requires express consent. The landing page for v1.1 adds that giving paid third
parties embedded on many sites access to visitor data "constitutes a
particularly intensive intrusion" and personalised advertising via third-party
cookies often needs consent because it enables high-risk profiling. Section
3.8.2 allows statistics under Art. 31(2)(e) FADP with anonymisation "as soon
as possible" and external tools only "on the website operator's behalf and not
for their own purposes". Section 3.7.2: the Art. 45c TCA opt-out is mandatory
for every non-essential cookie.

**Correction.** The `switzerlandOptOutNoPrompt()` assumptions should name
third-party advertising networks and sensitive-content sites as excluded, not
only "high-risk profiling". The guide's Switzerland paragraph should say the
same.

## Medium and low findings

### Presets and docs

- **Japan scope.** Article 27-12 applies only to telecommunications businesses
  providing services the MIC ordinance lists (messaging, SNS and similar
  platforms, search, online information provision such as news). MIC FAQ Q1-12
  and Q1-13: a retailer's own site, including an online-only retailer, is not
  covered. The duty is notice or publication; consent and opt-out are
  exemptions from that duty, not alternatives. `japanOptOut()` text is
  compatible but should say most corporate sites are outside 27-12 and that
  APPI still governs. The 2026 APPI amendment (passed 10 July 2026, promulgated
  17 July 2026, in force within two years) treats contactable identifiers
  including cookie IDs as regulated personal related information for the new
  improper-use rule; set the review date accordingly.
- **Australia.** OAIC's pixel guidance (4 November 2024) supports
  `australiaOptOut()`: the Privacy Act "does not prohibit the use of tracking
  pixels"; a banner is one suggested APP 5 delivery method, not a requirement;
  APP 7 applies to targeted online advertising and the guidance recommends an
  opt-out. Sensitive information needs express consent. Tranche 2 (fair and
  reasonable test) is an exposure draft dated 31 August 2026, not law; the
  Children's Online Privacy Code is due by 10 December 2026. Both belong in the
  review-by note.
- **Canada.** OPC opt-out conditions verified verbatim. The page's "modified
  2025-08-11" stamp is a site republish; the substance is the 2011 guidance.
  Bill C-36 (successor to C-27) was introduced 15 June 2026 and is at second
  reading; PIPEDA is unchanged. No 2025 or 2026 amendment to Alberta PIPA ss.7
  to 8 or BC PIPA ss.6 to 8; Alberta's and BC's 2025 and 2026 bills are public-
  sector. BC PIPA s.8(3) and Alberta PIPA s.8(3) both permit opt-out consent
  with notice and "a reasonable opportunity to decline". The notice default for
  `canadaOptOut()` is well grounded.
- **Brazil.** ANPD's cookie guide (October 2022, unchanged) ties legitimate
  interest generally to strictly necessary cookies and supports first-party
  aggregated audience measurement only through one public-sector example; it
  favours consent for advertising cookies, especially third-party. The
  `brazilAudience` recipe in the guide matches that example. The guide's model
  buttons are "Rejeitar cookies não necessários / Aceitar todos os cookies /
  Selecionar cookies"; an accept-only banner is called non-compliant.
- **South Korea.** PIPA Art. 15(1)6 legitimate interest verified; the old
  Art. 39-3 online-provider consent rule was removed in 2023 and must not be
  cited. Amendment Act 21445 enters into force 11 September 2026; the English
  translation lags it. The July 2026 TikTok decision is verified (pixel and SDK
  collection without basis, account linking, bundled consent, transfer
  disclosure failures). PIPC's promised revised behavioural-advertising
  guideline was not published; the 2024 press release remains the position.
- **India.** G.S.R. 843(E) and 846(E), both dated 13 November 2025: sections 3
  to 5, 6(1) to (8), 7 to 17 and the operative rules commence eighteen months
  later, 13 May 2027; Consent Manager registration after twelve months; s.43A
  IT Act and the SPDI Rules stay in force until then. The preset cites a PIB
  workshop release that contains one relevant sentence; cite the gazette
  notifications instead.
- **China.** PIPL Arts. 13 to 17, 23, 24, 29, 31 and 39 and NDSMR Arts. 21 to
  24 and 42 verified from CAC and gov.cn texts. No 2025 or 2026 instrument
  regulates cookies specifically; the 2026 special action adds an internet-
  advertising and SDK enforcement track, and the August 2026 large-handler draft
  would require an SDK inventory and a working personalised-recommendation
  switch. Nothing changes the consent-plus-refusal structure the preset assumes.
- **UAE.** The Executive Regulations article is Art. 28; Art. 29 is the six-
  month regularisation clock that starts when they issue. No primary evidence
  they exist; Chambers (March 2026) says they do not. The 2025 Child Digital
  Safety decree (No. 26 of 2025, in force 1 January 2026) restricts data use
  and targeted advertising for children under 13 with parental-consent
  conditions; "child" is under 18 for other purposes. `asia-pacific.md` should
  say Art. 28 and under-13.
- **DIFC.** The enacted 2025 amendment (Amendment Law No. 1 of 2025, effective
  15 July 2025) removes the "other than on an occasional basis" carve-out and
  the physical-location test. It does not add the goods-and-services or
  behaviour-monitoring limb that the consultation draft proposed.
  `asia-pacific.md`'s caution is correct and can now be stated positively.
  Regulation 9 verified: analytics cookies are within "behavioural advertising",
  refusal must be offered at first collection, defaults must be minimum
  necessary with colour-neutral controls, and pre-ticked boxes, silence and
  inactivity are not consent.
- **ADGM.** Direct-marketing objection is DPR s.19(3) to (4), not "Art. 21".
  The 2025 amendment concerns special-category data only.
- **Saudi Arabia.** Consent for marketing is Law Art. 26; the opt-out mechanism
  is Implementing Regulation Art. 29. No adopted regulation amendment and no
  SDAIA cookie guidance were found; the 2025 consultation did not produce a
  published amended text that I could locate.
- **Netherlands.** Telecommunicatiewet 11.7a(3)(b) verified (no or minor
  privacy impact). No current AP text says Google Analytics can qualify; the
  2018 handleiding is gone. The guide does not make that claim; keep it that
  way.
- **Liechtenstein.** KomG Art. 61(4)(b) as enacted exempts what is strictly
  necessary for an "audiovisuellen Mediendienst", not an information society
  service. The statistics route is Datenschutzstelle guidance on GDPR Art.
  6(1)(f) with an Art. 21 objection, not a statutory exception. `europe.md`
  should say so.
- **Iceland.** Act 70/2022 Art. 88 requires "upplýstu samþykki" (informed
  consent) with no GDPR cross-reference, and its exception is "technical
  storage for a lawful purpose with the user's knowledge", looser than the
  ePrivacy strictly-necessary test. `europe.md` overstates precision here.
- **Norway.** Verified; the act is LOV-2024-12-13-76, in force 1 January 2025.
- **Türkiye.** Decision 2022/229 ordered opt-in for functional, performance and
  advertising cookies "if no processing condition other than explicit consent
  exists"; the 2025 guide s.5.9 says first-party analytics "may" fall under
  Criterion B with anonymous output, IP masking, no cross-site tracking,
  reasonable lifetime and no transfer to third parties. The recipe in the guide
  is consistent; the assumption text in `turkeyOptIn()` should keep the hedge.
- **Quebec.** s.8.1 and s.9.1 verified from the enacted 2021 c.25 text; in
  force 22 September 2023; s.9.1 excludes browser cookie settings. CAI guideline
  B.4: identification, location and profiling functions must be off by default.
- **EDPB.** Taskforce report para 8 records a majority position and concerns
  any layer "with a consent button"; Guidelines 05/2020 v1.1 remain current.

### Engine and UI

- **Mixed exempt analytics and consent advertising.** Confirmed unsupported.
  `model` is per rule; a strict scope of `['measurement']` under opt-out makes
  marketing permanently ungrantable (out-of-scope positive saves are rejected in
  `recordCategoryPatch`), and an opt-in rule cannot default a category to
  allowed (`preselectedCategories` affects display only). The docs say this
  honestly. The smallest fix is a per-category default: an opt-in rule with
  `defaults: { measurement: 'allowed' }` (or `exemptCategories`) whose members
  start permitted, are excluded from the choice-prompt requirement, and remain
  toggleable. That is one field, not a new model.
- **Notice prompt.** Under `prompt: 'notice'` the banner renders the notice
  copy, an "OK" dismissal via `common.acknowledge`, and one underlined-text
  `<button>` that opens preferences. Dismissal records no grant. This matches
  the OPC opt-out route and the ICO's description of an on-by-default toggle.
  It is not a CCPA "Do Not Sell or Share" link: 1798.135(a)(1) requires the
  link "on the business' internet homepages" and CalPrivacy's FAQ says "in the
  footer or header"; a banner control that disappears on dismissal does not
  satisfy that. The guide says this; keep it.
- **Message profile.** `i18n.messageProfile: 'preferences'` is set by
  `countryOptOut` and by the world and Swiss presets, so every non-US opt-out
  preset uses "Manage preferences". `usPrivacyStatesOptOut()` uses "Do not sell
  or share my data" for all 20 states. Only California uses "sell or share";
  the other 19 use "sale" and "targeted advertising". No state prescribes the
  banner wording, so this is a copy choice, not a defect, but a
  `us-privacy` profile with "Opt out of sale and targeted advertising" would
  be more accurate outside California.
- **GPC.** The product mapping (deny marketing and measurement) is a sensible
  superset. Note that in California an opt-out preference signal is also a
  request to limit sensitive personal information use (1798.135(b)(1)), which
  no category models; the assumptions should say so.
- **Kernel handling of `failed`.** Verified: `resolveEffectivePolicy` adopts
  the safe fallback for every non-matched status. See finding 2.

## Country and regional table

Status: **verified** means the primary source supports the preset's stated
behavior; **conditional** means the preset is defensible only when the named
prerequisite holds; **incorrect** means the preset or its docs state something
the source contradicts; **unverified** means I could not read the operative
text or the claim was not checked. "Necessary UI" is the minimum initial UI the
law itself requires for ordinary optional tracking, separate from what the
preset renders.

| Jurisdiction | Status | Recommended behavior for optional tracking | Necessary UI |
| --- | --- | --- | --- |
| EEA baseline (ePrivacy 5(3), GDPR) | verified | Opt-in choice | Choice before non-exempt storage |
| EU outermost regions, Åland (AX GF GP MQ MF RE YT) | incorrect (matcher) | Same as EEA | Choice |
| Gibraltar (GI) | incorrect (matcher) | Opt-in choice | Choice |
| France | verified | Opt-in; audience-measurement exemption recipe | Choice, or none for exempt measurement with information |
| Netherlands | verified | Opt-in; minor-impact analytics recipe | Choice, or none for exempt analytics |
| Germany | verified | Opt-in only | Choice |
| Norway | verified | Opt-in only | Choice |
| Iceland | conditional | Opt-in | Choice; statutory exception wording is looser than ePrivacy |
| Liechtenstein | conditional | Opt-in; statistics route is regulator guidance on GDPR 6(1)(f) | Choice, or none for anonymous statistics with information |
| United Kingdom | verified | Opt-in for advertising; statistics-only recipe or preset | Choice, or none for exempt purposes with information and free objection |
| Switzerland | conditional | Opt-in for third-party ads and high-risk profiling; opt-out with information and refusal otherwise | None with Art. 45c information and refusal; prominent notice for unexpected uses |
| Türkiye | conditional | Opt-in; first-party cookie statistics recipe | Choice; information at entry always |
| Quebec | verified | Opt-in for identification, location, profiling functions | Choice; functions off by default |
| Canada outside Quebec | verified | Opt-out with notice for non-sensitive behavioral ads; opt-in for sensitive or unexpected | Prominent information at or before collection; immediate persistent opt-out |
| US 20-state group | verified (list) | Opt-out, no prompt, persistent rights, GPC | None; privacy notice and opt-out method |
| California | verified | Opt-out, no prompt, GPC | Homepage link or honored opt-out signal; no banner |
| Maryland, Connecticut (from 1 July 2026), Delaware, Colorado (minors) | conditional | Same as group; minors and minimization limits cannot be consented around | None; California must display whether a signal was honored |
| US other states (NY etc.) | conditional | World default is a product choice | None; sector laws apply |
| Louisiana, Oklahoma, Alabama, Vermont | verified (future) | Add on 1 Jan 2027, 1 Jan 2027, 1 May 2027, 1 Jan 2028 | None |
| Brazil | verified | Opt-in; assessed audience recipe | Choice for ads; none for assessed first-party aggregate measurement with information and objection |
| Australia | verified | Opt-out with notice for expected non-sensitive; opt-in for sensitive | None; APP 5 notice by any method |
| Japan | verified | Opt-out, no prompt, where APPI consent triggers absent; 27-12 publication if covered | None for most corporate sites; notice or publication for covered services |
| China mainland | verified | Opt-in; independent separate consents | Choice |
| South Korea | conditional | Opt-in for identifiable; non-identifying recipe possible | Choice for identifiable tracking |
| India | verified (dated) | Opt-in ready; current-law custom until 13 May 2027 | None today for non-sensitive; consent from 13 May 2027 |
| Singapore | verified | Opt-in for personal-data ad targeting; exceptions by assessment | Choice for ad targeting; none for non-personal or requested |
| Malaysia | verified (law), incorrect (scope framing) | Opt-in starter; statistics recipe for Malaysian data users | Choice when consent is the basis; none under s.45(2)(c) |
| Thailand | verified | Opt-in; assessed s.24 recipe | Choice when consent is the basis; no cookie-specific PDPC guidance found |
| Indonesia | verified (law); conditional (PP 33/2026 unread) | Opt-in; assessed Art. 20 recipe | Choice when consent is the basis |
| Philippines | verified | Opt-in; assessed legitimate-interest recipe | None mandated; pop-ups optional per AO 2017-047 |
| Vietnam | verified | Opt-in for behavioral advertising | Choice; refusal mechanism required |
| Brunei | verified | Opt-in; timed notification unsupported | Choice, or none after a lapsed s.12 notification period |
| Laos | partially verified | Opt-in approval starter | Choice; Art. 12 approval before collection |
| UAE federal | conditional | Opt-in | Choice |
| DIFC | verified | Opt-in profile by business regime | First-collection refusal; minimum defaults |
| ADGM | verified | Opt-in or assessed legitimate-interest opt-out by business regime | Objection to direct marketing |
| Saudi Arabia | verified | Opt-in for marketing; assessed Art. 16 analytics recipe | Choice for marketing |
| Everywhere else | unverified | World default is a product choice, not a finding | Unknown |

Rows for the US group are refined in the US section below.

## Preset disposition

**Ship unchanged**
- `europeOptIn()`, `europeIab()` — after the matcher fix in finding 1.
- `quebecOptIn()`.
- `canadaOptIn()`, `canadaOptOut()`.
- `australiaOptIn()`, `australiaOptOut()`.
- `japanOptIn()`, `japanOptOut()` (assumption wording only).
- `chinaOptIn()`, `southKoreaOptIn()`, `brazilOptIn()`, `turkeyOptIn()`,
  `indonesiaOptIn()`, `thailandOptIn()`, `philippinesOptIn()`,
  `vietnamOptIn()`, `bruneiOptIn()`, `laosOptIn()`, `singaporeOptIn()`,
  `malaysiaOptIn()`, `indiaOptIn()`, `uaeOptIn()`, `saudiArabiaOptIn()` — as
  consent starters they assert nothing false. Their value as separate exports
  is low (see the pack proposal).

**Change**
- `usPrivacyStatesOptOut()` / `usPrivacyStatesOptIn()`: add Louisiana and
  Vermont to the upcoming list; add the Connecticut minors prohibition; note the
  California sensitive-information signal; for the opt-in variant, state the
  re-prompt conflict (finding 3) until the engine fix lands.
- `californiaOptIn()`: same re-prompt note.
- `ukStatistics()`: cite the statute; separate statute from guidance; add the
  5(2) exclusion and the UK GDPR lawful-basis point.
- `switzerlandOptOutNoPrompt()`: exclude third-party advertising networks and
  sensitive-content sites explicitly.
- `worldOptOutNoPrompt()`: assumptions should list the verified uncovered
  European codes until the matcher is fixed, and say the rule is reached by
  EU visitors when the dataset is stale.

**Become documented recipes rather than public presets**
- `malaysiaStatistics()`: correct in law, wrong as a location rule. Keep the
  object in the guide's Malaysia section with the s.2 and s.3(2) applicability
  test.
- `switzerlandOptOutNoPrompt()` could also live as a recipe; it is defensible
  as a preset only because Art. 45c makes the refusal control mandatory and
  the preset renders it.

**Remove**
- None. No preset asserts a consent requirement that does not exist or an
  allowance the source contradicts, once the changes above land.

## Documented limitations: are they sufficient and honest?

Yes, with three gaps. The guide and the research notes correctly say that one
model per rule cannot express exempt analytics plus consent advertising, that
timed deemed consent (Singapore s.15A, Brunei s.12) is not implemented, and
that China's separate consents, child permissions and prohibitions are
application gates. The gaps:

1. The safe-fallback choice banner on a missing subdivision (finding 2) is not
   stated.
2. The policy-change re-prompt after a denial (finding 3) is stated as a host
   duty; it is an engine behavior the US opt-in presets trigger by default.
3. The world default's exposure to EU territories (finding 1) is a matcher
   omission, not a "known uncovered location" the host chose.

Defaults that enable operations before the host could establish permission:
`worldOptOutNoPrompt()` for the codes in finding 1; `canadaOptOut()`,
`australiaOptOut()`, `japanOptOut()` and `switzerlandOptOutNoPrompt()` enable
all four optional categories including `marketing` on load, which is lawful
only under the conditions each assumption lists. That is by design and is
documented; the risk is that a host adds a third-party ad pixel to `marketing`
without reading the assumptions. A scoped default (measurement only) for the
opt-out country variants would be safer and is one line per preset.

## Organisation: packs, overrides and analytics profiles

The proposed structure (small curated packs returning ordinary rules, country
overrides, specialist analytics profiles) is the right direction. It should
group by **behavioral shape**, not by country, and keep legal differences in
`review` metadata and the guide. Four shapes cover every preset in the file:

| Shape | Model, prompt, scope | Members today |
| --- | --- | --- |
| Consent-first | opt-in, choice, all | EEA, UK ads, CH consent, TR, QC, BR, CN, KR, IN, SG, MY, TH, ID, PH, VN, BN, LA, AE, SA, US opt-in variants |
| Rights-first | opt-out, none, all, persistent rights, optional GPC | US group, CA-US, AU, JP, CH no-prompt, world |
| Notice-first | opt-out, notice, all | Canada outside Quebec, optional US notice |
| Statistics-only | opt-out, none, measurement, strict | UK, MY, and the FR, NL, LI, TR, BR, KR, SA recipes |

A pack is an ordered list of shape instances with matchers and review metadata:
`consentFirst({ match, review })`, `rightsFirst({ match, gpc, review })`,
`noticeFirst(...)`, `statisticsOnly(...)`. Country presets become one-line
calls that supply the matcher and sources, so the 18 near-identical
`countryOptIn` exports collapse into data. This is simpler than a rule per
statutory exception and does not hide differences: the sources and assumptions
travel with each instance, and the guide's per-country sections stay. Country
overrides (California before the US group, Quebec before Canada, UK statistics
before Europe) are just ordering, which the resolver already honors.

Two things a pack helper should refuse to do: silently include a rights-first
rule for a code whose law is consent-first (finding 1), and ship the world
default without the author naming it. Keep `worldOptOutNoPrompt()` an explicit
opt-in to the pack.

## Corrections to the existing research notes

- `europe.md`: Liechtenstein Art. 61(4)(b) says "audiovisuellen
  Mediendienst"; the statistics route is guidance, not statute. Iceland's
  standard and exception wording differ from ePrivacy. Add the PECR Schedule
  A1 statute cite and the 5(2) exclusion. Add the EU outermost regions and
  Gibraltar to the coverage discussion.
- `americas.md`: add Louisiana (1 Jan 2027) and Vermont (1 Jan 2028); note
  Connecticut SB 1295 (1 July 2026), Maryland Ch. 874 (1 July 2026), Delaware
  s.12D-106(a)(7) teens, Colorado SB 24-041 minors (1 Oct 2025) and New
  Hampshire HB 1460 (1 Jan 2027). The 1798.135 cite should be (a)(4) for the
  12-month rule; (a)(5) is the under-16 rule. Colorado re-consent is
  s.6-1-1306(1)(a)(IV)(C) and Rule 5.09, not s.6-1-1308. Nevada's sale opt-out
  is NRS 603A.345, not .340. Section cites for Minnesota, Delaware and Oregon
  are corrected in the US section. Virginia's GPC claim is settled: not
  required. New Hampshire and New Jersey GPC duties could not be read from
  primary text in this review. State that the opt-in presets re-prompt on
  policy change.
- `asia-pacific.md`: UAE Executive Regulations are Art. 28 (Art. 29 is the
  regularisation period); child decree is No. 26 of 2025 and its data and
  targeted-ad rule is for under-13s; DIFC 2025 amendment scope as stated above;
  ADGM objection is s.19; Saudi opt-out is Implementing Regulation Art. 29;
  Japan 27-12 does not reach ordinary corporate sites; APPI 2026 amendment and
  Korean Act 21445 need review dates; Australia Tranche 2 exposure draft 31
  August 2026.
- `southeast-asia.md`: Malaysia s.2 and s.3(2) applicability; s.45(2)(c)
  leaves Security, Retention and Data Integrity in force. Remaining items are
  in the Southeast Asia section below.
- `README.md` coverage paragraph: add the EU territories and Gibraltar to the
  list of places that are not covered by the Europe matcher, and correct the
  claim that "Europe supplies the fallback for an unknown country" to note that
  a known but unlisted EU territory code does not reach that fallback.

## Southeast Asia: verification detail

All items below were read from primary documents unless marked otherwise.

- **Malaysia amendment commencement (P.U. (B) 522, 24 December 2024).**
  1 January 2025: A1727 ss.7, 11, 13, 14 (housekeeping and savings of
  registered codes). 1 April 2025: ss.2, 3, 4, 5, 8, 10, 12 (the "data
  controller" rename, biometric data, processor security duty under new
  s.5(1A), cross-border rewrite of s.129). 1 June 2025: ss.6 and 9 (DPO
  appointment s.12A, breach notification s.12B, portability s.43A).
  `southeast-asia.md` gives the three dates without the mapping; the
  processor and cross-border changes belong to April, not January.
- **Malaysia General Code.** The URL cited in `malaysiaOptIn()` and the guide
  (`.../jpdpv2/assets/2023/01/28.12.2022-FINAL-PRINTING-COP-BI.pdf`) now
  redirects to the regulator's homepage. The official page links only a
  47 MB image-only scan with no text layer. The content claims (s.1.1.2 scope,
  s.1.2.1 binding force, s.3.3.3(b) consent by conduct including non-objection,
  voluntary disclosure and continued use, s.4.2 notice is not blanket consent,
  s.10.6.3 to 10.6.4 direct marketing bases) are verified against a text copy
  with the same title and foreword. The 15 December 2022 registration date is
  secondary only. Replace the dead link with the official page URL and say the
  registration date is unconfirmed. Section 10.6.4 lists permitted bases; the
  opt-out itself is Act s.43.
- **Malaysia 2026 Data Protection by Design Guideline** (Department of Personal
  Data Protection, April 2026 file path, issuance date not printed) is the only
  regulator document that addresses cookies: "by default, only the strictly
  necessary cookies used by the online platform are active. The additional
  cookies are activated only when the customer consents to their use", an
  opt-in checkbox "by default unchecked", and cookie pop-up overload listed as
  deceptive design. This is guidance, not a change to s.6 or s.45, but it cuts
  against reading the General Code's consent-by-conduct as authority for
  running trackers on load. The guide's Malaysia contextual recipe should cite
  it and should not describe non-objection as covering third-party trackers.
- **Regulations 2013 reg. 3 and Act s.7(3)** verified: consent "in any form
  that such consent can be recorded and maintained properly", distinguishable
  from other matters, burden of proof on the controller; notice "in the
  national and English languages".
- **Singapore Key Concepts** at the "17-may-2022" URL is the revision of
  29 April 2026 (cover and running headers). s.15A(4) verified: assessment,
  notification of intention, purpose and "a reasonable period within which,
  and a reasonable manner by which" to opt out; consent is deemed only after
  the period lapses; Regulations 2021 reg. 13 excludes direct marketing
  messages. Legitimate interests (First Schedule Part 3 para. 1) and business
  improvement (Part 5) verified with their direct-marketing exclusions;
  business improvement applies to data "collected in accordance with the Data
  Protection Provisions" already. Selected Topics paras. 7.9, 7.10, 7.12,
  7.13 and 7.14 verified (revised 23 May 2024). The preset's statements are
  accurate.
- **Thailand** PDPA ss.19, 24(1), 24(5), 26 and 32 verified from the MDES
  translation. No cookie-specific PDPC notification was found; the 2022
  consent guideline does not mention cookies. pdpc.or.th was INACCESSIBLE.
  Vendor claims of a "PDPC cookie banner rule" are unsupported.
- **Indonesia** Law 27/2022 Arts. 20(2), 21 to 24, 40(2) and 74 verified from
  the official scan. Implementing regulation PP 33/2026 (16 July 2026,
  effective six months later) is reported by Indonesian legal databases; the
  government copy was INACCESSIBLE, so its cookie relevance is unknown. The
  supervisory body was not yet established as of the latest reports (February
  and July 2026). Add PP 33/2026 to the review-by note.
- **Philippines** Circular 2023-04 s.10(A) says "Non-response or implied
  consent does not constitute valid consent" and s.10(C) allows continued use
  of a specifically described service as assent; the words "silence" and
  "pre-ticked" do not appear. Advisory Opinion 2017-047: pop-ups "while not
  required, may serve as notice". Circular 2023-07 verified. No 2024 to 2026
  cookie-specific issuance in the NPC list. privacy.gov.ph was reachable only
  via an archive snapshot.
- **Vietnam** Law 91/2025 Art. 9(3) to (4) (per-purpose consent, no bundling,
  silence is not consent), Art. 19(1) exceptions (no legitimate-interest
  ground), Art. 28(8) (consent before collecting through website or app
  tracking for behavioral, targeted or personalised advertising, plus a
  refusal mechanism and retention limits) and Art. 29(3) to (4) (cookie refusal
  and "do not track" options for social networks and online media services)
  verified. The official signed PDFs are image-only, so the quotes come from a
  text transcription; mark as such. Decree 356/2025 Art. 6 verified from the
  Công báo text and Art. 42 repeals Decree 13/2023. The preset text is
  accurate.
- **Brunei** PDPO 2025 ss.8, 11, 12 (deemed consent by notification with the
  direct-marketing exclusion inside s.12(2)), 13, 17 and Schedule 1 Part 3
  verified from the gazette; S 11/2025 commences Parts 3 to 9, s.42 and
  Schedules 1 to 5 on 1 January 2026. The agc.gov.bn certificate has expired.
- **Laos** Law 25/NA Art. 12 verified from the Ministry portal: collection
  must be approved by the data owner after purpose and detail are given to the
  owner and the authorities. No newer personal data protection law exists;
  search results attributing one to Laos are a misfiled Vietnam article. A
  2025 Cybersecurity Law is reported (secondary only).

## United States: verification detail

Official legislature hosts for New Hampshire, New Jersey, Rhode Island,
Nebraska, Oregon, Tennessee and Nevada blocked or timed out; those rows rely
on code mirrors (FindLaw, public.law) and are marked so. Everything else was
read from the official text.

**Effective 20-state list.** Confirmed correct as of today. No other
comprehensive law is both enacted and effective. Pennsylvania HB 78 is at
second consideration in the Senate; Maine LD 1822 died; Massachusetts bills
are in committee. Enacted but future: Louisiana and Oklahoma (1 January 2027),
Alabama (1 May 2027), Vermont (1 January 2028).

**Universal opt-out signal (GPC) duties.** Statutory cite, status and source
quality:

| State | Required to honor a signal? | Cite | Source quality |
| --- | --- | --- | --- |
| California | Yes | Civ. Code 1798.135(b)(1); CPPA regs s.7025 | official |
| Colorado | Yes, from 1 July 2024 | CRS 6-1-1306(1)(a)(IV)(B); 4 CCR 904-3 Rules 5.06 to 5.09 | rules official; statute mirror |
| Connecticut | Yes (per prior note) | not re-read this review | unverified here |
| Delaware | Yes, from 1 January 2026 | 6 Del. C. s.12D-106(e)(1)a.2 | official |
| Minnesota | Yes, from 31 July 2025 | Minn. Stat. s.325M.14 subd. 3 | official |
| Montana | Yes, from 1 January 2025 | MCA s.30-14-2809 | official |
| New Hampshire | Reported yes | RSA 507-H:6 | INACCESSIBLE (host blocks) |
| New Jersey | Reported yes | P.L.2023 c.266 | INACCESSIBLE (host blocks) |
| Oregon | Yes, from 1 January 2026 | ORS 646A.578(5)(c) | mirror with official operative note |
| Maryland | Permissive: a signal is one of two methods a controller "may utilize" | Com. Law s.14-4707(f)(3); (g)(2) | official |
| Nebraska | Agent designation by technology, with residency and verification conditions | s.87-1111(5) to (6) | mirror |
| Texas | Same shape as Nebraska | Bus. & Com. Code s.541.055(e) to (f) | mirror |
| Virginia | No; the 2026 amendment (Ch. 820, eff. 1 July 2026) adds only a precise-geolocation sale ban | s.59.1-577, s.59.1-578 | official |
| Kentucky | No; note a successor s.367.3617 takes effect 1 July 2027 | KRS 367.3617(4) | official |
| Rhode Island | No | s.6-48.1-5(e)(4), (f) | mirror |
| Tennessee | No | s.47-18-3304, -3305 | mirror |
| Utah | No | s.13-61-302(1)(b) | official |
| Iowa | No | s.715D.4(6) | official |
| Indiana | No | IC 24-15-4-4 | mirror |
| Florida | No | s.501.702 et seq. | official (controller test verified) |

The preset's product choice to honor GPC in all 20 states remains sound. The
research note's section numbers for Minnesota (325M.11), Delaware
(12D-104(a)(6)) and Oregon (646A.574) point at definitions or the plain opt-out
right, not the signal duty; correct them.

**California regulations effective 1 January 2026** (CPPA approved text, OAL
22 September 2025). Three items bear on c15t:

- s.7025(c)(6) now says a business "must display whether it has processed the
  consumer's opt-out preference signal as a valid request to opt-out of
  sale/sharing on its website" (previously "may"; the example is "Opt-Out
  Preference Signal Honored"). The reviewing agent read this from a flattened
  approved-text PDF and flagged the direction as inferred from markup order, so
  confirm against the OAL-published Title 11 text before relying on it. If
  confirmed, the stock UI's restriction notice, which appears only for a saved
  and restricted grant, does not meet it on its own; the guide should tell
  hosts to render a persistent signal-status indicator when GPC is active.
- s.7025(f)(3): a business processing the signal frictionlessly must not
  "display a notification, pop-up, text, graphic, animation, sound, video, or
  any interstitial content in response to the opt-out preference signal". The
  opt-out presets comply (no prompt). An opt-in variant that shows a choice
  banner to a GPC user is not "in response to the signal", but it does forgo
  the frictionless route and therefore the s.7025(g) exemption from the
  homepage link.
- s.7004(a)(2)(C): a banner offering only "Accept All" and "Preferences" is
  not a symmetrical choice; "Accept All" and "Decline All" is. This applies to
  consent requests. The notice prompt's "OK" is an acknowledgement under a rule
  that grants nothing, so it is not a consent choice, but a host that relabels
  the dismissal "Accept All" would create exactly the asymmetry the rule
  names. Keep "OK".
- s.7013(c) to (d): the link must sit in the header or footer of the homepage,
  or be replaced by the alternative link or frictionless signal processing.
  The banner's underlined control is neither. The guide already says this.

**Maryland.** s.14-4707(b)(1)(i) verified: collection limited to what is
"reasonably necessary and proportionate to provide or maintain a specific
product or service requested by the consumer"; (a)(1) applies the "strictly
necessary" test to sensitive data; (a)(2) bans sale of sensitive data;
(a)(4) to (5) ban targeted advertising and sale where the controller "knew or
should have known that the consumer is under the age of 18 years". Effective
1 October 2025, not applying to processing before 1 April 2026. SB 569 (2026)
died in committee. HB 711 was enacted as Ch. 874, effective 1 July 2026: it
adds inferred data to "sensitive data" and restricts sales for immigration
enforcement. Neither changes the preset's assumptions; `americas.md` should
record Ch. 874.

**Colorado.** s.6-1-1308(7) consent for sensitive data verified. The
re-consent clause is s.6-1-1306(1)(a)(IV)(C), not s.6-1-1308. Rule 5.08(A)
(effective 1 July 2024) requires treating a signal as a valid opt-out for the
browser or device and, if known, the consumer; 5.08(D) bars requiring login;
5.09 bars reading a missing signal as consent. SB 24-041 took effect
1 October 2025: no targeted advertising, sale or profiling of a known minor
without the minor's consent.

**Iowa and Utah.** s.715D.4(2) and s.13-61-302(3) verified: sensitive data may
be processed after "clear notice and an opportunity to opt out", unlike the
consent rule in most peers. The preset's "ordinary adult nonsensitive" framing
is correct; the research note's description matches the text.

**Nevada and Washington.** NRS 603A.345 (not .340) provides the verified
request not to sell covered information; the narrow "sale" definition in
603A.316 was INACCESSIBLE. RCW 19.373.030 requires consent to collect and,
separately, to share consumer health data beyond what the consumer requested;
19.373.070 requires a separate signed "valid authorization" for any sale;
19.373.010(23) applies to any entity that conducts business in Washington or
targets Washington consumers, with no revenue threshold. Both are correctly
described in `americas.md` as duties outside the 20-state group that a cookie
category cannot implement.

**Florida.** s.501.702(9) verified: over $1 billion global revenue plus one of
the three platform tests. Including FL in the group is a voluntary broader
choice, as the note says.

## Source index

Primary documents read in this review, grouped by region. URLs are the ones
fetched; several official hosts required a browser user agent or a local PDF
extraction.

Europe and UK
- PECR reg. 6 and Schedule A1 (as amended 5 February 2026): https://www.legislation.gov.uk/uksi/2003/2426/regulation/6 ; https://www.legislation.gov.uk/uksi/2003/2426/schedule/A1
- SI 2026/82 reg. 2: https://www.legislation.gov.uk/uksi/2026/82/regulation/2/made
- ICO Storage and Access Technologies guidance, exceptions (April 2026): https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-the-use-of-storage-and-access-technologies/what-are-the-exceptions/
- ePrivacy Art. 5(3) (retained-law copy): https://www.legislation.gov.uk/eudr/2002/58/article/5
- CNIL audience-measurement page (4 July 2025) and consolidated recommendation (16 January 2026): https://www.cnil.fr/fr/cookies-solutions-pour-les-outils-de-mesure-daudience ; https://www.cnil.fr/sites/default/files/2026-01/recommandation_cookies_consolidee.pdf
- Telecommunicatiewet 11.7a: https://wetten.overheid.nl/BWBR0009950/2026-08-15 ; AP normuitleg (5 March 2024)
- TDDDG s.25: https://www.gesetze-im-internet.de/ttdsg/__25.html ; BfDI Einwilligungsverwaltung page
- Ekomloven s.3-15 (LOV-2024-12-13-76): https://lovdata.no/dokument/NL/lov/2024-12-13-76/KAPITTEL_3
- Iceland Act 70/2022 Art. 88: https://www.althingi.is/lagas/nuna/2022070.html
- Liechtenstein KomG (LGBl. 2023 Nr. 216, as of 1 February 2025): https://www.gesetze.li/konso/pdf/2023216000 ; Datenschutzstelle cookies page
- FDPIC guide v1.1 (6 October 2025) and landing page: https://www.edoeb.admin.ch/en/cookie-guidelines-updated-version
- KVKK cookie guide (2025 edition), decisions 2022/229 and 2022/1358: https://www.kvkk.gov.tr/Icerik/7353/Cerez-Uygulamalari-Hakkinda-Rehber ; https://www.kvkk.gov.tr/Icerik/7275/2022-229 ; https://www.kvkk.gov.tr/Icerik/7595/2022-1358
- Quebec 2021 c.25 (ss.102, 108, 175): https://www.publicationsduquebec.gouv.qc.ca/fileadmin/Fichiers_client/lois_et_reglements/LoisAnnuelles/en/2021/2021C25A.PDF ; CAI Lignes directrices 2023-1
- EDPB Cookie Banner Taskforce report (17 January 2023); Guidelines 05/2020 v1.1
- Gibraltar GRA GN28 Cookies (23 May 2023): https://www.gra.gi/uploads/documents/data-protection/Documents/Guidance/GN28%20Cookies.pdf
- TFEU Art. 355(1): https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:12016E355

Americas
- Civ. Code 1798.135: https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.135 ; AG page (28 August 2026): https://oag.ca.gov/privacy/ccpa ; CalPrivacy FAQ: https://www.cppa.ca.gov/faq ; CPPA approved regulations (effective 1 January 2026): https://cppa.ca.gov/regulations/pdf/ccpa_updates_cyber_risk_admt_appr_text.pdf
- Maryland s.14-4707 and Ch. 874 (2026): https://mgaleg.maryland.gov/mgawebsite/Laws/StatuteText?article=gcl&section=14-4707&enactments=false ; https://mgaleg.maryland.gov/2026RS/Chapters_noln/CH_874_hb0711t.pdf
- Colorado 4 CCR 904-3 (amended 30 January 2025); SB 24-041 enrolled act
- Minnesota s.325M.14; Delaware s.12D-106; Montana s.30-14-2809; Utah s.13-61-302; Iowa s.715D.4; Kentucky KRS 367.3617; Florida s.501.702; Virginia Ch. 820 (2026): https://lis.blob.core.windows.net/files/1222750.PDF
- Washington RCW 19.373.010, .030, .070
- Louisiana enrolled SB 386: https://www.legis.la.gov/Legis/ViewDocument.aspx?d=1475339 ; Vermont Act 145 summary: https://legislature.vermont.gov/Documents/2026/Docs/ACTS/ACT145/ACT145%20Act%20Summary.pdf
- OPC OBA guidelines and meaningful-consent guidelines: https://www.priv.gc.ca/en/privacy-topics/technology/online-privacy-tracking-cookies/tracking-and-ads/gl_ba_1112/ ; PIPEDA s.6.1 and Schedule 1: https://laws-lois.justice.gc.ca/eng/acts/P-8.6/ ; Alberta PIPA (King's Printer, 1 September 2025); BC PIPA: https://www.bclaws.gov.bc.ca/civix/document/id/complete/statreg/03063_01 ; LEGISinfo Bill C-36
- ANPD Guia orientativo cookies (October 2022); ANPD Guia legítimo interesse (February 2024)

Asia-Pacific and Gulf
- OAIC tracking pixels guidance (4 November 2024); APP 7 text; Privacy and Other Legislation Amendment Act 2024 (No. 128): https://www.legislation.gov.au/C2024A00128/asmade/2024-12-10/text/original/pdf
- APPI (Japanese Law Translation, Act 37 of 2021 consolidation): https://www.japaneselawtranslation.go.jp/en/laws/view/4241 ; PPC Q8-1, Q8-3; PPC 2026 amendment pages; Telecommunications Business Act Art. 27-12 (e-Gov) and MIC FAQ: https://www.soumu.go.jp/main_sosiki/joho_tsusin/d_syohi/gaibusoushin_kiritsu_00002.html
- PIPA (KLRI English, Act 19234); PIPC 31 January 2024 release (nttId=9888) and 23 July 2026 decision (nttId=12330)
- PIPL (CAC text): https://www.cac.gov.cn/2021-08/20/c_1631050028355286.htm ; NDSMR (State Council Order 790): https://www.gov.cn/zhengce/content/202409/content_6977766.htm ; CAC 2026 special action and August 2026 draft
- DPDP Act 2023 (PRS gazette copy); G.S.R. 843(E) and 846(E) of 13 November 2025; PIB PRID 2261823
- UAE Federal Decree-Law 45/2021 and Decree-Law 26/2025: https://uaelegislation.gov.ae/en/legislations/1972 ; https://uaelegislation.gov.ae/en/legislations/3912
- DIFC DP Law consolidated (July 2025) and Data Protection Regulations (1 September 2023), Regulation 9; ADGM DPR 2021 and ODP Guidance Part 2
- Saudi PDPL (Bureau of Experts) and Implementing Regulation (SDAIA, September 2023): https://sdaia.gov.sa/en/SDAIA/about/Documents/ImplementingRegulation.pdf

Southeast Asia
- Malaysia Act 709 consolidated: https://www.pdp.gov.my/ppdpv1/wp-content/uploads/2024/07/UNDANG-UNDANG-MALAYSIA_AKTA_PERLINDUNGAN_DATA_PERIBADI_2010_709_MALAY_AND-ENG_V2022.pdf ; P.U. (B) 522 commencement; Act A1727; Regulations 2013; Data Protection by Design Guideline (2026): https://www.pdp.gov.my/ppdpv1/wp-content/uploads/2026/04/Data-Protection-By-Design-Guideline-DpbD.pdf ; General Code official page: https://www.pdp.gov.my/ppdpv1/en/akta/personal-data-protection-general-practice/
- Singapore PDPA ss.13, 15, 15A and First Schedule (sso.agc.gov.sg); PDPC Key Concepts (revised 29 April 2026); PDPC Selected Topics (revised 23 May 2024)
- Thailand PDPA (MDES translation); PDPC consent guideline 2022 (mirror)
- Indonesia Law 27/2022 (official scan); PP 33/2026 reported only
- Philippines NPC Circulars 2023-04, 2023-07; Advisory Opinion 2017-047
- Vietnam Law 91/2025 (text transcription; official PDFs image-only); Decree 356/2025 (Công báo text): https://congbaocdn.chinhphu.vn/180507251028987904/2026/1/17/356signed-1768638052103952849513.pdf
- Brunei S 1/2025 and S 11/2025 (agc.gov.bn)
- Laos Law 25/NA (Ministry portal): https://lsp.moic.gov.la/?id=289&r=site%2Fdisplaylegal

Inaccessible or partially accessible in this review: EUR-Lex consolidated
ePrivacy text (substitute used), legisquebec (substitute used), Rhode Island,
New Hampshire, New Jersey, Nebraska, Oregon, Tennessee and Nevada official
statute hosts (mirrors used or marked), NRS 603A.316, Malaysia General Code
official scan (no text layer) and Data Breach Notification guideline, Thailand
PDPC site, Indonesia PP 33/2026, privacy.gov.ph (archive snapshot used), UAE
Executive Regulations (existence not established), Saudi implementing
regulation amendments (not established), Kentucky successor s.367.3617.
