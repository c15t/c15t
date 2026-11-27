# Africa cookie-policy source review

Research date: 27 November 2026. This note covers Morocco only. It is not a
survey of African cookie law.

## Morocco

### Scope

Law 09-08 applies to automated processing when the controller is established in
Morocco or uses automated means located there. Article 2 excludes mere transit.
A controller relying on means in Morocco without an establishment must notify a
Moroccan representative to the CNDP. Visitor location alone neither establishes
nor rules out applicability, so the country matcher is an editable starting
point rather than a legal-scope test.

### Sources

- [CNDP, Textes et lois](https://www.cndp.ma/textes-et-lois/)
- [Dahir 1-09-15 promulgating Law 09-08](https://www.cndp.ma/images/lois/Loi-09-08-Fr.pdf)
- [CNDP, Conformité des sites web](https://www.cndp.ma/conformite-des-sites-web/)
- [Délibération D-939-2025 of 28 November 2025](https://www.cndp.ma/wp-content/uploads/2025/12/Deliberation-N%C2%B0-D-939-2025-du-28112025-relative-au-modele-de-declaration-simplifiee-relative-au-traitement-des-donnees-a-caractere-personnel-de-cookies-sur-un-terminal.pdf)

### Bases and limits

Article 4 of Law 09-08 sets consent as the baseline and lists exceptions,
including legal obligation, contract, vital interests, public mission and
legitimate interest subject to the person's rights. Articles 12 and 28(5) let
the CNDP define simplified-declaration categories. Article 43 requires an
adequate protection level for foreign transfers, and Article 44 allows
specified derogations.

D-939-2025 uses that power for cookie processing. Its section 3 lists four
purposes: non-profiling personalized advertising based on browser or geographic
location, content or service personalization based on prior choices or
consultations, social sharing, and navigation statistics or audience
measurement without profiling. It states that building a personal profile
requires prior CNDP authorization under Article 12. Section 5 caps cookie data
retention at six months. Section 10 requires prior authorization for
interconnection with files serving different purposes. Section 9 requires prior
authorization for foreign transfers.

Section 6 is the operative consent distinction. It does not require prior
consent for the four listed purposes except personalized advertising and social
sharing. For those two, consent must come from a clear and explicit action
before the first deposit, through simple and accessible means, with a refusal
that is respected and retained for no more than six months. Section 6 also
requires six information items before the first deposit, including controller
identity, purposes, collected data categories, recipients, rights contact and
CNDP receipt references. Section 8 requires a simplified declaration before
implementation.

The older website guidelines section 10 says personal-data cookies need prior
consent. For cookie processing inside D-939-2025's scope, read section 6 of the
later, cookie-specific deliberation as the narrow rule. The guidelines still
apply to other personal-data collection and to processing outside the
deliberation.

### Decision

Keep `moroccoOptIn()` as a starter configuration, not a compliance claim. Scope
the opt-in choice to `marketing` for personalized advertising and `functionality`
for social sharing. Leave `experience` for non-profiling content personalization
and `measurement` for non-profiling audience measurement available before a
choice through `scopeMode: 'permissive'`. Record the category mapping in review
assumptions so a host does not put profiling or unrelated scripts in those
categories. The host must declare or discover `functionality` and `marketing`;
with no declared categories a permissive rule asks about none of them.

Use a 180-day choice validity as a product setting close to the six-month
refusal-retention rule. Cookie-data deletion, CNDP declaration and transfer
authorization remain controller responsibilities outside the policy rule. The
kernel cannot express a full mixed model in one rule: positive saves outside the
active scope are rejected, although refusals outside scope are retained. Check
`effectivePermissions` before publishing.
