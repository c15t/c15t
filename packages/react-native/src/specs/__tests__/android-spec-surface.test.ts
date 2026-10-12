/**
 * The hand-written Android stand-in, checked against the spec Codegen actually generates.
 *
 * `android/c15t-spec/src/main/java/.../NativeC15tSpec.java` exists so the bridge has
 * something to compile against in this repository. The real class is generated per app
 * build, so the stand-in is load-bearing in exactly one way: the bridge's Kotlin overrides
 * must still typecheck against what Codegen emits, or the module compiles here and fails in
 * a user's app. Some drift does that quietly. `removeListeners(Double)` and
 * `removeListeners(double)` are two different overrides to a Kotlin subclass and both
 * compile against the stand-in, so "the build is green" is not the check.
 *
 * Ground truth is Codegen itself, run over `src/specs/NativeC15t.ts` through the same
 * command `-Pc15t.spec.source=codegen` runs in Gradle, so this file grades the command CI
 * uses rather than a second implementation of generation. Expectations come from
 * `spec-contract.ts`, which reads the TypeScript, so a stand-in that matches generated
 * output while both moved away from the contract is still a failure here.
 *
 * The iOS mirror of this file is `ios-spec-surface.test.ts`.
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import {
	ALLOWED_JAVA_TYPES,
	JAVA_PACKAGE,
	JAVA_STUB_SOURCE,
	LIBRARY_NAME,
	MODULE_NAME,
	SPEC_METHODS,
	SPEC_METHOD_NAMES,
	expectedJavaSignature,
	stripComments,
} from './spec-contract.ts';

const PACKAGE_ROOT = resolve(
	dirname(fileURLToPath(import.meta.url)),
	'../../..'
);

/** The generator `-Pc15t.spec.source=codegen` runs: same file, same argv shape. */
const GENERATOR_PATH = join(PACKAGE_ROOT, 'android/codegen/generate-spec.mjs');

/** Anything the type encoding can wear in a parameter or return position. */
const ANNOTATION = /@[\w.]+(?:\s*\([^)]*\))?/gu;

/** One method of either file, as written. */
interface JavaMethod {
	/** `true` for `@ReactMethod(isBlockingSynchronousMethod = true)`. */
	blocking: boolean;
	/** Whether it is `abstract`, which is how a spec leaves work to the subclass. */
	abstractMethod: boolean;
	hasReactMethod: boolean;
	name: string;
	/** Java type spellings in order, annotations removed: `['String', 'Promise']`. */
	parameterTypes: string[];
	returnType: string;
}

/** The parts of either Java file that a bridge's overrides depend on. */
interface JavaSpec {
	className: string;
	constructorParameterTypes: string[];
	extendsType: string;
	implementsTypes: string[];
	/** Every method in the file, including the ones React Native declares. */
	methods: JavaMethod[];
	moduleName: string;
	packageName: string;
}

/** Strip the decoration so `@Nonnull String` and `String` compare equal. */
const normalizeJavaType = function normalizeJavaType(raw: string): string {
	return raw
		.replaceAll(ANNOTATION, ' ')
		.replaceAll(/\bfinal\s+/gu, '')
		.replaceAll(/\s+/gu, ' ')
		.trim();
};

/** Split `String intent, Promise promise` into its parameter types. */
const parseParameterTypes = function parseParameterTypes(
	parameters: string
): string[] {
	const trimmed = parameters.trim();

	if (trimmed.length === 0) {
		return [];
	}

	return trimmed.split(',').map((parameter) => {
		const tokens = normalizeJavaType(parameter).split(' ');

		if (tokens.length < 2) {
			throw new Error(
				`The parameter "${parameter}" has no name, so its type cannot be read reliably.`
			);
		}

		return tokens.slice(0, -1).join(' ');
	});
};

/** A constructor is the only declaration with no return type: one identifier, then `(`. */
const CONSTRUCTOR =
	/\b(?:public|protected|private)\s+(?<name>[A-Za-z_$]\w*)\s*\((?<parameters>[^)]*)\)\s*\{/gu;

/** A method declaration or definition, with the modifiers kept and the body's brace read. */
const METHOD =
	/(?<modifiers>\b(?:public|protected|private)\b(?:\s+\b(?:static|final|abstract|synchronized)\b)*)\s+(?<returnType>[A-Za-z_$][\w$.<>[\]]*)\s+(?<name>[A-Za-z_$]\w*)\s*\((?<parameters>[^)]*)\)\s*(?:throws[\w., ]+)?(?<terminator>[{;])/gu;

/**
 * Read the parts of a `NativeC15tSpec.java` that matter, generated or hand-written.
 *
 * One reader for both files is the point: the comparison cannot be skewed by two parsers
 * that disagree about Java. Narrow by design, and it throws when a file stops looking like
 * the two files it is written to read, because a method this reader skipped is a method
 * nobody compared.
 *
 * @param javaSource The whole file.
 */
const parseJavaSpec = function parseJavaSpec(javaSource: string): JavaSpec {
	const annotated = stripComments(javaSource);

	const packageName =
		/package\s+(?<name>[\w.]+);/u.exec(annotated)?.groups?.name ?? '';
	const classDeclaration =
		/(?:public|abstract|\s)*class\s+(?<name>[A-Za-z_$]\w*)\s+extends\s+(?<extends>[\w.]+)(?:\s+implements\s+(?<implements>[\w., ]+?))?\s*\{/u.exec(
			annotated
		);

	// Annotations are collected first, then removed. Left in place, `public @Nonnull String
	// getName()` and `public String getName()` parse as different shapes, and the two files
	// would be read by two different readers wearing one hat.
	const blockingNames = new Set(
		[
			...annotated.matchAll(
				/@ReactMethod\s*\(\s*isBlockingSynchronousMethod\s*=\s*true\s*\)[\w\s@()=]*?\b(?<name>[A-Za-z_$]\w*)\s*\(/gu
			),
		].map((match) => match.groups?.name ?? '')
	);
	const reactMethodNames = new Set(
		[
			...annotated.matchAll(
				/@ReactMethod\b[\w\s@()=]*?\b(?<name>[A-Za-z_$]\w*)\s*\(/gu
			),
		].map((match) => match.groups?.name ?? '')
	);

	const source = annotated.replaceAll(ANNOTATION, ' ');
	const declarations = [...source.matchAll(METHOD)];
	const constructorDeclaration = [...source.matchAll(CONSTRUCTOR)].find(
		(candidate) => candidate.groups?.name === classDeclaration?.groups?.name
	);

	if (classDeclaration === null || declarations.length === 0) {
		throw new Error(
			'NativeC15tSpec.java has no readable class declaration or no readable methods, so nothing below could be compared.'
		);
	}

	return {
		className: classDeclaration.groups?.name ?? '',
		constructorParameterTypes: parseParameterTypes(
			constructorDeclaration?.groups?.parameters ?? ''
		),
		extendsType: classDeclaration.groups?.extends ?? '',
		implementsTypes: (classDeclaration.groups?.implements ?? '')
			.split(',')
			.map((type) => normalizeJavaType(type))
			.filter((type) => type.length > 0),
		methods: declarations.map((method) => {
			const {
				modifiers = '',
				name = '',
				parameters = '',
				returnType = '',
			} = method.groups ?? {};

			return {
				abstractMethod: /\babstract\b/u.test(modifiers),
				blocking: blockingNames.has(name),
				hasReactMethod: reactMethodNames.has(name),
				name,
				parameterTypes: parseParameterTypes(parameters),
				returnType: normalizeJavaType(returnType),
			};
		}),
		moduleName:
			/String\s+NAME\s*=\s*"(?<name>[^"]+)"/u.exec(annotated)?.groups?.name ??
			'',
		packageName,
	};
};

/**
 * The methods the spec declares, as distinct from the one React Native declares.
 *
 * `getName()` is generated and hand-written alike, so it is checked where it belongs;
 * keeping it out of the spec surface means a rename shows up as a mismatched set rather
 * than as a method nobody expected to find.
 */
const specMethodsOf = function specMethodsOf(spec: JavaSpec): JavaMethod[] {
	const inherited = spec.methods.filter((method) => method.name === 'getName');

	if (inherited.length !== 1) {
		throw new Error(
			`Expected exactly one getName() in NativeC15tSpec.java and found ${inherited.length.toString()}, so the module has no readable name.`
		);
	}

	const getName = inherited[0] as JavaMethod;

	if (getName.parameterTypes.length > 0 || getName.returnType !== 'String') {
		throw new Error(
			`getName() is declared as ${getName.returnType} getName(${getName.parameterTypes.join(', ')}), which is not how React Native spells it.`
		);
	}

	return spec.methods.filter((method) => method.name !== 'getName');
};

const GENERATED_DIRECTORY = 'generated';

/** The generated spec, produced once for the whole file by the real command. */
let generatedSource = '';
let outputDirectory = '';

beforeAll(() => {
	outputDirectory = mkdtempSync(join(tmpdir(), 'c15t-android-spec-'));
	// The exact invocation `:c15t-spec` makes, so a generator that broke fails here as
	// well as in the Gradle build.
	execFileSync(
		process.execPath,
		[
			GENERATOR_PATH,
			'--platform',
			'android',
			'--output',
			join(outputDirectory, GENERATED_DIRECTORY),
			'--project-root',
			PACKAGE_ROOT,
		],
		{ encoding: 'utf8' }
	);

	generatedSource = readFileSync(
		join(
			outputDirectory,
			GENERATED_DIRECTORY,
			'java',
			JAVA_PACKAGE.replaceAll('.', '/'),
			'NativeC15tSpec.java'
		),
		'utf8'
	);
}, 60000);

afterAll(() => {
	if (outputDirectory.length > 0) {
		rmSync(outputDirectory, { force: true, recursive: true });
	}
});

describe('the generated Android spec', () => {
	let generated: JavaSpec;

	beforeAll(() => {
		generated = parseJavaSpec(generatedSource);
	});

	test('is Codegen output, in the package codegenConfig declares', () => {
		// Prose only a generator writes, so a hand-placed file cannot satisfy this test by
		// looking the part.
		expect(generatedSource).toContain('@generated by codegen project');
		// The library name is the generated artifact's identity, and the package is the one
		// the bridge's Kotlin is compiled in.
		expect(generatedSource).toContain(LIBRARY_NAME);
		expect(generated.packageName).toBe(JAVA_PACKAGE);
		expect(generated.className).toBe('NativeC15tSpec');
	});

	test('extends the base module, implements TurboModule, and leaves the work abstract', () => {
		expect(generated.extendsType).toBe('ReactContextBaseJavaModule');
		expect(generated.implementsTypes).toContain('TurboModule');
		expect(
			specMethodsOf(generated).every((method) => method.abstractMethod)
		).toBe(true);
	});

	test('registers under the name JavaScript looks up', () => {
		expect(generated.moduleName).toBe(MODULE_NAME);
	});

	test('declares every method the TypeScript spec declares, in order', () => {
		expect(specMethodsOf(generated).map((method) => method.name)).toEqual(
			SPEC_METHOD_NAMES
		);
	});

	test('lowers every method the way the contract says', () => {
		// Derived from NativeC15t.ts and not from either Java file, so generated output and
		// stand-in that drifted the same way still fail here.
		expect(
			specMethodsOf(generated).map((method) => ({
				blocking: method.blocking,
				name: method.name,
				...expectedJavaSignature(
					SPEC_METHODS.find((candidate) => candidate.name === method.name) ?? {
						args: [],
						blocking: false,
						name: method.name,
						returns: 'void',
					}
				),
			}))
		).toEqual(
			SPEC_METHODS.map((method) => ({
				blocking: method.blocking,
				name: method.name,
				...expectedJavaSignature(method),
			}))
		);
	});
});

describe('the hand-written Android stand-in', () => {
	let stub: JavaSpec;
	let generated: JavaSpec;

	beforeAll(() => {
		stub = parseJavaSpec(JAVA_STUB_SOURCE);
		generated = parseJavaSpec(generatedSource);
	});

	test('is the file the bridge build compiles', () => {
		expect(stub.packageName).toBe(JAVA_PACKAGE);
		expect(stub.className).toBe('NativeC15tSpec');
	});

	test('agrees with the generated class about its shape', () => {
		expect(stub.extendsType).toBe(generated.extendsType);
		expect(stub.implementsTypes).toEqual(generated.implementsTypes);
		expect(stub.moduleName).toBe(generated.moduleName);
		// `C15tReactNativeModule(appContext)` calls this constructor. A different parameter
		// list is a compile error in one build and not the other, which is the gap here.
		expect(stub.constructorParameterTypes).toEqual(
			generated.constructorParameterTypes
		);
	});

	test('declares exactly the generated methods, no more', () => {
		expect(specMethodsOf(stub).map((method) => method.name)).toEqual(
			specMethodsOf(generated).map((method) => method.name)
		);
	});

	test('matches every generated signature exactly', () => {
		const implementations = new Map(
			specMethodsOf(stub).map((method) => [method.name, method])
		);
		const mismatches: string[] = [];

		for (const declaration of specMethodsOf(generated)) {
			const standIn = implementations.get(declaration.name);

			if (standIn === undefined) {
				mismatches.push(
					`${declaration.name}: Codegen declares it and the stand-in does not`
				);
				continue;
			}

			// Boxed against primitive counts. Kotlin maps `Double` to whichever the base
			// class uses, so the two overrides are not interchangeable even though both
			// compile against the stand-in.
			if (
				standIn.parameterTypes.join(',') !==
				declaration.parameterTypes.join(',')
			) {
				mismatches.push(
					`${declaration.name}: the stand-in takes (${standIn.parameterTypes.join(', ')}) and Codegen takes (${declaration.parameterTypes.join(', ')})`
				);
			}

			if (standIn.returnType !== declaration.returnType) {
				mismatches.push(
					`${declaration.name}: the stand-in returns ${standIn.returnType} and Codegen returns ${declaration.returnType}`
				);
			}

			if (standIn.abstractMethod !== declaration.abstractMethod) {
				mismatches.push(
					`${declaration.name}: abstract on one side only, so the bridge can compile against one and not the other`
				);
			}

			if (standIn.blocking !== declaration.blocking) {
				mismatches.push(
					`${declaration.name}: isBlockingSynchronousMethod=${String(declaration.blocking)} in generated output and ${String(standIn.blocking)} in the stand-in, which decides whether RN may call it from the UI thread`
				);
			}

			if (standIn.hasReactMethod !== declaration.hasReactMethod) {
				mismatches.push(
					`${declaration.name}: @ReactMethod is on one side only, and RN collects methods through it`
				);
			}
		}

		expect(mismatches).toEqual([]);
	});

	test('keeps the JSON-string payload convention on both sides', () => {
		const offenders: string[] = [];

		for (const side of [
			{ label: 'generated', methods: specMethodsOf(generated) },
			{ label: 'stand-in', methods: specMethodsOf(stub) },
		]) {
			for (const method of side.methods) {
				for (const type of [method.returnType, ...method.parameterTypes]) {
					if (type === 'Promise') {
						continue;
					}

					if (!ALLOWED_JAVA_TYPES.has(type)) {
						offenders.push(
							`${side.label}.${method.name}: ${type} crosses the bridge, where the contract allows only String, double, void, and a trailing Promise`
						);
					}
				}
			}
		}

		expect(offenders).toEqual([]);
	});
});
