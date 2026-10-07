import { Node } from 'ts-morph';
import type * as TsMorphTypes from 'ts-morph';

import { runTransform } from './runner';
import type { CodemodRunOptions, CodemodRunResult } from './runner';
import {
	addTodo,
	applyEdits,
	ensureNamedImports,
	findProperty,
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

const OPTION_RENAMES: Record<string, string> = {
	retryConfig: 'retry',
	timeout: 'timeoutMs',
	token: 'apiKey',
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
	const next = access.getParent();
	if (
		(path === 'meta' || path === 'subjects' || path === 'consent') &&
		Node.isPropertyAccessExpression(next) &&
		next.getExpression() === access
	) {
		path = `${path}.${next.getName()}`;
		access = next;
	}
	const call = access.getParent();
	if (!Node.isCallExpression(call) || call.getExpression() !== access) {
		return undefined;
	}
	return { access, call, path };
};

/** Rewrites arguments whose position or format changed. */
const planArguments = function planArguments(
	target: string,
	args: TsMorphTypes.Node[],
	context: Context
): void {
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
	const { access, call, path } = method;
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
			text: `.${target}`,
		});
		context.summaries.add(`${path} -> ${target}`);
	}
	planArguments(target, call.getArguments(), context);
	if (addTodo(statementOf(call), RESULT_TODO, context.edits)) {
		context.summaries.add('TODO: result shape');
	}
	context.operations += 1;
};

/** Renames client options and marks the ones v3 dropped. */
const planOptions = function planOptions(
	call: TsMorphTypes.CallExpression | TsMorphTypes.NewExpression,
	context: Context
): void {
	const [argument] = call.getArguments() ?? [];
	const object = argument && unwrapExpression(argument);
	if (!object || !Node.isObjectLiteralExpression(object)) {
		if (!argument && addTodo(statementOf(call), ENV_TODO, context.edits)) {
			context.summaries.add('TODO: environment variables');
		}
		return;
	}
	if (!findProperty(object, 'baseUrl')) {
		addTodo(statementOf(call), ENV_TODO, context.edits);
	}
	for (const property of object.getProperties()) {
		const key = propertyKey(property);
		if (!key) {
			continue;
		}
		const renamed = OPTION_RENAMES[key];
		if (renamed && Node.isPropertyAssignment(property)) {
			context.edits.push(toTextEdit(property.getNameNode(), renamed));
			context.summaries.add(`${key} -> ${renamed}`);
		} else if (renamed && Node.isShorthandPropertyAssignment(property)) {
			context.edits.push(toTextEdit(property, `${renamed}: ${key}`));
			context.summaries.add(`${key} -> ${renamed}`);
		}
		if (key === 'retryConfig' && Node.isPropertyAssignment(property)) {
			const retry = unwrapExpression(property.getInitializerOrThrow());
			if (
				Node.isObjectLiteralExpression(retry) &&
				retry
					.getProperties()
					.some((item) => DROPPED_RETRY_KEYS.has(propertyKey(item) ?? ''))
			) {
				addTodo(property, RETRY_TODO, context.edits);
			}
		}
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

/** `new C15TClient()` becomes the factory; type uses become `C15tClient`. */
const planClientClass = function planClientClass(
	named: TsMorphTypes.ImportSpecifier,
	context: Context
): void {
	const typeReferences: TsMorphTypes.Node[] = [];
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
		typeReferences.push(reference);
		const holder = reference.getFirstAncestor(
			(ancestor) =>
				Node.isParameterDeclaration(ancestor) ||
				Node.isPropertyDeclaration(ancestor) ||
				Node.isVariableDeclaration(ancestor)
		);
		if (holder) {
			context.clientDeclarations.push(holder);
		}
	}
	context.operations += 1;
	if (typeReferences.length === 0) {
		context.edits.push(toTextEdit(named, FACTORY));
		return;
	}
	const alias = named.getAliasNode()?.getText();
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

const transformSourceFile = function transformSourceFile(
	sourceFile: TsMorphTypes.SourceFile
): TransformResult {
	const specifiers = sourceFile
		.getImportDeclarations()
		.filter((declaration) => declaration.getModuleSpecifierValue() === ENTRY)
		.flatMap((declaration) => declaration.getNamedImports());
	if (specifiers.length === 0) {
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
