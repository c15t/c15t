import { Node, SyntaxKind } from 'ts-morph';
import type * as TsMorphTypes from 'ts-morph';

import { runTransform } from './runner';
import type { CodemodRunOptions, CodemodRunResult } from './runner';

/** Entries that exported `useConsentManager` before v3.0.0-alpha.3. */
const SOURCE_SPECIFIERS = new Set([
	'@c15t/react',
	'@c15t/react/headless',
	'@c15t/nextjs',
	'@c15t/nextjs/headless',
	'@c15t/tanstack-start',
	'@c15t/tanstack-start/headless',
	'c15t/react',
	'c15t/react/headless',
	'c15t/next',
	'c15t/next/headless',
	'c15t/tanstack-start',
	'c15t/tanstack-start/headless',
]);

const HEADLESS_SUFFIX = '/headless';

/** Fields that map to one selector or action hook call. */
const HOOK_FIELDS = {
	activeUI: { expression: "useActiveUI() ?? 'none'", hook: 'useActiveUI' },
	branding: { expression: "useBranding() ?? 'c15t'", hook: 'useBranding' },
	consents: { expression: 'useConsents()', hook: 'useConsents' },
	effectivePermissions: {
		expression: 'useEffectivePermissions()',
		hook: 'useEffectivePermissions',
	},
	explicitChoice: {
		expression: 'useExplicitChoice()',
		hook: 'useExplicitChoice',
	},
	iab: { expression: 'useIABSnapshot()', hook: 'useIABSnapshot' },
	model: { expression: "useModel() ?? 'opt-in'", hook: 'useModel' },
	noticeDismissal: {
		expression: 'useNoticeDismissal()',
		hook: 'useNoticeDismissal',
	},
	optOutDirectives: {
		expression: 'useOptOutDirectives()',
		hook: 'useOptOutDirectives',
	},
	policyBanner: {
		expression: 'usePromptPresentation()',
		hook: 'usePromptPresentation',
	},
	policyCategories: {
		expression: "['necessary', ...usePolicyCategories()]",
		hook: 'usePolicyCategories',
	},
	policyDialog: {
		expression: 'usePreferencesPresentation()',
		hook: 'usePreferencesPresentation',
	},
	policyRule: { expression: 'usePolicyRule()', hook: 'usePolicyRule' },
	policyScopeMode: {
		expression: 'usePolicyScopeMode()',
		hook: 'usePolicyScopeMode',
	},
	privacySignals: {
		expression: 'usePrivacySignals()',
		hook: 'usePrivacySignals',
	},
	promptRequirement: {
		expression: 'usePromptRequirement()',
		hook: 'usePromptRequirement',
	},
	resolution: {
		expression: 'usePolicyResolution()',
		hook: 'usePolicyResolution',
	},
	restrictions: { expression: 'useRestrictions()', hook: 'useRestrictions' },
	setActiveUI: { expression: 'useSetActiveUI()', hook: 'useSetActiveUI' },
	subscribeToConsentChanges: {
		expression: 'useSubscribeToConsentChanges()',
		hook: 'useSubscribeToConsentChanges',
	},
	updateConsentCategories: {
		expression: 'useRegisterConsentCategories()',
		hook: 'useRegisterConsentCategories',
	},
	vendorChoice: { expression: 'useVendorChoice()', hook: 'useVendorChoice' },
	vendors: { expression: 'useDeclaredVendors()', hook: 'useDeclaredVendors' },
} as const;

/** Fields that become properties of one `useConsentDraft()` destructuring. */
const DRAFT_FIELDS = {
	draftIsStale: 'isStale',
	resetDraft: 'reset',
	selectedConsentTypes: 'values',
	selectedConsents: 'values',
	selectedVendors: 'vendors',
	setSelectedConsent: 'set',
	setSelectedVendor: 'setVendor',
} as const;

/** What to use instead of a field the codemod cannot rewrite. */
const MANUAL_HINTS: Record<string, string> = {
	consentCategories: 'useConsentDraft().displayedCategories',
	consentInfo: 'useExplicitChoice()',
	consentTypes:
		'useConsentDraft().displayedCategories, with labels from useTranslations().consentTypes',
	getDisplayedConsents:
		'useConsentDraft().displayedCategories, with labels from useTranslations().consentTypes',
	getDisplayedVendors: 'useDeclaredVendors() filtered by category',
	has: 'useConsent(category), one call per category at the top of the component',
	hasConsented: 'useExplicitChoice() !== null',
	identifyUser: 'useIdentify()',
	manager: 'nothing; it was always null in v3',
	saveConsents:
		"useHeadlessConsentUI().saveCustomPreferences('all' | 'none'), or with no argument for the draft",
	setConsent: 'useSaveConsents(), called with { [category]: value }',
	translationConfig: 'useTranslations() for the active strings',
};

const SAVE_ARGUMENTS: Record<string, string> = {
	all: "'all'",
	custom: '',
	necessary: "'none'",
};

const TODO_PREFIX = 'TODO(c15t v3): useConsentManager() was removed.';

interface UseConsentManagerResult {
	changed: boolean;
	operations: number;
	summaries: string[];
}

interface Edit {
	node: TsMorphTypes.Node;
	text: string;
}

interface FieldPlan {
	statements: string[];
	hooks: Set<string>;
	headlessHooks: Set<string>;
	manual: { text: string; field: string }[];
	edits: Edit[];
	draftProperties: string[];
	usesDraftSave: boolean;
}

const toPascalCase = function toPascalCase(value: string): string {
	return value
		.split(/[^A-Za-z0-9]+/u)
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join('');
};

const bindingPropertyName = function bindingPropertyName(
	element: TsMorphTypes.BindingElement
): string | undefined {
	const propertyNameNode = element.getPropertyNameNode();
	if (!propertyNameNode) {
		const nameNode = element.getNameNode();
		return Node.isIdentifier(nameNode) ? nameNode.getText() : undefined;
	}
	if (Node.isIdentifier(propertyNameNode)) {
		return propertyNameNode.getText();
	}
	if (Node.isStringLiteral(propertyNameNode)) {
		return propertyNameNode.getLiteralText();
	}
	return undefined;
};

/** Every use of a binding other than its declaration. */
const usesOf = function usesOf(
	name: TsMorphTypes.Identifier
): TsMorphTypes.Node[] {
	return name
		.findReferencesAsNodes()
		.filter(
			(reference) =>
				reference.getSourceFile() === name.getSourceFile() &&
				reference.getStart() !== name.getStart()
		);
};

/** The literal argument of each call, or `null` when a use is not a literal call. */
const literalCallArguments = function literalCallArguments(
	uses: TsMorphTypes.Node[]
): { call: TsMorphTypes.CallExpression; value: string }[] | null {
	const calls: { call: TsMorphTypes.CallExpression; value: string }[] = [];
	for (const use of uses) {
		const call = use.getParent();
		if (!Node.isCallExpression(call) || call.getExpression() !== use) {
			return null;
		}
		const args = call.getArguments();
		const [argument] = args;
		if (args.length !== 1 || !Node.isStringLiteral(argument)) {
			return null;
		}
		calls.push({ call, value: argument.getLiteralText() });
	}
	return calls;
};

const uniqueName = function uniqueName(
	sourceFile: TsMorphTypes.SourceFile,
	taken: Set<string>,
	base: string
): string {
	const text = sourceFile.getFullText();
	const isFree = (candidate: string) =>
		!taken.has(candidate) && !new RegExp(`\\b${candidate}\\b`, 'u').test(text);
	let candidate = base;
	let suffix = 2;
	while (!isFree(candidate)) {
		candidate = `${base}${suffix}`;
		suffix += 1;
	}
	taken.add(candidate);
	return candidate;
};

const planHas = function planHas(
	sourceFile: TsMorphTypes.SourceFile,
	local: TsMorphTypes.Identifier,
	plan: FieldPlan,
	taken: Set<string>
): boolean {
	const calls = literalCallArguments(usesOf(local));
	if (!calls) {
		return false;
	}
	const names = new Map<string, string>();
	for (const { call, value } of calls) {
		let name = names.get(value);
		if (!name) {
			name = uniqueName(
				sourceFile,
				taken,
				`${local.getText()}${toPascalCase(value)}`
			);
			names.set(value, name);
			plan.statements.push(
				`const ${name} = useConsent(${JSON.stringify(value).replaceAll('"', "'")});`
			);
		}
		plan.edits.push({ node: call, text: name });
	}
	plan.hooks.add('useConsent');
	return true;
};

const planSave = function planSave(
	local: TsMorphTypes.Identifier,
	plan: FieldPlan
): boolean {
	const calls = literalCallArguments(usesOf(local));
	if (!calls || calls.some(({ value }) => !(value in SAVE_ARGUMENTS))) {
		return false;
	}
	for (const { call, value } of calls) {
		const replacement = SAVE_ARGUMENTS[value] ?? '';
		plan.edits.push({
			node: call,
			text: `${call.getExpression().getText()}(${replacement})`,
		});
		if (value === 'custom') {
			plan.usesDraftSave = true;
		}
	}
	const name = local.getText();
	plan.statements.push(
		`const { saveCustomPreferences${name === 'saveCustomPreferences' ? '' : `: ${name}`} } = useHeadlessConsentUI();`
	);
	plan.headlessHooks.add('useHeadlessConsentUI');
	return true;
};

const planElement = function planElement(
	sourceFile: TsMorphTypes.SourceFile,
	element: TsMorphTypes.BindingElement,
	plan: FieldPlan,
	taken: Set<string>
): void {
	const key = bindingPropertyName(element);
	const local = element.getNameNode();
	const keep = () =>
		plan.manual.push({
			field: key ?? element.getText(),
			text: element.getText(),
		});
	if (
		!key ||
		element.getDotDotDotToken() ||
		element.getInitializer() ||
		!Node.isIdentifier(local)
	) {
		keep();
		return;
	}
	const name = local.getText();
	if (key in HOOK_FIELDS) {
		const field = HOOK_FIELDS[key as keyof typeof HOOK_FIELDS];
		plan.statements.push(`const ${name} = ${field.expression};`);
		plan.hooks.add(field.hook);
		return;
	}
	if (key in DRAFT_FIELDS) {
		const property = DRAFT_FIELDS[key as keyof typeof DRAFT_FIELDS];
		plan.draftProperties.push(
			property === name ? property : `${property}: ${name}`
		);
		return;
	}
	if (key === 'has' && planHas(sourceFile, local, plan, taken)) {
		return;
	}
	if (key === 'saveConsents' && planSave(local, plan)) {
		return;
	}
	keep();
};

const manualComment = function manualComment(
	fields: string[],
	indent: string
): string {
	const lines = fields.map((field) => {
		const hint = MANUAL_HINTS[field] ?? 'no direct v3 replacement';
		return `${indent}// - ${field}: ${hint}`;
	});
	return [`// ${TODO_PREFIX} Migrate these fields by hand:`, ...lines].join(
		'\n'
	);
};

interface TextEdit {
	start: number;
	end: number;
	text: string;
}

interface CallContext {
	sourceFile: TsMorphTypes.SourceFile;
	localName: string;
	edits: TextEdit[];
	hooks: Set<string>;
	headlessHooks: Set<string>;
	summaries: string[];
}

const toTextEdit = function toTextEdit(node: TsMorphTypes.Node, text: string) {
	return { end: node.getEnd(), start: node.getStart(), text };
};

/** The whitespace that starts the node's line, exactly as written. */
const lineIndent = function lineIndent(node: TsMorphTypes.Node): string {
	const text = node.getSourceFile().getFullText();
	const lineStart = text.lastIndexOf('\n', node.getStart() - 1) + 1;
	return /^[\t ]*/u.exec(text.slice(lineStart))?.[0] ?? '';
};

/** Marks a call the codemod cannot destructure, leaving it in place. */
const markCall = function markCall(
	call: TsMorphTypes.CallExpression,
	context: CallContext
): boolean {
	const anchor =
		call.getFirstAncestorByKind(SyntaxKind.VariableStatement) ??
		call.getFirstAncestorByKind(SyntaxKind.ExpressionStatement);
	if (!anchor || anchor.getFullText().includes(TODO_PREFIX)) {
		return false;
	}
	context.edits.push({
		end: anchor.getStart(),
		start: anchor.getStart(),
		text: `// ${TODO_PREFIX} Read each field through its own hook; see the v3 upgrade guide.\n${lineIndent(anchor)}`,
	});
	context.summaries.push('TODO: useConsentManager() without destructuring');
	return true;
};

const planCall = function planCall(
	call: TsMorphTypes.CallExpression,
	context: CallContext
): boolean {
	const declaration = call.getParentIfKind(SyntaxKind.VariableDeclaration);
	const list = declaration?.getParentIfKind(SyntaxKind.VariableDeclarationList);
	const statement = list?.getParentIfKind(SyntaxKind.VariableStatement);
	const pattern = declaration?.getNameNode();
	if (
		!declaration ||
		!list ||
		!statement ||
		list.getDeclarations().length !== 1 ||
		declaration.getTypeNode() ||
		!Node.isObjectBindingPattern(pattern)
	) {
		return markCall(call, context);
	}

	const plan: FieldPlan = {
		draftProperties: [],
		edits: [],
		headlessHooks: new Set(),
		hooks: new Set(),
		manual: [],
		statements: [],
		usesDraftSave: false,
	};
	const taken = new Set<string>();
	for (const element of pattern.getElements()) {
		planElement(context.sourceFile, element, plan, taken);
	}
	const indent = lineIndent(statement);
	const keyword = list.getDeclarationKind();
	const lines: string[] = [];
	if (plan.draftProperties.length > 0 || plan.usesDraftSave) {
		lines.push(
			`// ${TODO_PREFIX} Its draft and save now come from separate hooks. Render the components that edit and save choices inside one <ConsentDraftProvider> so they share a draft.`
		);
	}
	if (plan.draftProperties.length > 0) {
		lines.push(
			`const { ${[...new Set(plan.draftProperties)].join(', ')} } = useConsentDraft();`
		);
		plan.hooks.add('useConsentDraft');
	}
	lines.push(...plan.statements);
	if (plan.manual.length > 0) {
		lines.push(
			manualComment(
				plan.manual.map(({ field }) => field),
				indent
			),
			`const { ${plan.manual.map(({ text }) => text).join(', ')} } = ${context.localName}();`
		);
	}
	const replacement = lines
		.map((line) =>
			keyword === 'const' ? line : line.replace(/^const /u, `${keyword} `)
		)
		.join(`\n${indent}`);

	context.edits.push(
		...plan.edits.map(({ node, text }) => toTextEdit(node, text)),
		toTextEdit(statement, replacement)
	);
	for (const hook of plan.hooks) {
		context.hooks.add(hook);
	}
	for (const hook of plan.headlessHooks) {
		context.headlessHooks.add(hook);
	}
	const mapped = [...plan.hooks, ...plan.headlessHooks];
	if (mapped.length > 0) {
		context.summaries.push(`useConsentManager -> ${mapped.join(', ')}`);
	}
	for (const { field } of plan.manual) {
		context.summaries.push(`TODO: ${field}`);
	}
	return true;
};

/** Applies non-overlapping edits from the end of the file backwards. */
const applyEdits = function applyEdits(
	sourceFile: TsMorphTypes.SourceFile,
	edits: TextEdit[]
): void {
	let text = sourceFile.getFullText();
	for (const edit of [...edits].sort(
		(left, right) => right.start - left.start
	)) {
		text = text.slice(0, edit.start) + edit.text + text.slice(edit.end);
	}
	sourceFile.replaceWithText(text);
};

const findImport = function findImport(
	sourceFile: TsMorphTypes.SourceFile,
	specifier: string
): TsMorphTypes.ImportDeclaration | undefined {
	return sourceFile
		.getImportDeclarations()
		.find(
			(declaration) =>
				declaration.getModuleSpecifierValue() === specifier &&
				!declaration.isTypeOnly() &&
				!declaration.getNamespaceImport()
		);
};

const addNamedImports = function addNamedImports(
	sourceFile: TsMorphTypes.SourceFile,
	specifier: string,
	names: Set<string>,
	after: TsMorphTypes.ImportDeclaration,
	quote: string
): void {
	const existing = findImport(sourceFile, specifier);
	const present = new Set(
		existing?.getNamedImports().map((named) => named.getName())
	);
	const missing = [...names].filter((name) => !present.has(name)).sort();
	if (missing.length === 0) {
		return;
	}
	if (existing) {
		existing.addNamedImports(missing);
		return;
	}
	sourceFile.insertStatements(
		after.getChildIndex() + 1,
		`import { ${missing.join(', ')} } from ${quote}${specifier}${quote};`
	);
};

const transformSourceFile = function transformSourceFile(
	sourceFile: TsMorphTypes.SourceFile
): UseConsentManagerResult {
	const declaration = sourceFile
		.getImportDeclarations()
		.find(
			(candidate) =>
				SOURCE_SPECIFIERS.has(candidate.getModuleSpecifierValue()) &&
				!candidate.isTypeOnly() &&
				candidate
					.getNamedImports()
					.some((named) => named.getName() === 'useConsentManager')
		);
	const namedImport = declaration
		?.getNamedImports()
		.find((named) => named.getName() === 'useConsentManager');
	if (!declaration || !namedImport || namedImport.isTypeOnly()) {
		return { changed: false, operations: 0, summaries: [] };
	}
	const specifier = declaration.getModuleSpecifierValue();
	const quote = declaration.getModuleSpecifier().getText().charAt(0);
	const localName =
		namedImport.getAliasNode()?.getText() ?? 'useConsentManager';
	const base = specifier.endsWith(HEADLESS_SUFFIX)
		? specifier.slice(0, -HEADLESS_SUFFIX.length)
		: specifier;
	const context: CallContext = {
		edits: [],
		headlessHooks: new Set(),
		hooks: new Set(),
		localName,
		sourceFile,
		summaries: [],
	};
	let operations = 0;
	for (const call of sourceFile.getDescendantsOfKind(
		SyntaxKind.CallExpression
	)) {
		if (
			call.getExpression().getText() === localName &&
			planCall(call, context)
		) {
			operations += 1;
		}
	}
	if (operations === 0) {
		return { changed: false, operations: 0, summaries: [] };
	}
	applyEdits(sourceFile, context.edits);

	// The edits re-parsed the file; find the import again.
	const current = sourceFile
		.getImportDeclarations()
		.find(
			(candidate) =>
				candidate.getModuleSpecifierValue() === specifier &&
				candidate
					.getNamedImports()
					.some((named) => named.getName() === 'useConsentManager')
		);
	if (!current) {
		return { changed: true, operations, summaries: context.summaries };
	}
	const stillUsed = sourceFile
		.getDescendantsOfKind(SyntaxKind.Identifier)
		.some(
			(identifier) =>
				identifier.getText() === localName &&
				!identifier.getFirstAncestorByKind(SyntaxKind.ImportDeclaration)
		);
	addNamedImports(sourceFile, base, context.hooks, current, quote);
	addNamedImports(
		sourceFile,
		`${base}${HEADLESS_SUFFIX}`,
		context.headlessHooks,
		current,
		quote
	);
	if (!stillUsed) {
		current
			.getNamedImports()
			.find((named) => named.getName() === 'useConsentManager')
			?.remove();
		if (
			current.getNamedImports().length === 0 &&
			!current.getDefaultImport() &&
			!current.getNamespaceImport()
		) {
			current.remove();
		}
	}
	return { changed: true, operations, summaries: context.summaries };
};

/**
 * Rewrites `useConsentManager()` destructuring to the v3 selector, draft and
 * headless hooks. Fields with no one-call replacement stay on a residual
 * `useConsentManager()` call under a TODO comment, so the build points at
 * them.
 *
 * @param options - Codemod execution options.
 * @returns Changed files and non-fatal per-file errors.
 */
export const runUseConsentManagerToHooksCodemod =
	function runUseConsentManagerToHooksCodemod(
		options: CodemodRunOptions
	): Promise<CodemodRunResult> {
		return runTransform(options, transformSourceFile);
	};

export type { CodemodRunOptions, CodemodRunResult } from './runner';
