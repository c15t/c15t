// Accordion, Collapsible, PreferenceItem, Switch and Tabs render classes whose
// rules live in the dialog stylesheet, not styles.css.
import '@c15t/ui/styles/dialog.css';

// oxlint-disable-next-line oxc/no-barrel-file -- Preserve declaration order, interface shape, and public compatibility.
export * as Accordion from './components/shared/ui/accordion';
export * as Button from './components/shared/ui/button';
export * as Collapsible from './components/shared/ui/collapsible';
export * as Dialog from './components/shared/ui/dialog';
export * as PreferenceItem from './components/shared/ui/preference-item';
export * as Switch from './components/shared/ui/switch';
export * as Tabs from './components/shared/ui/tabs';
