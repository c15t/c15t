// declaration.d.ts
// This is a browser package, so it does not pull in @types/node. `portal`
// guards its dev-only warnings with `typeof process === 'undefined'`, which
// still requires `process` to be declared for the property access to check.
declare const process:
	| { env?: { NODE_ENV?: string } | undefined }
	| undefined;
