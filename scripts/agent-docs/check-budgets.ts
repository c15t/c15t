import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
	AGENT_PACKAGE_CONFIGS,
	expectedAgentDocPaths,
	ROOT_DIR,
} from './config';

export type AgentDocsBudget = {
	pageCount: number;
	totalBytes: number;
};

export type PackedFile = {
	path: string;
	size: number;
};

export type AgentDocsCheckResult = {
	issues: string[];
};

const BUDGET_FILE = join(ROOT_DIR, 'scripts', 'agent-docs', 'budgets.json');

export function readBudgets(): Record<string, AgentDocsBudget> {
	return JSON.parse(readFileSync(BUDGET_FILE, 'utf8')) as Record<
		string,
		AgentDocsBudget
	>;
}

export function checkPackedAgentDocs(
	packageName: string,
	files: PackedFile[]
): AgentDocsCheckResult {
	const issues: string[] = [];
	const relevantFiles = files.filter((file) => file.path.startsWith('docs/'));
	const expectedPaths = expectedAgentDocPaths(packageName);

	for (const expectedPath of expectedPaths) {
		if (!relevantFiles.some((file) => file.path === expectedPath)) {
			issues.push(`missing required published file ${expectedPath}`);
		}
	}

	for (const file of relevantFiles) {
		if (!expectedPaths.has(file.path)) {
			issues.push(`unexpected published agent docs file ${file.path}`);
		}
	}

	const budgets = readBudgets();
	const budget = budgets[packageName];
	if (!budget) {
		issues.push(`missing agent docs budget for ${packageName}`);
		return { issues };
	}

	const docFiles = relevantFiles.filter((file) => file.path.endsWith('.md'));
	const pageCount = docFiles.length;
	const totalBytes = docFiles.reduce((sum, file) => sum + file.size, 0);

	if (pageCount > Math.ceil(budget.pageCount * 1.15)) {
		issues.push(
			`agent docs page count ${pageCount} exceeds budget ${budget.pageCount}`
		);
	}

	if (totalBytes > Math.ceil(budget.totalBytes * 1.15)) {
		issues.push(
			`agent docs size ${totalBytes} exceeds budget ${budget.totalBytes}`
		);
	}

	return { issues };
}

export function supportedAgentDocsPackages() {
	return AGENT_PACKAGE_CONFIGS.map((config) => config.packageName);
}
