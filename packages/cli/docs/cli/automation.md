---
title: Agents and automation
description: Read JSON results from the c15t CLI, call it from another program
  with runCli, and give a coding agent a v3 setup or migration task.
group: cli
---

## Read JSON results

```bash
npx @c15t/cli@alpha setup offline --plan --json --no-telemetry
```

`--json` writes one JSON document to stdout. Human diagnostics go to stderr. Check `success` before consuming `data`; a completed process alone does not mean the command succeeded.

```json
{
  "schemaVersion": 1,
  "success": false,
  "command": "setup",
  "exitCode": 1,
  "error": {
    "code": "INPUT_REQUIRED",
    "message": "Required command input is missing"
  }
}
```

Commands return their own data under `data`, such as generated edits, hosted projects, or a migration report. Do not parse terminal messages for those values.

## Call the CLI from code

```ts
import { runCli } from '@c15t/cli';

const result = await runCli(['setup', 'offline', '--plan', '--json'], {
	cwd: projectDirectory,
});

if (!result.success) {
	throw new Error(result.error?.message);
}
```

Importing the package does not execute a command. `runCli` returns a result without changing process arguments, the working directory, or the exit status. Prompts and telemetry are disabled by default for library callers. Supply a `logger` to route diagnostics into the host CLI. The executable adapter owns JSON serialization and process exit status.

CommonJS callers on Node versions that support `require(esm)` can use `const { runCli } = require('@c15t/cli')`.

For Inth or another host, use explicit project inputs and inspect the returned result. Standalone account commands delegate to the pinned Inth executable and use Inth's existing session and organization context. The runner never reads Inth credentials. Hosts that already own account operations should use the independent frontend exports below.

## Reuse generation in another CLI

Install `@c15t/cli@alpha` in the host project. Import the generation entry point to create integration files without loading the interactive runner:

```ts
import { generate, runGenerateCommand } from '@c15t/cli/generate';

const plan = generate({
	framework: 'react',
	mode: 'hosted',
	backendURL: projectBackendURL,
	scripts: ['google-tag'],
	output: 'src/consent',
});

// Forward arguments after `inth c15t generate`:
const forwardedPlan = runGenerateCommand([
	'hosted',
	'--framework',
	'react',
	'--backend-url',
	projectBackendURL,
]);
```

Both functions return `{ files, dependencies, instructions }` synchronously. `files` maps application-relative paths to their contents, including a README. `dependencies` contains installation arguments such as `@c15t/react@alpha`. `getInstallSpecifier` adds `@alpha` to bare c15t package names and preserves explicit specifiers and external package names. `generateBoilerplateTemplate` exposes the lower-level template with bare dependency names and paths relative to the output directory.

The host CLI owns writing files, checking existing contents and symlinks, installing dependencies, diagnostics, and authentication. These functions do not read the application, detect its framework, prompt, write files, install packages, or access the network. Use the project's provisioned backend URL for hosted mode.

`runGenerateCommand` accepts `hosted` or `offline`, `--framework`, and optional `--backend-url`, `--scripts`, and `--output` values. A second argument supplies host defaults for these inputs. Without defaults, mode and framework are required. Explicit arguments override defaults; selecting offline clears an inherited backend URL. Repeated flags are rejected. `parseGenerateOptions` exposes the same parser without generating files. It supports the [boilerplate framework targets](./commands/boilerplate.md). The default output is `src/consent`. Hosted mode requires an absolute HTTP or HTTPS URL without embedded credentials. Offline mode rejects a backend URL. Invalid frameworks, integrations, flags, and paths that escape the application throw an `Error`. Runner flags such as `--apply`, `--json`, and `--package-source` belong to the host rather than this parser.

For Node hosts that need the full CLI command metadata and actions, `import { commands } from '@c15t/cli/commands'` exports the same registry used by the runner. Actions accept a c15t `CliContext`; use `runCli` when you need the runner to create that context.

## Frontend commands with host state

Use `@c15t/cli/frontend` when Inth or another host owns authentication and the selected project. The dispatcher accepts arguments after the `c15t` namespace and returns `{ command, data }` synchronously:

```ts
import { runFrontendCommand } from '@c15t/cli/frontend';

const result = runFrontendCommand(['setup', '--framework', 'react'], {
	generation: { backendURL: projectBackendURL },
});
```

`setup` and `generate` return the standalone file plan. The frontend dispatcher defaults to hosted mode. Supply a framework through arguments or `generation.framework`; no detection runs. Explicit flags override `generation` defaults. `setup offline` ignores the host's inherited backend URL, while an explicit offline `--backend-url` is an error.

A host can supply its already-fetched projects and current selection instead of a backend URL:

```ts
import { runFrontendCommand } from '@c15t/cli/frontend';

const context = {
	generation: { framework: 'react' as const },
	projects: availableProjects,
	selectedProject: selectedProjectId,
};

const plan = runFrontendCommand(['generate'], context);
const selection = runFrontendCommand(
	['projects', 'select', 'organization/project'],
	context
);
```

Projects use `{ id, name, organizationSlug?, status, url }`. `status` is `active`, `pending`, or `inactive`; `url` is the provisioned consent backend URL. Generation resolves the selected ID or unambiguous `organization/name` and rejects an unavailable or invalid backend. An explicit backend URL takes precedence over the selected project.

| Command                                   | Returned `data`                                                    | Host responsibility                                                                                |
| ----------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `setup`, `generate`                       | `{ files, dependencies, instructions }`                            | Review and write files, handle conflicts and symlinks, install dependencies, wire the application. |
| `projects`, `projects list`               | `{ projects, selectedProject }`                                    | Fetch projects using the host's authenticated client.                                              |
| `projects select <id\|organization/name>` | `{ project, selectedProject }`                                     | Persist the returned project ID and refresh the generation context.                                |
| `status`                                  | `{ authenticated, status, expiresAt?, origin?, selectedProject? }` | Resolve session state and expiry in the host.                                                      |

`status` requires `context.authentication` with `isLoggedIn` and `isExpired`. Optional metadata is limited to `expiresAt`, `origin`, and `selectedProject`. It never returns access or refresh tokens. Project commands require `context.projects`, including an empty array when there are no projects. Missing host state is an error rather than a network request or implicit login.

The host owns prompts, project creation, login, logout, token refresh, and persistence. Selection returns data and does not update the context. These commands have no database dependencies. Codemods, self-hosting commands, and runner flags such as `--apply` or `--json` are rejected by the frontend dispatcher. The standalone Node CLI uses the same project resolver, backend URL validation, and account status logic with its own runtime adapters.

## Plan and apply frontend files

Use `@c15t/cli/frontend/runtime` when the host needs filesystem operations and
dependency installation. It uses Node built-ins supported by scriptc 0.2.0:

```ts
import { runGenerationWorkflow } from '@c15t/cli/frontend/runtime';

const result = await runGenerationWorkflow(
	['generate', '--framework', 'react', '--apply'],
	{ generation: { backendURL: projectBackendURL } },
	{
		cwd: projectDirectory,
		packageManager: 'bun',
		signal: abortController.signal,
	}
);
```

The application directory must exist and contain a regular `package.json`.
Generation defaults to a plan without writes or installation. `--plan` and
`--dry-run` make that choice explicit. `--apply` creates files and requires a
host-supplied package manager or `--skip-install`. These flags belong to the
runtime; the pure frontend dispatcher continues to reject them. The host still
owns help, `--json`, working-directory options, framework detection, authentication
and application wiring.

The result contains `{ command, applied, created, installed, plan, recovered }`.
`plan` contains the canonical application `root`, `files` with `path`, `content`
and `exists`, alpha `dependencies`, and `instructions`. Existing files must
already match. Apply checks the reviewed files again before writing and refuses
conflicts, symlink targets and symlink ancestors, including dangling symlinks.
The application root itself resolves to its real directory.

Files stage in `.c15t-native-generation` before complete contents are published
with exclusive hard links. An interrupted apply blocks further generation.
Use `--resume --apply` with the original command to recover and regenerate.
Recovery checks every record and generated file before removing owned files.
Edited files, replacements even with identical contents, unexpected staging
contents, and malformed records remain for inspection. Empty generated directories
can remain after recovery. This supports process interruption; it does not promise
recovery from filesystem corruption or power loss. A partially written journal
requires inspection. The Node runner's `.c15t-generation.json` uses its own recovery
path and cannot be resumed by this runtime.

Dependency installation runs after file apply commits. npm, pnpm, yarn, and Bun
run in the application directory with installer output on stderr. Cancellation
stops the direct installer process. Installer failure leaves generated files in
place and reports a retry command; package-manager changes to manifests, lockfiles
and `node_modules` do not roll back. For manual installation, use `--skip-install`
and the returned dependencies. `planGeneration`, `applyGeneration`,
`recoverGeneration`, `installGenerationDependencies`, and
`parseGenerationWorkflowArguments` expose the same steps separately.

## Compile native frontend commands with scriptc

The published package includes dependency-free generation and frontend TypeScript sources. With scriptc 0.2.0, copy both source directories into the host's vendor directory before compilation. scriptc treats imports under `node_modules` as npm dependencies, so directly importing the npm entry points does not establish static native compilation.

Create `scripts/vendor-c15t.mjs` in the host project and run it with Node during the build:

```js
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';

const require = createRequire(import.meta.url);
for (const entry of ['generate', 'frontend']) {
	const source = dirname(require.resolve(`@c15t/cli/${entry}/source`));
	const destination = resolve(`vendor/c15t/${entry}`);
	mkdirSync(dirname(destination), { recursive: true });
	rmSync(destination, { recursive: true, force: true });
	cpSync(source, destination, { recursive: true });
}
```

Copy both complete directories and keep them as siblings. Preserve the source contents; NodeNext hosts may add explicit `.ts` or `/index.ts` extensions to relative import specifiers during vendoring. The frontend source imports the generation source through a relative path. Regenerate them when updating the locked `@c15t/cli@alpha` dependency. The published source paths exist for this build step. Generation-only hosts can copy just the generation directory.

In the host's `cli.ts`, route the generation subcommand to the vendored parser. This example prints the plan; integrate it with Inth's own plan/apply and installation behavior to create application files:

```ts
import { runGenerateCommand } from './vendor/c15t/generate/index.ts';

try {
	const args = process.argv.slice(2);
	if (args[0] !== 'c15t' || args[1] !== 'generate') {
		throw new Error('Usage: inth c15t generate <mode> --framework <framework>');
	}
	const plan = runGenerateCommand(args.slice(2));
	process.stdout.write(`${JSON.stringify(plan)}\n`);
} catch (error) {
	process.stderr.write(
		`${error instanceof Error ? error.message : String(error)}\n`
	);
	process.exitCode = 1;
}
```

Build with scriptc 0.2.0 in its default static mode, without `--dynamic`:

```bash
node scripts/vendor-c15t.mjs
scriptc build cli.ts --out inth
./inth c15t generate hosted --framework react --backend-url https://your-project.inth.app
```

Replace the example URL with the exact endpoint provisioned for the project. The result contains the generated source and alpha installation arguments. To route the frontend command set, import `runFrontendCommand` from `./vendor/c15t/frontend/index.ts`, forward arguments after the `c15t` namespace, and supply the host context described above. Native verification covers hosted and offline boilerplate for all targets, generation defaults, project list/select, account status, filesystem apply, conflicts, symlinks, recovery, and alpha installer arguments. Import `runGenerationWorkflow` from `./vendor/c15t/frontend/runtime/index.ts` to plan and apply standalone frontend files natively. Interactive application-root editing, codemods, and database migrations continue to use the Node runner.

## Agent setup and v3 migration workflow

Launch your installed Codex CLI from the application directory:

```bash
c15t setup --codex
c15t setup --codex hosted --backend-url https://your-project.inth.app
```

Replace the example URL with the provisioned consent backend URL. With an Inth
connection, `--project <id|name>` resolves that project's backend URL.
Use either `--project` or `--backend-url`. `--framework` and `--scripts` provide
optional hints. Explicitly select `offline` or `custom` when needed. Without a
mode, the task asks the agent to confirm it with you.

Codex receives the default c15t v3 frontend task and named public inputs. It
inspects the application, proposes a setup plan, installs required c15t packages
from `@alpha`, and reads their version-matched bundled docs before adapting
providers, UI, styles, and consent-gated scripts. It does not provision a
backend or migrate a database. Review the resulting diff and the agent's
verification report before deploying.

Launch requires an interactive terminal and a `codex` executable on `PATH`.
The CLI inherits Codex's approval and sandbox settings; `--yes` does not
change them. A successful exit means the agent session ended successfully,
not that the CLI independently verified the application's behavior. Interrupting
setup stops the direct child process and leaves any edits for review.

Preview or export the complete task without launching an agent:

```bash
c15t setup --codex --plan
c15t setup --codex --plan --json
```

`--dry-run` also previews the task. Live agent launch rejects `--json` and
`--non-interactive`. Scaffold options such as `--boilerplate`, `--output`,
`--apply`, `--resume`, and `--skip-install` are not supported with `--codex`.
Discuss styling, SSR, proxying, and other frontend preferences in the agent
session. `generate` retains deterministic generation and rejects `--codex`.

Hosts can reuse the same prompt and launcher:

```ts
import {
	createAgentSetupPlan,
	launchAgentSetup,
} from '@c15t/cli/frontend/agent';

const plan = createAgentSetupPlan({ backendURL: provisionedBackendURL });
// Show plan.prompt for review, or hand it to another coding agent.
const exitCode = await launchAgentSetup(projectDirectory, plan, abortSignal);
```

`createAgentSetupPlan` performs no file or network operations. Its options are
`mode`, `backendURL`, `framework`, and `scripts`; it copies only those fields
into the task. Hosts keep authentication and project selection in their own
code. The module also exports `DEFAULT_C15T_SETUP_PROMPT`, `AgentSetupOptions`,
and `AgentSetupPlan`. A missing executable produces an installation hint;
`launchAgentSetup` returns the agent's exit code and rejects on caller
cancellation or launch failure.

For a scriptc host, vendor both source directories as described above and
import from `./vendor/c15t/frontend/agent/index.ts`. The prompt and launcher
compile statically with scriptc 0.2.0 without `--dynamic`. This compiles the
handoff; Codex still needs its own installed executable, authentication, and
network access to perform the task.

For v3, source code and installed documentation determine the migration work. The legacy codemod collection targets v2, apart from the named `use-consent-manager-to-hooks` and `scripts-to-integrations` transforms. It does not update dependencies, convert a v2 backend configuration to v3, or migrate a database.

`skills` delegates to an external interactive installer and does not support JSON output. Use installed bundled docs directly when building unattended automation.

Environment-file edits in setup results contain only `path`, `operation` (`create` or `update`), and `redacted: true`. This also applies when either a symlink's name or its target is an environment file. Their original and proposed contents stay out of JSON output. Setup keeps the full contents internally to apply edits and restore files if generation fails.
