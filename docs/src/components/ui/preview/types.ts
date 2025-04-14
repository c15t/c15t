import type { ComponentProps } from 'react';
import type { SandboxProvider } from './sandbox';

/**
 * Sandbox template types
 */
export type SandboxTemplate =
  | 'static'
  | 'react'
  | 'react-ts'
  | 'vanilla'
  | 'vanilla-ts'
  | 'vue'
  | 'vue-ts'
  | 'angular'
  | 'nextjs'
  | 'vite'
  | 'vite-react'
  | 'vite-react-ts';

/**
 * Props for the Preview component
 */
export type PreviewProps = {
  /** Name/identifier for the preview */
  name: string;
  /** Code content, either as a string or map of files */
  code: string | Record<string, string>;
  /** Optional extra dependencies to include */
  dependencies?: Record<string, string>;
  /** Default file to show in the editor */
  defaultFile?: string;
  /** Active file to highlight in the editor */
  activeFile?: string;
  /** Template type (react-ts, etc.) */
  template?: SandboxTemplate;
  /** Whether to auto-run the code */
  autorun?: boolean;
  /** Default tab to show (code, preview, console) */
  defaultTab?: 'code' | 'preview' | 'console';
  /** Enable debug mode to show additional information */
  debug?: boolean;
  /** Custom height for the preview container */
  height?: string | number;
};

/**
 * Type for files in sandbox
 */
export type SandboxFiles = ComponentProps<typeof SandboxProvider>['files'];
