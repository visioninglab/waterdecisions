#!/usr/bin/env node
/**
 * Validate referential integrity across Water Decisions data files.
 *
 * Checks that every slug referenced in mapping files exists in
 * the corresponding source data. Exits with code 1 if any
 * broken links are found.
 *
 * Usage: node scripts/validate-links.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, '_data');
const CASES = path.join(ROOT, '_case_studies');

let errors = [];
let warnings = [];
let stats = { entities: 0, relationships: 0, checks: 0 };

// ── Helpers ──────────────────────────────────────────────────

function loadYaml(file) {
  // Use Ruby (available via Jekyll) or Node to parse YAML
  // Fallback to regex-based extraction of slug fields
  const raw = fs.readFileSync(path.join(DATA, file), 'utf8');
  return parseYamlArray(raw);
}

function parseYamlArray(raw) {
  // Zero-dependency YAML array parser for our data format
  // Handles: - slug: value\n  key: value\n  key: [a, b]\n  list:\n    - item
  const items = [];
  let current = null;
  let currentKey = null;
  let inArray = false;

  for (const line of raw.split('\n')) {
    // New item
    if (line.match(/^- \w+:/)) {
      if (current) items.push(current);
      current = {};
      currentKey = null;
      inArray = false;
      const m = line.match(/^- (\w[\w_]*):\s*(.*)/);
      if (m) {
        const val = m[2].replace(/^["']|["']$/g, '').trim();
        if (val.startsWith('[')) {
          current[m[1]] = val.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
        } else if (val) {
          current[m[1]] = val;
        } else {
          currentKey = m[1];
          inArray = true;
          current[m[1]] = [];
        }
      }
    }
    // Continuation of current item
    else if (current && line.match(/^\s{2,}\w[\w_]*:/)) {
      inArray = false;
      const m = line.match(/^\s+(\w[\w_]*):\s*(.*)/);
      if (m) {
        const val = m[2].replace(/^["']|["']$/g, '').trim();
        if (val.startsWith('[')) {
          current[m[1]] = val.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
        } else if (val) {
          current[m[1]] = val;
        } else {
          currentKey = m[1];
          inArray = true;
          current[m[1]] = [];
        }
      }
    }
    // Array item
    else if (current && inArray && currentKey && line.match(/^\s+- /)) {
      const val = line.replace(/^\s+- /, '').replace(/^["']|["']$/g, '').trim();
      if (!current[currentKey]) current[currentKey] = [];
      // Handle array of objects (name/url)
      if (val.match(/^\w+:/)) {
        // Skip complex objects, we only need slugs
      } else {
        current[currentKey].push(val);
      }
    }
  }
  if (current) items.push(current);
  return items;
}

function loadCsv(file) {
  const raw = fs.readFileSync(path.join(DATA, file), 'utf8');
  const lines = raw.trim().split('\n');
  const headers = lines[0].split(',');
  return lines.slice(1).map(line => {
    const vals = line.split(',');
    const obj = {};
    headers.forEach((h, i) => obj[h.trim()] = (vals[i] || '').trim());
    return obj;
  });
}

function getCaseStudySlugs() {
  if (!fs.existsSync(CASES)) return [];
  return fs.readdirSync(CASES)
    .filter(f => f.endsWith('.md'))
    .map(f => {
      const content = fs.readFileSync(path.join(CASES, f), 'utf8');
      const m = content.match(/^slug:\s*(.+)$/m);
      return m ? m[1].trim() : f.replace('.md', '');
    });
}

function getPageSlugs(dir) {
  const fullDir = path.join(ROOT, dir);
  if (!fs.existsSync(fullDir)) return [];
  return fs.readdirSync(fullDir)
    .filter(f => f.endsWith('.html') && f !== 'index.html')
    .map(f => f.replace('.html', ''));
}

function check(condition, msg, severity = 'error') {
  stats.checks++;
  if (!condition) {
    if (severity === 'error') errors.push(msg);
    else warnings.push(msg);
  }
}

// ── Load all data ────────────────────────────────────────────

console.log('Validating Water Decisions data integrity...\n');

// Source entities
const useCases = loadYaml('use-cases.yml');
const decisionPatterns = loadYaml('decision-patterns.yml');
const models = loadYaml('models.yml');
const caseStudySlugs = getCaseStudySlugs();

const ucSlugs = new Set(useCases.map(u => u.slug));
const dpSlugs = new Set(decisionPatterns.map(d => d.slug));
const modelSlugs = new Set(models.map(m => m.slug));
const csSlugs = new Set(caseStudySlugs);

stats.entities = ucSlugs.size + dpSlugs.size + modelSlugs.size + csSlugs.size;

console.log(`  ${ucSlugs.size} use cases`);
console.log(`  ${dpSlugs.size} decision patterns`);
console.log(`  ${modelSlugs.size} models`);
console.log(`  ${csSlugs.size} case studies`);
console.log(`  ${stats.entities} total entities\n`);

// ── Check use-case-mapping.csv ───────────────────────────────

console.log('Checking use-case-mapping.csv...');
const ucMapping = loadCsv('use-case-mapping.csv');
stats.relationships += ucMapping.length;

for (const row of ucMapping) {
  check(ucSlugs.has(row.use_case_slug),
    `use-case-mapping.csv: use_case_slug "${row.use_case_slug}" not found in use-cases.yml`);
  check(dpSlugs.has(row.decision_pattern_slug),
    `use-case-mapping.csv: decision_pattern_slug "${row.decision_pattern_slug}" not found in decision-patterns.yml`);
  check(csSlugs.has(row.case_study_slug),
    `use-case-mapping.csv: case_study_slug "${row.case_study_slug}" not found in _case_studies/`);
}
console.log(`  ${ucMapping.length} rows checked`);

// ── Check model-mapping.yml ──────────────────────────────────

console.log('Checking model-mapping.yml...');
const modelMapping = loadYaml('model-mapping.yml');
stats.relationships += modelMapping.length;

for (const row of modelMapping) {
  check(modelSlugs.has(row.model_slug),
    `model-mapping.yml: model_slug "${row.model_slug}" not found in models.yml`);
  check(csSlugs.has(row.case_study_slug),
    `model-mapping.yml: case_study_slug "${row.case_study_slug}" not found in _case_studies/`);

  // Check use_case_slugs array if present
  if (row.use_case_slugs) {
    const ucs = Array.isArray(row.use_case_slugs) ? row.use_case_slugs : [row.use_case_slugs];
    for (const uc of ucs) {
      check(ucSlugs.has(uc),
        `model-mapping.yml: use_case_slug "${uc}" (in ${row.model_slug} → ${row.case_study_slug}) not found in use-cases.yml`);
    }
  }
}
console.log(`  ${modelMapping.length} rows checked`);

// ── Check page files exist for data entries ──────────────────

console.log('Checking page files...');
const ucPages = new Set(getPageSlugs('use-cases'));
const dpPages = new Set(getPageSlugs('decision-patterns'));
const modelPages = new Set(getPageSlugs('models'));

for (const slug of ucSlugs) {
  check(ucPages.has(slug),
    `Missing page: use-cases/${slug}.html (defined in use-cases.yml but no page file)`, 'warning');
}
for (const slug of dpSlugs) {
  check(dpPages.has(slug),
    `Missing page: decision-patterns/${slug}.html (defined in decision-patterns.yml but no page file)`, 'warning');
}
for (const slug of modelSlugs) {
  check(modelPages.has(slug),
    `Missing page: models/${slug}.html (defined in models.yml but no page file)`, 'warning');
}

// ── Check for orphaned entities ──────────────────────────────

console.log('Checking for orphaned entities...');
const mappedUCs = new Set(ucMapping.map(r => r.use_case_slug));
const mappedDPs = new Set(ucMapping.map(r => r.decision_pattern_slug));
const mappedCSfromUC = new Set(ucMapping.map(r => r.case_study_slug));
const mappedCSfromModel = new Set(modelMapping.map(r => r.case_study_slug));
const allMappedCS = new Set([...mappedCSfromUC, ...mappedCSfromModel]);

for (const slug of ucSlugs) {
  check(mappedUCs.has(slug),
    `Orphan: use case "${slug}" is not referenced in any mapping file`, 'warning');
}
for (const slug of dpSlugs) {
  check(mappedDPs.has(slug),
    `Orphan: decision pattern "${slug}" is not referenced in any mapping file`, 'warning');
}
for (const slug of csSlugs) {
  check(allMappedCS.has(slug),
    `Orphan: case study "${slug}" is not referenced in any mapping file`, 'warning');
}

// ── Report ───────────────────────────────────────────────────

console.log(`\n${'═'.repeat(50)}`);
console.log(`  ${stats.checks} checks | ${stats.entities} entities | ${stats.relationships} relationships`);

if (warnings.length > 0) {
  console.log(`\n⚠ ${warnings.length} warning(s):`);
  warnings.forEach(w => console.log(`  → ${w}`));
}

if (errors.length > 0) {
  console.log(`\n✗ ${errors.length} error(s):`);
  errors.forEach(e => console.log(`  → ${e}`));
  console.log(`\nValidation FAILED\n`);
  process.exit(1);
} else {
  console.log(`\n✓ All links valid\n`);
  process.exit(0);
}
