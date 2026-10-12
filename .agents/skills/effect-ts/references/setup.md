# Effect Source Setup

This setup task is required when `./.repos/effect` is missing from the root of the repository where this skill is used.

## Prompt

The local Effect source checkout was not found at `./.repos/effect`.

Choose one of these setup options before continuing:

1. Add `https://github.com/Effect-TS/effect` as a git subtree with squashed history at `./.repos/effect`
2. Add `https://github.com/Effect-TS/effect` as a git submodule at `./.repos/effect`
3. Use `git clone` into `./.repos/effect`, ignore it via `.gitignore`, and add a prepare script that bootstraps it when missing

## Supported Options

### 1. Git Subtree

Use this when the repository should vendor the Effect source directly while keeping history compact.

- Repo path: `./.repos/effect`
- Source: `https://github.com/Effect-TS/effect`
- Preferred shape: subtree with squashed history

### 2. Git Submodule

Use this when the repository should track the Effect source explicitly as a separate Git dependency.

- Repo path: `./.repos/effect`
- Source: `https://github.com/Effect-TS/effect`
- Preferred shape: standard Git submodule

### 3. Local Clone + Gitignore + Prepare Task

Use this when the repository should avoid vendoring or submodule management, but still provide a reproducible local setup.

- Repo path: `./.repos/effect`
- Source: `https://github.com/Effect-TS/effect`
- Add `.repos/effect` to the repository `.gitignore`
- Add a `prepare` task that clones the repo automatically when the directory is missing

#### Concrete Shape

Use this exact shape for the setup. Do not invent a different script.

`package.json`:

```json
{
  "scripts": {
    "prepare": "./scripts/prepare-effect.sh"
  }
}
```

`.gitignore`:

```gitignore
.repos/effect
```

`scripts/prepare-effect.sh`:

```sh
#!/usr/bin/env sh

set -eu

repo_dir=".repos/effect"
repo_url="https://github.com/Effect-TS/effect"

if [ -d "$repo_dir/.git" ]; then
  exit 0
fi

mkdir -p ".repos"
git clone "$repo_url" "$repo_dir"
```

#### Notes

- This keeps `./.repos/effect` available for local research without forcing it into version control
- The script is only responsible for ensuring the checkout exists; it does not update or reset an existing clone
- If you choose this option, the setup task should add this exact script, wire it via `prepare`, and add `.repos/effect` to `.gitignore`

## Guidance

- Do not continue with Effect-specific work until one of the setup options is chosen.
- Prefer the option that matches the host repository's dependency management style.
