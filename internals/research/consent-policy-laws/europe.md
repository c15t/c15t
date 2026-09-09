# Europe cookie-policy source review

Reviewed 8 September 2026. This note separates legal conditions from c15t
preset decisions. It covers the EEA baseline, selected national analytics
exceptions, the UK, Switzerland and Türkiye. It is not an article-by-article
audit of all 30 EEA national implementations.

## EEA baseline

Article 5(3) requires prior informed consent for device storage/access
except transmission-only operations and operations strictly necessary for
a service the user requested. It concerns information on devices, so
removing personal identifiers does not itself create an exemption. GDPR
lawful-basis analysis applies separately to personal-data processing.
Legitimate interests cannot override a device-access consent requirement.

Source: [Directive 2002/58/EC, Article 5(3)](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A02002L0058-20091219).

The EDPB Cookie Banner Taskforce says consent-requiring cookies must remain
off before a positive action; preselected choices are insufficient. Most
participating authorities require rejection on a layer with acceptance.
Obscure refusal text can undermine consent. This concerns visibility and
effort, not merely whether the control is an HTML button.

Source: [EDPB taskforce report, paragraphs 7–14](https://www.edpb.europa.eu/system/files/2023-01/edpb_20230118_report_cookie_banner_taskforce_en.pdf).

Decision: retain `europeOptIn()` and alternative `europeIab()` for
consent-requiring tracking. No Europe-wide allow-all opt-out preset.
Necessary-only sites need no automatic consent prompt. Specific analytics
exemptions need scoped profiles. IAB is an optional interoperability
framework, not another lawful basis.

## Territory coverage correction

The matcher includes Åland AX and the French EU territories GF, GP, MQ, MF,
RE and YT, which can arrive as separate GeoIP country codes. Gibraltar GI
uses the Europe consent workflow under its own law without being classified
as EEA or UK. Matcher dataset revision: 2026-09-08. A known territory code
must match explicitly rather than depend on the unknown-country fallback.

Sources: [EU outermost regions](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=LEGISSUM%3Aoutermost_regions),
[Gibraltar GRA GN28](https://www.gra.gi/uploads/documents/data-protection/Documents/Guidance/GN28%20Cookies.pdf).

## National differences checked

| Jurisdiction | Source and section | Consequence |
| --- | --- | --- |
| Germany | [TDDDG §25](https://www.gesetze-im-internet.de/ttdsg/__25.html) | Consent except transmission-only or strictly necessary requested service. No general analytics exemption established. |
| France | [CNIL, 4 July 2025](https://www.cnil.fr/fr/cookies-solutions-pour-les-outils-de-mesure-daudience) | Audience-only exemption: exclusive publisher purposes, anonymous statistical output, no combination, cross-site identifiers or nonanonymous third-party reuse. |
| Netherlands | [AP cookie-consent norm interpretation, statutory discussion](https://www.autoriteitpersoonsgegevens.nl/uploads/2024-03/Normuitleg%20AP%20intrekken%20toestemming%20cookiebanners.pdf) | Analytics exception requires no or minor privacy impact. It does not authorize behavioral advertising. |
| Norway | [Datatilsynet guidance, introduction and sections 4–10](https://www.datatilsynet.no/personvern-pa-ulike-omrader/internett-og-apper/bruk-av-informasjonskapsler-og-andre-sporingsteknologier/) | Ekomloven §3-15 requires GDPR-valid prior consent from 1 January 2025. Old browser-default consent advice is unsuitable. |
| Iceland | [Electronic Communications Act 70/2022, Article 88](https://www.althingi.is/lagas/nuna/2022070.html) | Informed consent or statutory authority. Article 88 separately permits technical access/storage for a lawful purpose with user knowledge; its wording is not identical to the ePrivacy strictly-necessary exemption. No general analytics exemption is established here. |
| Liechtenstein | [Authority guidance, legal rules and categories 1–3](https://www.datenschutzstelle.li/datenschutz/themen-z/cookies) | The narrow statistics route comes from Datenschutzstelle guidance on legitimate interests and objection, not a general statutory analytics exemption. Behavioral analysis and marketing require separate consent assessment. |

France's consolidated January 2026 recommendation distinguishes exemption
conditions from recommendations: information in a privacy policy, a justified
tracker lifetime such as 13 months without automatic extension, and
collected-data retention of at most 25 months. These concern trackers and
data, not c15t consent-receipt expiry. Earlier developer guidance should not
silently replace current exemption conditions.

Source: [CNIL consolidated recommendation, section 5](https://www.cnil.fr/sites/default/files/2026-01/recommandation_cookies_consolidee.pdf).

Decision: document France/Netherlands/Liechtenstein audience-only recipes
with processing constraints. The baseline Europe preset does not implement
these optimizations. Other EEA national exemptions remain outside this
note's verified coverage.

## United Kingdom

Use the ICO's final Storage and Access Technologies guidance of 29 April
2026, incorporating Data (Use and Access) Act changes. The older short PECR
cookies page still lists only two exemptions and is insufficient for the
present design.

Source: [ICO publication announcement](https://ico.org.uk/about-the-ico/media-centre/news-and-blogs/2026/04/final-storage-and-access-technologies-guidance-published/).

[PECR Schedule A1 paragraph 5](https://www.legislation.gov.uk/uksi/2003/2426/schedule/A1)
is the statutory service-statistics exception. It limits purpose and sharing,
requires information and a free simple objection mechanism, and excludes
collecting or monitoring automatically emitted terminal information under
paragraph 5(2), such as Wi-Fi probe requests. UK GDPR lawful basis still needs
assessment for personal data. The aggregate-only and processor-only limits
below follow ICO guidance.

The statistical-purposes exception covers aggregate service-improvement
statistics. It permits a processor acting only for that purpose, but not
advertising, individual profiling or individual histories retained after
aggregation. It requires clear information and a simple, free objection
mechanism. The appearance exception also requires information and
objection access. Users can turn qualifying purposes off and back on.
Browser defaults do not prove absence of objection. Necessary requested
services have a separate exemption.

Source: [ICO exceptions guidance, statistical purposes, appearance and simple means of objecting](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-the-use-of-storage-and-access-technologies/what-are-the-exceptions/).

Decision: keep opt-in for advertising. Add a scoped UK service-statistics
option, with no automatic banner when the host supplies information and
accessible objection. A notice is an optional delivery method. It must not
enable every script labelled `measurement` or enable `marketing`.
Mixed statistics/advertising sites need different permission behavior for
the two purposes.

## Switzerland

The October 2025 FDPIC guide distinguishes ordinary uses, overriding
interests, high-risk profiling and unexpected processing. Article 45c TCA
requires information and refusal access. Sections 3.7–3.9 permit justified
ordinary uses with opt-out, with minimum processing until information and
objection are actually available. Sections 3.10–3.11 require express
consent for highly intrusive/high-risk processing. Unexpected low-intrusion
uses can sometimes use prominently disclosed opt-out. Unexpected use is
not automatically synonymous with mandatory consent.

Sources: [FDPIC guide, sections 3.7–3.13](https://www.edoeb.admin.ch/dam/en/sd-web/brLL9rM3ny9d/Leitfaden%20des%20ED%C3%96B%20betreffend%20Datenbearbeitungen%20mittels%20Cookies%20und%20%C3%A4hnlichen%20Technologien%20V.%201.1%20vom%2006.10.2025_EN.pdf),
[FDPIC advertising/high-risk explanation](https://www.edoeb.admin.ch/en/cookie-guidelines-updated-version).

Decision: retain opt-in and conditional opt-out options. No-prompt opt-out
requires host information and working refusal access before optional
processing. Unexpected uses require notice prominent enough that first-time
visitors cannot ignore it; a footer-only disclosure is insufficient there.
It cannot be an automatic default for arbitrary advertising
pixels. Correct the earlier overstatement that all unexpected uses need
opt-in. Use generic privacy-preference labels, not US sale/sharing wording.

Swiss preset clarification: exclude third-party advertising networks and
unexpected commercial tracking on political, religious or trade-union sites
from the no-prompt recipe. The former is a product boundary for this starter;
FDPIC section 3.10.2 expressly requires consent for the latter sensitive-data
case. Assess lawful consent-based processing separately. Source: [FDPIC v1.1,
section 3.10.2](https://www.edoeb.admin.ch/dam/en/sd-web/brLL9rM3ny9d/Leitfaden%20des%20ED%C3%96B%20betreffend%20Datenbearbeitungen%20mittels%20Cookies%20und%20%C3%A4hnlichen%20Technologien%20V.%201.1%20vom%2006.10.2025_EN.pdf).

## Türkiye

KVKK's guide distinguishes necessary purposes and first-party statistics
in section 5.9 from behavioral advertising in section 6.2. The statistics
route is limited to anonymous output for operating the service,
proportionate collection, no cross-site tracking, reasonable cookie life
and no third-party data transfer. Behavioral advertising requires explicit
consent. Section 7 requires an informed active action before placement and
withdrawal access. Merely entering the site is insufficient.

Source: [KVKK Cookie Applications Guide, printed pages 24–29](https://www.kvkk.gov.tr/Icerik/7353/Cerez-Uygulamalari-Hakkinda-Rehber).

Board decisions require a valid Article 5/6 condition for nonessential
cookie processing and separate compliance with Article 9 transfers. A
privacy notice alone did not fix unlawful tracking in the reviewed cases.
Companies' arguments in these decisions must not be mistaken for findings.

Sources: [decision 2022/229, operative findings](https://www.kvkk.gov.tr/Icerik/7408/Summary-of-the-Board-Decision-on-the-processing-of-personal-data-by-the-data-controller-operating-in-e-commerce-sector-through-cookies-used-by-the-websites-mobile-applications-),
[decision 2022/1358](https://www.kvkk.gov.tr/Icerik/7595/2022-1358).

Decision: retain `turkeyOptIn()` for tracking/advertising. Offer a separate
first-party-statistics recipe with no consent request. Section 9 requires
visible disclosure at website entry even where consent is unnecessary;
the host must supply that information if the CMP does not display it.
Section 1.2 excludes pixels, fingerprinting, local storage and beacons from
the guide's scope. Do not extend its cookie-statistics example to every
analytics technology, or expose a general `turkeyOptOut()` enabling all
optional scripts.

## Implementation consequences

Country codes locate visitors, not applicable law. Establishment, targeting,
purposes and provider roles can make multiple laws apply. No-prompt routes
require their processing conditions; omitting a modal does not waive notice.

The kernel has one permission model per resolved rule. Scoped opt-in with
permissive outside categories allows outside processing, but is not a full
mixed model: outside-scope positive saves are rejected, though denials can
persist. Do not advertise this as a reversible preference flow for exempt
statistics plus advertising.

Code evidence: `packages/core/src/consent-record/evaluate.ts` and
`packages/core/src/kernel/__tests__/consent-model.test.ts`.

An analytics-only preset can use opt-out, no prompt and strict category
scope, with the host verifying every included script. Broad category names
cannot establish those facts. Source-review metadata and 365-day receipt
validity do not establish statutory compliance.
