#!/usr/bin/env node

/**
 * Script d'analyse des tests mobiles Detox
 * Précondition 2.6 : Vérification de l'exhaustivité des tests mobiles
 */

const fs = require('fs');
const path = require('path');

const MOBILE_TESTS_DIR = path.join(__dirname, '../apps/mobile/e2e');
const REQUIRED_MOBILE_TESTS = [
  'fan.test.js',
  'ring.test.js',
  'stack.test.js',
  'shuffle.test.js',
  'flip.test.js',
  'deck-sizes.test.js',
  'transitions.test.js'
];

function findTestFiles(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }
  const files = fs.readdirSync(dir);
  return files
    .filter(file => file.endsWith('.test.js') || file.endsWith('.spec.js'))
    .map(file => path.join(dir, file));
}

function analyzeTestFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const filename = path.basename(filePath);
  
  const analysis = {
    filename,
    path: filePath,
    hasScreenshot: content.includes('takeScreenshot'),
    hasWaitFor: content.includes('waitFor') || content.includes('waitFor'),
    isDeterministic: !content.includes('Date.now') && !content.includes('Math.random'),
    hasReload: content.includes('reloadReactNative'),
    layouts: [],
    animations: [],
    deckSizes: [],
    lines: content.split('\n').length
  };

  // Détecter les layouts
  if (content.includes('Fan') || content.includes('fan')) {
    analysis.layouts.push('fan');
  }
  if (content.includes('Ring') || content.includes('ring')) {
    analysis.layouts.push('ring');
  }
  if (content.includes('Stack') || content.includes('stack')) {
    analysis.layouts.push('stack');
  }

  // Détecter les animations
  if (content.includes('shuffle') || content.includes('Shuffle')) {
    analysis.animations.push('shuffle');
  }
  if (content.includes('flip') || content.includes('Flip')) {
    analysis.animations.push('flip');
  }

  // Détecter les tailles de deck
  const deckSizeMatches = content.match(/deck.*size.*(\d+)|size.*(\d+)/gi);
  if (deckSizeMatches) {
    deckSizeMatches.forEach(match => {
      const size = parseInt(match.match(/\d+/)?.[0] || '0');
      if (size > 0) {
        analysis.deckSizes.push(size);
      }
    });
  }

  return analysis;
}

function generateReport() {
  const mobileTests = findTestFiles(MOBILE_TESTS_DIR);
  
  console.log('📱 Analyse des tests mobiles Detox\n');
  console.log(`Tests trouvés: ${mobileTests.length} fichier(s)\n`);

  const analyses = mobileTests.map(analyzeTestFile);

  console.log('=== Tests Mobiles ===');
  analyses.forEach(analysis => {
    console.log(`\n📄 ${analysis.filename}`);
    console.log(`   - Screenshot: ${analysis.hasScreenshot ? '✅' : '❌'}`);
    console.log(`   - Déterministe: ${analysis.isDeterministic ? '✅' : '❌'}`);
    console.log(`   - Reload avant test: ${analysis.hasReload ? '✅' : '❌'}`);
    console.log(`   - WaitFor: ${analysis.hasWaitFor ? '✅' : '❌'}`);
    console.log(`   - Layouts: ${analysis.layouts.length > 0 ? analysis.layouts.join(', ') : 'aucun'}`);
    console.log(`   - Animations: ${analysis.animations.length > 0 ? analysis.animations.join(', ') : 'aucun'}`);
  });

  // Identifier les tests manquants
  const existingTests = analyses.map(a => a.filename);
  const missingTests = REQUIRED_MOBILE_TESTS.filter(test => !existingTests.includes(test));

  console.log('\n=== Tests Requis vs Existants ===');
  console.log('\n✅ Tests existants:');
  existingTests.forEach(test => console.log(`   - ${test}`));

  console.log('\n❌ Tests manquants:');
  if (missingTests.length === 0) {
    console.log('   Aucun');
  } else {
    missingTests.forEach(test => console.log(`   - ${test}`));
  }

  // Analyse de couverture
  const coveredLayouts = new Set();
  const coveredAnimations = new Set();

  analyses.forEach(analysis => {
    analysis.layouts.forEach(l => coveredLayouts.add(l));
    analysis.animations.forEach(a => coveredAnimations.add(a));
  });

  console.log('\n=== Couverture ===');
  console.log(`\nLayouts couverts: ${Array.from(coveredLayouts).join(', ') || 'aucun'}`);
  console.log(`Animations couvertes: ${Array.from(coveredAnimations).join(', ') || 'aucun'}`);

  return {
    mobileTests: analyses,
    missingTests,
    coverage: {
      layouts: Array.from(coveredLayouts),
      animations: Array.from(coveredAnimations)
    }
  };
}

if (require.main === module) {
  const report = generateReport();
  
  // Sauvegarder le rapport
  const reportPath = path.join(__dirname, '../tests/mobile-test-analysis.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n✅ Rapport sauvegardé dans: ${reportPath}`);
}

module.exports = { generateReport, REQUIRED_MOBILE_TESTS };




