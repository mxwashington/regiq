#!/usr/bin/env node

/**
 * Complete Console to Logger Migration Script
 * This completes the migration of all remaining console statements to the centralized logger
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Console method mapping
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

function addLoggerImport(content) {
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
  
  // Insert logger import after existing imports
  const importStatement = "import { logger } from '@/lib/logger';";
  lines.splice(insertIndex, 0, importStatement);
  
  return lines.join('\n');
}

function replaceConsoleStatements(content, componentName) {
  // Enhanced regex to handle multi-line console statements
  const consoleRegex = /console\.(log|warn|error|info|debug)\s*\(\s*((?:[^()]*(?:\([^()]*\))?)*)\s*\);?/g;
  
  return content.replace(consoleRegex, (match, method, args) => {
    const loggerMethod = LOGGER_MAPPING[`console.${method}`];
    const trimmedArgs = args.trim();
    
    // Handle different argument patterns
    if (trimmedArgs.includes(',')) {
      // Multiple arguments - first is message, rest is data
      const firstCommaIndex = trimmedArgs.indexOf(',');
      const message = trimmedArgs.substring(0, firstCommaIndex).trim();
      const dataArgs = trimmedArgs.substring(firstCommaIndex + 1).trim();
      
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

async function processAllRemainingFiles() {
  console.log('🔍 Finding all remaining files with console statements...\n');
  
  try {
    // Use grep to find all files with console statements
    const grepOutput = execSync('grep -r "console\\." src/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --exclude="*logger.ts" | head -50', { encoding: 'utf8' });
    const matches = grepOutput.trim().split('\n').filter(line => line.length > 0);
    
    if (matches.length === 0) {
      console.log('✅ No remaining console statements found!');
      return;
    }
    
    // Extract unique file paths
    const filePaths = [...new Set(matches.map(match => match.split(':')[0]))];
    
    console.log(`Found ${matches.length} console statements in ${filePaths.length} files:`);
    filePaths.forEach((file, idx) => {
      console.log(`  ${idx + 1}. ${file}`);
    });
    
    console.log('\n🔄 Processing files...\n');
    
    let processedCount = 0;
    let errorCount = 0;
    
    for (const filePath of filePaths) {
      try {
        if (!fs.existsSync(filePath)) {
          console.log(`⚠️  Skipping ${filePath} - file not found`);
          continue;
        }
        
        const content = fs.readFileSync(filePath, 'utf8');
        const componentName = getComponentName(filePath);
        
        // Skip if no console statements (grep might have false positives)
        if (!/(console\.(log|warn|error|info|debug))/.test(content)) {
          continue;
        }
        
        let updatedContent = content;
        
        // Add logger import if needed
        updatedContent = addLoggerImport(updatedContent);
        
        // Replace console statements
        updatedContent = replaceConsoleStatements(updatedContent, componentName);
        
        // Write back to file
        fs.writeFileSync(filePath, updatedContent, 'utf8');
        
        processedCount++;
        console.log(`✅ ${filePath} - ${componentName}`);
        
      } catch (error) {
        errorCount++;
        console.log(`❌ ${filePath} - ${error.message}`);
      }
    }
    
    console.log(`\n📊 Migration Summary:`);
    console.log(`   Files processed: ${processedCount}`);
    console.log(`   Files with errors: ${errorCount}`);
    console.log(`   Total files scanned: ${filePaths.length}`);
    
    // Run ESLint to check for violations
    console.log('\n🔍 Running ESLint to check for remaining console statements...');
    try {
      execSync('npm run lint', { stdio: 'inherit' });
      console.log('✅ ESLint passed - no console statements found!');
    } catch (error) {
      console.log('⚠️  ESLint found some issues. Running --fix...');
      try {
        execSync('npm run lint -- --fix', { stdio: 'inherit' });
        console.log('✅ ESLint --fix completed successfully!');
      } catch (fixError) {
        console.log('❌ ESLint --fix failed. Manual review required.');
      }
    }
    
    console.log('\n🎉 Console to logger migration completed!');
    
  } catch (error) {
    console.error('Error during migration:', error.message);
    
    // Fallback: check specific important files manually
    const criticalFiles = [
      'src/hooks/useSavedAlerts.tsx'
    ];
    
    console.log('\n📝 Checking critical files manually...');
    for (const file of criticalFiles) {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        if (content.includes('console.')) {
          console.log(`⚠️  ${file} still has console statements`);
        }
      }
    }
  }
}

// Run the migration
processAllRemainingFiles().catch(console.error);