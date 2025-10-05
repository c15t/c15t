# Ticket 5.5: Consent Dashboard UI Components

## 📋 Ticket Details
**Phase**: 5 - Consent.io Control Plane  
**Story Points**: 8  
**Priority**: High  
**Assignee**: TBD  
**Status**: Ready

## 🔗 Dependencies
**Depends on**: Ticket 5.3 (Consent Backend API Handlers)  
**Blocking**: None  

## 🎯 Description
Build React components for destination management in the consent.io control plane dashboard. This enables organizations to manage their analytics destinations through a web interface, while self-hosted users continue using direct code configuration.

## 🧠 Context & Background
This ticket creates the UI components for the **consent.io control plane** dashboard where:

- **Organizations** manage destinations through web UI instead of code
- **React components** provide intuitive destination management
- **Dynamic forms** adapt to different destination types and settings
- **Self-hosted users** continue using `c15tInstance` with direct configuration
- **Two deployment models** coexist:
  - **Consent.io SaaS**: Dashboard → Database → Deployed Instance
  - **Self-hosted**: Code → c15tInstance → Analytics

The UI components must:
- Display destinations in organized lists
- Provide forms for adding/editing destinations
- Support different destination types with specific settings
- Test connections to external services
- Handle loading states and errors gracefully
- Provide intuitive user experience

## ✅ Acceptance Criteria
- [ ] Create destination list component
- [ ] Create add destination modal
- [ ] Create edit destination form
- [ ] Create destination type selector
- [ ] Create settings form (dynamic based on schema)
- [ ] Create connection test button
- [ ] Add loading states and error handling
- [ ] Unit tests for all components

## 📁 Files to Create
- `packages/dev-tools/src/admin/destinations-list.tsx`
- `packages/dev-tools/src/admin/add-destination-modal.tsx`
- `packages/dev-tools/src/admin/edit-destination-form.tsx`
- `packages/dev-tools/src/admin/destination-type-selector.tsx`

## 🔧 Implementation Details

### Destination List Component
```typescript
import React, { useState, useEffect } from 'react';
import { DestinationResponse } from '@c15t/backend-contracts';

interface DestinationsListProps {
  organizationId: string;
  environment: 'development' | 'staging' | 'production';
  onEdit: (destination: DestinationResponse) => void;
  onDelete: (destinationId: string) => void;
  onTestConnection: (destinationId: string) => Promise<void>;
}

export function DestinationsList({
  organizationId,
  environment,
  onEdit,
  onDelete,
  onTestConnection,
}: DestinationsListProps) {
  const [destinations, setDestinations] = useState<DestinationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testingConnections, setTestingConnections] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadDestinations();
  }, [organizationId, environment]);

  const loadDestinations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/v1/destinations?environment=${environment}`);
      if (!response.ok) {
        throw new Error(`Failed to load destinations: ${response.status}`);
      }
      
      const data = await response.json();
      setDestinations(data.destinations);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load destinations');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async (destinationId: string) => {
    setTestingConnections(prev => new Set(prev).add(destinationId));
    
    try {
      await onTestConnection(destinationId);
      await loadDestinations(); // Refresh to get updated status
    } catch (err) {
      console.error('Connection test failed:', err);
    } finally {
      setTestingConnections(prev => {
        const next = new Set(prev);
        next.delete(destinationId);
        return next;
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      connected: { color: 'green', text: 'Connected' },
      failed: { color: 'red', text: 'Failed' },
      unknown: { color: 'gray', text: 'Unknown' },
      testing: { color: 'blue', text: 'Testing' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.unknown;
    
    return (
      <span className={`px-2 py-1 rounded text-xs bg-${config.color}-100 text-${config.color}-800`}>
        {config.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading destinations...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <div className="mt-2 text-sm text-red-700">{error}</div>
            <div className="mt-4">
              <button
                onClick={loadDestinations}
                className="bg-red-100 px-3 py-2 rounded text-sm font-medium text-red-800 hover:bg-red-200"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          Analytics Destinations ({environment})
        </h3>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          Manage your analytics destinations and their configurations.
        </p>
      </div>
      
      {destinations.length === 0 ? (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No destinations</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by adding your first analytics destination.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-200">
          {destinations.map((destination) => (
            <li key={destination.id}>
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 font-medium text-sm">
                          {destination.type.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-gray-900">{destination.name}</p>
                        {getStatusBadge(destination.connectionStatus)}
                      </div>
                      <p className="text-sm text-gray-500">
                        {destination.type} • {destination.environment}
                      </p>
                      {destination.description && (
                        <p className="text-sm text-gray-500 mt-1">{destination.description}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleTestConnection(destination.id)}
                      disabled={testingConnections.has(destination.id)}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {testingConnections.has(destination.id) ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                          Testing...
                        </>
                      ) : (
                        'Test Connection'
                      )}
                    </button>
                    
                    <button
                      onClick={() => onEdit(destination)}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Edit
                    </button>
                    
                    <button
                      onClick={() => onDelete(destination.id)}
                      className="inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                
                <div className="mt-2">
                  <div className="flex flex-wrap gap-2">
                    {destination.requiredConsent.map((consent) => (
                      <span
                        key={consent}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {consent}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

### Add Destination Modal
```typescript
import React, { useState } from 'react';
import { DestinationType } from '@c15t/backend-contracts';

interface AddDestinationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (destination: any) => Promise<void>;
  organizationId: string;
  environment: 'development' | 'staging' | 'production';
}

export function AddDestinationModal({
  isOpen,
  onClose,
  onSave,
  organizationId,
  environment,
}: AddDestinationModalProps) {
  const [formData, setFormData] = useState({
    type: '' as DestinationType | '',
    name: '',
    description: '',
    enabled: true,
    testMode: false,
    requiredConsent: [] as string[],
    settings: {} as Record<string, unknown>,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const destinationTypes = [
    { value: 'posthog', label: 'PostHog', description: 'Product analytics and feature flags' },
    { value: 'meta-pixel', label: 'Meta Pixel', description: 'Facebook advertising tracking' },
    { value: 'google-analytics', label: 'Google Analytics', description: 'Web analytics and reporting' },
    { value: 'mixpanel', label: 'Mixpanel', description: 'Product analytics and user behavior' },
    { value: 'amplitude', label: 'Amplitude', description: 'Digital analytics platform' },
    { value: 'console', label: 'Console', description: 'Development and debugging' },
  ];

  const consentOptions = [
    { value: 'necessary', label: 'Necessary', description: 'Essential for website functionality' },
    { value: 'measurement', label: 'Analytics', description: 'Website usage and performance' },
    { value: 'marketing', label: 'Marketing', description: 'Advertising and promotional content' },
    { value: 'functionality', label: 'Functionality', description: 'Enhanced features and personalization' },
    { value: 'experience', label: 'Experience', description: 'User experience improvements' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await onSave({
        ...formData,
        environment,
        organizationId,
      });
      onClose();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create destination');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      type: '',
      name: '',
      description: '',
      enabled: true,
      testMode: false,
      requiredConsent: [],
      settings: {},
    });
    setError(null);
  };

  const handleConsentChange = (consent: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      requiredConsent: checked
        ? [...prev.requiredConsent, consent]
        : prev.requiredConsent.filter(c => c !== consent),
    }));
  };

  const renderSettingsForm = () => {
    if (!formData.type) return null;

    switch (formData.type) {
      case 'posthog':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">API Key</label>
              <input
                type="text"
                required
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                value={(formData.settings.apiKey as string) || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  settings: { ...prev.settings, apiKey: e.target.value }
                }))}
                placeholder="phc_..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Host (optional)</label>
              <input
                type="url"
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                value={(formData.settings.host as string) || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  settings: { ...prev.settings, host: e.target.value }
                }))}
                placeholder="https://app.posthog.com"
              />
            </div>
          </div>
        );

      case 'meta-pixel':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Pixel ID</label>
              <input
                type="text"
                required
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                value={(formData.settings.pixelId as string) || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  settings: { ...prev.settings, pixelId: e.target.value }
                }))}
                placeholder="123456789"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Access Token</label>
              <input
                type="password"
                required
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                value={(formData.settings.accessToken as string) || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  settings: { ...prev.settings, accessToken: e.target.value }
                }))}
                placeholder="Your Meta access token"
              />
            </div>
          </div>
        );

      case 'google-analytics':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Measurement ID</label>
              <input
                type="text"
                required
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                value={(formData.settings.measurementId as string) || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  settings: { ...prev.settings, measurementId: e.target.value }
                }))}
                placeholder="G-XXXXXXXXXX"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">API Secret</label>
              <input
                type="password"
                required
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                value={(formData.settings.apiSecret as string) || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  settings: { ...prev.settings, apiSecret: e.target.value }
                }))}
                placeholder="Your GA4 API secret"
              />
            </div>
          </div>
        );

      default:
        return (
          <div className="text-sm text-gray-500">
            No additional settings required for {formData.type}.
          </div>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Add Destination</h3>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Destination Type</label>
              <select
                required
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as DestinationType }))}
              >
                <option value="">Select a destination type</option>
                {destinationTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label} - {type.description}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                required
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="My Analytics Destination"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                rows={3}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description"
              />
            </div>

            {renderSettingsForm()}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Required Consent</label>
              <div className="space-y-2">
                {consentOptions.map((consent) => (
                  <label key={consent.value} className="flex items-center">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      checked={formData.requiredConsent.includes(consent.value)}
                      onChange={(e) => handleConsentChange(consent.value, e.target.checked)}
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      {consent.label} - {consent.description}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Destination'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
```

### Self-Hosted Integration Note
```typescript
// For self-hosted users, they continue using direct configuration:
// These UI components are ONLY for consent.io control plane dashboard

// Self-hosted example:
const instance = await c15tInstance({
  analytics: {
    destinations: [
      posthog({ apiKey: 'phc_their_key' }),
      metaPixel({ pixelId: '123', accessToken: 'their_token' }),
    ],
  },
});

// Consent.io SaaS users manage destinations through these UI components + dashboard
```

## 🧪 Testing Requirements
- Unit tests for all UI components
- Integration tests with admin API
- Form validation tests
- Error handling tests
- Loading state tests
- User interaction tests

## 🔍 Definition of Done
- [ ] Destination list component created
- [ ] Add destination modal created
- [ ] Edit destination form created
- [ ] Destination type selector created
- [ ] Dynamic settings form created
- [ ] Connection test button created
- [ ] Loading states and error handling added
- [ ] Unit tests for all components
- [ ] Code review completed

## 📚 Related Documentation
- [Cloud Configuration](../docs/analytics-cloud-configuration.md)
- [Analytics Frontend Integration](../docs/analytics-frontend-integration.md)

## 🔗 Dependencies
- [3.1: Database Schema](./12-database-schema.md) ✅
- [3.2: Admin API Contracts](./13-admin-api-contracts.md) ✅
- [3.3: Admin API Handlers](./14-admin-api-handlers.md) ✅
- [3.4: Database Loading Support](./15-database-loading.md) ✅

## 🚀 Next Ticket
[3.6: Update Scripts Endpoint for Database](./17-scripts-endpoint-database.md)
