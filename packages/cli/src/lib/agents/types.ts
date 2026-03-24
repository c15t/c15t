export type SupportedAgentPackage =
	| 'c15t'
	| '@c15t/react'
	| '@c15t/nextjs'
	| '@c15t/backend';

export type AgentPackageMetadata = {
	packageName: SupportedAgentPackage;
	blockId: 'core' | 'react' | 'nextjs' | 'backend';
	packageLabel: string;
	docsDir: string;
	headline: string;
	description: string;
	workflowKeywords: string[];
	appliesWhen: string[];
	startPages: string[];
	integrationExamples?: string[];
};

export type InstalledAgentPackage = {
	packageName: SupportedAgentPackage;
	packageRoot: string;
	docsDir: string;
	metadata: AgentPackageMetadata;
};
