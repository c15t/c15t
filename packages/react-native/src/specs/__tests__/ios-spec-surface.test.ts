/**
 * The hand-written iOS selector surface, checked against the protocol Codegen
 * actually generates.
 *
 * `C15tReactNativeModule.swift` cannot declare the conformance the TypeScript spec
 * implies. Codegen emits that protocol into an ObjC++ umbrella header whose first
 * directive refuses to compile as plain Objective-C, so the protocol has no Swift
 * spelling and the hand-written side states every selector by name instead. Nothing
 * ties those names to the protocol at build time: the JSI glue compiled into the host
 * app looks each one up on the instance at call time. Rename an argument label, or
 * take an `Int` where Codegen says `double`, and the pod still builds, the app still
 * launches, and the one user who taps allow gets `doesNotRecognizeSelector:` on the
 * JavaScript thread. That is the class of bug this file stops, and it is the only
 * automated check for it that needs neither a simulator nor an app checkout.
 *
 * Ground truth is Codegen itself, run over `src/specs/NativeC15t.ts` with the same
 * `@react-native/codegen` the host app resolves. A committed copy of the generated
 * header would have been cheaper, and would drift on its own schedule, which is the
 * failure being guarded against.
 */

import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, describe, expect, test } from 'vitest';

const requireModule = createRequire(import.meta.url);

const PACKAGE_ROOT = resolve(
	dirname(fileURLToPath(import.meta.url)),
	'../../..'
);

const REACT_NATIVE_DIR = join(PACKAGE_ROOT, 'ios/C15tReactNative/ReactNative');

const SWIFT_MODULE_PATH = join(REACT_NATIVE_DIR, 'C15tReactNativeModule.swift');

const MODULE_PATH = join(REACT_NATIVE_DIR, 'C15tReactNativeModule.mm');

/** One method as the generated Objective-C protocol declares it. */
interface GeneratedMethod {
	/** Objective-C type spellings, in declaration order. */
	argumentTypes: string[];
	/** Objective-C type of the return value; `void` when the protocol says so. */
	returnType: string;
	/** The whole selector, colons included: `commit:resolve:reject:`. */
	selector: string;
}

/** The same pair of facts, read off the hand-written Swift implementation. */
type ImplementedMethod = GeneratedMethod;

/** What a run of Codegen over this package produced. */
interface GeneratedSpec {
	/** The name Codegen gives the spec module, for example `NativeC15t`. */
	codegenModuleName: string;
	/** The umbrella header, verbatim. */
	header: string;
	/** The protocol's Objective-C name, for example `NativeC15tSpec`. */
	protocolName: string;
}

interface CodegenConfig {
	android?: { javaPackageName?: string };
	ios?: { modules?: Record<string, { className?: string }> };
	jsSrcsDir: string;
	name: string;
	type: string;
}

interface PackageJson {
	codegenConfig: CodegenConfig;
}

interface CombineModule {
	combineSchemasInFileList: (
		files: readonly string[],
		platform: string,
		exclude: RegExp | undefined,
		libraryName: string
	) => { modules: Record<string, unknown> };
}

interface RNCodegenModule {
	generate: (
		config: {
			libraryName: string;
			outputDirectory: string;
			packageName: string;
			schema: unknown;
			useLocalIncludePaths: boolean;
		},
		options: { generators: readonly string[] }
	) => boolean;
}

const packageJson = JSON.parse(
	readFileSync(join(PACKAGE_ROOT, 'package.json'), 'utf8')
) as PackageJson;

const { codegenConfig } = packageJson;

/** The name JavaScript looks this module up by, straight from `codegenConfig`. */
const [moduleName = ''] = Object.keys(codegenConfig.ios?.modules ?? {});

/** The class name Codegen tells `RCTModuleProviders` to instantiate. */
const [{ className = '' } = {}] = Object.values(
	codegenConfig.ios?.modules ?? {}
);

const specSource = readFileSync(
	join(PACKAGE_ROOT, codegenConfig.jsSrcsDir, 'NativeC15t.ts'),
	'utf8'
);

const swiftSource = readFileSync(SWIFT_MODULE_PATH, 'utf8');

const moduleSource = readFileSync(MODULE_PATH, 'utf8');

/**
 * Swift spelling for the Objective-C type Codegen writes in the same wire position.
 *
 * `String` bridges to `NSString *`, the two promise blocks bridge by name, and a
 * TypeScript `number` arrives as `double` -- `Int` would bridge to `NSInteger` and
 * disagree, which is why `removeListeners` takes `Double`. A Swift type missing from
 * this table fails the test instead of quietly comparing equal, so widening the
 * TypeScript spec forces a decision here rather than a surprise at runtime.
 */
const OBJC_TYPE_BY_SWIFT_TYPE: Readonly<Record<string, string>> = {
	Double: 'double',
	RCTPromiseRejectBlock: 'RCTPromiseRejectBlock',
	RCTPromiseResolveBlock: 'RCTPromiseResolveBlock',
	String: 'NSString',
};

/** Collapse an Objective-C type to the form the table values use. */
const normalizeObjCType = (objcType: string): string =>
	objcType
		.replace(/\s+/gu, ' ')
		.replace(/\s*\*\s*$/u, '')
		.trim();

/** Collapse a Swift type to a key of the table. */
const normalizeSwiftType = (swiftType: string): string =>
	swiftType
		.replace(/^@escaping\s+/u, '')
		.replace(/[!?]$/u, '')
		.trim();

const objcTypeForSwiftType = (swiftType: string, selector: string): string => {
	const normalized = normalizeSwiftType(swiftType);
	const objcType = OBJC_TYPE_BY_SWIFT_TYPE[normalized];

	if (objcType === undefined) {
		throw new Error(
			`Swift spells an argument of ${selector} as "${swiftType}", which has no entry in OBJC_TYPE_BY_SWIFT_TYPE. Add the pair here, having checked the generated header agrees.`
		);
	}

	return objcType;
};

/** Index of the `)` matching the `(` at `open`, counting nesting. */
const findMatchingParen = (source: string, open: number): number => {
	let depth = 0;

	for (let index = open; index < source.length; index += 1) {
		const character = source[index];
		if (character === '(') {
			depth += 1;
		} else if (character === ')') {
			depth -= 1;
			if (depth === 0) {
				return index;
			}
		}
	}

	throw new Error('An @objc method declaration has no closing parenthesis.');
};

/** Split a Swift parameter list on its top-level commas. */
const splitTopLevel = (parameterList: string): string[] => {
	const parameters: string[] = [];
	let depth = 0;
	let current = '';

	for (const character of parameterList) {
		if (character === '(' || character === '[') {
			depth += 1;
		} else if (character === ')' || character === ']') {
			depth -= 1;
		}

		if (character === ',' && depth === 0) {
			parameters.push(current.trim());
			current = '';
			continue;
		}

		current += character;
	}

	const last = current.trim();
	if (last.length > 0) {
		parameters.push(last);
	}

	return parameters;
};

/** The type of one `name: Type` or `_ name: Type` parameter. */
const typeOfParameter = (parameter: string): string => {
	const colon = parameter.lastIndexOf(':');

	if (colon === -1) {
		throw new Error(
			`The parameter "${parameter}" carries no type annotation, so its Objective-C type cannot be derived.`
		);
	}

	return parameter.slice(colon + 1).trim();
};

/**
 * Read the `- (T)foo:(T)a bar:(T)b;` declarations out of one generated protocol.
 *
 * Deliberately a narrow reader rather than a parser: it is handed a file Codegen wrote
 * from a fixed template, and it fails loudly when the shape it expects is absent.
 */
const parseGeneratedProtocol = (
	header: string,
	protocolName: string
): GeneratedMethod[] => {
	const start = header.indexOf(`@protocol ${protocolName}`);

	if (start === -1) {
		throw new Error(
			`Codegen produced no @protocol ${protocolName}, so there is nothing to compare the Swift selectors against.`
		);
	}

	const end = header.indexOf('@end', start);
	const body = header.slice(start, end === -1 ? header.length : end);

	return [
		...body.matchAll(/- *\((?<returnType>[^)]+)\) *(?<signature>[^;]*);/gu),
	].map((declaration) => {
		const { returnType = 'void', signature = '' } = declaration.groups ?? {};
		const keywords = [
			...signature.matchAll(
				/(?<keyword>[A-Za-z_][A-Za-z0-9_]*) *: *\((?<argumentType>[^)]*)\) *[A-Za-z_][A-Za-z0-9_]*/gu
			),
		];

		if (keywords.length === 0) {
			return {
				argumentTypes: [],
				returnType: normalizeObjCType(returnType),
				selector: signature.trim(),
			};
		}

		return {
			argumentTypes: keywords.map((keyword) =>
				normalizeObjCType(keyword.groups?.argumentType ?? 'void')
			),
			returnType: normalizeObjCType(returnType),
			selector: keywords
				.map((keyword) => `${keyword.groups?.keyword ?? ''}:`)
				.join(''),
		};
	});
};

/**
 * The declaration an `@objc(name)` annotation is allowed to introduce.
 *
 * `class` covers the annotation on the class itself, `func` is the one with a signature
 * worth checking. An annotation followed by anything else fails rather than passing as
 * agreement, because a selector this reader skips is a selector nobody compared.
 */
const DECLARATION_AFTER_OBJC_NAME =
	/^(?:(?:public|open|internal|private|fileprivate|final|override|dynamic|required|static|weak|lazy|convenience|optional)\s+)*(?<keyword>func|class|init|var|let|subscript|protocol|extension|struct|enum)\b/u;

/**
 * Read every `@objc(selector)` the Swift class exposes, with its Swift signature.
 *
 * The selector is what the generated JSI glue dispatches on, so it is read from the
 * annotation rather than inferred from the Swift name: inferred names are the thing
 * under test.
 */
const parseSwiftObjcSurface = (source: string): ImplementedMethod[] => {
	const methods: ImplementedMethod[] = [];

	for (const annotation of source.matchAll(
		/@objc\((?<selector>[A-Za-z_][A-Za-z0-9_:]*)\)/gu
	)) {
		const { selector = '' } = annotation.groups ?? {};
		const rest = source.slice((annotation.index ?? 0) + annotation[0].length);
		const head = rest.replace(/^\s+/u, '');
		const introduced = DECLARATION_AFTER_OBJC_NAME.exec(head)?.groups?.keyword;

		if (introduced === undefined) {
			throw new Error(
				`@objc(${selector}) is not followed by a declaration this reader understands, so its signature cannot be checked.`
			);
		}

		if (introduced !== 'func') {
			continue;
		}

		const declaration = /\bfunc\s+(?<name>[A-Za-z_][A-Za-z0-9_]*)\s*\(/u.exec(
			head
		);

		if (declaration === null) {
			throw new Error(
				`@objc(${selector}) introduces a func with no readable name and parameter list.`
			);
		}

		const { name: functionName = '' } = declaration.groups ?? {};
		const openParen = declaration.index + declaration[0].length - 1;
		const closeParen = findMatchingParen(head, openParen);
		const parameters = splitTopLevel(head.slice(openParen + 1, closeParen));
		const body = /^\s*(?:->\s*(?<returnType>[^{]+?))?\s*\{/u.exec(
			head.slice(closeParen + 1)
		);

		if (body === null) {
			throw new Error(
				`@objc(${selector}) has no readable opening brace, so its return type cannot be read.`
			);
		}

		methods.push({
			argumentTypes: parameters.map((parameter) =>
				objcTypeForSwiftType(typeOfParameter(parameter), selector)
			),
			returnType:
				body.groups?.returnType === undefined
					? 'void'
					: objcTypeForSwiftType(body.groups.returnType, selector),
			selector,
		});

		// For every method Codegen generates, the selector's first keyword is the
		// Swift function name, so a gap between the two means the annotation was
		// edited on its own.
		const [firstKeyword = ''] = selector.split(':');
		if (firstKeyword !== functionName) {
			throw new Error(
				`@objc(${selector}) is attached to func ${functionName}, so the Objective-C name and the Swift name have drifted apart inside one declaration.`
			);
		}
	}

	return methods;
};

let generatedSpec: GeneratedSpec = {
	codegenModuleName: '',
	header: '',
	protocolName: '',
};

let outputDirectory = '';

beforeAll(() => {
	const { combineSchemasInFileList } = requireModule(
		'@react-native/codegen/lib/cli/combine/combine-js-to-schema.js'
	) as CombineModule;
	const { generate } = requireModule(
		'@react-native/codegen/lib/generators/RNCodegen.js'
	) as RNCodegenModule;

	const schema = combineSchemasInFileList(
		[join(PACKAGE_ROOT, codegenConfig.jsSrcsDir)],
		'ios',
		undefined,
		codegenConfig.name
	);
	const [codegenModuleName = ''] = Object.keys(schema.modules);

	expect(codegenModuleName).not.toBe('');

	outputDirectory = mkdtempSync(join(tmpdir(), 'c15t-spec-surface-'));
	generate(
		{
			libraryName: codegenConfig.name,
			outputDirectory,
			packageName:
				codegenConfig.android?.javaPackageName ?? 'com.c15t.reactnative',
			schema,
			useLocalIncludePaths: true,
		},
		{ generators: ['modulesIOS'] }
	);

	generatedSpec = {
		codegenModuleName,
		header: readFileSync(
			join(outputDirectory, codegenConfig.name, `${codegenConfig.name}.h`),
			'utf8'
		),
		protocolName: `${codegenModuleName}Spec`,
	};
}, 30000);

afterAll(() => {
	if (outputDirectory.length > 0) {
		rmSync(outputDirectory, { force: true, recursive: true });
	}
});

describe('the generated iOS protocol', () => {
	test('is ObjC++ only, which is why Swift cannot conform to it', () => {
		expect(generatedSpec.header).toMatch(/^#error/mu);
		expect(swiftSource).not.toMatch(
			/class\s+C15tReactNativeModule[^\n]*Native\w+Spec/u
		);
	});

	test('inherits RCTTurboModule, which is what makes the app build an instance', () => {
		const inherited = new RegExp(
			`@protocol ${generatedSpec.protocolName} *<(?<protocols>[^>]*)>`,
			'u'
		).exec(generatedSpec.header)?.groups?.protocols;

		expect(inherited).toContain('RCTBridgeModule');
		expect(inherited).toContain('RCTTurboModule');
	});

	test('declares one method per entry in the TypeScript spec', () => {
		const declared = [
			...specSource.matchAll(/^\t(?<member>[A-Za-z_][A-Za-z0-9_]*):/gmu),
		].map((member) => member.groups?.member ?? '');
		const generated = parseGeneratedProtocol(
			generatedSpec.header,
			generatedSpec.protocolName
		).map((method) => method.selector.split(':')[0]);

		expect(declared).toHaveLength(10);
		expect(generated).toEqual(declared);
	});
});

describe('the hand-written iOS module', () => {
	test('exposes every generated selector with the generated argument types', () => {
		const generated = parseGeneratedProtocol(
			generatedSpec.header,
			generatedSpec.protocolName
		);
		const implemented = new Map(
			parseSwiftObjcSurface(swiftSource).map((method) => [
				method.selector,
				method,
			])
		);
		const mismatches: string[] = [];

		for (const method of generated) {
			// A selector lies about its arity if the colons and the declared
			// argument types disagree, and every comparison below would be wrong.
			expect(method.selector.split(':').length - 1).toBe(
				method.argumentTypes.length
			);

			const implementation = implemented.get(method.selector);

			if (implementation === undefined) {
				mismatches.push(
					`${method.selector}: the protocol declares it and the Swift class does not expose that selector`
				);
				continue;
			}

			if (
				implementation.argumentTypes.join(',') !==
				method.argumentTypes.join(',')
			) {
				mismatches.push(
					`${method.selector}: Swift bridges (${implementation.argumentTypes.join(', ')}) but the protocol declares (${method.argumentTypes.join(', ')})`
				);
			}

			if (implementation.returnType !== method.returnType) {
				mismatches.push(
					`${method.selector}: Swift returns ${implementation.returnType}, the protocol returns ${method.returnType}`
				);
			}
		}

		for (const selector of implemented.keys()) {
			if (!generated.some((method) => method.selector === selector)) {
				mismatches.push(
					`${selector}: the Swift class exposes it and the protocol does not declare it`
				);
			}
		}

		expect(mismatches).toEqual([]);
	});

	test('states the module name in every place it is read from', () => {
		expect(Object.keys(codegenConfig.ios?.modules ?? {})).toHaveLength(1);
		expect(moduleName).toBe('C15t');
		expect(className).toBe('C15tReactNativeModule');
		// The JavaScript spec asks for the name, `RCTModuleProviders` maps that
		// name onto the class name, and `+moduleName` answers it at runtime. All
		// three have to say the same thing or the lookup throws.
		expect(specSource).toContain(`getEnforcing<Spec>('${moduleName}')`);
		expect(moduleSource).toContain(`return @"${moduleName}";`);
		expect(moduleSource).toContain(`@interface ${className} (`);
	});

	test('imports the umbrella header where ReactCodegen installs it', () => {
		// header_mappings_dir stays at './' in the generated podspec, so the
		// subdirectory survives and a flat import never resolves.
		expect(moduleSource).toContain(
			`#import <ReactCodegen/${codegenConfig.name}/${codegenConfig.name}.h>`
		);
	});

	test('supplies the provider that hands JavaScript the generated JSI wrapper', () => {
		// The conformance belongs on the category interface, because an
		// `@implementation` cannot carry a protocol list, and without it
		// RCTTurboModuleManager never creates the instance the provider is later
		// called on.
		expect(moduleSource).toContain(`<${generatedSpec.protocolName}>`);
		expect(moduleSource).toContain(`@protocol(${generatedSpec.protocolName})`);
		expect(moduleSource).toContain('getTurboModule:');
		expect(moduleSource).toContain(`${generatedSpec.protocolName}JSI`);
	});
});
