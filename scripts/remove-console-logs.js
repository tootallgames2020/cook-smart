#!/usr/bin/env node
/**
 * Script to remove console.log, console.warn, console.info, console.debug statements
 * Keeps console.error for critical error logging
 */

const fs = require('fs');
const path = require('path');

const PATTERNS = [
  // Remove entire console.log lines
  /^\s*console\.log\([^)]*\);?\s*$/gm,
  // Remove console.log with multiline arguments
  /console\.log\([^;]*\);?/gs,
  // Remove console.warn
  /^\s*console\.warn\([^)]*\);?\s*$/gm,
  /console\.warn\([^;]*\);?/gs,
  // Remove console.info
  /^\s*console\.info\([^)]*\);?\s*$/gm,
  /console\.info\([^;]*\);?/gs,
  // Remove console.debug
  /^\s*console\.debug\([^)]*\);?\s*$/gm,
  /console\.debug\([^;]*\);?/gs,
];

function removeConsoleLogs(content) {
  let cleaned = content;
  
  // Apply each pattern
  PATTERNS.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });
  
  // Remove multiple consecutive blank lines
  cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n');
  
  return cleaned;
}

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const cleaned = removeConsoleLogs(content);
    
    if (content !== cleaned) {
      fs.writeFileSync(filePath, cleaned, 'utf8');
      console.log(`✓ Cleaned: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`✗ Error processing ${filePath}:`, error.message);
    return false;
  }
}

function processDirectory(dir, extensions = ['.ts', '.tsx', '.js', '.jsx']) {
  let filesProcessed = 0;
  let filesChanged = 0;
  
  function walk(directory) {
    const files = fs.readdirSync(directory);
    
    files.forEach(file => {
      const filePath = path.join(directory, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        // Skip node_modules, dist, build directories
        if (!['node_modules', 'dist', 'build', '.git', 'android', 'ios'].includes(file)) {
          walk(filePath);
        }
      } else if (extensions.some(ext => file.endsWith(ext))) {
        filesProcessed++;
        if (processFile(filePath)) {
          filesChanged++;
        }
      }
    });
  }
  
  walk(dir);
  
  console.log(`\n📊 Summary:`);
  console.log(`   Files processed: ${filesProcessed}`);
  console.log(`   Files changed: ${filesChanged}`);
}

// Get directory from command line or use current directory
const targetDir = process.argv[2] || '.';

console.log(`🧹 Removing console statements from: ${targetDir}\n`);
processDirectory(targetDir);
console.log(`\n✅ Done!`);
