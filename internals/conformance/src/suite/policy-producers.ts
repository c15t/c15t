import type { PolicyContractInput } from '../contract/policy-driver';
import { DriverNotImplementedError } from '../driver';
import type { TestDriver } from '../driver';
import {
	POLICY_CANONICAL_SET_CASES,
	POLICY_FINGERPRINT_CASES,
	POLICY_GPC_DETECTION_CASES,
	POLICY_GPC_MAPPING_CASES,
	POLICY_MODEL_PROMPT_CASES,
} from '../fixtures/policy-contract-cases';
import { POLICY_NOW, POLICY_RECORDS } from '../fixtures/policy-records';
import type { SuiteApi } from './helpers';

/** Group A vectors exercise actual public producers and codecs. */
export const runPolicyProducerConformance =
	function runPolicyProducerConformance(
		driver: TestDriver,
		api: SuiteApi
	): void {
		const probe = (input: PolicyContractInput) => {
			if (!driver.probePolicyContract) {
				throw new DriverNotImplementedError(
					driver.framework,
					'probePolicyContract'
				);
			}
			return driver.probePolicyContract(structuredClone(input));
		};
		api.describe(`[${driver.framework}] policy producers and codecs`, () => {
			for (const vector of POLICY_MODEL_PROMPT_CASES) {
				api.test(`validates ${vector.model}/${vector.prompt}`, async () => {
					const actual = await probe({
						kind: 'validate',
						model: vector.model,
						prompt: vector.prompt,
					});
					api.expect(actual.valid).toBe(vector.valid);
				});
			}
			for (const vector of POLICY_GPC_MAPPING_CASES) {
				api.test(
					`validates GPC mapping ${vector.denyCategories.join(',')}`,
					async () => {
						const actual = await probe({
							gpcDenyCategories: vector.denyCategories,
							kind: 'validate',
							model: 'opt-out',
							prompt: 'notice',
						});
						api.expect(actual.valid).toBe(vector.valid);
					}
				);
			}
			for (const vector of POLICY_GPC_DETECTION_CASES) {
				api.test(
					`detects ${vector.source} ${typeof vector.value}:${vector.value}`,
					async () => {
						const actual = await probe({
							kind: 'detect-gpc',
							source: vector.source,
							value: vector.value,
						});
						api.expect(actual.detected).toBe(vector.detected);
					}
				);
			}
			for (const vector of POLICY_CANONICAL_SET_CASES) {
				api.test(`canonicalizes ${vector.field}`, async () => {
					const actual = await probe({
						field: vector.field,
						kind: 'canonicalize',
						values: vector.input,
					});
					api.expect(actual.canonical).toEqual(vector.expected);
				});
			}
			for (const [index, vector] of POLICY_FINGERPRINT_CASES.entries()) {
				api.test(`fingerprint domains ${index + 1}`, async () => {
					const baseline = await probe({ kind: 'fingerprints', mutation: {} });
					const actual = await probe({
						kind: 'fingerprints',
						mutation: vector.mutation,
					});
					if (!baseline.fingerprintInputs || !actual.fingerprintInputs) {
						throw new Error('Missing public fingerprint input domains');
					}
					for (const domain of ['choice', 'notice'] as const) {
						api.expect(baseline.fingerprintInputs[domain].domain).toBe(domain);
						api.expect(baseline.fingerprintInputs[domain].version).toBe(1);
						api.expect(actual.fingerprintInputs[domain].domain).toBe(domain);
						api.expect(actual.fingerprintInputs[domain].version).toBe(1);
					}
					if (!baseline.fingerprints || !actual.fingerprints) {
						throw new Error('Missing actual producer fingerprints');
					}
					api
						.expect(
							baseline.fingerprints.choice === baseline.fingerprints.notice
						)
						.toBe(false);
					for (const domain of vector.changed) {
						api.expect(baseline.fingerprints[domain].length).toBeGreaterThan(0);
						api.expect(actual.fingerprints[domain].length).toBeGreaterThan(0);
						api
							.expect(
								actual.fingerprints[domain] === baseline.fingerprints[domain]
							)
							.toBe(false);
					}
					for (const domain of 'unchanged' in vector ? vector.unchanged : []) {
						api
							.expect(actual.fingerprints[domain])
							.toBe(baseline.fingerprints[domain]);
					}
				});
			}
			for (const [id, record] of Object.entries(POLICY_RECORDS)) {
				api.test(`decodes raw ${id}`, async () => {
					const actual = await probe({
						kind: 'decode',
						now: POLICY_NOW,
						record: { encoding: record.encoding, raw: record.raw },
					});
					api.expect(actual.decoded).toEqual(
						record.expected.valid
							? {
									choice: record.expected.choice,
									subject: record.expected.subject,
								}
							: null
					);
				});
			}
		});
	};
