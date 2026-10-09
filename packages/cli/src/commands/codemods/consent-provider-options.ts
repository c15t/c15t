import { Node, SyntaxKind } from 'ts-morph';
import type * as TsMorphTypes from 'ts-morph';

import { runTransform } from './runner';
import type { CodemodRunOptions, CodemodRunResult } from './runner';
import {
	addTodo,
	applyEdits,
	elementRemovals,
	ensureNamedImports,
	findProperty,
	isNameTaken,
	objectLiteralFor,
	propertyRemoval,
	propertyText,
	propertyValueText,
	referencesOf,
	toTextEdit,
	UNCHANGED,
	unwrapExpression,
} from './source-edits';
import type { TextEdit, TransformResult } from './source-edits';

/** Entries that export the React provider, in v2 and in v3. */
const PROVIDER_ENTRIES = new Set([
	'@c15t/react',
	'@c15t/nextjs',
	'@c15t/tanstack-start',
	'c15t/react',
	'c15t/next',
	'c15t/tanstack-start',
]);

/** The v2 store package. Its runtime factory takes the same transport keys. */
const RUNTIME_ENTRY = 'c15t';
const RUNTIME_FACTORIES = new Set(['getOrCreateConsentRuntime']);

const RENAMES: Record<string, string> = {
	ConsentManagerOptions: 'ConsentProviderOptions',
	ConsentManagerProvider: 'ConsentProvider',
	ConsentManagerProviderProps: 'ConsentProviderProps',
};
const PROVIDER_NAMES = new Set(['ConsentManagerProvider', 'ConsentProvider']);
const OPTION_TYPES = new Set([
	'ConsentManagerOptions',
	'ConsentProviderOptions',
]);

/** v2 hosted mode fell back to this URL when `backendURL` was empty. */
const V2_DEFAULT_BACKEND_URL = "'/api/c15t'";

export const POLICY_RULES_TODO =
	'v3 policy rules are flat ({ id, match, model, prompt, ... }) instead of { consent, ui }. Rewrite hand-written rules; preset calls need no change.';

interface OptionsObject {
	object: TsMorphTypes.ObjectLiteralExpression;
	entry: string;
}

interface Plan {
	edits: TextEdit[];
	imports: Map<string, Set<string>>;
	summaries: string[];
	operations: number;
}

/** The import specifier, from one of `entries`, that declares this name. */
const importedFrom = function importedFrom(
	node: TsMorphTypes.Node,
	entries: ReadonlySet<string>,
	names: ReadonlySet<string>
): string | undefined {
	for (const declaration of node.getSymbol()?.getDeclarations() ?? []) {
		if (!Node.isImportSpecifier(declaration)) {
			continue;
		}
		const entry = declaration.getImportDeclaration().getModuleSpecifierValue();
		if (entries.has(entry) && names.has(declaration.getName())) {
			return entry;
		}
	}
	return undefined;
};

/** The entry a `Namespace.Name` access reads from, when it is a c15t namespace import. */
const namespaceEntry = function namespaceEntry(
	node: TsMorphTypes.Node,
	entries: ReadonlySet<string>
): string | undefined {
	for (const declaration of node.getSymbol()?.getDeclarations() ?? []) {
		if (Node.isNamespaceImport(declaration)) {
			const entry = declaration
				.getFirstAncestorByKind(SyntaxKind.ImportDeclaration)
				?.getModuleSpecifierValue();
			if (entry && entries.has(entry)) {
				return entry;
			}
		}
	}
	return undefined;
};

/** The provider entry a JSX tag or type name resolves to. */
const resolveName = function resolveName(
	node: TsMorphTypes.Node,
	names: ReadonlySet<string>
): string | undefined {
	if (Node.isIdentifier(node)) {
		return importedFrom(node, PROVIDER_ENTRIES, names);
	}
	if (Node.isPropertyAccessExpression(node) || Node.isQualifiedName(node)) {
		const right = Node.isPropertyAccessExpression(node)
			? node.getName()
			: node.getRight().getText();
		const left = Node.isPropertyAccessExpression(node)
			? node.getExpression()
			: node.getLeft();
		return names.has(right)
			? namespaceEntry(left, PROVIDER_ENTRIES)
			: undefined;
	}
	return undefined;
};

const objectFor = objectLiteralFor;

/** The provider entry named by an options type annotation or assertion. */
const optionsTypeEntry = function optionsTypeEntry(
	type: TsMorphTypes.TypeNode | undefined
): string | undefined {
	if (!type || !Node.isTypeReference(type)) {
		return undefined;
	}
	return resolveName(type.getTypeName(), OPTION_TYPES);
};

/** Finds option objects passed to the provider, typed as its options, or given to the v2 runtime. */
const findOptionsObjects = function findOptionsObjects(
	sourceFile: TsMorphTypes.SourceFile
): OptionsObject[] {
	const found = new Map<number, OptionsObject>();
	const add = (
		object: TsMorphTypes.ObjectLiteralExpression | undefined,
		entry: string | undefined
	) => {
		if (object && entry && !found.has(object.getStart())) {
			found.set(object.getStart(), { entry, object });
		}
	};
	for (const element of [
		...sourceFile.getDescendantsOfKind(SyntaxKind.JsxOpeningElement),
		...sourceFile.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement),
	]) {
		const entry = resolveName(element.getTagNameNode(), PROVIDER_NAMES);
		const attribute = element.getAttribute('options');
		if (!entry || !attribute || !Node.isJsxAttribute(attribute)) {
			continue;
		}
		const initializer = attribute.getInitializer();
		if (Node.isJsxExpression(initializer)) {
			add(objectFor(initializer.getExpression()), entry);
		}
	}
	for (const declaration of sourceFile.getDescendantsOfKind(
		SyntaxKind.VariableDeclaration
	)) {
		const initializer = declaration.getInitializer();
		let entry = optionsTypeEntry(declaration.getTypeNode());
		if (
			!entry &&
			initializer &&
			(Node.isSatisfiesExpression(initializer) ||
				Node.isAsExpression(initializer))
		) {
			entry = optionsTypeEntry(initializer.getTypeNode());
		}
		add(objectFor(initializer), entry);
	}
	for (const call of sourceFile.getDescendantsOfKind(
		SyntaxKind.CallExpression
	)) {
		const callee = call.getExpression();
		if (
			Node.isIdentifier(callee) &&
			importedFrom(callee, new Set([RUNTIME_ENTRY]), RUNTIME_FACTORIES)
		) {
			add(objectFor(call.getArguments()[0]), RUNTIME_ENTRY);
		}
	}
	return [...found.values()];
};

const requireImport = function requireImport(
	plan: Plan,
	entry: string,
	name: string
): void {
	const names = plan.imports.get(entry) ?? new Set<string>();
	names.add(name);
	plan.imports.set(entry, names);
};

/** Whether `name` can be imported without shadowing another binding. */
const canImport = function canImport(
	sourceFile: TsMorphTypes.SourceFile,
	entry: string,
	name: string
): boolean {
	if (!isNameTaken(sourceFile, name)) {
		return true;
	}
	return sourceFile
		.getImportDeclarations()
		.some(
			(declaration) =>
				declaration.getModuleSpecifierValue() === entry &&
				declaration
					.getNamedImports()
					.some((named) => named.getName() === name && !named.getAliasNode())
		);
};

/**
 * Whether policy packs may be hand-written rather than preset calls: an
 * array that holds an object literal, followed through a property or a
 * variable initialized in the same file. A value the codemod cannot read,
 * such as an import or a call, counts too, so it gets a TODO.
 */
export const hasHandWrittenRules = function hasHandWrittenRules(
	value: TsMorphTypes.Node | undefined,
	depth = 0
): boolean {
	if (!value || depth > 5) {
		return false;
	}
	if (Node.isPropertyAssignment(value)) {
		return hasHandWrittenRules(value.getInitializer(), depth + 1);
	}
	const expression = Node.isShorthandPropertyAssignment(value)
		? value
		: unwrapExpression(value);
	if (Node.isArrayLiteralExpression(expression)) {
		return expression
			.getElements()
			.some((element) =>
				Node.isObjectLiteralExpression(unwrapExpression(element))
			);
	}
	let symbol: TsMorphTypes.Symbol | undefined;
	if (Node.isShorthandPropertyAssignment(expression)) {
		symbol = expression.getValueSymbol();
	} else if (Node.isIdentifier(expression)) {
		symbol = expression.getSymbol();
	}
	const initializers = (symbol?.getDeclarations() ?? []).flatMap(
		(declaration) =>
			Node.isVariableDeclaration(declaration) &&
			declaration.getSourceFile() === value.getSourceFile()
				? (declaration.getInitializer() ?? [])
				: []
	);
	if (initializers.length === 0) {
		return true;
	}
	return initializers.some((initializer) =>
		hasHandWrittenRules(initializer, depth + 1)
	);
};

/** How far to follow variables and conditionals when resolving a mode. */
const MAX_MODE_DEPTH = 5;

/** The v3 transport factories. */
const TRANSPORT_FACTORIES = new Set(['custom', 'hosted', 'offline']);

/** Whether a call invokes `hosted()`, `offline()` or `custom()`, or an alias of one. */
const callsTransportFactory = function callsTransportFactory(
	call: TsMorphTypes.CallExpression
): boolean {
	const callee = call.getExpression();
	if (Node.isPropertyAccessExpression(callee)) {
		return TRANSPORT_FACTORIES.has(callee.getName());
	}
	if (!Node.isIdentifier(callee)) {
		return false;
	}
	return (
		TRANSPORT_FACTORIES.has(callee.getText()) ||
		(callee.getSymbol()?.getDeclarations() ?? []).some(
			(declaration) =>
				Node.isImportSpecifier(declaration) &&
				TRANSPORT_FACTORIES.has(declaration.getName())
		)
	);
};

/**
 * Whether a `mode` value is already a v3 transport: a call to `hosted()`,
 * `offline()` or `custom()`, a choice between transports, a variable that
 * holds one, or a value typed as an object. v2 modes were strings, so a
 * helper that returns one, such as `getConsentMode()`, is not a transport.
 */
const isTransport = function isTransport(
	node: TsMorphTypes.Node,
	depth = 0
): boolean {
	if (depth > MAX_MODE_DEPTH) {
		return false;
	}
	const value = unwrapExpression(node);
	if (Node.isCallExpression(value) && callsTransportFactory(value)) {
		return true;
	}
	if (Node.isConditionalExpression(value)) {
		return (
			isTransport(value.getWhenTrue(), depth + 1) &&
			isTransport(value.getWhenFalse(), depth + 1)
		);
	}
	const shorthand = Node.isShorthandPropertyAssignment(value);
	const symbol = shorthand ? value.getValueSymbol() : value.getSymbol();
	// `const mode = hosted()`, then `{ mode }` or `mode: mode`.
	const holdsTransport =
		(shorthand || Node.isIdentifier(value)) &&
		(symbol?.getDeclarations() ?? []).some((declaration) => {
			const initializer = Node.isVariableDeclaration(declaration)
				? declaration.getInitializer()
				: undefined;
			return initializer !== undefined && isTransport(initializer, depth + 1);
		});
	return (
		holdsTransport ||
		(shorthand ? value.getNameNode() : value).getType().isObject()
	);
};

const literalMode = function literalMode(
	mode: TsMorphTypes.ObjectLiteralElementLike | undefined
): { kind: 'absent' | 'literal' | 'transport' | 'other'; value?: string } {
	if (!mode) {
		return { kind: 'absent' };
	}
	if (Node.isShorthandPropertyAssignment(mode)) {
		return { kind: isTransport(mode) ? 'transport' : 'other' };
	}
	if (!Node.isPropertyAssignment(mode)) {
		return { kind: 'other' };
	}
	const initializer = mode.getInitializer();
	const value = initializer && unwrapExpression(initializer);
	if (value && Node.isStringLiteral(value)) {
		return { kind: 'literal', value: value.getLiteralText() };
	}
	if (value && isTransport(value)) {
		return { kind: 'transport' };
	}
	return { kind: 'other' };
};

const planHosted = function planHosted(
	object: TsMorphTypes.ObjectLiteralExpression,
	entry: string,
	plan: Plan
): void {
	const mode = findProperty(object, 'mode');
	const backend = findProperty(object, 'backendURL');
	const headers = findProperty(object, 'headers');
	const customFetch = findProperty(object, 'customFetch');
	const args = [
		`backendURL: ${(backend && propertyValueText(backend)) ?? V2_DEFAULT_BACKEND_URL}`,
	];
	const headersValue = headers && propertyValueText(headers);
	if (headersValue) {
		args.push(propertyText('headers', headersValue));
	}
	const fetchValue = customFetch && propertyValueText(customFetch);
	if (fetchValue) {
		args.push(propertyText('fetch', fetchValue));
	}
	const replacement = `mode: hosted({ ${args.join(', ')} })`;
	const anchor = mode ?? backend;
	if (!anchor) {
		return;
	}
	plan.edits.push(toTextEdit(anchor, replacement));
	plan.edits.push(
		...elementRemovals(
			[backend, headers, customFetch].filter(
				(property): property is TsMorphTypes.ObjectLiteralElementLike =>
					property !== undefined && property !== anchor
			)
		)
	);
	requireImport(plan, entry, 'hosted');
	plan.summaries.push('mode/backendURL -> hosted()');
	plan.operations += 1;
};

const OFFLINE_POLICY_TODO =
	'offlinePolicy was removed. offline() takes only policyRules; move its policyPacks there and offline copy to the i18n option.';

const planOffline = function planOffline(
	object: TsMorphTypes.ObjectLiteralExpression,
	entry: string,
	plan: Plan
): void {
	const mode = findProperty(object, 'mode');
	if (!mode) {
		return;
	}
	const offlinePolicy = findProperty(object, 'offlinePolicy');
	const policyObject =
		offlinePolicy && Node.isPropertyAssignment(offlinePolicy)
			? unwrapExpression(offlinePolicy.getInitializer() ?? offlinePolicy)
			: undefined;
	const packs =
		policyObject && Node.isObjectLiteralExpression(policyObject)
			? findProperty(policyObject, 'policyPacks')
			: undefined;
	const packsValue = packs && propertyValueText(packs);
	const transport = packsValue
		? `offline({ ${propertyText('policyRules', packsValue)} })`
		: 'offline()';
	plan.edits.push(toTextEdit(mode, `mode: ${transport}`));
	requireImport(plan, entry, 'offline');
	if (packsValue && hasHandWrittenRules(packs)) {
		addTodo(mode, POLICY_RULES_TODO, plan.edits);
	}
	if (
		offlinePolicy &&
		policyObject &&
		Node.isObjectLiteralExpression(policyObject)
	) {
		const others = policyObject
			.getProperties()
			.filter((property) => property !== packs);
		if (others.length === 0) {
			plan.edits.push(propertyRemoval(offlinePolicy));
		} else {
			if (packs) {
				plan.edits.push(propertyRemoval(packs));
			}
			addTodo(offlinePolicy, OFFLINE_POLICY_TODO, plan.edits);
		}
	} else if (offlinePolicy) {
		addTodo(offlinePolicy, OFFLINE_POLICY_TODO, plan.edits);
	}
	plan.summaries.push("mode 'offline' -> offline()");
	plan.operations += 1;
};

const CUSTOM_TODO =
	"mode 'custom' and endpointHandlers were removed. Implement the v3 transport interface and pass mode: custom(transport). See https://c15t.com/docs/concepts/data-fetching";
const MODE_TODO =
	'mode now takes a transport such as hosted({ backendURL }) or offline(). Replace this value and remove backendURL, offlinePolicy and endpointHandlers.';
const RETRY_TODO = 'retryConfig was removed. Delete it.';

/** Queues a TODO and counts it once. */
const planTodo = function planTodo(
	plan: Plan,
	node: TsMorphTypes.Node,
	message: string,
	summary: string
): void {
	if (addTodo(node, message, plan.edits)) {
		plan.summaries.push(summary);
		plan.operations += 1;
	}
};

/** Turns `mode` and its sibling keys into a v3 transport. */
const planTransport = function planTransport(
	sourceFile: TsMorphTypes.SourceFile,
	{ object, entry }: OptionsObject,
	plan: Plan
): void {
	const mode = findProperty(object, 'mode');
	const backend = findProperty(object, 'backendURL');
	const { kind, value } = literalMode(mode);
	if (
		(kind === 'literal' && (value === 'hosted' || value === 'c15t')) ||
		(kind === 'absent' && backend)
	) {
		if (canImport(sourceFile, entry, 'hosted')) {
			planHosted(object, entry, plan);
		} else {
			planTodo(plan, mode ?? backend ?? object, MODE_TODO, 'TODO: mode');
		}
		return;
	}
	if (!mode) {
		return;
	}
	if (kind === 'literal' && value === 'offline') {
		if (canImport(sourceFile, entry, 'offline')) {
			planOffline(object, entry, plan);
		} else {
			planTodo(plan, mode, MODE_TODO, 'TODO: mode');
		}
	} else if (kind === 'literal' && value === 'custom') {
		planTodo(plan, mode, CUSTOM_TODO, "TODO: mode 'custom'");
	} else if (kind === 'other') {
		// A variable or expression that may hold a v2 mode string.
		planTodo(plan, mode, MODE_TODO, 'TODO: mode');
	}
};

const planIframeBlocker = function planIframeBlocker(
	object: TsMorphTypes.ObjectLiteralExpression,
	plan: Plan
): void {
	const iframe = findProperty(object, 'iframeBlockerConfig');
	if (!iframe || findProperty(object, 'iframeBlocker')) {
		return;
	}
	if (Node.isShorthandPropertyAssignment(iframe)) {
		plan.edits.push(toTextEdit(iframe, 'iframeBlocker: iframeBlockerConfig'));
	} else if (Node.isPropertyAssignment(iframe)) {
		plan.edits.push(toTextEdit(iframe.getNameNode(), 'iframeBlocker'));
	} else {
		return;
	}
	plan.summaries.push('iframeBlockerConfig -> iframeBlocker');
	plan.operations += 1;
};

const planOptions = function planOptions(
	sourceFile: TsMorphTypes.SourceFile,
	options: OptionsObject,
	plan: Plan
): void {
	planTransport(sourceFile, options, plan);
	const retry = findProperty(options.object, 'retryConfig');
	if (retry) {
		planTodo(plan, retry, RETRY_TODO, 'TODO: retryConfig');
	}
	planIframeBlocker(options.object, plan);
};

/** Renames provider imports, re-exports, references and namespace accesses. */
const planRenames = function planRenames(
	sourceFile: TsMorphTypes.SourceFile,
	plan: Plan
): void {
	const renamed = new Set<string>();
	for (const declaration of sourceFile.getImportDeclarations()) {
		if (!PROVIDER_ENTRIES.has(declaration.getModuleSpecifierValue())) {
			continue;
		}
		for (const named of declaration.getNamedImports()) {
			const next = RENAMES[named.getName()];
			if (!next) {
				continue;
			}
			plan.edits.push(toTextEdit(named.getNameNode(), next));
			if (!named.getAliasNode()) {
				for (const reference of referencesOf(named)) {
					plan.edits.push(toTextEdit(reference, next));
				}
			}
			renamed.add(named.getName());
		}
	}
	for (const declaration of sourceFile.getExportDeclarations()) {
		const specifier = declaration.getModuleSpecifierValue();
		if (!specifier || !PROVIDER_ENTRIES.has(specifier)) {
			continue;
		}
		for (const named of declaration.getNamedExports()) {
			const name = named.getNameNode().getText();
			const next = RENAMES[name];
			if (!next) {
				continue;
			}
			// Keep the name this module exports so its importers still resolve.
			plan.edits.push(
				toTextEdit(
					named.getNameNode(),
					named.getAliasNode() ? next : `${next} as ${name}`
				)
			);
			renamed.add(name);
		}
	}
	const accesses = [
		...sourceFile.getDescendantsOfKind(SyntaxKind.PropertyAccessExpression),
		...sourceFile.getDescendantsOfKind(SyntaxKind.QualifiedName),
	];
	for (const access of accesses) {
		const nameNode = Node.isPropertyAccessExpression(access)
			? access.getNameNode()
			: access.getRight();
		const next = RENAMES[nameNode.getText()];
		if (next && resolveName(access, new Set(Object.keys(RENAMES)))) {
			plan.edits.push(toTextEdit(nameNode, next));
			renamed.add(nameNode.getText());
		}
	}
	for (const name of renamed) {
		plan.summaries.push(`${name} -> ${RENAMES[name]}`);
		plan.operations += 1;
	}
};

/** Drops a second specifier for the same binding, left when both names were imported. */
const dedupeSpecifiers = function dedupeSpecifiers(
	sourceFile: TsMorphTypes.SourceFile
): void {
	for (const declaration of sourceFile.getImportDeclarations()) {
		if (!PROVIDER_ENTRIES.has(declaration.getModuleSpecifierValue())) {
			continue;
		}
		const seen = new Set<string>();
		for (const named of declaration.getNamedImports()) {
			const local = (named.getAliasNode() ?? named.getNameNode()).getText();
			if (seen.has(local)) {
				named.remove();
			} else {
				seen.add(local);
			}
		}
	}
};

const transformSourceFile = function transformSourceFile(
	sourceFile: TsMorphTypes.SourceFile
): TransformResult {
	const relevant =
		sourceFile.getImportDeclarations().some((declaration) => {
			const entry = declaration.getModuleSpecifierValue();
			return PROVIDER_ENTRIES.has(entry) || entry === RUNTIME_ENTRY;
		}) ||
		sourceFile
			.getExportDeclarations()
			.some((declaration) =>
				PROVIDER_ENTRIES.has(declaration.getModuleSpecifierValue() ?? '')
			);
	if (!relevant) {
		return UNCHANGED;
	}
	const plan: Plan = {
		edits: [],
		imports: new Map(),
		operations: 0,
		summaries: [],
	};
	for (const options of findOptionsObjects(sourceFile)) {
		planOptions(sourceFile, options, plan);
	}
	planRenames(sourceFile, plan);
	if (plan.edits.length === 0) {
		return UNCHANGED;
	}
	applyEdits(sourceFile, plan.edits);
	for (const [entry, names] of plan.imports) {
		ensureNamedImports(sourceFile, entry, names);
	}
	dedupeSpecifiers(sourceFile);
	return {
		changed: true,
		operations: plan.operations,
		summaries: [...new Set(plan.summaries)],
	};
};

export { findOptionsObjects };

/**
 * Renames `ConsentManagerProvider` and its option types to `ConsentProvider`,
 * turns `mode`/`backendURL`/`offlinePolicy` into `hosted()` or `offline()`
 * transports, and renames `iframeBlockerConfig` to `iframeBlocker`. Custom
 * mode gets a `TODO(c15t v3)` comment.
 *
 * @param options - Codemod execution options.
 * @returns Changed files and non-fatal per-file errors.
 */
export const runConsentProviderOptionsCodemod =
	function runConsentProviderOptionsCodemod(
		options: CodemodRunOptions
	): Promise<CodemodRunResult> {
		return runTransform(options, transformSourceFile);
	};
