# Americas consent-policy audit

Reviewed 8 September 2026. Research note; proposed behavior is not yet implemented. Scope: ordinary adult website storage, analytics and advertising, plus limitations that prevent a geographic preset from being a complete compliance implementation. Statutes and regulator guidance below are primary sources. The proposed shipping behavior is an engineering recommendation, not a claim that each country has a single consent mode.

## Shipping decisions

| Preset / configuration | Decision | Automatic UI |
| --- | --- | --- |
| `usPrivacyStatesOptOut()` | Prefer `opt-out` with `prompt: 'none'` for eligible adult, nonsensitive processing. Require host disclosure and persistent opt-out controls. | None |
| `usPrivacyStatesOptIn()` | Keep as an optional consent-first implementation for the same eligible processing. Consent does not cure prohibited processing. | Choice |
| US notice prompt | Support `prompt: 'notice'` as an explicit policy configuration; a separate regional law model is unnecessary. | OK + opt-out preferences |
| `californiaOptOut()` / `californiaOptIn()` | Preserve existing variants; apply the same distinctions as the US group. | None / choice |
| `quebecOptIn()` | Keep for optional identification, location and profiling technology. It is not a rule that every technical cookie requires a banner. | Choice |
| Proposed `canadaOptOut()` | Add for reviewed nonsensitive, expected uses and OBA meeting the OPC conditions. Québec override first; unidentified Canadian province should not silently select this. | Notice by default, unless equivalent prominent information exists elsewhere before collection |
| Proposed `canadaOptIn()` | Add consent-first alternative; needed for sensitive, unexpected or significantly risky processing when otherwise lawful. | Choice |
| `brazilOptIn()` | Keep for ordinary advertising-capable sites and consent-based analytics. | Choice |
| Brazil analytics-only custom profile | Document a no-banner, limited-scope configuration after a legitimate-interest assessment. Do not expose a generic `brazilOptOut()` that silently permits marketing. | None when host supplies required information and objection controls |

No-banner means no CMP prompt, not no disclosure, no rights or no processing constraints. A known unmatched state such as New York is a deployment-default decision. A missing US subdivision leaves regional applicability unresolved. The current matcher falls through to the world default; a deliberate missing-state fallback is recommended. Residence, company establishment, sector, turnover and data practices can matter independently of IP geolocation.

## United States

### Common rule relevant to a website CMP

The state frameworks generally provide an opt-out from specified uses, notably sale and targeted advertising, instead of requiring consent before all ordinary adult nonsensitive collection. A privacy notice and conspicuous rights mechanisms are required. A modal or banner is not the prescribed universal mechanism. Personal analytics is not automatically targeted advertising: definitions commonly exclude contextual advertising, the controller's own-site activity and pure advertising measurement. A processor relationship can avoid a sale classification only where its actual conduct and contract meet the exception. A third-party SDK's marketing or combining behavior cannot be classified from its category name alone.

Thus blocking both `marketing` and `measurement` for GPC is a deliberately broad product mapping. It is defensible as extra protection; it is neither the statutory definition of sale nor a guarantee that all sale/sharing has stopped. A widget or `experience` script could also sell/share information. The app must classify all relevant flows, including server events and offline transfers.

### Current 20-state coverage and evidence

The existing list is consistent with the comprehensive/narrow-omnibus state laws in effect at the review date: CA, CO, CT, DE, FL, IA, IN, KY, MD, MN, MT, NE, NH, NJ, OR, RI, TN, TX, UT and VA. It is not a list of every state with relevant privacy law. In each row, the recommended ordinary adult nonsensitive model is opt-out with accessible rights and disclosure, subject to the noted exceptions.

| State | Primary authority / sections | Material distinction for the preset |
| --- | --- | --- |
| California | [AG CCPA explanation](https://oag.ca.gov/privacy/ccpa), Civil Code §§1798.100, .120, .135; [CalPrivacy FAQ](https://cppa.ca.gov/faq) | Notice at/before collection; sale includes valuable consideration and sharing separately covers cross-context behavioral advertising. GPC must be honored. Sensitive-data limitation and under-16 sale/sharing rules are not a generic cookie toggle. |
| Colorado | [AG CPA guidance](https://coag.gov/resources/colorado-privacy-act/), CRS §§6-1-1306–1309 | Consent for sensitive data, incompatible secondary uses and restarting sale/ads after opt-out. UOOM required from 1 July 2024; GPC recognized. |
| Connecticut | [AG CTDPA guidance](https://portal.ct.gov/ag/sections/privacy/the-connecticut-data-privacy-act) | Conspicuous website opt-out link plus signals required from 1 January 2025. Sensitive and youth/health rules exceed the group preset. 2026 amendments and applicability must be assessed at deployment. |
| Delaware | [DOJ FAQ](https://attorneygeneral.delaware.gov/fraud/personal-data-privacy-portal/frequently-asked-questions/), 6 Del. C. ch.12D | Act effective 1 January 2025; UOOM from 1 January 2026. Sensitive-data consent and children/teen rules remain separate. |
| Florida | [2025 statute §501.702](https://flsenate.gov/Laws/Statutes/2025/501.702), [Part V](https://www.flsenate.gov/Laws/Statutes/2025/Chapter501/Part_V) | Controller definition generally requires over $1bn global annual revenue plus one of three platform/ad business tests. Including FL is a voluntary broader product choice for most ordinary sites. Check additional sensitive-data provisions separately. |
| Iowa | [Code §715D.4](https://www.legis.iowa.gov/docs/code/715D.4.pdf), [definitions §715D.1](https://www.legis.iowa.gov/docs/code/715D.1.pdf) | Sensitive data generally uses clear prior notice and opportunity to opt out, unlike most peers. §715D.4(6) requires conspicuous disclosure and a way to opt out of sale or targeted advertising; do not infer absence of targeted-ad controls from the narrower rights enumeration alone. |
| Indiana | [AG consumer guide](https://www.in.gov/attorneygeneral/files/Consumer_Data-Bill-of-Rights.pdf), IC 24-15 | Effective 1 January 2026; 100,000 consumers or 25,000 plus over 50% sale revenue, with exemptions. Access/correction/deletion/portability and sale/ads/profiling controls are broader than CMP categories. |
| Kentucky | [AG KCDPA guide](https://www.ag.ky.gov/about/Office-Divisions/ODP/KCDPA/Pages/default.aspx), KRS 367.3611–3629 | Effective 1 January 2026. Sensitive data requires prior consent; ordinary ads/sale use opt-out. Privacy notice must explain rights and appeals. |
| Maryland | [Commercial Law §14-4707](https://mgaleg.maryland.gov/mgawebsite/Laws/StatuteText?article=gcl&section=14-4707&enactments=false), [AG guide](https://oag.maryland.gov/resources-info/Pages/data-privacy.aspx) | Collection limited to the requested service, not any disclosed business purpose. Sensitive-data sale prohibited; other sensitive processing strictly necessary only; under-18 sale/ads prohibited. See detailed decision below. |
| Minnesota | [AG implementation announcement](https://ag.state.mn.us/Office/Communications/2025/07/28_MCDPA.asp), [controller duties](https://www.ag.state.mn.us/Data-Privacy/Business/Controller/Structural-Obligations.asp), Minn. Stat. ch.325M | Effective 31 July 2025, including UOOM. Adds profiling explanation/review and recipient information rights that a category dialog does not satisfy. |
| Montana | [§30-14-2809](https://mca.legmt.gov/bills/mca/title_0300/chapter_0140/part_0280/section_0090/0300-0140-0280-0090.html), [§30-14-2812](https://mca.legmt.gov/bills/mca/title_0300/chapter_0140/part_0280/section_0120/0300-0140-0280-0120.html) | UOOM from 1 January 2025. Current law requires a conspicuous opt-out method outside the privacy notice; multilingual/accessibility and material-change duties. Use amended 2025 code rather than original bill thresholds. |
| Nebraska | [§87-1111](https://nebraskalegislature.gov/laws/statutes.php?statute=87-1111), [AG implementation](https://protectthegoodlife.nebraska.gov/data-privacy-homepage) | Effective 1 January 2025. Browser/device technology can designate an opt-out agent; statute has verification, capability and similar-other-state-law conditions. Small-business exclusions do not excuse sensitive-data sales without consent. |
| New Hampshire | [RSA ch.507-H](https://gc.nh.gov/rsa/html/LII/507-H/507-H-mrg.htm), especially §§4–6 | Effective 1 January 2025; conspicuous link AND qualifying signal handling. Ordinary thresholds 35,000 or 10,000 plus over 25% sale revenue. Sensitive/youth consent separate. |
| New Jersey | [Division FAQ](https://www.njconsumeraffairs.gov/ocp/Pages/NJ-Data-Privacy-Law-FAQ.aspx), P.L.2023 c.266 | Effective 15 January 2025; UOOM from 15 July 2025. Sensitive information and youth protections need separate handling. |
| Oregon | [DOJ consumer FAQ](https://www.doj.state.or.us/consumer-protection/id-theft-data-breaches/privacy/privacy-law-faqs-for-consumers/), ORS 646A.570–589 | Effective July 2024 for ordinary for-profits, July 2025 for nonprofits. UOOM from January 2026. January 2026 bans sale of precise geolocation and under-16 sale/targeted ads/profiling; consent cannot undo those bans. |
| Rhode Island | [rights §6-48.1-5](https://webserver.rilegislature.gov/Statutes/TITLE6/6-48.1/6-48.1-5.htm), [duties §6-48.1-7](https://webserver.rilegislature.gov/Statutes/TITLE6/6-48.1/6-48.1-7.htm) | Effective 1 January 2026. Ads/sale/profiling opt-out; controller duties include targeted-ad assessments. Rights thresholds are 35,000 consumers or 10,000 plus over 20% sale revenue. Needs a final direct-text recheck of §6-48.1-3 disclosure detail before publishing a precise recipient-list claim; that page failed to load in this audit. |
| Tennessee | [AG TIPA guide](https://www.tn.gov/attorneygeneral/news/2025/4/30/pr25-25.html), Tenn. Code 47-18-3301 et seq. | Effective 1 July 2025. Applicability requires over $25m revenue AND 175,000 consumers or 25,000 plus at least 50% sale revenue. Opt-out for sale/ads/certain profiling; sensitive data rules separate. |
| Texas | [AG TDPSA guide](https://www.texasattorneygeneral.gov/es/node/259071), [DIR report](https://dir.texas.gov/sites/default/files/2024-12/DIR%20Report%20on%20the%20Texas%20Data%20Privacy%20and%20Security%20Act.pdf), Bus. & Com. Code ch.541 | Effective 1 July 2024; technology/agent opt-outs from January 2025 with statutory conditions. General small-business exemption has a sensitive-data sale-consent exception. |
| Utah | [§13-61-302](https://le.utah.gov/xcode/Title13/Chapter61/C13-61-S302_2022050420231231.pdf) | Sensitive data generally requires prior clear notice and opt-out opportunity, not blanket express consent. Privacy notice and conspicuous ads/sale opt-out required. |
| Virginia | [§59.1-578](https://law.lis.virginia.gov/vacode/title59.1/chapter53/section59.1-578/) | Consent for sensitive and incompatible uses; ordinary ads/sales opt-out. Current code also bans sale/offering for sale of precise geolocation. |

Do not claim that all 20 currently mandate GPC. The source-backed required-signal group includes CA, CO, CT, DE, MN, MT, NH, NJ and OR. NE and TX have technology/authorized-agent recognition with conditions. Maryland §14-4707(f)(3) uses an alternative-mechanism formulation, unlike the explicit AND wording in NH/MT. Honoring GPC across all 20 is a simple product decision regardless of those distinctions. This audit did not find a universal general GPC duty in IA, IN, KY, RI, TN, UT or VA; avoid publishing that negative as an exhaustive 2026 amendments audit without final statutory checks.

### California UI implications

[CalPrivacy's current FAQ](https://cppa.ca.gov/faq) describes a conspicuous header/footer opt-out link in most cases, with prescribed labels such as "Do Not Sell or Share My Personal Information" or an alternative privacy-choices label. A consent banner is not required merely because CCPA applies. Opening a dedicated opt-out preference surface is conceptually appropriate; the surface must let the person actually submit an effective request without account creation, unnecessary questions or obstructive steps. The current short label "Do not sell or share my data" should not be represented as the statute's prescribed link text. A semantic button can open a dialog accessibly, but its compliance equivalence to the mandated website link should not be asserted from UI preference alone. Offer the required host-level rights link or an audited equivalent flow.

The [AG explanation](https://oag.ca.gov/privacy/ccpa), updated 28 August 2026, also says an opted-out consumer cannot be asked to opt back in for at least 12 months. c15t now suppresses automatic choice prompts whenever an in-scope refusal applies, including when a policy changes, another category is added or a grant expires. It does not schedule a request at 12 months. The host must retain opt-outs durably and apply the same restriction to its own prompts. User-initiated preference changes remain available. GPC should remain enforceable even with an earlier Accept All. A later lawful authorization is a separate question from default permission.

### Maryland: grouping decision

The [current statute §14-4707](https://mgaleg.maryland.gov/mgawebsite/Laws/StatuteText?article=gcl&section=14-4707&enactments=false) creates a hard limit on collection in subsection (b)(1)(i): reasonably necessary and proportionate to the specific product/service requested. Subsection (a)(8) allows consent for incompatible uses, but does not repeal collection minimization or the sensitive/minor prohibitions. Adult nonsensitive targeted ads are not categorically prohibited, since subsection (e) expressly regulates their disclosure and opt-out.

Engineering inference: do not remove MD from the group and let it fall into an unrestricted world fallback; that worsens behavior. Do not invent `marylandOptIn()` as a compliance cure. Keep MD in the regional rights matcher, make the minimization prerequisite visible in the documented assumptions, and keep unreviewed MD advertising pipelines off using a separate application processing gate. An audited deployment may use the common opt-out configuration for eligible data uses.

The [2026 proposed SB569](https://mgaleg.maryland.gov/mgawebsite/Legislation/Details/SB0569?ys=2026RS) would relax some restrictions, but its final session status is a February hearing, not enacted. Do not implement its proposed consent exception as current law.

### Outside the 20 and upcoming laws

[Alabama enrolled HB351 §12](https://alison.legislature.state.al.us/files/pdf/SearchableInstruments/2026RS/HB351-enr.pdf) becomes effective **1 May 2027**. [Oklahoma enacted SB546 §22](https://www.oklegislature.gov/cf_pdf/2025-26%20ENR/SB/SB546%20ENR.PDF) becomes effective **1 January 2027**; the [official history](https://www.oklegislature.gov/BillInfo.aspx?Bill=SB546) records governor approval on 20 March 2026. Neither belongs in a preset represented as the currently effective 20-state group, though early voluntary coverage is possible.

[Louisiana Act 502, SB386](https://www.legis.la.gov/legis/BillInfo.aspx?b=SB386&s=26RS&sbi=y)
is enacted and starts 1 January 2027. [Vermont Act 145, S.71](https://legislature.vermont.gov/Documents/2026/Docs/ACTS/ACT145/ACT145%20Act%20Summary.pdf)
starts 1 January 2028. Both remain outside the currently effective group.

Connecticut's [expanded protections from 1 July 2026](https://portal.ct.gov/ag/press-releases/2026-press-releases/attorney-general-tong-sends-message-to-big-tech-about-hooking-kids-on-addictive-apps)
prohibit sale and targeted advertising using minors' data. Consent cannot
replace these restrictions. Maryland [Chapter 874, HB711](https://mgaleg.maryland.gov/2026RS/Chapters_noln/CH_874_hb0711t.pdf),
effective 1 July 2026, amends its privacy law, including sensitive-attribute
inferences and specified government sales. This is distinct from the
unenacted SB569 proposal mentioned above.

[Nevada NRS 603A](https://ag.nv.gov/News/PR/2020/Attorney_General_Aaron_Ford_Advises_Nevadans_on_Privacy_Rights/) has an online sale opt-out outside that list. [Washington's My Health My Data Act](https://www.atg.wa.gov/protecting-washingtonians-personal-health-data-and-privacy) applies to specified consumer-health collection/sharing and requires separate sale authorization. Health inferences from apparently ordinary browsing or purchases can enter that scope. Federal COPPA, health, communications/wiretap and other sector laws also prevent "not in the 20 = no privacy law." These need processing-specific gates; adding another ordinary cookie preset cannot implement them all.

## Canada

### Federal PIPEDA; Alberta and British Columbia

[PIPEDA §6.1 and Schedule 1 principle 4.3](https://lois-laws.justice.gc.ca/eng/acts/p-8.6/FullText.html) require meaningful knowledge and consent for applicable personal-data collection/use/disclosure, subject to legal exceptions. The [OPC consent guidance](https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/p_principle/principles/p_consent/) requires express consent for sensitive data, unexpected uses and meaningful residual risk of significant harm. Low sensitivity does not automatically make a use expected.

The [OPC OBA guidelines](https://www.priv.gc.ca/en/privacy-topics/technology/online-privacy-tracking-cookies/tracking-and-ads/gl_ba_1112/), modified 11 August 2025, explicitly permit opt-out consent for nonsensitive online behavioral advertising if purposes and parties are made clear at/before collection, the purpose is not buried in a policy, opt-out is easy, immediate and persistent, and retention is minimized. Advertising cannot be made a condition of using the Internet generally. The [supporting policy](https://www.priv.gc.ca/en/privacy-topics/technology/online-privacy-tracking-cookies/tracking-and-ads/bg_ba_1206/) excludes tracking that people cannot effectively stop; permission labels do not cure uncontrollable technology.

Alberta PIPA §§7–8 recognizes express, deemed and opt-out consent: [OIPC guidance](https://www.oipc.ab.ca/wp-content/uploads/2022/02/PIPA-Guide-2008.pdf). British Columbia PIPA §§6–8 similarly recognizes consent forms: [official statute](https://www.bclaws.gov.bc.ca/civix/document/id/complete/statreg/00_03063_01). The [joint meaningful-consent guidance](https://oipc.bc.ca/documents/guidance-documents/2134) applies the same sensitivity/expectations/risk analysis. A country matcher cannot determine whether federal or provincial law governs a business.

| Processing | Defensible behavior |
| --- | --- |
| Technical operation without personal information | No consent prompt under these personal-information laws merely because storage exists. |
| Required personal-data processing for the requested transaction | Meaningful notice; consent may be implied in appropriate contexts, with statutory exceptions where applicable. Do not invent a "necessary cookie" exemption from every duty. |
| Expected nonsensitive personal analytics | Implied/opt-out route may be available; assess purposes, collection and sharing. |
| Nonsensitive OBA meeting OPC conditions | Opt-out consent is explicitly available; a notice with immediate persistent refusal is a sensible turnkey UI. |
| Sensitive, unexpected or substantially risky profiling/sharing | Express choice when lawful; separate purposes/conditions as needed. |

Recommended names `canadaOptOut()` and `canadaOptIn()` are modes, not two laws. The opt-out sample must place Québec first and not silently treat missing province as non-Québec. A no-prompt variant is possible only if host UI already supplies the prominent prior information and control; a footer policy alone is insufficient for OBA.

### Québec

[Private-sector Act s8.1](https://www.legisquebec.gouv.qc.ca/fr/version/lc/p-39.1?code=se%3A8_1&history=20251110&langCont=en), effective 22 September 2023, requires prior information about technology allowing identification, location or profiling and how to activate those functions. [CAI privacy-policy guidance](https://www.cai.gouv.qc.ca/uploads/pdfs/CAI_GU_POL_Confidentialite.pdf?v=1741120394) explains those functions start disabled. The common claim that s9.1 imposes highest confidentiality on every cookie is incorrect: [s9.1](https://www.legisquebec.gouv.qc.ca/fr/version/lc/p-39.1?code=se%3A9_1&history=20251023&langCont=en) expressly excludes browser-cookie settings from that paragraph.

Keep choice for optional personal tracking/profiling. Anonymous aggregate statistics that never collect personal information need no such prompt. Essential operations and technical functions need separate classification. Broader [CAI consent guidance](https://www.cai.gouv.qc.ca/protection-renseignements-personnels/information-entreprises-privees/consentement-personnes-entreprises) emphasizes necessity before asking; consent must be specific and valid, with additional safeguards for sensitive data and transfers. Do not label `quebecOptIn()` an authorization for all unclassified optional scripts.

## Brazil

[ANPD cookie guidance](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-cookies-e-protecao-de-dados-pessoais.pdf/@@display-file/file), pages 18–26, addresses consent and legitimate interest rather than importing an EU terminal-storage rule. Consent must be affirmative, informed and revocable; browsing on or a preselected permission is insufficient. Necessary cookies generally use another lawful basis. The regulator favors consent for nonnecessary advertising, especially third-party cross-site profiling. Its example gives accept, reject and manage equal prominence, with consent-based cookies initially off. Audience measurement can use legitimate interest in appropriate contexts, especially aggregated trends without combined tracking or user profiles. The low-risk example excludes third-party sharing and cross-database reuse and supplies information and objection controls. This is not a general opt-out advertising permission.

The [ANPD legitimate-interest guide announcement](https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-lanca-guia-orientativo-sobre-legitimo-interesse) explains the Article 7(IX) balancing approach: purpose, necessity, then balancing and safeguards. Legitimate interest does not apply as the sensitive-data legal basis. Assessment must precede processing.

| Processing | Defensible behavior |
| --- | --- |
| Necessary storage / processing | No consent prompt solely for necessary operation; disclose and identify the applicable basis. |
| Truly anonymous analytics | No LGPD consent requirement where no personal data is processed; anonymizing later does not erase the initial personal-data collection. |
| Limited first-party audience measurement | Possible non-consent route after legitimate-interest test, purpose/retention disclosure and objection mechanism. |
| Personal analytics with profiles or combined data | Consent choice is a defensible standard; assess other bases before using them. |
| Third-party behavioral advertising | Keep opt-in by default; ANPD says legitimate interest generally loses the balancing test in this setting. |

Current `brazilOptIn()` is a reasonable ad-capable starter but overstates the minimum if described as a rule for all cookies. A documented analytics-only configuration should scope to reviewed measurement and deny out-of-scope advertising. A single whole-policy model cannot represent simultaneously allowed LI analytics and consent-required advertising without additional per-purpose configuration. Do not hide that limitation by renaming the same allow-all object "Brazil opt-out."

## Corrections to public claims

1. Replace "country X is opt-in/opt-out" with a default for stated processing and a short alternate-path note.
2. Stop calling the US notice mandatory. No banner plus a persistent effective opt-out and proper disclosure is an intended option.
3. Add Canada outside Québec; the silent global default is inadequate for personal-data advertising relying on implied consent.
4. Treat statutory bans and independent permissions as application gates. Adding Accept All cannot make them lawful.
5. Keep sources, exact reviewed dates and deployment assumptions alongside preset docs. Country matchers do not assess business applicability or technical data flows.
