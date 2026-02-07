#!/bin/bash

# Test Apps Creation Script for CLI Testing
# Creates multiple test apps to verify CLI behavior across different frameworks

set -e

TEST_DIR="$(pwd)/.test-apps"
CLI_PATH="$(pwd)/packages/cli/dist/index.mjs"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}! $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Clean up existing test apps
clean() {
    print_header "Cleaning up test apps"
    if [ -d "$TEST_DIR" ]; then
        rm -rf "$TEST_DIR"
        print_success "Removed $TEST_DIR"
    else
        print_warning "No test directory found"
    fi
}

# Create Next.js App Directory project
create_nextjs_app() {
    print_header "Creating Next.js App Directory project"

    local APP_DIR="$TEST_DIR/nextjs-app"
    mkdir -p "$APP_DIR"
    cd "$APP_DIR"

    # Initialize package.json
    cat > package.json << 'EOF'
{
  "name": "test-nextjs-app",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "@c15t/nextjs": "link:../../packages/nextjs",
    "@c15t/scripts": "link:../../packages/scripts",
    "next": "^16.1.6",
    "react": "^19.2.4",
    "react-dom": "^19.2.4"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.9.3"
  }
}
EOF

    # Create app directory structure
    mkdir -p app

    # Create layout.tsx
    cat > app/layout.tsx << 'EOF'
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Test Next.js App',
  description: 'Testing c15t CLI',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
EOF

    # Create page.tsx
    cat > app/page.tsx << 'EOF'
export default function Home() {
  return (
    <main>
      <h1>Test Next.js App Directory</h1>
      <p>Ready for CLI testing</p>
    </main>
  );
}
EOF

    # Create tsconfig.json
    cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
EOF

    # Create next.config.js
    cat > next.config.js << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {};
module.exports = nextConfig;
EOF

    print_success "Created Next.js App Directory project at $APP_DIR"
    cd - > /dev/null
}

# Create Next.js Pages Directory project
create_nextjs_pages() {
    print_header "Creating Next.js Pages Directory project"

    local APP_DIR="$TEST_DIR/nextjs-pages"
    mkdir -p "$APP_DIR"
    cd "$APP_DIR"

    # Initialize package.json
    cat > package.json << 'EOF'
{
  "name": "test-nextjs-pages",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "@c15t/nextjs": "link:../../packages/nextjs",
    "@c15t/scripts": "link:../../packages/scripts",
    "next": "^16.1.6",
    "react": "^19.2.4",
    "react-dom": "^19.2.4"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.9.3"
  }
}
EOF

    # Create pages directory structure
    mkdir -p pages

    # Create _app.tsx
    cat > pages/_app.tsx << 'EOF'
import type { AppProps } from 'next/app';

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
EOF

    # Create index.tsx
    cat > pages/index.tsx << 'EOF'
export default function Home() {
  return (
    <main>
      <h1>Test Next.js Pages Directory</h1>
      <p>Ready for CLI testing</p>
    </main>
  );
}
EOF

    # Create tsconfig.json
    cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
EOF

    # Create next.config.js
    cat > next.config.js << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {};
module.exports = nextConfig;
EOF

    print_success "Created Next.js Pages Directory project at $APP_DIR"
    cd - > /dev/null
}

# Create Vite React project
create_vite_react() {
    print_header "Creating Vite React project"

    local APP_DIR="$TEST_DIR/vite-react"
    mkdir -p "$APP_DIR"
    cd "$APP_DIR"

    # Initialize package.json
    cat > package.json << 'EOF'
{
  "name": "test-vite-react",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@c15t/react": "link:../../packages/react",
    "@c15t/scripts": "link:../../packages/scripts",
    "react": "^19.2.4",
    "react-dom": "^19.2.4"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^5.1.3",
    "typescript": "^5.9.3",
    "vite": "^7.3.1"
  }
}
EOF

    # Create src directory
    mkdir -p src

    # Create main.tsx
    cat > src/main.tsx << 'EOF'
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
EOF

    # Create App.tsx
    cat > src/App.tsx << 'EOF'
function App() {
  return (
    <main>
      <h1>Test Vite React</h1>
      <p>Ready for CLI testing</p>
    </main>
  );
}

export default App;
EOF

    # Create index.html
    cat > index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Test Vite React</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
EOF

    # Create vite.config.ts
    cat > vite.config.ts << 'EOF'
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
EOF

    # Create tsconfig.json
    cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
EOF

    print_success "Created Vite React project at $APP_DIR"
    cd - > /dev/null
}

# Create Svelte project (no framework detection - tests core package)
create_svelte() {
    print_header "Creating Svelte project (for core package testing)"

    local APP_DIR="$TEST_DIR/svelte-app"
    mkdir -p "$APP_DIR"
    cd "$APP_DIR"

    # Initialize package.json
    cat > package.json << 'EOF'
{
  "name": "test-svelte-app",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "devDependencies": {
    "@sveltejs/vite-plugin-svelte": "^6.2.4",
    "svelte": "^5.49.0",
    "vite": "^7.3.1"
  }
}
EOF

    # Create src directory
    mkdir -p src

    # Create main.js (Svelte 5 mount syntax)
    cat > src/main.js << 'EOF'
import { mount } from 'svelte';
import App from './App.svelte';

const app = mount(App, {
  target: document.getElementById('app'),
});

export default app;
EOF

    # Create App.svelte (Svelte 5 with runes)
    cat > src/App.svelte << 'EOF'
<script>
  let name = $state('Svelte 5');
</script>

<main>
  <h1>Test {name} App</h1>
  <p>Ready for CLI testing (no framework detection)</p>
</main>

<style>
  main {
    text-align: center;
    padding: 1em;
    max-width: 240px;
    margin: 0 auto;
  }
</style>
EOF

    # Create index.html
    cat > index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Test Svelte App</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
EOF

    # Create vite.config.js
    cat > vite.config.js << 'EOF'
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
});
EOF

    # Create svelte.config.js
    cat > svelte.config.js << 'EOF'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess(),
};
EOF

    print_success "Created Svelte project at $APP_DIR"
    cd - > /dev/null
}

# Check if we're in the c15t monorepo
is_c15t_monorepo() {
    [ -f "$(pwd)/package.json" ] && grep -q '"name": "c15t-workspace"' "$(pwd)/package.json"
}

# Install dependencies in each test app individually
install_deps() {
    print_header "Installing test app dependencies"

    if ! is_c15t_monorepo; then
        print_error "Not in c15t monorepo root. Run this script from the monorepo root."
        exit 1
    fi

    for dir in "$TEST_DIR"/*/; do
        if [ -d "$dir" ] && [ -f "$dir/package.json" ]; then
            local name=$(basename "$dir")
            echo -e "  Installing deps for ${BLUE}$name${NC}..."
            cd "$dir"
            bun install
            cd - > /dev/null
            print_success "$name dependencies installed"
        fi
    done

    print_success "All test app dependencies installed"
}

# Show usage
usage() {
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  create    Create all test apps (default)"
    echo "  clean     Remove all test apps"
    echo "  reset     Clean and recreate all test apps"
    echo "  install   Install dependencies in all test apps"
    echo "  list      List all test apps"
    echo "  help      Show this help message"
    echo ""
    echo "Test apps will be created in: $TEST_DIR"
    echo ""
    echo "After creating, run the CLI in each app:"
    echo "  cd $TEST_DIR/nextjs-app && bun run $CLI_PATH generate"
    echo ""
}

# List test apps
list_apps() {
    print_header "Test Apps"

    if [ ! -d "$TEST_DIR" ]; then
        print_warning "No test apps found. Run '$0 create' first."
        return
    fi

    for dir in "$TEST_DIR"/*/; do
        if [ -d "$dir" ]; then
            local name=$(basename "$dir")
            local has_deps="no"
            [ -d "$dir/node_modules" ] && has_deps="yes"
            echo -e "  ${GREEN}$name${NC} (deps installed: $has_deps)"
            echo "    cd $dir"
        fi
    done

    echo ""
    echo "To test CLI in an app:"
    echo "  cd <app-dir> && bun run $CLI_PATH generate"
}

# Main script
main() {
    local cmd="${1:-create}"

    case "$cmd" in
        create)
            mkdir -p "$TEST_DIR"
            create_nextjs_app
            create_nextjs_pages
            create_vite_react
            create_svelte
            echo ""
            print_success "All test apps created!"
            echo ""
            echo "Next steps:"
            echo "  1. Run: $0 install"
            echo "  2. Test CLI: cd $TEST_DIR/nextjs-app && bun run $CLI_PATH generate"
            ;;
        clean)
            clean
            ;;
        reset)
            clean
            mkdir -p "$TEST_DIR"
            create_nextjs_app
            create_nextjs_pages
            create_vite_react
            create_svelte
            install_deps
            print_success "All test apps reset and ready!"
            ;;
        install)
            install_deps
            ;;
        list)
            list_apps
            ;;
        help|--help|-h)
            usage
            ;;
        *)
            print_error "Unknown command: $cmd"
            usage
            exit 1
            ;;
    esac
}

main "$@"
