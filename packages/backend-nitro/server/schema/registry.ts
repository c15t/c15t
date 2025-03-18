import { createModel } from '@doubletie/query-builder';
import { auditLogTable } from './audit-log';
import { consentTable } from './consent';
import { consentGeoLocationTable } from './consent-geo-location';
import { consentPolicyTable } from './consent-policy';
import { consentPurposeTable } from './consent-purpose';
import { consentPurposeJunctionTable } from './consent-purpose-junction';
import { consentRecordTable } from './consent-record';
import { consentWithdrawalTable } from './consent-withdrawal';
import { domainTable } from './domain';
import { geoLocationTable } from './geo-location';
import { subjectTable } from './subject';

/**
 * Creates models programmatically from table definitions
 */
export function createModels() {
  // First create all models
  const models = {
    auditLog: new Model(auditLogTable),
    consent: new Model(consentTable),
    consentGeoLocation: new Model(consentGeoLocationTable),
    consentPolicy: new Model(consentPolicyTable),
    consentPurpose: new Model(consentPurposeTable),
    consentPurposeJunction: new Model(consentPurposeJunctionTable),
    consentRecord: new Model(consentRecordTable),
    consentWithdrawal: new Model(consentWithdrawalTable),
    domain: new Model(domainTable),
    geoLocation: new Model(geoLocationTable),
    subject: new Model(subjectTable),
  };

  // Set up Consent relationships
  models.consent.belongsTo(models.subject, {
    foreignKey: 'subjectId'
  });
  models.consent.belongsTo(models.domain, {
    foreignKey: 'domainId'
  });
  models.consent.belongsTo(models.consentPolicy, {
    foreignKey: 'policyId'
  });
  models.consent.hasMany(models.consentRecord, {
    foreignKey: 'consentId'
  });
  models.consent.hasMany(models.consentWithdrawal, {
    foreignKey: 'consentId'
  });
  models.consent.hasMany(models.consentGeoLocation, {
    foreignKey: 'consentId'
  });
  models.consent.belongsToMany(models.consentPurpose, {
    through: models.consentPurposeJunction,
    foreignKey: 'consentId',
    targetKey: 'purposeId'
  });

  // Set up Subject relationships
  models.subject.hasMany(models.consent, {
    foreignKey: 'subjectId'
  });
  models.subject.hasMany(models.auditLog, {
    foreignKey: 'subjectId'
  });

  // Set up Domain relationships
  models.domain.hasMany(models.consent, {
    foreignKey: 'domainId'
  });

  // Set up ConsentPolicy relationships
  models.consentPolicy.hasMany(models.consent, {
    foreignKey: 'policyId'
  });

  // Set up ConsentPurpose relationships
  models.consentPurpose.belongsToMany(models.consent, {
    through: models.consentPurposeJunction,
    foreignKey: 'purposeId',
    targetKey: 'consentId'
  });

  // Set up ConsentGeoLocation relationships
  models.consentGeoLocation.belongsTo(models.consent, {
    foreignKey: 'consentId'
  });
  models.consentGeoLocation.belongsTo(models.geoLocation, {
    foreignKey: 'geoLocationId'
  });

  // Set up ConsentRecord relationships
  models.consentRecord.belongsTo(models.consent, {
    foreignKey: 'consentId'
  });
  models.consentRecord.belongsTo(models.subject, {
    foreignKey: 'subjectId'
  });

  // Set up ConsentWithdrawal relationships
  models.consentWithdrawal.belongsTo(models.consent, {
    foreignKey: 'consentId'
  });
  models.consentWithdrawal.belongsTo(models.subject, {
    foreignKey: 'subjectId'
  });

  // Set up AuditLog relationships
  models.auditLog.belongsTo(models.subject, {
    foreignKey: 'subjectId'
  });

  return models;
}

// Create and export the models
export const models = createModels();

// Export the table definitions
export const tables = {
  auditLog: auditLogTable,
  consent: consentTable,
  consentGeoLocation: consentGeoLocationTable,
  consentPolicy: consentPolicyTable,
  consentPurpose: consentPurposeTable,
  consentPurposeJunction: consentPurposeJunctionTable,
  consentRecord: consentRecordTable,
  consentWithdrawal: consentWithdrawalTable,
  domain: domainTable,
  geoLocation: geoLocationTable,
  subject: subjectTable,
};

/**
 * Complete schema configuration for query builder
 */
export const schemaConfig = {
  models,
  tables
};

// Export individual models and tables for direct use
export {
  auditLogTable,
  consentTable,
  consentGeoLocationTable,
  consentPolicyTable,
  consentPurposeTable,
  consentPurposeJunctionTable,
  consentRecordTable,
  consentWithdrawalTable,
  domainTable,
  geoLocationTable,
  subjectTable
};

// Export types
export type ModelRegistry = typeof models;
export type TableRegistry = typeof tables;