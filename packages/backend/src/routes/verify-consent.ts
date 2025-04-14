import type { EventHandlerRequest, H3Event } from 'h3';
import { z } from 'zod';
import { defineRoute } from '~/pkgs/api-router/utils/define-route';
import { PolicyTypeSchema } from '~/schema/consent-policy';
import { validateEntityOutput } from '~/schema/definition';

interface Consent {
  id: string;
  purposeIds: string[];
  [key: string]: unknown;
}

export interface VerifyConsentResponse {
  isValid: boolean;
  reasons?: string[];
  consent?: Consent;
}

export const VerifyConsentRequestBody = z.object({
  subjectId: z.string().optional(),
  externalSubjectId: z.string().optional(),
  domain: z.string(),
  type: PolicyTypeSchema,
  policyId: z.string().optional(),
  preferences: z.array(z.string()).optional(),
});

export const verifyConsent = defineRoute({
  path: '/consent/verify',
  method: 'post',
  validations: {
    body: VerifyConsentRequestBody,
  },
  handler: async (event) => {
    const { body } = event.context.validated;
    const {
      type,
      subjectId,
      externalSubjectId,
      domain,
      policyId,
      preferences,
    } = body;

    const { registry } = event.context;

    // Find subject
    const subject = await registry.findOrCreateSubject({
      subjectId,
      externalSubjectId,
      ipAddress: event.context.ipAddress || 'unknown',
    });

    if (!subject) {
      return {
        isValid: false,
        reasons: ['Subject not found'],
      };
    }

    // Find domain
    const domainRecord = await registry.findDomain(domain);
    if (!domainRecord) {
      return {
        isValid: false,
        reasons: ['Domain not found'],
      };
    }

    if (type === 'cookie_banner' && preferences?.length === 0) {
      return {
        isValid: false,
        reasons: ['Preferences are required'],
      };
    }

    const purposePromises = preferences?.map((purpose: string) =>
      registry.findConsentPurposeByCode(purpose)
    );

    const rawPurposes = await Promise.all(purposePromises ?? []);
    const purposeIds = rawPurposes
      .filter(
        (purpose): purpose is NonNullable<typeof purpose> => purpose !== null
      )
      .map((purpose) => purpose.id);

    if (purposeIds.length !== (preferences?.length ?? 0)) {
      return {
        isValid: false,
        reasons: ['Could not find all purposes'],
      };
    }

    // Check if the user has consented to the specific policy
    if (policyId) {
      const policy = await registry.findConsentPolicyById(policyId);
      if (!policy || policy.type !== type) {
        return {
          isValid: false,
          reasons: ['Policy not found'],
        };
      }

      return await policyConsentGiven({
        policyId: policy.id,
        subjectId: subject.id,
        domainId: domainRecord.id,
        purposeIds,
        type,
        event,
      });
    }

    // Check if the user has consented to the latest policy if no policyId is provided
    const latestPolicy = await registry.findOrCreatePolicy(type);
    if (!latestPolicy) {
      return {
        isValid: false,
        reasons: ['Failed to find or create latest policy'],
      };
    }

    return await policyConsentGiven({
      policyId: latestPolicy.id,
      subjectId: subject.id,
      domainId: domainRecord.id,
      purposeIds,
      type,
      event,
    });
  },
});

interface ConsentCheckParams {
  policyId: string;
  subjectId: string;
  domainId: string;
  purposeIds?: string[];
  type: string;
  event: H3Event<EventHandlerRequest>;
}

async function policyConsentGiven({
  policyId,
  subjectId,
  domainId,
  purposeIds,
  type,
  event,
}: ConsentCheckParams): Promise<VerifyConsentResponse> {
  const { registry, adapter } = event.context;

  const rawConsents = await adapter.findMany({
    model: 'consent',
    where: [
      { field: 'subjectId', value: subjectId },
      { field: 'policyId', value: policyId },
      { field: 'domainId', value: domainId },
    ],
    sortBy: {
      field: 'givenAt',
      direction: 'desc',
    },
  });

  const consents = rawConsents.map((consent: Record<string, unknown>) =>
    validateEntityOutput('consent', consent, {})
  );

  const filteredConsents = consents.filter((consent: Consent) => {
    if (!purposeIds) {
      return true;
    }

    return purposeIds.every((id) =>
      (consent.purposeIds as string[]).some((purposeId) => purposeId === id)
    );
  });

  await registry.createAuditLog({
    subjectId: subjectId,
    entityType: 'consent_policy',
    entityId: policyId,
    actionType: 'verify_consent',
    metadata: {
      type,
      policyId,
      purposeIds,
      success: filteredConsents.length !== 0,
      consentId: filteredConsents[0]?.id,
    },
  });

  if (consents.length === 0) {
    return {
      isValid: false,
      reasons: ['No consent found for the given policy'],
    };
  }

  return {
    isValid: true,
    consent: filteredConsents[0],
  };
}
