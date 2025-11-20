#!/usr/bin/env node

/**
 * Script d'analyse de l'exhaustivité des tests visuels
 * Précondition 2.5 : Vérification de l'exhaustivité des tests visuels
 */

const fs = require('fs');
const path = require('path');

const WEB_TESTS_DIR = path.join(__dirname, '../tests/web');
const MOBILE_TESTS_DIR = path.join(__dirname, '../apps/mobile/e2e');

// Espace d'état théorique à couvrir
const REQUIRED_STATES = {
  layouts: ['fan', 'ring', 'stack', 'line', 'default'],
  deckSizes: [5, 10, 16, 24, 32, 48, 64],
  animations: ['shuffle', 'flip', 'sequence', 'draw'],
  transitions: [
    'fan→ring',
    'ring→stack',
    'stack→fan',
    'fan→stack',
    'ring→fan',
    'stack→ring',
    'fan→shuffle',
    'ring→shuffle',
    'stack→shuffle'
  ],
  interactiveStates: ['card-selected', 'card-press', 'pointer-drag'],
  mobileOrientations: ['portrait', 'landscape']
};

// Tests requis
const REQUIRED_TESTS = [
  'fan.spec.ts',
  'ring.spec.ts',
  'stack.spec.ts',
  'shuffle.spec.ts',
  'flip.spec.ts',
  'deck-sizes.spec.ts',
  'transitions.spec.ts'
];

function findTestFiles(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }
  const files = fs.readdirSync(dir);
  return files
    .filter(file => file.endsWith('.spec.ts') || file.endsWith('.test.ts') || file.endsWith('.test.js'))
    .map(file => path.join(dir, file));
}

function analyzeTestFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const filename = path.basename(filePath);
  
  const analysis = {
    filename,
    path: filePath,
    hasScreenshot: content.includes('toHaveScreenshot') || content.includes('takeScreenshot'),
    layouts: [],
    deckSizes: [],
    animations: [],
    transitions: [],
    interactiveStates: [],
    isDeterministic: !content.includes('Math.random') && !content.includes('Date.now'),
    hasWaitForAnimations: content.includes('waitForTimeout') || content.includes('waitFor'),
    lines: content.split('\n').length
  };

  // Détecter les layouts
  if (content.includes('fan') || content.includes('Fan')) {
    analysis.layouts.push('fan');
  }
  if (content.includes('ring') || content.includes('Ring')) {
    analysis.layouts.push('ring');
  }
  if (content.includes('stack') || content.includes('Stack')) {
    analysis.layouts.push('stack');
  }
  if (content.includes('line') || content.includes('Line')) {
    analysis.layouts.push('line');
  }

  // Détecter les animations
  if (content.includes('shuffle') || content.includes('Shuffle')) {
    analysis.animations.push('shuffle');
  }
  if (content.includes('flip') || content.includes('Flip')) {
    analysis.animations.push('flip');
  }
  if (content.includes('sequence') || content.includes('Sequence')) {
    analysis.animations.push('sequence');
  }
  if (content.includes('draw') || content.includes('Draw')) {
    analysis.animations.push('draw');
  }

  // Détecter les tailles de deck
  const deckSizeMatches = content.match(/deckSize[:\s]*(\d+)|deck.*size[:\s]*(\d+)/gi);
  if (deckSizeMatches) {
    deckSizeMatches.forEach(match => {
      const size = parseInt(match.match(/\d+/)?.[0] || '0');
      if (size > 0 && REQUIRED_STATES.deckSizes.includes(size)) {
        analysis.deckSizes.push(size);
      }
    });
  }

  return analysis;
}

function generateReport() {
  const webTests = findTestFiles(WEB_TESTS_DIR);
  const mobileTests = findTestFiles(MOBILE_TESTS_DIR);

  console.log('📊 Analyse des tests visuels existants\n');
  console.log(`Web: ${webTests.length} fichier(s) trouvé(s)`);
  console.log(`Mobile: ${mobileTests.length} fichier(s) trouvé(s)\n`);

  const webAnalyses = webTests.map(analyzeTestFile);
  const mobileAnalyses = mobileTests.map(analyzeTestFile);

  console.log('=== Tests Web ===');
  webAnalyses.forEach(analysis => {
    console.log(`\n📄 ${analysis.filename}`);
    console.log(`   - Screenshot: ${analysis.hasScreenshot ? '✅' : '❌'}`);
    console.log(`   - Déterministe: ${analysis.isDeterministic ? '✅' : '❌'}`);
    console.log(`   - Attente animations: ${analysis.hasWaitForAnimations ? '✅' : '❌'}`);
    console.log(`   - Layouts: ${analysis.layouts.length > 0 ? analysis.layouts.join(', ') : 'aucun'}`);
    console.log(`   - Animations: ${analysis.animations.length > 0 ? analysis.animations.join(', ') : 'aucun'}`);
    console.log(`   - Tailles deck: ${analysis.deckSizes.length > 0 ? analysis.deckSizes.join(', ') : 'aucun'}`);
  });

  console.log('\n=== Tests Mobile ===');
  mobileAnalyses.forEach(analysis => {
    console.log(`\n📄 ${analysis.filename}`);
    console.log(`   - Screenshot: ${analysis.hasScreenshot ? '✅' : '❌'}`);
    console.log(`   - Déterministe: ${analysis.isDeterministic ? '✅' : '❌'}`);
    console.log(`   - Attente animations: ${analysis.hasWaitForAnimations ? '✅' : '❌'}`);
    console.log(`   - Layouts: ${analysis.layouts.length > 0 ? analysis.layouts.join(', ') : 'aucun'}`);
    console.log(`   - Animations: ${analysis.animations.length > 0 ? analysis.animations.join(', ') : 'aucun'}`);
  });

  // Identifier les tests manquants
  const existingWebTests = webAnalyses.map(a => a.filename);
  const missingTests = REQUIRED_TESTS.filter(test => !existingWebTests.includes(test));

  console.log('\n=== Tests Requis vs Existants ===');
  console.log('\n✅ Tests existants:');
  existingWebTests.forEach(test => console.log(`   - ${test}`));

  console.log('\n❌ Tests manquants:');
  missingTests.forEach(test => console.log(`   - ${test}`));

  // Analyse de couverture
  const coveredLayouts = new Set();
  const coveredAnimations = new Set();
  const coveredDeckSizes = new Set();

  [...webAnalyses, ...mobileAnalyses].forEach(analysis => {
    analysis.layouts.forEach(l => coveredLayouts.add(l));
    analysis.animations.forEach(a => coveredAnimations.add(a));
    analysis.deckSizes.forEach(s => coveredDeckSizes.add(s));
  });

  console.log('\n=== Couverture ===');
  console.log(`\nLayouts couverts: ${Array.from(coveredLayouts).join(', ') || 'aucun'}`);
  console.log(`Layouts requis: ${REQUIRED_STATES.layouts.join(', ')}`);
  console.log(`Layouts manquants: ${REQUIRED_STATES.layouts.filter(l => !coveredLayouts.has(l)).join(', ') || 'aucun'}`);

  console.log(`\nAnimations couvertes: ${Array.from(coveredAnimations).join(', ') || 'aucun'}`);
  console.log(`Animations requises: ${REQUIRED_STATES.animations.join(', ')}`);
  console.log(`Animations manquantes: ${REQUIRED_STATES.animations.filter(a => !coveredAnimations.has(a)).join(', ') || 'aucun'}`);

  console.log(`\nTailles deck couvertes: ${Array.from(coveredDeckSizes).join(', ') || 'aucun'}`);
  console.log(`Tailles deck requises: ${REQUIRED_STATES.deckSizes.join(', ')}`);
  console.log(`Tailles deck manquantes: ${REQUIRED_STATES.deckSizes.filter(s => !coveredDeckSizes.has(s)).join(', ') || 'aucun'}`);

  return {
    webTests: webAnalyses,
    mobileTests: mobileAnalyses,
    missingTests,
    coverage: {
      layouts: Array.from(coveredLayouts),
      animations: Array.from(coveredAnimations),
      deckSizes: Array.from(coveredDeckSizes)
    }
  };
}

if (require.main === module) {
  const report = generateReport();
  
  // Sauvegarder le rapport
  const reportPath = path.join(__dirname, '../tests/visual-test-analysis.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n✅ Rapport sauvegardé dans: ${reportPath}`);
}

module.exports = { generateReport, REQUIRED_TESTS, REQUIRED_STATES };

