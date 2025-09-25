#!/usr/bin/env node

/**
 * Console to Logger Migration Script
 * 
 * This script systematically replaces all console.* statements with logger calls
 * across the entire codebase while preserving functionality and context.
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const CONSOLE_METHODS = ['log', 'warn', 'error', 'info', 'debug'];
const LOGGER_MAPPING = {
  'console.log': 'logger.info',
  'console.warn': 'logger.warn', 
  'console.error': 'logger.error',
  'console.info': 'logger.info',
  'console.debug': 'logger.debug'
};

function getComponentName(filePath) {
  const fileName = path.basename(filePath, path.extname(filePath));
  return fileName;
}

function hasLoggerImport(content) {
  return content.includes("import { logger } from '@/lib/logger'") ||
         content.includes('from "@/lib/logger"');
}

function addLoggerImport(content, filePath) {
  if (hasLoggerImport(content)) return content;
  
  const lines = content.split('\n');
  let insertIndex = 0;
  
  // Find the last import statement
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('import ')) {
      insertIndex = i + 1;
    } else if (lines[i].trim() === '' && insertIndex > 0) {
      break;
    }
  }
  
  const importStatement = "import { logger } from '@/lib/logger';";
  lines.splice(insertIndex, 0, importStatement);
  
  return lines.join('\n');
}

function replaceConsoleStatements(content, componentName) {
  const consoleRegex = /console\.(log|warn|error|info|debug)\s*\(\s*(.*?)\s*\);?/g;
  
  return content.replace(consoleRegex, (match, method, args) => {
    const loggerMethod = LOGGER_MAPPING[`console.${method}`];
    
    // Parse arguments to separate message from data
    const trimmedArgs = args.trim();
    
    // Handle different argument patterns
    if (trimmedArgs.includes(',')) {
      // Multiple arguments - first is message, rest is data
      const argParts = trimmedArgs.split(',');
      const message = argParts[0].trim();
      const dataArgs = argParts.slice(1).join(',').trim();
      
      if (dataArgs) {
        return `${loggerMethod}(${message}, ${dataArgs}, '${componentName}');`;
      } else {
        return `${loggerMethod}(${message}, undefined, '${componentName}');`;
      }
    } else {
      // Single argument
      return `${loggerMethod}(${trimmedArgs}, undefined, '${componentName}');`;
    }
  });
}

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const componentName = getComponentName(filePath);
    
    // Skip if no console statements
    if (!CONSOLE_METHODS.some(method => content.includes(`console.${method}`))) {
      return { processed: false, reason: 'No console statements found' };
    }
    
    let updatedContent = content;
    
    // Add logger import if needed
    updatedContent = addLoggerImport(updatedContent, filePath);
    
    // Replace console statements
    updatedContent = replaceConsoleStatements(updatedContent, componentName);
    
    // Write back to file
    fs.writeFileSync(filePath, updatedContent, 'utf8');
    
    return { processed: true, componentName };
    
  } catch (error) {
    return { processed: false, error: error.message };
  }
}

function main() {
  console.log('🔍 Starting console to logger migration...\n');
  
  // Find all TypeScript/JavaScript files in src
  const files = glob.sync('src/**/*.{ts,tsx,js,jsx}', {
    ignore: [
      'src/**/*.test.*',
      'src/**/*.spec.*',
      'src/lib/logger.ts' // Skip the logger file itself
    ]
  });
  
  let processedCount = 0;
  let errorCount = 0;
  const results = [];
  
  files.forEach(filePath => {
    const result = processFile(filePath);
    results.push({ filePath, ...result });
    
    if (result.processed) {
      processedCount++;
      console.log(`✅ ${filePath} - ${result.componentName}`);
    } else if (result.error) {
      errorCount++;
      console.log(`❌ ${filePath} - ${result.error}`);
    }
  });
  
  console.log(`\n📊 Migration Summary:`);
  console.log(`   Files processed: ${processedCount}`);
  console.log(`   Files with errors: ${errorCount}`);
  console.log(`   Total files scanned: ${files.length}`);
  
  if (errorCount > 0) {
    console.log(`\n❌ Files with errors:`);
    results.filter(r => r.error).forEach(r => {
      console.log(`   ${r.filePath}: ${r.error}`);
    });
  }
  
  console.log('\n🎉 Console to logger migration completed!');
  console.log('\n📋 Next steps:');
  console.log('   1. Run ESLint to check for remaining issues: npm run lint');
  console.log('   2. Run ESLint --fix to auto-fix issues: npm run lint -- --fix');
  console.log('   3. Test the application to ensure everything works');
}

if (require.main === module) {
  main();
}

module.exports = { processFile, replaceConsoleStatements, addLoggerImport };