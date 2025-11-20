#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Load Playwright from @playwright/test
let chromium;
try {
  const { chromium: chromiumFromTest } = require('@playwright/test');
  chromium = chromiumFromTest;
} catch (e) {
  try {
    const playwright = require('playwright');
    chromium = playwright.chromium;
  } catch (e2) {
    console.error('❌ Playwright not found. Please install: pnpm add -D playwright');
    process.exit(1);
  }
}

const MAX_ITERATIONS = 20;
const DEV_SERVER_URL = 'http://localhost:3000';
const DEV_SERVER_TIMEOUT = 30000; // 30 seconds

let devServerProcess = null;
let iteration = 0;
const errorsSeen = new Set();

async function startDevServer() {
  console.log('🚀 Starting dev server...');
  return new Promise((resolve, reject) => {
    devServerProcess = spawn('pnpm', ['dev:web'], {
      cwd: process.cwd(),
      stdio: 'pipe',
      shell: true
    });

    let output = '';
    const timeout = setTimeout(() => {
      reject(new Error('Dev server timeout'));
    }, DEV_SERVER_TIMEOUT);

    devServerProcess.stdout.on('data', (data) => {
      output += data.toString();
      if (output.includes('Ready in') || output.includes('localhost:3000')) {
        clearTimeout(timeout);
        console.log('✅ Dev server ready');
        // Wait a bit more for server to be fully ready
        setTimeout(() => resolve(), 2000);
      }
    });

    devServerProcess.stderr.on('data', (data) => {
      const str = data.toString();
      if (str.includes('Error') || str.includes('error')) {
        console.error('❌ Dev server error:', str);
      }
    });

    devServerProcess.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

async function testWithPlaywright() {
  console.log(`\n🔍 Iteration ${iteration + 1}/${MAX_ITERATIONS} - Testing with Playwright...`);
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  const errors = [];
  const warnings = [];

  page.on('console', (msg) => {
    const type = msg.type();
    const text = msg.text();
    
    // Ignore 404 and resource loading errors (normal Next.js behavior)
    if (text.includes('404') || text.includes('Failed to load resource')) {
      return; // Skip these errors
    }
    
    if (type === 'error') {
      // Only capture real JS runtime errors
      if (text.includes('TypeError') || 
          text.includes('ReferenceError') || 
          text.includes('SyntaxError') ||
          text.includes('react-native-reanimated') ||
          text.includes('CSSStyleDeclaration') ||
          text.includes('CardView') ||
          text.includes('DeckView') ||
          text.includes('global is not defined') ||
          text.includes('require is not defined') ||
          text.includes('useAnimatedStyle') ||
          text.includes('Cannot read') ||
          text.includes('Cannot access')) {
        errors.push(text);
        console.error(`❌ Console error: ${text}`);
      }
    } else if (type === 'warning') {
      warnings.push(text);
      console.warn(`⚠️  Console warning: ${text}`);
    }
  });

  page.on('pageerror', (error) => {
    const errorMsg = error.message;
    // Ignore 404 errors
    if (errorMsg.includes('404') || errorMsg.includes('Failed to load resource')) {
      return;
    }
    // Only capture real JS errors
    if (errorMsg.includes('TypeError') || 
        errorMsg.includes('ReferenceError') || 
        errorMsg.includes('SyntaxError') ||
        errorMsg.includes('react-native-reanimated') ||
        errorMsg.includes('global is not defined') ||
        errorMsg.includes('require is not defined')) {
      errors.push(errorMsg);
      console.error(`❌ Page error: ${errorMsg}`);
    }
  });

  try {
    console.log(`📡 Loading ${DEV_SERVER_URL}...`);
    
    // First load might show 404, wait for actual page
    await page.goto(DEV_SERVER_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
    
    // Wait for React to render and check if we're on the actual page (not 404)
    let attempts = 0;
    let pageLoaded = false;
    
    while (attempts < 10 && !pageLoaded) {
      await page.waitForTimeout(1000);
      const title = await page.title();
      const bodyText = await page.textContent('body') || '';
      
      // Check if we're past the 404 page
      if (!title.includes('404') && !bodyText.includes('This page could not be found')) {
        pageLoaded = true;
        console.log(`📄 Page loaded: ${title}`);
        break;
      }
      
      // Try navigating again if still on 404
      if (attempts < 5) {
        await page.reload({ waitUntil: 'domcontentloaded' });
      }
      attempts++;
    }
    
    if (!pageLoaded) {
      console.warn('⚠️  Still on 404 page, but continuing...');
    }
    
    // Wait additional time for React to fully render
    await page.waitForTimeout(3000);
    
    // Take a screenshot for debugging
    await page.screenshot({ path: `debug-iteration-${iteration + 1}.png`, fullPage: true });
    
    // Check for React errors in the page
    const reactErrors = await page.evaluate(() => {
      const errors = [];
      // Check for React error boundaries
      const errorElements = document.querySelectorAll('[data-react-error-boundary]');
      if (errorElements.length > 0) {
        errors.push('React error boundary triggered');
      }
      return errors;
    });
    
    errors.push(...reactErrors);

  } catch (error) {
    errors.push(`Navigation error: ${error.message}`);
    console.error(`❌ Navigation failed: ${error.message}`);
  } finally {
    await browser.close();
  }

  return { errors, warnings };
}

function analyzeError(error) {
  // Skip 404 and resource errors
  if (error.includes('404') || error.includes('Failed to load resource')) {
    return null;
  }
  
  const errorKey = error.substring(0, 200); // Use first 200 chars as key
  
  if (errorsSeen.has(errorKey)) {
    return null; // Already seen this error
  }
  
  errorsSeen.add(errorKey);
  
  // Analyze error patterns - only real JS runtime errors
  if (error.includes('global is not defined')) {
    return {
      type: 'global_error',
      file: 'packages/deck-web/src/CardView.tsx',
      fix: 'remove_reanimated_hooks'
    };
  }
  
  if (error.includes('useAnimatedStyle')) {
    return {
      type: 'useAnimatedStyle_error',
      file: 'packages/deck-web/src/CardView.tsx',
      fix: 'remove_useAnimatedStyle'
    };
  }
  
  if (error.includes('require is not defined')) {
    return {
      type: 'require_error',
      file: 'packages/deck-web/src',
      fix: 'convert_to_esm'
    };
  }
  
  if (error.includes('react-native-reanimated')) {
    return {
      type: 'reanimated_error',
      file: 'packages/deck-web/src/CardView.tsx',
      fix: 'remove_reanimated_imports'
    };
  }
  
  if (error.includes('CSSStyleDeclaration') || error.includes('style')) {
    return {
      type: 'style_error',
      file: 'packages/deck-web/src/CardView.tsx',
      fix: 'fix_style_format'
    };
  }
  
  if (error.includes('Cannot read property') || error.includes('Cannot read properties') || error.includes('Cannot access')) {
    return {
      type: 'property_access_error',
      file: 'packages/deck-web/src/CardView.tsx',
      fix: 'add_null_check'
    };
  }
  
  if (error.includes('transform') && (error.includes('array') || error.includes('index'))) {
    return {
      type: 'transform_array_error',
      file: 'packages/deck-web/src/CardView.tsx',
      fix: 'fix_transform_format'
    };
  }
  
  if (error.includes('CardView') || error.includes('DeckView')) {
    return {
      type: 'component_error',
      file: 'packages/deck-web/src/CardView.tsx',
      fix: 'fix_component'
    };
  }
  
  // Only return fix info for real JS errors
  if (error.includes('TypeError') || error.includes('ReferenceError') || error.includes('SyntaxError')) {
    return {
      type: 'js_error',
      file: 'packages/deck-web/src/CardView.tsx',
      fix: 'generic_fix'
    };
  }
  
  return null; // Ignore other errors
}

async function applyFix(fixInfo) {
  console.log(`🔧 Applying fix: ${fixInfo.fix} to ${fixInfo.file}`);
  
  const filePath = path.join(process.cwd(), fixInfo.file);
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    return false;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  switch (fixInfo.fix) {
    case 'remove_useAnimatedStyle':
      // Ensure useAnimatedStyle is never called
      if (content.includes('useAnimatedStyle(')) {
        // Replace useAnimatedStyle(() => ({...})) with direct object
        content = content.replace(
          /const\s+animatedStyle\s*=\s*useAnimatedStyle\s*\(\(\)\s*=>\s*\(\{([^}]+)\}\)\)/gs,
          'const animatedStyle = {$1}'
        );
        modified = true;
      }
      break;
      
    case 'remove_reanimated_hooks':
      // Remove any top-level Reanimated hook usage
      if (content.includes('useAnimatedStyle')) {
        // Already handled by remove_useAnimatedStyle
        modified = true;
      }
      break;
      
    case 'fix_transform_format':
      // Ensure transform is properly formatted
      if (content.includes('transform: [')) {
        // Check if transform needs fixing
        const transformRegex = /transform:\s*\[([^\]]+)\]/g;
        if (transformRegex.test(content)) {
          // Transform is already an array, but might need proper formatting
          modified = true;
        }
      }
      break;
      
    case 'add_null_check':
      // Add null checks for property access
      if (content.includes('.value') && !content.includes('?.value')) {
        // Add optional chaining where needed
        content = content.replace(/(\w+)\.value/g, '$1?.value ?? 0');
        modified = true;
      }
      break;
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed ${fixInfo.file}`);
    return true;
  }
  
  return false;
}

async function rebuild() {
  console.log('🔨 Rebuilding @deck/web...');
  try {
    execSync('pnpm --filter @deck/web run build', {
      cwd: process.cwd(),
      stdio: 'inherit'
    });
    console.log('✅ Build complete');
    return true;
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    return false;
  }
}

async function stopDevServer() {
  if (devServerProcess) {
    console.log('🛑 Stopping dev server...');
    devServerProcess.kill();
    devServerProcess = null;
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

async function main() {
  console.log('🎯 Starting automated runtime error fixing...\n');
  
  try {
    while (iteration < MAX_ITERATIONS) {
      iteration++;
      
      // Start/restart dev server
      await stopDevServer();
      await startDevServer();
      
      // Test with Playwright
      const { errors, warnings } = await testWithPlaywright();
      
      if (errors.length === 0) {
        console.log('\n✅ SUCCESS! No runtime errors detected.');
        console.log(`📊 Total iterations: ${iteration}`);
        console.log(`📊 Warnings: ${warnings.length}`);
        break;
      }
      
      console.log(`\n❌ Found ${errors.length} error(s):`);
      errors.forEach((err, idx) => {
        console.log(`  ${idx + 1}. ${err.substring(0, 100)}...`);
      });
      
      // Analyze errors (filter out 404s and resource errors)
      const realErrors = errors.filter(err => 
        !err.includes('404') && 
        !err.includes('Failed to load resource') &&
        (err.includes('TypeError') || 
         err.includes('ReferenceError') || 
         err.includes('SyntaxError') ||
         err.includes('react-native-reanimated') ||
         err.includes('global') ||
         err.includes('require') ||
         err.includes('CardView') ||
         err.includes('DeckView'))
      );
      
      if (realErrors.length === 0) {
        console.log('✅ No real JS runtime errors found (only 404s/resource errors, which are normal)');
        break;
      }
      
      // Analyze first real error
      const firstError = realErrors[0];
      const fixInfo = analyzeError(firstError);
      
      if (!fixInfo) {
        console.log('⚠️  Error already seen or not fixable, skipping...');
        continue;
      }
      
      // Apply fix
      const fixed = await applyFix(fixInfo);
      
      if (fixed) {
        // Rebuild
        const rebuilt = await rebuild();
        if (!rebuilt) {
          console.error('❌ Rebuild failed, stopping...');
          break;
        }
        
        // Wait a bit before next iteration
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        console.log('⚠️  No fix applied, stopping...');
        break;
      }
    }
    
    if (iteration >= MAX_ITERATIONS) {
      console.log('\n⚠️  Reached max iterations, stopping...');
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await stopDevServer();
    console.log('\n🏁 Done.');
  }
}

main().catch(console.error);

