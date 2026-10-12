// Vue components import each component stylesheet next to its `@c15t/ui`
// class map. Kept in a script file (no imports) so the wildcard declaration
// is global rather than a module augmentation.
declare module '@c15t/ui/styles/components/*.css';
