/**
 * Command exports
 */

// Auth commands
export { authCommands, loginCommand, logoutCommand } from './auth';
// Codemods
export { codemodsCommand, runCodemods } from './codemods';
// Generate command
export { generate, generateCommand } from './generate';
// Project management
export { instancesAliasCommand, projectsCommand } from './instances';
// Self-host (existing)
export { selfHost } from './self-host';
// Skills command
export { installSkills } from './skills';
