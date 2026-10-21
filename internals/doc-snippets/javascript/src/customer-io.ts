// #region docs:customer-io-configuration
import { customerIo } from '@c15t/integrations/customer-io';

export const scripts = [customerIo({ writeKey: 'YOUR_WRITE_KEY' })];
// #endregion docs:customer-io-configuration

// #region docs:customer-io-proxy
export const proxiedScripts = [
	customerIo({
		writeKey: 'YOUR_WRITE_KEY',
		cdnUrl: 'https://analytics.example.com',
		loadOptions: {
			integrations: {
				'Customer.io Data Pipelines': {
					apiHost: 'collect.example.com/v1',
					protocol: 'https',
				},
			},
		},
	}),
];
// #endregion docs:customer-io-proxy
