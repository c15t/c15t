import { Node, SyntaxKind } from 'ts-morph';
import type * as TsMorphTypes from 'ts-morph';

import { runTransform } from './runner';
import type { CodemodRunOptions, CodemodRunResult } from './runner';
import {
	addTodo,
	applyEdits,
	ensureNamedImports,
	findProperty,
	objectLiteralFor,
	propertyKey,
	referencesOf,
	toTextEdit,
	UNCHANGED,
	unwrapExpression,
} from './source-edits';
import type { TextEdit, TransformResult } from './source-edits';

const ENTRY = '@c15t/node-sdk';
const FACTORY = 'createC15tClient';

/** Exports renamed one to one. */
const RENAMES: Record<string, string> = {
	C15TClientOptions: 'C15tClientOptions',
	C15TError: 'C15tError',
	FetchOptions: 'C15tCallOptions',
	ResponseContext: 'C15tResult',
	RetryConfig: 'C15tRetryOptions',
	c15tClient: FACTORY,
	isC15TError: 'isC15tError',
};

/** v2 method paths and their v3 replacements. */
const METHODS: Record<string, string> = {
	checkConsent: 'consents.check',
	'consent.check': 'consents.check',
	createSubject: 'subjects.create',
	getSubject: 'subjects.get',
	init: 'init',
	listSubjects: 'subjects.list',
	'meta.init': 'init',
	'meta.status': 'status',
	patchSubject: 'subjects.identify',
	status: 'status',
	'subjects.create': 'subjects.create',
	'subjects.get': 'subjects.get',
	'subjects.list': 'subjects.list',
	'subjects.patch': 'subjects.identify',
};

/** Per-call option keys renamed one to one. */
const CALL_OPTION_RENAMES: Record<string, string> = {
	retryConfig: 'retry',
	timeout: 'timeoutMs',
};

const OPTION_RENAMES: Record<string, string> = {
	...CALL_OPTION_RENAMES,
	token: 'apiKey',
};

/**
 * Position of the per-call options argument in v2, by v3 method. v2 and v3
 * agree on every position except `init`, whose options move from first to
 * second.
 */
const CALL_OPTIONS_INDEX: Record<string, number> = {
	'consents.check': 1,
	init: 0,
	status: 0,
	'subjects.create': 1,
	'subjects.get': 2,
	'subjects.identify': 2,
	'subjects.list': 1,
};

const DROPPED_RETRY_KEYS = new Set([
	'backoffFactor',
	'nonRetryableStatusCodes',
	'retryableStatusCodes',
	'retryOnNetworkError',
]);

const RESULT_TODO =
	'@c15t/node-sdk methods now resolve to { ok: true, data } or { ok: false, error } and never throw. Check result.ok before reading data, or wrap the call in unwrap().';
const OPTION_TODOS: Record<string, string> = {
	debug:
		'debug was removed. Pass onEvent to log requests, retries and responses.',
	prefix:
		"prefix was removed. v2 replaced the base URL's path with it; put the full path in baseUrl, such as https://app.example.com/api/c15t.",
};
const ENV_TODO =
	'createC15tClient() reads no environment variables. Pass baseUrl (was C15T_API_URL) and apiKey (was C15T_API_TOKEN) yourself.';
const RETRY_TODO =
	'retry takes only maxRetries, initialDelayMs and maxDelayMs, or false. backoffFactor, the status code lists and retryOnNetworkError were removed.';
const TYPES_TODO =
	"Pass types as an array, such as types: ['privacy_policy'], instead of a comma-separated type string.";
const FETCH_TODO = '$fetch was removed. Call the typed client methods.';
const RUNTIME_CLASS_TODO =
	'C15TClient is no longer a class, so instanceof checks, subclasses and other runtime uses stop working. createC15tClient() returns a plain C15tClient object.';
const CLIENT_OPTIONS_TODO =
	'createC15tClient() options changed: token is now apiKey, timeout is now timeoutMs and retryConfig is now retry. prefix and debug were removed, and baseUrl is required.';
const CALL_OPTION_TODOS: Record<string, string> = {
	body: "body was removed from call options, and v3 ignores it. Pass the request body as the method's input argument.",
	method:
		'method was removed from call options. Each client method sends its own HTTP method.',
	onError: 'onError was removed. Check result.ok after the call.',
	onSuccess: 'onSuccess was removed. Check result.ok after the call.',
	query:
		"query was removed from call options, and v3 ignores it. Pass the query as the method's request argument.",
	throw: 'throw was removed. Wrap the call in unwrap() to throw on failure.',
};
const CALL_OPTIONS_TODO =
	'Call options changed: timeout is now timeoutMs, retryConfig is now retry, and onSuccess, onError, throw, body, query and method were removed.';

interface Context {
	clientDeclarations: TsMorphTypes.Node[];
	edits: TextEdit[];
	summaries: Set<string>;
	operations: number;
	usesFactory: boolean;
}

const statementOf = function statementOf(
	node: TsMorphTypes.Node
): TsMorphTypes.Node {
	return (
		node.getFirstAncestor((ancestor) => Node.isStatement(ancestor)) ?? node
	);
};

/** Rewrites `type: 'a,b'` to `types: ['a', 'b']` in a query object. */
const planTypes = function planTypes(
	argument: TsMorphTypes.Node | undefined,
	context: Context
): void {
	const object = argument && unwrapExpression(argument);
	if (!object || !Node.isObjectLiteralExpression(object)) {
		return;
	}
	const type = findProperty(object, 'type');
	if (!type) {
		return;
	}
	const value = Node.isPropertyAssignment(type)
		? unwrapExpression(type.getInitializerOrThrow())
		: undefined;
	if (value && Node.isStringLiteral(value)) {
		const quote = value.getText().charAt(0);
		const items = value
			.getLiteralText()
			.split(',')
			.map((item) => item.trim())
			.filter(Boolean)
			.map((item) => `${quote}${item}${quote}`);
		context.edits.push(toTextEdit(type, `types: [${items.join(', ')}]`));
		context.summaries.add('type string -> types array');
		return;
	}
	addTodo(type, TYPES_TODO, context.edits);
};

interface MethodCall {
	access: TsMorphTypes.PropertyAccessExpression;
	call: TsMorphTypes.CallExpression;
	/** Whether the access path uses optional chaining, as in `client?.status()`. */
	optional: boolean;
	path: string;
}

/** The `client.method(...)` or `client.namespace.method(...)` call a reference starts. */
const methodCallOf = function methodCallOf(
	client: TsMorphTypes.Node
): MethodCall | undefined {
	const parent = client.getParent();
	if (
		!Node.isPropertyAccessExpression(parent) ||
		parent.getExpression() !== client
	) {
		return undefined;
	}
	let access: TsMorphTypes.PropertyAccessExpression = parent;
	let path = access.getName();
	let optional = parent.hasQuestionDotToken();
	const next = access.getParent();
	if (
		(path === 'meta' || path === 'subjects' || path === 'consent') &&
		Node.isPropertyAccessExpression(next) &&
		next.getExpression() === access
	) {
		path = `${path}.${next.getName()}`;
		access = next;
		optional ||= next.hasQuestionDotToken();
	}
	const call = access.getParent();
	if (!Node.isCallExpression(call) || call.getExpression() !== access) {
		return undefined;
	}
	return { access, call, optional, path };
};

/** Renames an options key that kept its meaning under a new name. */
const planKeyRename = function planKeyRename(
	property: TsMorphTypes.ObjectLiteralElementLike,
	renames: Record<string, string>,
	context: Context
): void {
	const key = propertyKey(property);
	const renamed = key && renames[key];
	if (!renamed) {
		return;
	}
	if (Node.isPropertyAssignment(property)) {
		context.edits.push(toTextEdit(property.getNameNode(), renamed));
	} else if (Node.isShorthandPropertyAssignment(property)) {
		context.edits.push(toTextEdit(property, `${renamed}: ${key}`));
	} else {
		return;
	}
	context.summaries.add(`${key} -> ${renamed}`);
};

/**
 * Marks a `retryConfig` unless it is an object literal with only keys v3
 * still accepts. A variable or spread may carry the removed keys.
 */
const planRetry = function planRetry(
	property: TsMorphTypes.ObjectLiteralElementLike,
	context: Context
): void {
	if (propertyKey(property) !== 'retryConfig') {
		return;
	}
	const value = Node.isPropertyAssignment(property)
		? unwrapExpression(property.getInitializerOrThrow())
		: undefined;
	const accepted =
		value !== undefined &&
		Node.isObjectLiteralExpression(value) &&
		value.getProperties().every((item) => {
			const key = propertyKey(item);
			return key !== undefined && !DROPPED_RETRY_KEYS.has(key);
		});
	if (!accepted && addTodo(property, RETRY_TODO, context.edits)) {
		context.summaries.add('TODO: retry');
	}
};

/** Renames per-call option keys and marks the ones v3 removed. */
const planCallOptions = function planCallOptions(
	target: string,
	call: TsMorphTypes.CallExpression,
	context: Context
): void {
	const index = CALL_OPTIONS_INDEX[target];
	const argument = index === undefined ? undefined : call.getArguments()[index];
	if (!argument) {
		return;
	}
	const object = unwrapExpression(argument);
	if (Node.isIdentifier(object) && object.getText() === 'undefined') {
		return;
	}
	const markCall = () => {
		if (addTodo(statementOf(call), CALL_OPTIONS_TODO, context.edits)) {
			context.summaries.add('TODO: call options');
		}
	};
	if (!Node.isObjectLiteralExpression(object)) {
		markCall();
		return;
	}
	for (const property of object.getProperties()) {
		if (Node.isSpreadAssignment(property)) {
			markCall();
			continue;
		}
		planKeyRename(property, CALL_OPTION_RENAMES, context);
		planRetry(property, context);
		const key = propertyKey(property);
		const todo = key && CALL_OPTION_TODOS[key];
		if (todo && addTodo(property, todo, context.edits)) {
			context.summaries.add(`TODO: ${key}`);
		}
	}
};

/** Rewrites arguments whose position or format changed. */
const planArguments = function planArguments(
	target: string,
	call: TsMorphTypes.CallExpression,
	context: Context
): void {
	const args = call.getArguments();
	planCallOptions(target, call, context);
	const [first, second] = args;
	// v2 init(fetchOptions) took one argument; v3 takes the request first.
	if (target === 'init' && first && args.length === 1) {
		context.edits.push({
			end: first.getStart(),
			start: first.getStart(),
			text: 'undefined, ',
		});
	}
	if (target === 'subjects.get') {
		planTypes(second, context);
	}
	if (target === 'consents.check') {
		planTypes(first, context);
	}
};

/** Rewrites one `client.method(...)` call. */
const planCall = function planCall(
	client: TsMorphTypes.Node,
	context: Context
): void {
	const method = methodCallOf(client);
	if (!method) {
		return;
	}
	const { access, call, optional, path } = method;
	if (path === '$fetch') {
		addTodo(statementOf(call), FETCH_TODO, context.edits);
		context.operations += 1;
		return;
	}
	const target = METHODS[path];
	if (!target) {
		return;
	}
	if (target !== path) {
		context.edits.push({
			end: access.getEnd(),
			start: client.getEnd(),
			text: `${optional ? '?.' : '.'}${target}`,
		});
		context.summaries.add(`${path} -> ${target}`);
	}
	planArguments(target, call, context);
	if (addTodo(statementOf(call), RESULT_TODO, context.edits)) {
		context.summaries.add('TODO: result shape');
	}
	context.operations += 1;
};

/**
 * Renames client options and marks the ones v3 dropped. Options in a
 * variable initialized in the same file are rewritten there; options from
 * anywhere else get a TODO.
 */
const planOptions = function planOptions(
	call: TsMorphTypes.CallExpression | TsMorphTypes.NewExpression,
	context: Context
): void {
	const [argument] = call.getArguments() ?? [];
	const markEnv = () => {
		if (addTodo(statementOf(call), ENV_TODO, context.edits)) {
			context.summaries.add('TODO: environment variables');
		}
	};
	const markOptions = () => {
		if (addTodo(statementOf(call), CLIENT_OPTIONS_TODO, context.edits)) {
			context.summaries.add('TODO: client options');
		}
	};
	if (!argument) {
		markEnv();
		return;
	}
	const object = objectLiteralFor(argument);
	if (!object) {
		markOptions();
		return;
	}
	if (object.getProperties().some((item) => Node.isSpreadAssignment(item))) {
		markOptions();
	} else if (!findProperty(object, 'baseUrl')) {
		markEnv();
	}
	for (const property of object.getProperties()) {
		const key = propertyKey(property);
		if (!key) {
			continue;
		}
		planKeyRename(property, OPTION_RENAMES, context);
		planRetry(property, context);
		const todo = OPTION_TODOS[key];
		if (todo && addTodo(property, todo, context.edits)) {
			context.summaries.add(`TODO: ${key}`);
		}
	}
};

/** References to every binding that holds a client made in this file. */
const clientReferences = function clientReferences(
	declarations: TsMorphTypes.Node[]
): TsMorphTypes.Node[] {
	const references: TsMorphTypes.Node[] = [];
	for (const declaration of new Set(declarations)) {
		const name =
			Node.isVariableDeclaration(declaration) ||
			Node.isParameterDeclaration(declaration) ||
			Node.isPropertyDeclaration(declaration)
				? declaration.getNameNode()
				: undefined;
		if (!name || !Node.isIdentifier(name)) {
			continue;
		}
		for (const reference of name.findReferencesAsNodes()) {
			if (
				reference.getSourceFile() !== declaration.getSourceFile() ||
				reference.getStart() === name.getStart()
			) {
				continue;
			}
			// `this.client` refers through the property access.
			const parent = reference.getParent();
			references.push(
				Node.isPropertyAccessExpression(parent) &&
					parent.getNameNode() === reference
					? parent
					: reference
			);
		}
	}
	return references;
};

/** Records the variable or property a client is assigned to. */
const recordHolder = function recordHolder(
	call: TsMorphTypes.Node,
	context: Context
): void {
	let node = call.getParent();
	while (
		node &&
		(Node.isAwaitExpression(node) ||
			Node.isParenthesizedExpression(node) ||
			Node.isAsExpression(node))
	) {
		node = node.getParent();
	}
	if (
		node &&
		(Node.isVariableDeclaration(node) || Node.isPropertyDeclaration(node))
	) {
		context.clientDeclarations.push(node);
	}
};

/** `c15tClient(options)` calls: options and the binding that holds the client. */
const planFactoryCalls = function planFactoryCalls(
	references: TsMorphTypes.Node[],
	context: Context
): void {
	for (const reference of references) {
		const call = reference.getParent();
		if (Node.isCallExpression(call) && call.getExpression() === reference) {
			planOptions(call, context);
			recordHolder(call, context);
		}
	}
};

/**
 * Whether a `C15TClient` reference is a type, such as an annotation or an
 * `implements` clause, rather than a runtime use of the v2 class.
 */
const isTypeUse = function isTypeUse(reference: TsMorphTypes.Node): boolean {
	const parent = reference.getParent();
	if (Node.isTypeReference(parent)) {
		return true;
	}
	return (
		Node.isExpressionWithTypeArguments(parent) &&
		parent.getParentIfKind(SyntaxKind.HeritageClause)?.getToken() ===
			SyntaxKind.ImplementsKeyword
	);
};

/** Marks a runtime use of the v2 class, which v3 does not export. */
const markRuntimeClassUse = function markRuntimeClassUse(
	reference: TsMorphTypes.Node,
	context: Context
): void {
	if (addTodo(statementOf(reference), RUNTIME_CLASS_TODO, context.edits)) {
		context.summaries.add('TODO: C15TClient runtime use');
	}
};

/** Records the parameter, property or variable a client type annotates. */
const recordTypedHolder = function recordTypedHolder(
	reference: TsMorphTypes.Node,
	context: Context
): void {
	const holder = reference.getFirstAncestor(
		(ancestor) =>
			Node.isParameterDeclaration(ancestor) ||
			Node.isPropertyDeclaration(ancestor) ||
			Node.isVariableDeclaration(ancestor)
	);
	if (holder) {
		context.clientDeclarations.push(holder);
	}
};

/** `new C15TClient()` becomes the factory; type uses become `C15tClient`. */
const planClientClass = function planClientClass(
	named: TsMorphTypes.ImportSpecifier,
	context: Context
): void {
	const typeReferences: TsMorphTypes.Node[] = [];
	let runtimeUses = 0;
	for (const reference of referencesOf(named)) {
		const parent = reference.getParent();
		if (Node.isNewExpression(parent) && parent.getExpression() === reference) {
			planOptions(parent, context);
			recordHolder(parent, context);
			context.edits.push({
				end: reference.getEnd(),
				start: parent.getStart(),
				text: FACTORY,
			});
			context.usesFactory = true;
			context.summaries.add(`new C15TClient -> ${FACTORY}`);
			continue;
		}
		if (!isTypeUse(reference)) {
			markRuntimeClassUse(reference, context);
			runtimeUses += 1;
			continue;
		}
		typeReferences.push(reference);
		recordTypedHolder(reference, context);
	}
	context.operations += 1;
	const alias = named.getAliasNode()?.getText();
	if (runtimeUses > 0) {
		// Keep the v2 name so the runtime uses still fail the build at the TODO.
		if (typeReferences.length > 0 && !alias) {
			context.edits.push({
				end: named.getEnd(),
				start: named.getEnd(),
				text: ', type C15tClient',
			});
			for (const reference of typeReferences) {
				context.edits.push(toTextEdit(reference, 'C15tClient'));
			}
		}
		return;
	}
	if (typeReferences.length === 0) {
		context.edits.push(toTextEdit(named, FACTORY));
		return;
	}
	const typeOnly =
		named.isTypeOnly() || named.getImportDeclaration().isTypeOnly();
	context.edits.push(
		toTextEdit(
			named,
			`${typeOnly ? '' : 'type '}C15tClient${alias ? ` as ${alias}` : ''}`
		)
	);
	if (!alias) {
		for (const reference of typeReferences) {
			context.edits.push(toTextEdit(reference, 'C15tClient'));
		}
	}
};

/** Renames an export with a one-to-one v3 name, and its references. */
const planRename = function planRename(
	named: TsMorphTypes.ImportSpecifier,
	context: Context
): void {
	const name = named.getName();
	const next = RENAMES[name];
	if (!next) {
		return;
	}
	context.edits.push(toTextEdit(named.getNameNode(), next));
	if (!named.getAliasNode()) {
		for (const reference of referencesOf(named)) {
			context.edits.push(toTextEdit(reference, next));
		}
	}
	context.summaries.add(`${name} -> ${next}`);
	context.operations += 1;
};

/**
 * `import * as sdk from '@c15t/node-sdk'`: renames `sdk.c15tClient`,
 * `new sdk.C15TClient()`, `sdk.C15TClient` types and the other renamed
 * exports, and follows the clients they create.
 */
const planNamespace = function planNamespace(
	namespace: TsMorphTypes.Identifier,
	context: Context
): void {
	for (const reference of namespace.findReferencesAsNodes()) {
		if (
			reference.getSourceFile() !== namespace.getSourceFile() ||
			reference.getStart() === namespace.getStart()
		) {
			continue;
		}
		const parent = reference.getParent();
		let nameNode: TsMorphTypes.Node | undefined;
		if (
			Node.isPropertyAccessExpression(parent) &&
			parent.getExpression() === reference
		) {
			nameNode = parent.getNameNode();
		} else if (Node.isQualifiedName(parent) && parent.getLeft() === reference) {
			nameNode = parent.getRight();
		}
		if (!(parent && nameNode)) {
			continue;
		}
		const name = nameNode.getText();
		const outer = parent.getParent();
		if (name === 'C15TClient') {
			const typeUse = Node.isQualifiedName(parent)
				? !parent.getFirstAncestorByKind(SyntaxKind.TypeQuery)
				: isTypeUse(parent);
			if (Node.isNewExpression(outer) && outer.getExpression() === parent) {
				planOptions(outer, context);
				recordHolder(outer, context);
				context.edits.push({
					end: parent.getEnd(),
					start: outer.getStart(),
					text: `${namespace.getText()}.${FACTORY}`,
				});
				context.summaries.add(`new C15TClient -> ${FACTORY}`);
			} else if (typeUse) {
				context.edits.push(toTextEdit(nameNode, 'C15tClient'));
				recordTypedHolder(parent, context);
				context.summaries.add('C15TClient -> C15tClient');
			} else {
				markRuntimeClassUse(parent, context);
			}
			context.operations += 1;
			continue;
		}
		if (
			name === 'c15tClient' &&
			Node.isCallExpression(outer) &&
			outer.getExpression() === parent
		) {
			planOptions(outer, context);
			recordHolder(outer, context);
		}
		const next = RENAMES[name];
		if (next) {
			context.edits.push(toTextEdit(nameNode, next));
			context.summaries.add(`${name} -> ${next}`);
			context.operations += 1;
		}
	}
};

const transformSourceFile = function transformSourceFile(
	sourceFile: TsMorphTypes.SourceFile
): TransformResult {
	const declarations = sourceFile
		.getImportDeclarations()
		.filter((declaration) => declaration.getModuleSpecifierValue() === ENTRY);
	const specifiers = declarations.flatMap((declaration) =>
		declaration.getNamedImports()
	);
	const namespaces = declarations.flatMap(
		(declaration) => declaration.getNamespaceImport() ?? []
	);
	if (specifiers.length === 0 && namespaces.length === 0) {
		return UNCHANGED;
	}
	const context: Context = {
		clientDeclarations: [],
		edits: [],
		operations: 0,
		summaries: new Set(),
		usesFactory: false,
	};
	for (const named of specifiers) {
		if (named.getName() === 'C15TClient') {
			planClientClass(named, context);
			continue;
		}
		if (named.getName() === 'c15tClient') {
			planFactoryCalls(referencesOf(named), context);
		}
		planRename(named, context);
	}
	for (const namespace of namespaces) {
		planNamespace(namespace, context);
	}
	for (const reference of clientReferences(context.clientDeclarations)) {
		planCall(reference, context);
	}
	if (context.edits.length === 0) {
		return UNCHANGED;
	}
	applyEdits(sourceFile, context.edits);
	if (context.usesFactory) {
		ensureNamedImports(sourceFile, ENTRY, [FACTORY]);
	}
	return {
		changed: true,
		operations: context.operations,
		summaries: [...context.summaries],
	};
};

/**
 * Moves `@c15t/node-sdk` code to the v3 client: `c15tClient()` and
 * `new C15TClient()` become `createC15tClient()`, options and methods take
 * their v3 names, and each call site gets a `TODO(c15t v3)` comment because
 * results are now `{ ok, data }` or `{ ok, error }`.
 *
 * @param options - Codemod execution options.
 * @returns Changed files and non-fatal per-file errors.
 */
export const runNodeSdkToV3Codemod = function runNodeSdkToV3Codemod(
	options: CodemodRunOptions
): Promise<CodemodRunResult> {
	return runTransform(options, transformSourceFile);
};
