import path from 'node:path';
import fs from 'fs-extra';
import type { CliContext, PackageInfo } from './types';

/**
 * Creates file system utilities for the CLI context
 */
export function createFileSystem(context: CliContext) {
  const { logger, cwd } = context;

  return {
    /**
     * Reads and returns the content of the package.json in the current directory
     */
    getPackageInfo: (): PackageInfo => {
      logger.debug('Reading package.json');
      const packageJsonPath = path.join(cwd, 'package.json');
      logger.debug(`package.json path: ${packageJsonPath}`);
      
      try {
        const packageInfo = fs.readJSONSync(packageJsonPath);
        logger.debug('Successfully read package.json');
        
        return {
          name: packageInfo?.name || 'unknown',
          version: packageInfo?.version || 'unknown',
          ...packageInfo,
        };
      } catch (error) {
        logger.error(`Error reading package.json at ${packageJsonPath}:`, error);
        // Return a default package info object if the file couldn't be read
        return {
          name: 'unknown',
          version: 'unknown',
        };
      }
    }
  };
} 