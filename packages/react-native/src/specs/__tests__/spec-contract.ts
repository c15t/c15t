/**
 * The `C15t` module surface, read off the two places it is written down.
 *
 * `src/specs/NativeC15t.ts` is the source of truth, and both native halves are hand-written
 * against it: `android/c15t-spec/src/main/java/.../NativeC15tSpec.java` and
 * `ios/C15tReactNative/ReactNative/C15tReactNativeModule.{swift,mm}`. The per-platform test
 * files generate the real Codegen output and compare; this file holds what both of them
 * grade against, so one renamed method fails two checks rather than being fixed on the
 * platform someone happened to test.
 *
 * Nothing here parses native source. Deriving the *expected* shape from the TypeScript is
 * what makes a check able to notice that both the spec and its stand-in moved together in
 * the wrong direction, which a bare hand-written-versus-generated diff cannot see.
 */

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKAGE_ROOT = resolve(
	dirname(fileURLToPath(import.meta.url)),
	'../../..'
);

/** One argument as the TypeScript spec declares it. */
export interface SpecArgument {
	/** The type name as written, which is the only thing Codegen reads. */
	type: 'number' | 'string';
}

/** One method as the TypeScript spec declares it. */
export interface SpecMethod {
	args: SpecArgument[];
	/** `true` when Codegen must lower this to a blocking synchronous method. */
	blocking: boolean;
	name: string;
	/** `promise-*` means a trailing promise pair in the generated native code. */
	returns: 'promise-string' | 'promise-void' | 'string' | 'void';
}

interface CodegenConfig {
	android?: { javaPackageName?: string };
	ios?: { modules?: Record<string, { className?: string }> };
	jsSrcsDir?: string;
	name: string;
	type?: string;
}

/** The names `codegenConfig` and the spec file have to keep agreeing on. */
export const { codegenConfig } = JSON.parse(
	readFileSync(join(PACKAGE_ROOT, 'package.json'), 'utf8')
) as {
	codegenConfig: CodegenConfig;
};

/** The name JavaScript looks this module up by, and the native side must register. */
export const [MODULE_NAME = ''] = Object.keys(codegenConfig.ios?.modules ?? {});

/** The class `RCTModuleProviders` is told to instantiate for that name. */
export const [MODULE_CLASS_NAME = ''] = Object.values(
	codegenConfig.ios?.modules ?? {}
).map((module) => module.className ?? '');

/** The `codegenConfig` library name, which is the generated artifact's file name. */
export const LIBRARY_NAME = codegenConfig.name;

/** The package the Android spec is generated into. */
export const [JAVA_PACKAGE = ''] = [
	codegenConfig.android?.javaPackageName ?? '',
];

/** The spec source, and the stand-in that has to keep matching what Codegen makes of it. */
export const SPEC_PATH = join(
	PACKAGE_ROOT,
	codegenConfig.jsSrcsDir ?? 'src/specs',
	'NativeC15t.ts'
);

export const JAVA_STUB_PATH = join(
	PACKAGE_ROOT,
	'android/c15t-spec/src/main/java',
	JAVA_PACKAGE.replaceAll('.', '/'),
	'NativeC15tSpec.java'
);

export const SPEC_SOURCE = readFileSync(SPEC_PATH, 'utf8');

export const JAVA_STUB_SOURCE = readFileSync(JAVA_STUB_PATH, 'utf8');

/** Drop comments, so a mention of a method in prose cannot read as a declaration. */
export const stripComments = function stripComments(source: string): string {
	return source
		.replaceAll(/\/\*[\S\s]*?\*\//gu, '')
		.replaceAll(/\/\/[^\n]*/gu, '');
};

/**
 * Every member of `export interface Spec extends TurboModule { ... }`.
 *
 * The reader is narrow on purpose: it is handed one file in one style, and it throws when
 * that file stops looking like that, because a member this reader skipped is a member
 * nobody compared.
 *
 * @param specSource The contents of `NativeC15t.ts`.
 * @throws {Error} When a declared member is not `name: (a: string) => Type;`.
 */
export const parseSpecMethods = function parseSpecMethods(
	specSource: string
): SpecMethod[] {
	const body = stripComments(specSource);
	const opened = body.indexOf('export interface Spec extends TurboModule {');

	if (opened === -1) {
		throw new Error(
			'NativeC15t.ts no longer declares `export interface Spec extends TurboModule`, so there is no surface to read.'
		);
	}

	const closed = body.indexOf('}', opened);
	const members = [
		...body
			.slice(opened, closed)
			.matchAll(
				/^\t(?<name>[A-Za-z_][A-Za-z0-9_]*) *: *\((?<args>[^)]*)\) *=> *(?<returns>[^;]+);/gmu
			),
	];

	if (members.length === 0) {
		throw new Error(
			'No members were read from the Spec interface, so every native comparison below would pass vacuously.'
		);
	}

	return members.map((member) => {
		const { args = '', name = '', returns = '' } = member.groups ?? {};
		const parsedArguments = args
			.split(',')
			.map((argument) => argument.trim())
			.filter((argument) => argument.length > 0)
			.map((argument) => {
				// `name: string`, and nothing else: the label is Codegen's business.
				const colon = argument.lastIndexOf(':');

				if (colon === -1) {
					throw new Error(
						`${name}: declares the parameter "${argument}" without a type annotation.`
					);
				}

				const normalized = argument.slice(colon + 1).trim();

				if (normalized !== 'number' && normalized !== 'string') {
					throw new Error(
						`${name}: declares an argument of type "${normalized}". Structured payloads cross as JSON strings, so the only accepted argument types are number and string.`
					);
				}

				return { type: normalized as SpecArgument['type'] };
			});

		const normalizedReturns = returns.trim();
		const known = [
			'Promise<string>',
			'Promise<void>',
			'string',
			'void',
		] as const;

		if (!(known as readonly string[]).includes(normalizedReturns)) {
			throw new Error(
				`${name}: returns "${normalizedReturns}". The contract allows string, void, Promise<string>, and Promise<void>, and nothing else, because Codegen cannot express the unions in a snapshot.`
			);
		}

		return {
			args: parsedArguments,
			blocking: normalizedReturns === 'string',
			name,
			returns: normalizedReturns as SpecMethod['returns'],
		};
	});
};

/** Every method the spec declares, in declaration order. */
export const SPEC_METHODS = parseSpecMethods(SPEC_SOURCE);

/** The names, in the order Codegen emits them. */
export const SPEC_METHOD_NAMES = SPEC_METHODS.map((method) => method.name);

/**
 * What Java may see where the wire carries consent data.
 *
 * A structured type here would mean the spec stopped encoding to JSON on the JavaScript
 * side and started handing Codegen something it can only pass by reference, which is the
 * one thing both native readers would then get wrong in different ways.
 */
export const ALLOWED_JAVA_TYPES = new Set([
	'Promise',
	'String',
	'double',
	'void',
]);

/** The same rule for the generated Objective-C protocol. */
export const ALLOWED_OBJC_TYPES = new Set([
	'RCTPromiseRejectBlock',
	'RCTPromiseResolveBlock',
	'NSString',
	'double',
	'void',
]);

/** The module surface, as the Android side has to be written. */
export const expectedJavaSignature = function expectedJavaSignature(
	method: SpecMethod
): { parameterTypes: string[]; returnType: string } {
	const parameterTypes = method.args.map((argument) =>
		argument.type === 'number' ? 'double' : 'String'
	);

	if (method.returns.startsWith('promise')) {
		parameterTypes.push('Promise');
	}

	return {
		parameterTypes,
		returnType: method.returns.endsWith('string') ? 'String' : 'void',
	};
};
