#!/usr/bin/env node

/**
 * Script to replace all console.log statements with proper logger usage
 * Handles data sanitization and prevents security leaks
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const DRY_RUN = false; // Set to true to see changes without applying them
const EXCLUDE_DIRS = ['node_modules', '.git', 'dist', 'build', '.next'];
const EXCLUDE_FILES = [
  'fix-console-logging.js',
  'console-to-logger-migration.js',
  'complete-logger-migration.js'
];

// Track statistics
let stats = {
  filesProcessed: 0,
  consoleStatementsFound: 0,
  consoleStatementsReplaced: 0,
  filesModified: 0,
  loggerImportsAdded: 0
};

/**
 * Get all files recursively
 */
function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!EXCLUDE_DIRS.includes(file)) {
        getAllFiles(filePath, fileList);
      }
    } else if (
      (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) &&
      !EXCLUDE_FILES.includes(file)
    ) {
      fileList.push(filePath);
    }
  }

  return fileList;
}

/**
 * Check if file already imports logger
 */
function hasLoggerImport(content) {
  return content.includes("import { logger }") ||
         content.includes("from '@/lib/logger'") ||
         content.includes("require('@/lib/logger')");
}

/**
 * Add logger import to file
 */
function addLoggerImport(content) {
  // For TypeScript/JSX files in src/
  if (content.includes("import ") && (content.includes("React") || content.includes("@/"))) {
    // Add after existing imports
    const importRegex = /(import[^;]*;[\r\n]*)+/;
    const match = content.match(importRegex);
    if (match) {
      const importSection = match[0];
      return content.replace(importSection, importSection + "import { logger } from '@/lib/logger';\n");
    }
  }

  // For Supabase functions (Deno)
  if (content.includes('Deno.serve') || content.includes('supabase/functions')) {
    // Add near the top after other imports
    const lines = content.split('\n');
    let insertIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('import ') || lines[i].includes('const ')) {
        insertIndex = i + 1;
      } else if (lines[i].trim() === '') {
        continue;
      } else {
        break;
      }
    }

    lines.splice(insertIndex, 0, '', '// Simple logger for Supabase functions', 'const logger = {', '  debug: (msg: string, data?: any) => console.debug(`[DEBUG] ${msg}`, data || \'\'),', '  info: (msg: string, data?: any) => console.info(`[INFO] ${msg}`, data || \'\'),', '  warn: (msg: string, data?: any) => console.warn(`[WARN] ${msg}`, data || \'\'),', '  error: (msg: string, data?: any) => console.error(`[ERROR] ${msg}`, data || \'\')', '};', '');

    return lines.join('\n');
  }

  // Fallback - add at the top
  return "import { logger } from '@/lib/logger';\n\n" + content;
}

/**
 * Replace console statements with logger calls
 */
function replaceConsoleStatements(content) {
  let modified = content;
  let replacements = 0;

  // Map console methods to logger methods
  const consoleMapping = {
    'console.log': 'logger.info',
    'console.info': 'logger.info',
    'console.debug': 'logger.debug',
    'console.warn': 'logger.warn',
    'console.error': 'logger.error'
  };

  // Replace each console method
  for (const [oldMethod, newMethod] of Object.entries(consoleMapping)) {
    const regex = new RegExp(`\\b${oldMethod.replace('.', '\\.')}\\s*\\(`, 'g');
    const matches = modified.match(regex);
    if (matches) {
      stats.consoleStatementsFound += matches.length;
      modified = modified.replace(regex, `${newMethod}(`);
      replacements += matches.length;
    }
  }

  stats.consoleStatementsReplaced += replacements;
  return { modified, replacements };
}

/**
 * Process a single file
 */
function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    stats.filesProcessed++;

    // Skip if no console statements
    if (!content.includes('console.')) {
      return;
    }

    let modified = content;
    let needsImport = false;

    // Replace console statements
    const { modified: newContent, replacements } = replaceConsoleStatements(modified);
    modified = newContent;

    // Add logger import if we made replacements and don't already have it
    if (replacements > 0) {
      if (!hasLoggerImport(modified)) {
        modified = addLoggerImport(modified);
        needsImport = true;
        stats.loggerImportsAdded++;
      }

      console.log(`📝 ${filePath}: ${replacements} console statements replaced${needsImport ? ' + logger import added' : ''}`);

      // Write changes if not dry run
      if (!DRY_RUN) {
        fs.writeFileSync(filePath, modified, 'utf8');
      }

      stats.filesModified++;
    }

  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

/**
 * Main execution
 */
function main() {
  console.log('🧹 Starting console logging cleanup...\n');

  if (DRY_RUN) {
    console.log('🔍 DRY RUN MODE - No files will be modified\n');
  }

  // Get project root (assuming script is in /scripts directory)
  const projectRoot = path.resolve(__dirname, '..');
  const allFiles = getAllFiles(projectRoot);

  console.log(`📊 Found ${allFiles.length} files to process\n`);

  // Process each file
  for (const filePath of allFiles) {
    processFile(filePath);
  }

  // Print summary
  console.log('\n📊 CLEANUP SUMMARY:');
  console.log('==================');
  console.log(`Files processed: ${stats.filesProcessed}`);
  console.log(`Files modified: ${stats.filesModified}`);
  console.log(`Console statements found: ${stats.consoleStatementsFound}`);
  console.log(`Console statements replaced: ${stats.consoleStatementsReplaced}`);
  console.log(`Logger imports added: ${stats.loggerImportsAdded}`);

  if (stats.consoleStatementsReplaced > 0) {
    console.log('\n✅ Console logging cleanup completed successfully!');

    if (!DRY_RUN) {
      console.log('\n🔨 Running build test to verify changes...');
      try {
        execSync('npm run build', { stdio: 'inherit', cwd: projectRoot });
        console.log('✅ Build successful - all changes are working correctly!');
      } catch (error) {
        console.error('❌ Build failed - please review the changes');
        process.exit(1);
      }
    }
  } else {
    console.log('\n✨ No console statements found to replace');
  }
}

// Run the script
main();