---
'@c15t/schema': minor
---

Extend the subject read schemas for v3 receipts and privacy directives. `consentItemSchema` gains an optional `choice` (the receipts one submission confirmed), and `getSubjectOutputSchema` gains optional `subjectChoice` (latest receipt per category), `privacyDirectives` and `subject.identityProvider`. Add the privacy-directive schemas (`subjectPrivacyDirectiveInputSchema`, `identityPrivacyDirectiveInputSchema`, `privacyDirectiveWireSchema` and their outputs) with matching types on `@c15t/schema/types`.
