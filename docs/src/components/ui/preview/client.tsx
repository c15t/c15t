'use client';

import {
  AlertTriangleIcon,
  AppWindowIcon,
  CodeIcon,
  MoonIcon,
  SunIcon,
  TerminalIcon,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import {
  Component,
  type ComponentProps,
  type ErrorInfo,
  type ReactNode,
  useEffect,
  useState,
} from 'react';
import { cn } from '~/lib/cn';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '../resizable';
import {
  SandboxCodeEditor,
  SandboxConsole,
  SandboxFileExplorer,
  SandboxLayout,
  SandboxPreview,
  SandboxProvider,
  SandboxTabs,
  SandboxTabsContent,
  SandboxTabsList,
  SandboxTabsTrigger,
} from './sandbox';
import type { PreviewProps, SandboxTemplate } from './types';

/**
 * Error boundary component to catch sandbox errors
 */
export class ErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // You can log the error to an error reporting service
    // biome-ignore lint/suspicious/noConsole: debug error
    console.error('ErrorBoundary caught an error', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex flex-col items-center justify-center p-4 text-fd-muted-foreground">
          <AlertTriangleIcon className="mb-4 h-10 w-10 text-amber-500" />
          <h3 className="mb-2 font-medium text-xl">Something went wrong</h3>
          <p className="mb-4 max-w-md text-center">
            An error occurred while rendering the sandbox preview.
          </p>
          <pre className="mx-auto max-w-md overflow-x-auto rounded bg-fd-card p-4 text-sm">
            {this.state.error?.message || 'Unknown error'}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Props for the PreviewProvider component
 */
type PreviewProviderProps = Omit<
  ComponentProps<typeof SandboxProvider>,
  'theme'
> & {
  onBundlerError?: () => void;
  onError?: () => void;
  height?: string | number;
  theme?: 'light' | 'dark';
};

/**
 * Provider component for the preview
 */
export const PreviewProvider = ({
  options,
  height,
  theme,
  ...props
}: PreviewProviderProps) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Use requestAnimationFrame for smoother loading
    const animationId = requestAnimationFrame(() => {
      setIsMounted(true);
    });

    return () => cancelAnimationFrame(animationId);
  }, []);

  if (!isMounted) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#f5f5f5] dark:bg-[#151616]">
        <div className="h-8 w-8 animate-pulse rounded-full bg-fd-muted-foreground/20" />
      </div>
    );
  }

  return (
    <SandboxProvider
      theme={theme}
      height={height}
      {...props}
      options={{
        ...options,
        externalResources: [...(options?.externalResources || [])],
        initMode: 'lazy', // Use lazy to prevent immediate timeout
        recompileMode: 'delayed',
        recompileDelay: 300, // Small delay for better stability
      }}
    />
  );
};

/**
 * Code editor tab content with file explorer and code editor panels
 */
const CodeEditorTab = () => (
  <div className="h-full flex-1 overflow-hidden rounded-b-lg bg-white dark:bg-[#151616]">
    <ResizablePanelGroup
      direction="horizontal"
      className="h-full overflow-hidden"
    >
      <ResizablePanel
        className="!overflow-y-auto h-full bg-[var(--sp-colors-surface1)]"
        defaultSize={25}
        minSize={20}
        maxSize={40}
      >
        <SandboxFileExplorer className="h-full" />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel className="!overflow-y-auto h-full bg-[var(--sp-colors-surface1)]">
        <SandboxCodeEditor style={{ height: '100%' }} />
      </ResizablePanel>
    </ResizablePanelGroup>
  </div>
);

/**
 * Preview tab content showing the rendered application
 */
const PreviewTab = ({ height }: { height?: string | number }) => (
  <div className="flex h-full w-full flex-1 flex-col overflow-hidden rounded-b-lg bg-white dark:bg-[#151616]">
    <SandboxPreview
      showNavigator={false}
      className="!h-full"
      height={height}
      style={{
        width: '100%',
        height: '100%',
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'column',
      }}
    />
  </div>
);

/**
 * Console tab content showing console output
 */
const ConsoleTab = () => (
  <div className="h-full flex-1 overflow-hidden rounded-b-lg bg-white dark:bg-[#151616]">
    <SandboxConsole className="h-full" />
  </div>
);

/**
 * Theme toggle button component
 */
const ThemeToggle = ({
  sandboxTheme,
  onThemeChange,
}: {
  sandboxTheme: 'light' | 'dark';
  onThemeChange: (theme: 'light' | 'dark') => void;
}) => {
  const { resolvedTheme } = useTheme();
  const [isMounted, setIsMounted] = useState(false);
  const [localTheme, setLocalTheme] = useState<'light' | 'dark' | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);
  useEffect(() => {
    if (!localTheme && resolvedTheme) {
      onThemeChange(resolvedTheme as 'light' | 'dark');
    }
  }, [resolvedTheme, localTheme, onThemeChange]);

  if (!isMounted) {
    return null;
  }

  // Use sandboxTheme if provided, otherwise fall back to localTheme/resolvedTheme
  const currentTheme =
    sandboxTheme || localTheme || (resolvedTheme as 'light' | 'dark');

  const handleThemeChange = () => {
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setLocalTheme(newTheme);
    onThemeChange(newTheme);
  };

  return (
    <button
      type="button"
      onClick={handleThemeChange}
      className="ml-auto inline-flex items-center justify-center rounded-md p-1.5 text-fd-muted-foreground transition-colors hover:text-fd-foreground"
      title={
        currentTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
      }
    >
      {currentTheme === 'dark' ? <SunIcon size={14} /> : <MoonIcon size={14} />}
    </button>
  );
};

/**
 * Complete tabs container for the sandbox with code, preview, and console tabs
 */
export const SandboxTabsContainer = ({
  defaultTab,
  height,
  sandboxTheme,
  onSandboxThemeChange,
}: {
  defaultTab: 'code' | 'preview' | 'console';
  height?: string | number;
  sandboxTheme: 'light' | 'dark';
  onSandboxThemeChange: (theme: 'light' | 'dark') => void;
}) => (
  <SandboxTabs
    defaultValue={defaultTab}
    className="flex h-full flex-col"
    style={{ height: '100%' }}
  >
    <SandboxTabsList>
      <SandboxTabsTrigger value="code">
        <CodeIcon size={14} />
        Code
      </SandboxTabsTrigger>
      <SandboxTabsTrigger value="preview">
        <AppWindowIcon size={14} />
        Preview
      </SandboxTabsTrigger>
      <SandboxTabsTrigger value="console">
        <TerminalIcon size={14} />
        Console
      </SandboxTabsTrigger>
      <ThemeToggle
        sandboxTheme={sandboxTheme}
        onThemeChange={onSandboxThemeChange}
      />
    </SandboxTabsList>
    <SandboxTabsContent value="code" className="h-full flex-1 overflow-hidden">
      <CodeEditorTab />
    </SandboxTabsContent>
    <SandboxTabsContent
      value="preview"
      className="h-full flex-1"
      height={height}
    >
      <PreviewTab height={height} />
    </SandboxTabsContent>
    <SandboxTabsContent value="console" className="h-full flex-1">
      <ConsoleTab />
    </SandboxTabsContent>
  </SandboxTabs>
);

/**
 * Interactive Preview Client Component
 */
export const PreviewClient = ({
  defaultFile = '/App.tsx',
  activeFile,
  template = 'react-ts',
  autorun = true,
  defaultTab = 'preview',
  debug = false,
  files,
  dependencies,
  externalResources,
  height,
}: Omit<PreviewProps, 'code' | 'dependencies'> & {
  files: ComponentProps<typeof SandboxProvider>['files'];
  dependencies: Record<string, string>;
  externalResources: string[];
  height?: string | number; // Allow custom height value
}) => {
  // Empty dev dependencies
  const devDependencies = {};

  // Sandbox state for debugging
  const [sandboxStatus, setSandboxStatus] = useState('initializing');

  // Show loading indicator immediately
  const [loading, setLoading] = useState(true);

  // Add state for sandbox theme (independent from page theme)
  const [sandboxTheme, setSandboxTheme] = useState<'light' | 'dark'>('light');

  // Hide loading indicator after component loads
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setLoading(false);
    }, 200);

    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <div
      className={cn(
        'not-prose relative overflow-hidden rounded-lg border border-neutral-100 bg-gradient-to-b from-fd-card/80 to-fd-card shadow-[0_0_1px_1px_rgba(0,0,0,0.1)] dark:border-neutral-800',
        'flex h-full flex-col'
      )}
      style={{ height: height || '500px' }}
    >
      {debug && (
        <div className="absolute top-2 right-2 z-10 rounded bg-fd-card px-2 py-1 text-fd-muted-foreground text-xs">
          Status: {sandboxStatus}
        </div>
      )}

      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white dark:bg-[#151616]">
          <div className="h-8 w-8 animate-pulse rounded-full bg-fd-muted-foreground/20" />
        </div>
      )}

      <ErrorBoundary>
        <PreviewProvider
          template={template as SandboxTemplate}
          theme={sandboxTheme}
          options={{
            externalResources,
            initMode: 'lazy',
            recompileMode: 'delayed',
            recompileDelay: 300,
            activeFile: activeFile || defaultFile,
            autorun,
          }}
          customSetup={{
            dependencies,
            devDependencies,
          }}
          files={files}
          className="not-prose flex h-full flex-col"
          onLoad={() => {
            setSandboxStatus('loaded');
            setLoading(false); // Hide loading indicator on load
          }}
          onBundlerError={() => {
            setSandboxStatus('error:bundler');
            setLoading(false);
          }}
          onError={() => {
            setSandboxStatus('error:runtime');
            setLoading(false);
          }}
          height={height}
        >
          <SandboxLayout
            className="flex h-full flex-col"
            style={{ height: '100%' }}
          >
            <SandboxTabsContainer
              defaultTab={defaultTab}
              height={height}
              sandboxTheme={sandboxTheme}
              onSandboxThemeChange={setSandboxTheme}
            />
          </SandboxLayout>
        </PreviewProvider>
      </ErrorBoundary>
    </div>
  );
};
