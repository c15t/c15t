import { test, vi } from 'vitest';
import { ConsentManagerWidget } from '~/components/consent-manager-widget/consent-manager-widget';
import type { ThemeValue } from '~/types/theme';
import testComponentStyles from '~/utils/test-helpers';
import type { ConsentManagerWidgetTheme } from '../theme';

vi.mock('~/hooks/use-consent-manager', () => ({
  useConsentManager: () => ({
    getConsentCategory: vi.fn(() => ({ isEnabled: true })), // Mock needed functions
    updateConsentCategory: vi.fn(),
    saveConsents: vi.fn(),
    getDisplayedConsents: vi.fn(() => []), // Add missing function
    // Add other necessary mock properties/functions if needed
  }),
}));

vi.mock('~/hooks/use-translations', () => ({
  useTranslations: () => ({
    consentManagerWidget: {
      // Use the correct key for widget
      necessaryCookies: 'Necessary',
      marketingCookies: 'Marketing',
      analyticsCookies: 'Analytics',
      preferencesCookies: 'Preferences',
      unknownIntegration: 'Unknown',
      alwaysActive: 'Always Active',
      rejectAllButton: 'Reject All',
      acceptAllButton: 'Accept All',
      saveButton: 'Save Settings',
    },
    consentManagerDialog: {},
    cookieBanner: {},
    general: {},
  }),
}));

type ComponentTestCase = {
  testId: string;
  themeKey: string;
  styles: string;
};

const ALL_COMPONENTS: ComponentTestCase[] = [
  {
    testId: 'consent-manager-widget-root',
    themeKey: 'widget.root',
    styles: 'custom-root',
  },
  {
    testId: 'consent-manager-widget-footer',
    themeKey: 'widget.footer',
    styles: 'custom-footer',
  },
  {
    testId: 'consent-manager-widget-footer-sub-group',
    themeKey: 'widget.footer.sub-group',
    styles: 'custom-footer-sub-group',
  },
  {
    testId: 'consent-manager-widget-reject-button',
    themeKey: 'widget.footer.reject-button',
    styles: 'custom-reject-button',
  },
  {
    testId: 'consent-manager-widget-footer-accept-button',
    themeKey: 'widget.footer.accept-button',
    styles: 'custom-accept-button',
  },
  {
    testId: 'consent-manager-widget-footer-save-button',
    themeKey: 'widget.footer.save-button',
    styles: 'custom-save-button',
  },
  {
    testId: 'consent-manager-widget-accordion-trigger-marketing',
    themeKey: 'widget.accordion.trigger',
    styles: 'custom-accordion-trigger',
  },
  {
    testId: 'consent-manager-widget-accordion-trigger-inner-marketing',
    themeKey: 'widget.accordion.trigger-inner',
    styles: 'custom-accordion-trigger-inner',
  },
  {
    testId: 'consent-manager-widget-accordion-content-marketing',
    themeKey: 'widget.accordion.content',
    styles: 'custom-accordion-content',
  },
  {
    testId: 'consent-manager-widget-switch-marketing',
    themeKey: 'widget.switch',
    styles: 'custom-switch',
  },
];

test('Theme prop applies string classnames to all components', async () => {
  const test = (
    <ConsentManagerWidget
      theme={ALL_COMPONENTS.reduce(
        (acc, { themeKey, styles }) => {
          acc[themeKey] = styles;
          return acc;
        },
        {} as Record<string, ThemeValue>
      )}
    />
  );

  await testComponentStyles({
    component: test,
    testCases: ALL_COMPONENTS.map(({ testId, styles }) => ({
      testId,
      styles,
    })),
  });
});

test('Theme prop supports object format with className and style for all components', async () => {
  const style = {
    backgroundColor: '#ffffff',
    padding: '20px',
    border: '1px solid #000000',
  } as const;

  const testCases = ALL_COMPONENTS.map(({ testId, themeKey, styles }) => ({
    testId,
    themeKey,
    className: styles,
    style,
  }));

  const test = (
    <ConsentManagerWidget
      theme={testCases.reduce(
        (acc, { themeKey, className, style }) => {
          acc[themeKey] = {
            className,
            style,
          };
          return acc;
        },
        {} as Record<string, ThemeValue>
      )}
    />
  );

  await testComponentStyles({
    component: test,
    testCases: testCases.map(({ testId, className, style }) => ({
      testId,
      styles: {
        className,
        style,
      },
    })),
  });
});

test('No style prop removes default styles but keeps custom classNames', async () => {
  const test = (
    <ConsentManagerWidget
      noStyle
      theme={ALL_COMPONENTS.reduce(
        (acc, { themeKey, styles }) => {
          acc[themeKey] = styles;
          return acc;
        },
        {} as Record<string, ThemeValue>
      )}
    />
  );

  await testComponentStyles({
    component: test,
    testCases: ALL_COMPONENTS.map(({ testId, styles }) => ({
      testId,
      styles,
    })),
    noStyle: true,
  });
});

test('Theme prop handles mixed format (string and object) correctly', async () => {
  const mixedTheme: ConsentManagerWidgetTheme = {
    'widget.root': {
      className: 'custom-root',
      style: {
        backgroundColor: 'rgb(255, 255, 255)',
        padding: '16px',
      },
    },
    'widget.accordion.trigger': 'custom-accordion-trigger',
  };

  const test = <ConsentManagerWidget theme={mixedTheme} />;

  await testComponentStyles({
    component: test,
    testCases: [
      {
        testId: 'consent-manager-widget-root',
        styles: {
          className: 'custom-root',
          style: {
            backgroundColor: 'rgb(255, 255, 255)',
            padding: '16px',
          },
        },
      },
      {
        testId: 'consent-manager-widget-accordion-trigger-marketing',
        styles: 'custom-accordion-trigger',
      },
    ],
  });
});

test('Theme prop handles edge cases gracefully', async () => {
  const edgeCaseTheme: ConsentManagerWidgetTheme = {
    'widget.root': '',
    'widget.accordion': '',
    'widget.footer': {
      className: '',
      style: {
        margin: '0',
        padding: '0',
      },
    },
  };

  const test = <ConsentManagerWidget theme={edgeCaseTheme} />;

  await testComponentStyles({
    component: test,
    testCases: [
      {
        testId: 'consent-manager-widget-root',
        styles: '',
      },
      {
        testId: 'consent-manager-widget-accordion',
        styles: '',
      },
      {
        testId: 'consent-manager-widget-footer',
        styles: {
          className: '',
          style: {
            margin: '0',
            padding: '0',
          },
        },
      },
    ],
  });
});
