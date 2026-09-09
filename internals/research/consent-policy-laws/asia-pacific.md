# Asia-Pacific and Gulf preset review

Research date: 8 September 2026. Research note; proposed behavior is not yet implemented.

## Decisions

| Jurisdiction | Qualifying low-risk first-party analytics | Ordinary third-party targeted advertising | Preset decision |
| --- | --- | --- | --- |
| China mainland | Consent for personal tracking unless a specific Article 13 exception applies; anonymous data excluded | Prior consent, with separate permissions where triggered | Keep opt-in. No broad opt-out preset. |
| Japan | Notice/publication can suffice where APPI consent triggers do not apply | Consent if provision/matching into identifiable personal data triggers APPI; not every cookie does | Offer opt-in and conditional opt-out/no-banner. |
| South Korea | No consent for genuinely non-identifying behavior; personal analytics requires a lawful basis | Prior valid consent is the defensible default for account-linked cross-site tracking | Keep opt-in; narrowly scoped no-banner variant possible after data/basis assessment. |
| India | Current non-sensitive use can avoid a DPDP banner before substantive commencement | Future DPDP ordinarily needs consent; current sector/privacy duties still apply | Dated custom no-banner recipe after scope review; opt-in for consent and May 2027 readiness. |
| Australia | No generic cookie consent requirement; APP necessity, purpose and notice apply | APP 7 permits conditional opt-out; sensitive/unexpected uses need stronger handling | Offer opt-in and opt-out/no-banner variants with explicit assumptions. |
| UAE federal | Consent unless a specific statutory exception applies | Consent is the defensible default | Keep federal opt-in, distinguish free zones. |
| DIFC | Regulation 9 includes analytics cookies and requires minimum necessary defaults | First-use refusal, minimum necessary defaults and valid consent if relied on | Separate deployment profile, opt-in choice default; no general always-on optional tracking. |
| ADGM | A documented legitimate-interest basis may permit processing without consent | Legitimate-interest direct marketing with objection is possible | Separate deployment profile; opt-in or assessed opt-out/no-banner. |
| Saudi Arabia | Assessed legitimate interests can cover expected non-sensitive processing | Direct marketing requires consent and easy opt-out | Keep opt-in for marketing; narrowly scoped assessed analytics no-banner profile possible. |

The legally relevant distinction is processing, not country name. "First-party" alone does not exempt a cookie. "Anonymous" means the full data flow cannot identify people, including provider-side matching. An SDK that receives persistent IDs, account IDs or an IP address cannot be called anonymous just because c15t does not receive names.

The existing engine can represent a consent workflow or non-consent permission defaults. It cannot decide legitimate interests, expected use, business coverage or anonymity. Do not add every possible statutory exception as a public preset. Ship named variants for common defensible deployments and document the required processing assumptions. A no-banner profile still needs applicable disclosures and persistent controls. An opt-out notice cannot manufacture valid consent by being dismissed.

## China mainland

PIPL applies domestically and to overseas processing offering products/services to people in China or analyzing their behavior. Anonymized information is excluded. Article 13 recognizes specified bases, including contract necessity and legal duties, but no general commercial legitimate-interest basis. Articles 14–17 require voluntary explicit informed consent when consent is the basis, convenient withdrawal, access despite refusal of unnecessary processing, and information before processing. Necessary storage serving an actual requested service can use the appropriate exception; optional personal analytics/ads should wait for choice. This is a personal-information rule rather than an EU-style universal device-storage consent provision. [NPC English text, Articles 3–4 and 13–17](https://en.npc.gov.cn.cdurl.cn/2021-12/29/c_694559.htm).

Separate consent triggers include providing personal information to another personal-information handler, sensitive information and overseas provision, under Articles 23, 29 and 39, subject to applicable exceptions. Under-14 processing needs guardian consent, Article 31. Article 24 requires a non-personalized alternative or convenient refusal for automated commercial marketing. Generic category acceptance does not satisfy separate recipient/transfer permissions; those operations must remain independently gated. [CAC statutory text, Articles 23–31 and 39](https://www.cac.gov.cn/2021-08/20/c_1631050028355286.htm).

Network Data Security Management Regulations add practical duties in Articles 21–24: prominent accessible processing rules, itemized collection/recipient information, separate sensitive permission, no repeated consent solicitation after explicit refusal, and deletion/anonymization of unlawfully or unnecessarily collected information. Article 42 requires accessible switches for personalized recommendations and related refusal/tag-deletion controls. [CAC regulations](https://www.cac.gov.cn/2024-09/30/c_1729384452307680.htm).

Decision: retain `chinaOptIn` for optional personal tracking. Necessary/nonpersonal-only deployments can omit the banner, but a `chinaOptOut` that enables all optional personal tracking would misstate the available basis. No general GPC mandate established in this review. Mainland CN does not cover Hong Kong/Macao laws.

## Japan

APPI distinguishes personal information from personal-related information, which can include cookie browsing histories not identifying an individual. Statistical information unlinked to individuals falls outside both. Identifiability depends on the full context, and accumulated location/history can cross the boundary. Article 31 requires recipient-consent verification when personal-related information is expected to be received as identifiable personal data; it is not a blanket consent requirement for all third-party cookie data. Article 27 generally governs personal-data third-party provision, with specific exemptions and a regulated opt-out mechanism that is not merely a website settings button. Ordinary collection within a stated legitimate use does not automatically need prior consent. [PPC current general guidelines, sections 2-8, 3-6 and 3-7, revised June 2026](https://www.ppc.go.jp/personalinfo/legal/guidelines_tsusoku/); [PPC Q&A, Q8-1 and Q8-3](https://www.ppc.go.jp/personalinfo/faq/APPI_QA/).

Telecommunications Business Act Article 27-12 requires covered services to give advance notice or make transmission information readily accessible. Necessary transmission and specified returning provider-issued identifiers are excluded; existing consent and a functioning disclosed opt-out are further statutory alternatives. This is not universal prior cookie consent. Scope depends on the service, and APPI disclosure/matching duties still apply independently. Verified directly from the official e-Gov XML, Article `Num="27_12"`; the chapeau supplies notice/publication, items 1–2 the exclusions, item 3 consent, item 4 opt-out. [e-Gov Telecommunications Business Act, Article 27-12](https://laws.e-gov.go.jp/law/359AC0000000086); [official XML endpoint](https://laws.e-gov.go.jp/api/1/lawdata/359AC0000000086).

Decision: add `japanOptOut()` with no prompt for processing that does not trigger APPI consent and has the required accessible publication. An explicit notice prompt is an optional delivery method for that disclosure. Keep `japanOptIn` for consent-triggering personal-data sharing/matching and chosen consent-based use. The host must disclose recipients and data uses; a generic "we use cookies" message is insufficient. APPI foreign-recipient requirements and sensitive-data collection need separate assessment. No blanket GPC requirement established.

## South Korea

PIPA Article 15 allows consent, necessary contractual steps, legal obligations and a narrow legitimate-interest basis. The latter must be necessary, manifestly superior to the person's rights, substantially related and reasonable in scope. Consent disclosures must cover purpose, items, retention and refusal consequences. Articles 17, 22 and 23 distinguish third-party provision and sensitive-data consent; Article 22-2 addresses under-14 guardian permission; Article 28-8 sets foreign-transfer conditions; Article 37 provides suspension/withdrawal rights. Personal analytics may have another assessed basis; a generic cookie opt-out cannot create one. [Current official English statute](https://elaw.klri.re.kr/eng_service/lawViewContent.do?hseq=71740).

PIPC's January 2024 behavioral-advertising policy says non-identifying behavioral processing can proceed without consent if accumulation, overlap or combination cannot identify people. Transparency, control and safeguards remain recommended. Identifying behavior needs lawful collection, with clear consent and refusal given as the relevant route. Child behavioral advertising restrictions/recommendations are stricter. [PIPC policy announcement](https://pipc.go.kr/np/cop/bbs/selectBoardArticle.do?bbsId=BS074&mCode=C020010000&nttId=9888).

This is not an ad-pixel exemption. In July 2026 PIPC sanctioned TikTok for tracking tools collecting activity plus browser/device IDs, linking them to accounts, and forcing marketing collection into required service consent. It also identified separate overseas-transfer failures. [PIPC July 23, 2026 enforcement](https://pipc.go.kr/np/cop/bbs/selectBoardArticle.do?bbsId=BS074&mCode=C020010000&nttId=12330).

Decision: keep opt-in for ordinary identifiable analytics/targeting relying on consent. A documented non-identifying or other-basis analytics deployment can use no-banner, ideally scope-restricted so it cannot activate ad SDKs. Do not market general Korean targeted ads as opt-out. No GPC mandate established. Review uncertainty: the 2024 policy announced further guideline work; no definitive final replacement was established here, so rely primarily on statute and current enforcement.

## India

Substantive DPDP consent requirements are not yet generally enforceable on the research date. MeitY states full enforceability from 13 May 2027. The final Rules' commencement clause phases notice and operational duties to eighteen months after gazette publication; registered Consent Manager provisions have a separate one-year phase. Do not label c15t itself a registered statutory Consent Manager. [MeitY May 2026 statement](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2261823); [DPDP Rules 2025, Rule 1 and 3–4](https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf).

When operative, the Act covers digital personal data processed in India and overseas processing connected to offering goods/services in India. Sections 4–6 require consent or a specified legitimate use; consent is affirmative, informed, specific and withdrawable. Section 7(a) permits specified purposes for voluntarily supplied data absent objection, not a blanket browser-tracking permission. There is no general legitimate-interest basis. Section 9 generally prohibits child tracking/behavior monitoring/targeted ads, with prescribed exceptions, and requires verified guardian consent for covered child processing. A banner cannot override those prohibitions. [DPDP Act, sections 3–9](https://www.meity.gov.in/static/uploads/2024/02/Digital-Personal-Data-Protection-Act-2023-1.pdf).

Current SPDI Rules remain material for covered sensitive information. MeitY confirms Rule 5 consent can use electronic communication. Ordinary non-sensitive analytics does not thereby acquire a universal cookie-banner duty. Sector, contract, privacy and sensitive-data rules still require assessment. [MeitY SPDI clarification](https://www.pib.gov.in/newsite/erelcontent.aspx?lang=2&reg=48&relid=74990); [MeitY discussion of existing SPDI scope](https://www.meity.gov.in/writereaddata/files/white_paper_on_data_protection_in_india_171127_final_v2.pdf).

Decision: document a dated custom no-banner recipe only after review of current SPDI, sector and sensitive-data facts; do not ship a broad public India no-banner preset inferred from the DPDP phase gap and an older government white paper. Set a visible review deadline before May 2027. Keep opt-in as an explicit consent workflow and future-ready alternative, without claiming the future rule is already mandatory. General date-based policy activation is outside the described engine. No GPC requirement established.

## Australia

The Privacy Act covers APP entities, usually organizations above AUD 3 million annual turnover and smaller businesses within exceptions, including health providers and personal-information trading. Overseas activity can be covered through an Australian link, including carrying on business in Australia. Visitor IP alone does not decide business coverage. [OAIC small-business guidance](https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/organisations/small-business); [OAIC Chapter B, B.10–B.13](https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-b-key-concepts).

There is no general cookie consent rule. Personal collection must be reasonably necessary under APP 3, fair and appropriately notified under APP 5. APP 6 limits use/disclosure to the primary purpose, consent, or qualifying reasonably expected related use. Sensitive pixel information generally needs express consent; configure pixels to avoid it. Thus ordinary expected non-sensitive analytics can run without an opt-in prompt if the rest is satisfied. [OAIC pixel guidance](https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/organisations/tracking-pixels-and-privacy-obligations).

APP 7.2 permits non-sensitive direct marketing where collected from the person, reasonably expected, and a simple opt-out exists and has not been exercised. APP 7.3 handles third-party/unexpected data with consent or genuinely impracticable consent plus extra opt-out notices. "Inconvenient" is insufficient. APP 7.4 requires consent for sensitive direct marketing. Requests cover facilitating another organization's marketing too. [OAIC APP 7, paragraphs 7.14–7.32 and 7.40](https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-7-app-7-direct-marketing).

Decision: offer opt-out/no-banner for properly notified expected non-sensitive processing, with persistent marketing refusal. Offer opt-in for consent-based uses and stronger privacy choices. A notice banner is a delivery option if needed for timely collection disclosure, not inherently legally required. No blanket no-prompt permission for sensitive or unexpected ad pixels. APP 8 foreign disclosures and child capacity remain outside category consent. No GPC mandate established.

## United Arab Emirates

### Federal

Federal Decree-Law 45/2021 includes domestic controllers/processors and overseas processing involving people in the UAE. It excludes government, specified sector-regulated data and free zones with their own data laws. Articles 4 and 6 make consent the ordinary basis unless a specific exception applies, such as requested contract performance or legal duties; there is no general legitimate-interest exception. Consent must be demonstrable, clear and easy to withdraw. Optional personal analytics/targeting normally does not become necessary contract processing. [Official federal statute](https://www.uaelegislation.gov.ae/en/legislations/1972/download); [UAE government overview](https://u.ae/en/about-the-uae/digital-uae/data/data-protection-laws.).

Decision: keep an expressly federal opt-in starter. Do not call it a complete UAE regional regime. Necessary/nonpersonal-only use can avoid a consent banner. Federal commencement is 2 January 2022, but executive-regulation issuance and the resulting compliance transition were not established from a current primary publication in this review. State that uncertainty; do not repeat unsupported claims that an implementing Cabinet Decision has been enacted. Article 29 ties regularization to executive regulations.

A separate 2025 Child Digital Safety decree contains child-data collection controls, parental consent and limits on commercial/targeted advertising/tracking. Those require age/parental workflows beyond an adult cookie preset. [Official child decree, Articles 7–8](https://www.uaelegislation.gov.ae/en/legislations/3912/download).

### DIFC

Regulation 9 covers personalization/analytics cookies, profiling and pixels. It requires information at collection, refusal on first collection, minimum necessary defaults and colour-neutral preference controls. Consent-based use needs an affirmative choice; silence, inactivity and preselected boxes fail. Ongoing controls must remain available. A prior customer/consent route has specific conditions and cannot justify blanket new-visitor tracking. [DIFC consolidated Regulations, 9.1–9.3, in force September 2023](https://assets.difc.com/v1/media/edge/images/dubaiintern0078-difcexperie96c5-production-3253/media/project/difcexperiences/difc/difcwebsite/documents/laws--regulations/data-protection-regulation.pdf).

Decision: a DIFC-specific opt-in choice profile is defensible for optional tracking. Support colour-neutral actions in examples. Select based on the organization's applicable regime; UAE visitor location alone cannot determine this. The precise post-July-2025 extraterritorial amendment was not verified from a current primary consolidated Law in this review. Do not repeat secondary claims that merely targeting any DIFC resident definitely triggers the Law; secondary reports conflict on adopted versus proposed text.

### ADGM

DPR 2021 applies to processing in the context of an ADGM establishment, including linked overseas operations. It recognizes six bases including consent, contract and legitimate interests. Sensitive data requires an additional condition. [ADGM official guidance Part 1, scope and section 5](https://assets.adgm.com/download/assets/ADGM%2BDPR%2B2021%2BGuidance%2BPart%2B1.pdf/b65534b2595411ef82c5a27efcbde115).

Official Part 2 expressly says direct marketing can in many cases rely on legitimate interests with objection at collection and in communications; direct-marketing objection is absolute. This is stronger evidence than inferring legal requirements from ADGM's own website banner. [ADGM official guidance Part 2, pages 20–21](https://www.adgm.com/documents/office-of-data-protection/guidance/adgm-dpr-2021-guidance-part-2.pdf).

Decision: separate ADGM deployment profile may offer opt-in and an assessed opt-out/no-banner route. Intrusive third-party targeting still needs an actual lawful-basis assessment; generic opt-out defaults are not that assessment. Transfer rules and sensitive/automated-decision safeguards remain separate. No GPC-specific mandate established for these UAE regimes.

## Saudi Arabia

PDPL applies to processing in the Kingdom and overseas processing of residents' personal data. Consent is a principal route, with exceptions including legitimate interests subject to conditions. Law Article 26 specifically restricts marketing processing to non-sensitive data collected directly from the person with consent. Separate disclosure and overseas-transfer conditions also apply. [Official PDPL, Articles 2, 5–6, 15, 26 and 29](https://misa.gov.sa/app/uploads/2025/08/PersonalDataProtectionLaw.pdf).

Implementing Regulation Article 16 permits legitimate interests for private controllers where lawful, necessary, balanced, non-sensitive and reasonably expected, following a documented assessment. Article 11 requires documented freely given purpose-specific consent; sensitive/credit data and wholly automated decisions trigger explicit consent. Article 12 requires easy withdrawal. Article 29 requires consent before direct marketing plus easy refusal. An opt-out available after consent is not an opt-out lawful basis. [Official Implementing Regulation, Articles 11–12, 16 and 29](https://sdaia.gov.sa/en/SDAIA/about/Documents/ImplementingRegulation.pdf).

Decision: retain opt-in for personal marketing and consent-based analytics. An analytics-only no-banner profile can support a documented Article 16 basis, excluding marketing/sensitive use. No unrestricted Saudi opt-out ads preset. Guardian permissions and overseas-transfer safeguards need separate controls; no GPC mandate established. Implementation rules are operational, not merely prospective.

## Product consequences

1. Add Japan and Australia opt-out/no-banner variants. Keep opt-in alternatives, labeled simply opt-in.
2. Treat India as a dated current/future decision, not a permanently opted-in country or permanently unrestricted country.
3. Retain consent-first optional-personal-tracking defaults for China, Korea, federal UAE and Saudi marketing. Their non-consent exceptions belong in scoped processing guidance, not broad all-categories opt-out aliases.
4. Separate DIFC/ADGM deployment choices from the AE visitor matcher. Use actual applicable-business regime configuration.
5. Fix any notice/toolbar wording that says "Do not sell or share" solely because `model === 'opt-out'`. Australia, Japan and other non-US opt-out choices need generic preference/refusal text. The model indicates permission defaults, not a California statutory right.

The [Singapore and Malaysia cross-check](southeast-asia.md#cross-check-of-malaysia-and-singapore) records the separate review of implied consent, opt-out marketing and notification timing.

## Verification clarifications

India's operative commencement source is [G.S.R. 843(E), 13 November 2025](https://www.meity.gov.in/static/uploads/2025/11/c56ceae6c383460ca69577428d36828b.pdf),
with the separate [final Rules and their Rule 1 commencement schedule](https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf).
The workshop announcement is supplementary, not the legal commencement instrument.

Japan's Article 27-12 concerns covered telecommunications services, not every
corporate or own-retail website. Where it applies, notification or accessible
publication is the duty, subject to exemptions. APPI assessment remains
separate. The preset makes no claim to implement the registered third-party
provision opt-out procedure. [MIC scope FAQ](https://www.soumu.go.jp/main_sosiki/joho_tsusin/d_syohi/gaibusoushin_kiritsu_00002.html).

UAE federal Article 28 concerns issuance of executive regulations; Article 29
concerns the regularisation period. Neither visitor country nor an assumed
executive-regulation date selects DIFC or ADGM. Those are business-scope
configurations. The preset continues to disclose the unverified transition.
