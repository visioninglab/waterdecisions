/* ============================================================
   7-Minute Resilience Diagnostic — JavaScript
   Quick infrastructure resilience assessment aligned with
   ISO 22372 and UNDRR Principles for Resilient Infrastructure
   ============================================================ */

(function () {
  'use strict';

  /* ============ SCHEMA ============ */

  var SCORE_LABELS = [
    'Absent', 'Ad hoc', 'Emerging', 'Operational', 'Integrated', 'Adaptive'
  ];

  var PRINCIPLES = [
    { id: 'p1', num: 'P1', name: 'Continuously Learning',
      desc: 'Develop and update understanding and insight into infrastructure resilience through monitoring, analysis and stress testing.' },
    { id: 'p2', num: 'P2', name: 'Proactively Protected',
      desc: 'Proactively plan, design, build and operate infrastructure prepared for current and future hazards.' },
    { id: 'p3', num: 'P3', name: 'Environmentally Integrated',
      desc: 'Work in a positively integrated way with the natural environment using nature-based solutions.' },
    { id: 'p4', num: 'P4', name: 'Socially Engaged',
      desc: 'Develop active engagement, involvement and participation across all levels of society.' },
    { id: 'p5', num: 'P5', name: 'Shared Responsibility',
      desc: 'Share information and expertise for coordinated benefits with clear accountability.' },
    { id: 'p6', num: 'P6', name: 'Adaptively Transforming',
      desc: 'Adapt and transform infrastructure systems to meet changing needs and conditions.' }
  ];

  var DECISION_AREAS = [
    { id: 'strategy', label: 'Strategy', prompt: 'How clear is the strategic direction for resilience?' },
    { id: 'operations', label: 'Operations', prompt: 'How clear are operational decisions and responsibilities?' },
    { id: 'investment', label: 'Investment', prompt: 'How evidence-based are investment and funding decisions?' },
    { id: 'coordination', label: 'Coordination', prompt: 'How effective is cross-boundary coordination?' },
    { id: 'monitoring', label: 'Monitoring', prompt: 'How systematic is performance monitoring and review?' }
  ];

  var CONCERN_LABELS = {
    climate: 'Climate change', flood: 'Flood risk', cyber: 'Cyber security',
    ageing: 'Ageing assets', interdep: 'Interdependencies', supply: 'Supply chain',
    social: 'Social equity', funding: 'Funding constraints'
  };

  /* ============ STATE ============ */

  var state = {
    mode: 'fresh',
    caseStudy: null,
    currentStep: 0,
    system: { name: '', sector: '', scale: '', role: '' },
    priorities: { outcomes: ['', '', ''], concerns: [], stakeholders: ['', '', ''] },
    principleScores: { p1: -1, p2: -1, p3: -1, p4: -1, p5: -1, p6: -1 },
    principleConfidence: { p1: 'medium', p2: 'medium', p3: 'medium', p4: 'medium', p5: 'medium', p6: 'medium' },
    principleReflections: {},
    decisionClarity: { strategy: -1, operations: -1, investment: -1, coordination: -1, monitoring: -1 }
  };

  var radarChart = null;

  /* ============ UTILITY ============ */

  function $(sel) { return document.querySelector(sel); }
  function $$(sel) { return document.querySelectorAll(sel); }

  function el(tag, attrs, children) {
    var e = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'className') e.className = attrs[k];
        else if (k === 'textContent') e.textContent = attrs[k];
        else if (k === 'innerHTML') e.innerHTML = attrs[k];
        else if (k.indexOf('on') === 0) e.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        else e.setAttribute(k, attrs[k]);
      });
    }
    if (children) {
      children.forEach(function (c) {
        if (typeof c === 'string') e.appendChild(document.createTextNode(c));
        else if (c) e.appendChild(c);
      });
    }
    return e;
  }

  function ucfirst(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

  function makeField(label, value) {
    var f = el('div', { className: 'diag-dx-field' });
    f.appendChild(el('div', { className: 'diag-dx-field-label', textContent: label }));
    f.appendChild(el('div', { className: 'diag-dx-field-value', textContent: value || '\u2014' }));
    return f;
  }

  /* ============ NAVIGATION ============ */

  function goToStep(n) {
    if (n < 0 || n > 5) return;
    state.currentStep = n;

    // Show/hide elements
    $$('.assess-step').forEach(function (s) { s.classList.remove('active'); });
    var target = $('#step' + n);
    if (target) target.classList.add('active');

    var progress = $('#assessProgress');
    var nav = $('#assessNav');
    var storage = $('#assessStorage');

    if (n === 0) {
      progress.style.display = 'none';
      nav.style.display = 'none';
      storage.style.display = 'none';
    } else {
      progress.style.display = 'flex';
      nav.style.display = 'flex';
      storage.style.display = 'flex';

      // Update progress dots
      $$('.assess-progress-step').forEach(function (s) {
        var sn = parseInt(s.dataset.step);
        s.classList.remove('active', 'completed');
        if (sn === n) s.classList.add('active');
        else if (sn < n) s.classList.add('completed');
      });

      // Prev/Next buttons
      $('#btnPrev').style.display = n <= 1 ? 'none' : '';
      if (n === 5) {
        $('#btnNext').textContent = 'Start Over';
      } else if (n === 4) {
        $('#btnNext').textContent = 'View Results';
      } else {
        $('#btnNext').textContent = 'Next';
      }
      $('#navStatus').textContent = n <= 4 ? 'Step ' + n + ' of 4' : '';
    }

    if (n === 3) renderPrinciples();
    if (n === 4) renderDecisions();
    if (n === 5) renderResults();

    saveState();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function nextStep() {
    collectCurrentStep();
    if (state.currentStep === 5) {
      clearProgress();
      return;
    }
    if (state.currentStep < 5) goToStep(state.currentStep + 1);
  }
  window.nextStep = nextStep;

  function prevStep() {
    collectCurrentStep();
    if (state.currentStep === 5 && state.mode === 'case-study') {
      goToStep(0);
      return;
    }
    if (state.currentStep > 0) goToStep(state.currentStep - 1);
  }
  window.prevStep = prevStep;

  function collectCurrentStep() {
    var step = state.currentStep;
    if (step === 1) {
      state.system.name = ($('#ctxSystem') || {}).value || '';
      state.system.sector = ($('#ctxSector') || {}).value || '';
      state.system.scale = ($('#ctxScale') || {}).value || '';
      state.system.role = ($('#ctxRole') || {}).value || '';
    }
    if (step === 2) collectPriorities();
  }

  /* ============ LANDING: CASE STUDY TILES ============ */

  function renderCaseTiles() {
    var container = $('#caseTiles');
    if (!container || typeof CASE_STUDY_FIXTURES === 'undefined') return;

    container.innerHTML = '';
    Object.keys(CASE_STUDY_FIXTURES).forEach(function (key) {
      var cs = CASE_STUDY_FIXTURES[key];
      var tile = el('button', {
        className: 'diag-case-tile',
        onClick: function () { loadCaseStudy(key); }
      }, [
        el('span', { className: 'diag-case-tile-title', textContent: cs.title }),
        el('span', { className: 'diag-case-tile-action', textContent: 'View results \u2192' })
      ]);
      container.appendChild(tile);
    });
  }

  function renderCaseDiagnostics() {
    var container = $('#caseOverview');
    if (!container || typeof CASE_STUDY_FIXTURES === 'undefined') return;

    container.innerHTML = '';

    var header = el('div', { className: 'diag-dx-header' });
    header.appendChild(el('h3', { textContent: 'How the Case Studies Answer the Diagnostic' }));
    header.appendChild(el('p', { textContent: 'See how three water infrastructure case studies complete each step of the 7-minute diagnostic.' }));
    container.appendChild(header);

    Object.keys(CASE_STUDY_FIXTURES).forEach(function (key) {
      var cs = CASE_STUDY_FIXTURES[key];
      var card = el('div', { className: 'diag-dx-card' });

      // Title bar
      var titleBar = el('div', { className: 'diag-dx-title-bar' });
      var titleLeft = el('div', { className: 'diag-dx-title-left' });
      titleLeft.appendChild(el('h4', { textContent: cs.title }));
      titleLeft.appendChild(el('span', { className: 'diag-dx-meta', textContent: ucfirst(cs.system.scale) + ' \u00b7 ' + ucfirst(cs.system.sector) }));
      titleBar.appendChild(titleLeft);
      if (cs.link) {
        titleBar.appendChild(el('a', { className: 'diag-dx-case-link', href: cs.link, textContent: 'Read case study \u2192' }));
      }
      card.appendChild(titleBar);

      var sections = el('div', { className: 'diag-dx-sections' });

      // Step 1: System
      var s1 = el('div', { className: 'diag-dx-section' });
      s1.appendChild(el('div', { className: 'diag-dx-step-tag', textContent: 'Step 1 \u2014 System' }));
      var s1grid = el('div', { className: 'diag-dx-field-grid' });
      s1grid.appendChild(makeField('System', cs.system.name));
      s1grid.appendChild(makeField('Sector', ucfirst(cs.system.sector)));
      s1grid.appendChild(makeField('Scale', ucfirst(cs.system.scale)));
      s1grid.appendChild(makeField('Role', cs.system.role));
      s1.appendChild(s1grid);
      sections.appendChild(s1);

      // Step 2: Priorities
      var s2 = el('div', { className: 'diag-dx-section' });
      s2.appendChild(el('div', { className: 'diag-dx-step-tag', textContent: 'Step 2 \u2014 Priorities' }));

      s2.appendChild(el('div', { className: 'diag-dx-sub-label', textContent: 'Strategic Outcomes' }));
      var ol = el('ol', { className: 'diag-dx-outcomes' });
      (cs.priorities.outcomes || []).forEach(function (o) {
        if (o) ol.appendChild(el('li', { textContent: o }));
      });
      s2.appendChild(ol);

      if (cs.priorities.concerns && cs.priorities.concerns.length) {
        s2.appendChild(el('div', { className: 'diag-dx-sub-label', textContent: 'Key Concerns' }));
        var tags = el('div', { className: 'diag-dx-tags' });
        cs.priorities.concerns.forEach(function (c) {
          tags.appendChild(el('span', { className: 'diag-dx-tag', textContent: CONCERN_LABELS[c] || c }));
        });
        s2.appendChild(tags);
      }

      s2.appendChild(el('div', { className: 'diag-dx-sub-label', textContent: 'Key Stakeholders' }));
      var sl = el('ul', { className: 'diag-dx-stakeholders' });
      (cs.priorities.stakeholders || []).forEach(function (s) {
        if (s) sl.appendChild(el('li', { textContent: s }));
      });
      s2.appendChild(sl);
      sections.appendChild(s2);

      // Step 3: Principles
      var s3 = el('div', { className: 'diag-dx-section' });
      s3.appendChild(el('div', { className: 'diag-dx-step-tag', textContent: 'Step 3 \u2014 Principles' }));

      PRINCIPLES.forEach(function (p) {
        var score = cs.principleScores[p.id];
        var conf = cs.principleConfidence ? cs.principleConfidence[p.id] : 'medium';
        var refl = cs.principleReflections ? cs.principleReflections[p.id] : '';

        var row = el('div', { className: 'diag-dx-principle-row' });
        var rowHeader = el('div', { className: 'diag-dx-principle-header' });
        rowHeader.appendChild(el('span', { className: 'diag-dx-p-badge', textContent: p.num }));
        rowHeader.appendChild(el('span', { className: 'diag-dx-p-name', textContent: p.name }));

        var scoreGroup = el('div', { className: 'diag-dx-p-score-group' });
        var barWrap = el('div', { className: 'diag-dx-p-bar' });
        var barFill = el('div', { className: 'diag-dx-p-bar-fill' });
        barFill.style.width = Math.round((score / 5) * 100) + '%';
        barFill.style.background = score >= 4 ? '#059669' : score >= 3 ? 'var(--accent)' : score >= 2 ? '#d97706' : '#dc2626';
        barWrap.appendChild(barFill);
        scoreGroup.appendChild(barWrap);
        scoreGroup.appendChild(el('span', { className: 'diag-dx-p-val', textContent: score + '/5' }));
        scoreGroup.appendChild(el('span', { className: 'diag-dx-p-conf conf-' + conf, textContent: ucfirst(conf) }));
        rowHeader.appendChild(scoreGroup);
        row.appendChild(rowHeader);

        if (refl) {
          row.appendChild(el('div', { className: 'diag-dx-p-reflection', textContent: '\u201c' + refl + '\u201d' }));
        }

        s3.appendChild(row);
      });
      sections.appendChild(s3);

      // Step 4: Decisions
      var s4 = el('div', { className: 'diag-dx-section' });
      s4.appendChild(el('div', { className: 'diag-dx-step-tag', textContent: 'Step 4 \u2014 Decisions' }));

      DECISION_AREAS.forEach(function (d) {
        var score = cs.decisionClarity[d.id];
        var row = el('div', { className: 'diag-dx-decision-row' });
        row.appendChild(el('span', { className: 'diag-dx-d-label', textContent: d.label }));
        var barWrap = el('div', { className: 'diag-dx-d-bar' });
        var barFill = el('div', { className: 'diag-dx-d-bar-fill' });
        barFill.style.width = Math.round((score / 5) * 100) + '%';
        barFill.style.background = score >= 4 ? '#059669' : score >= 3 ? 'var(--accent)' : '#d97706';
        barWrap.appendChild(barFill);
        row.appendChild(barWrap);
        row.appendChild(el('span', { className: 'diag-dx-d-val', textContent: score + '/5 \u2014 ' + SCORE_LABELS[score] }));
        s4.appendChild(row);
      });
      sections.appendChild(s4);

      card.appendChild(sections);

      // Footer with view results button
      var footer = el('div', { className: 'diag-dx-footer' });
      footer.appendChild(el('button', {
        className: 'diag-dx-view-btn',
        textContent: 'View full results dashboard \u2192',
        onClick: function () { loadCaseStudy(key); }
      }));
      card.appendChild(footer);

      container.appendChild(card);
    });
  }

  function loadCaseStudy(key) {
    if (typeof CASE_STUDY_FIXTURES === 'undefined') return;
    var cs = CASE_STUDY_FIXTURES[key];
    if (!cs) return;

    state.mode = 'case-study';
    state.caseStudy = key;
    state.system = Object.assign({}, cs.system);
    state.priorities = {
      outcomes: (cs.priorities.outcomes || []).slice(),
      concerns: (cs.priorities.concerns || []).slice(),
      stakeholders: (cs.priorities.stakeholders || []).slice()
    };
    state.principleScores = Object.assign({}, cs.principleScores);
    state.principleConfidence = Object.assign({}, cs.principleConfidence);
    state.principleReflections = Object.assign({}, cs.principleReflections || {});
    state.decisionClarity = Object.assign({}, cs.decisionClarity);

    goToStep(5);
  }
  window.loadCaseStudy = loadCaseStudy;

  function startFresh() {
    state.mode = 'fresh';
    state.caseStudy = null;
    state.system = { name: '', sector: '', scale: '', role: '' };
    state.priorities = { outcomes: ['', '', ''], concerns: [], stakeholders: ['', '', ''] };
    state.principleScores = { p1: -1, p2: -1, p3: -1, p4: -1, p5: -1, p6: -1 };
    state.principleConfidence = { p1: 'medium', p2: 'medium', p3: 'medium', p4: 'medium', p5: 'medium', p6: 'medium' };
    state.principleReflections = {};
    state.decisionClarity = { strategy: -1, operations: -1, investment: -1, coordination: -1, monitoring: -1 };
    goToStep(1);
  }
  window.startFresh = startFresh;

  /* ============ STEP 2: PRIORITIES ============ */

  function collectPriorities() {
    var outcomeInputs = $$('#outcomesList input');
    state.priorities.outcomes = [];
    outcomeInputs.forEach(function (inp) {
      state.priorities.outcomes.push(inp.value.trim());
    });
    while (state.priorities.outcomes.length < 3) state.priorities.outcomes.push('');

    state.priorities.concerns = [];
    $$('#concernsGrid input:checked').forEach(function (cb) {
      state.priorities.concerns.push(cb.value);
    });

    var stakeInputs = $$('#stakeholdersList input');
    state.priorities.stakeholders = [];
    stakeInputs.forEach(function (inp) {
      state.priorities.stakeholders.push(inp.value.trim());
    });
    while (state.priorities.stakeholders.length < 3) state.priorities.stakeholders.push('');
  }

  function renderOutcomesList() {
    var container = $('#outcomesList');
    if (!container) return;
    container.innerHTML = '';
    for (var i = 0; i < 3; i++) {
      var val = state.priorities.outcomes[i] || '';
      var row = el('div', { className: 'assess-list-row' }, [
        el('input', { type: 'text', value: val, placeholder: 'Strategic outcome ' + (i + 1) + '\u2026' })
      ]);
      row.querySelector('input').value = val;
      container.appendChild(row);
    }
  }

  function renderStakeholdersList() {
    var container = $('#stakeholdersList');
    if (!container) return;
    container.innerHTML = '';
    for (var i = 0; i < 3; i++) {
      var val = state.priorities.stakeholders[i] || '';
      var row = el('div', { className: 'assess-list-row' }, [
        el('input', { type: 'text', value: val, placeholder: 'Key stakeholder ' + (i + 1) + '\u2026' })
      ]);
      row.querySelector('input').value = val;
      container.appendChild(row);
    }
  }

  function renderConcernsCheckboxes() {
    var checkboxes = $$('#concernsGrid input');
    checkboxes.forEach(function (cb) {
      cb.checked = state.priorities.concerns.indexOf(cb.value) !== -1;
    });
  }

  /* ============ STEP 3: PRINCIPLES ============ */

  function renderPrinciples() {
    var container = $('#principlesBody');
    if (!container) return;
    container.innerHTML = '';

    PRINCIPLES.forEach(function (p) {
      var score = state.principleScores[p.id];
      var conf = state.principleConfidence[p.id] || 'medium';
      var refl = state.principleReflections[p.id] || '';

      var card = el('div', { className: 'diag-principle-card' });

      // Header
      card.appendChild(el('div', { className: 'diag-principle-header' }, [
        el('span', { className: 'diag-principle-num', textContent: p.num }),
        el('span', { className: 'diag-principle-name', textContent: p.name })
      ]));
      card.appendChild(el('p', { className: 'diag-principle-desc', textContent: p.desc }));

      // Score selector
      var selector = el('div', { className: 'assess-score-selector' });
      for (var i = 0; i <= 5; i++) {
        (function (val) {
          var btn = el('button', {
            className: 'assess-score-btn' + (val === score ? ' active' : ''),
            onClick: function () {
              state.principleScores[p.id] = val;
              selector.querySelectorAll('.assess-score-btn').forEach(function (b) { b.classList.remove('active'); });
              btn.classList.add('active');
              saveState();
            }
          }, [
            el('span', { className: 'assess-score-num', textContent: String(val) }),
            el('span', { className: 'assess-score-text', textContent: SCORE_LABELS[val] })
          ]);
          selector.appendChild(btn);
        })(i);
      }
      card.appendChild(selector);

      // Confidence
      var confRow = el('div', { className: 'assess-confidence-row' });
      confRow.appendChild(el('span', { className: 'assess-confidence-label', textContent: 'Confidence:' }));
      ['high', 'medium', 'low'].forEach(function (level) {
        var btn = el('button', {
          className: 'assess-confidence-btn' + (level === conf ? ' active' : '') + ' conf-' + level,
          textContent: level.charAt(0).toUpperCase() + level.slice(1),
          onClick: function () {
            state.principleConfidence[p.id] = level;
            confRow.querySelectorAll('.assess-confidence-btn').forEach(function (b) { b.classList.remove('active'); });
            btn.classList.add('active');
            saveState();
          }
        });
        confRow.appendChild(btn);
      });
      card.appendChild(confRow);

      // Reflection (optional)
      var reflToggle = el('button', {
        className: 'diag-refl-toggle',
        textContent: refl ? 'Edit reflection \u25BE' : 'Add reflection \u25BE',
        onClick: function () {
          var wrap = card.querySelector('.diag-refl-wrap');
          var isOpen = wrap.style.display !== 'none';
          wrap.style.display = isOpen ? 'none' : 'block';
          reflToggle.textContent = isOpen
            ? (state.principleReflections[p.id] ? 'Edit reflection \u25BE' : 'Add reflection \u25BE')
            : 'Hide \u25B4';
        }
      });
      card.appendChild(reflToggle);

      var reflWrap = el('div', { className: 'diag-refl-wrap' });
      reflWrap.style.display = refl ? 'block' : 'none';
      var textarea = el('textarea', {
        className: 'assess-reflection-input',
        rows: '2',
        placeholder: 'Optional: note why you gave this score\u2026'
      });
      textarea.value = refl;
      textarea.addEventListener('input', function () {
        state.principleReflections[p.id] = textarea.value;
        saveState();
      });
      reflWrap.appendChild(textarea);
      card.appendChild(reflWrap);

      container.appendChild(card);
    });
  }

  /* ============ STEP 4: DECISIONS ============ */

  function renderDecisions() {
    var container = $('#decisionsBody');
    if (!container) return;
    container.innerHTML = '';

    DECISION_AREAS.forEach(function (d) {
      var score = state.decisionClarity[d.id];

      var card = el('div', { className: 'diag-decision-card' });
      card.appendChild(el('div', { className: 'diag-decision-label', textContent: d.label }));
      card.appendChild(el('div', { className: 'diag-decision-prompt', textContent: d.prompt }));

      var selector = el('div', { className: 'assess-score-selector' });
      for (var i = 0; i <= 5; i++) {
        (function (val) {
          var btn = el('button', {
            className: 'assess-score-btn' + (val === score ? ' active' : ''),
            onClick: function () {
              state.decisionClarity[d.id] = val;
              selector.querySelectorAll('.assess-score-btn').forEach(function (b) { b.classList.remove('active'); });
              btn.classList.add('active');
              saveState();
            }
          }, [
            el('span', { className: 'assess-score-num', textContent: String(val) }),
            el('span', { className: 'assess-score-text', textContent: SCORE_LABELS[val] })
          ]);
          selector.appendChild(btn);
        })(i);
      }
      card.appendChild(selector);
      container.appendChild(card);
    });
  }

  /* ============ STEP 5: RESULTS ============ */

  function renderResults() {
    // Title
    if (state.mode === 'case-study' && state.caseStudy) {
      var cs = CASE_STUDY_FIXTURES[state.caseStudy];
      $('#resultsTitle').textContent = cs ? cs.title : 'Results';
      $('#resultsSubtitle').textContent = 'Pre-loaded case study assessment — explore the scores and analysis below.';

      // Case study link
      var linkCard = $('#caseStudyLink');
      if (linkCard && cs && cs.link) {
        linkCard.style.display = 'block';
        $('#caseStudyLinkText').textContent = 'Read the detailed analysis of ' + cs.title + ' in the case study wiki.';
        $('#caseStudyLinkHref').href = cs.link;
      }
    } else {
      $('#resultsTitle').textContent = 'Your Resilience Profile';
      $('#resultsSubtitle').textContent = state.system.name ? 'Assessment for ' + state.system.name : '';
      var linkCard2 = $('#caseStudyLink');
      if (linkCard2) linkCard2.style.display = 'none';
    }

    var scores = getPrincipleScoresArray();
    var overall = calcOverall(scores);
    var level = Math.min(Math.round(overall), 5);
    var pct = Math.round((overall / 5) * 100);

    // Maturity
    $('#maturityScore').textContent = overall.toFixed(1);
    $('#maturityLabel').textContent = overall > 0 ? SCORE_LABELS[level] : 'Not assessed';
    $('#maturityFill').style.width = pct + '%';
    $('#maturityPct').textContent = pct + '% of maximum';

    // Radar chart
    renderRadarChart(scores);

    // Gaps
    renderGaps(scores);

    // PDCA
    renderPDCA(scores);

    // Decision confidence map
    renderDecisionMap();

    // Suggestions
    renderSuggestions(scores);
  }

  function getPrincipleScoresArray() {
    return PRINCIPLES.map(function (p) {
      var v = state.principleScores[p.id];
      return (v != null && v >= 0) ? v : 0;
    });
  }

  function calcOverall(scores) {
    var sum = 0; var count = 0;
    scores.forEach(function (v) { if (v > 0) { sum += v; count++; } });
    return count > 0 ? sum / count : 0;
  }

  function renderRadarChart(scores) {
    var canvas = $('#radarChart');
    if (!canvas) return;
    if (radarChart) radarChart.destroy();

    var labels = PRINCIPLES.map(function (p) { return p.num + ' ' + p.name; });

    radarChart = new Chart(canvas, {
      type: 'radar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Principle Score',
          data: scores,
          fill: true,
          backgroundColor: 'rgba(0, 101, 189, 0.10)',
          borderColor: 'rgba(0, 101, 189, 0.75)',
          pointBackgroundColor: 'rgba(0, 101, 189, 1)',
          pointBorderColor: '#fff',
          pointRadius: 5,
          pointHoverRadius: 7,
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
          r: {
            min: 0, max: 5,
            ticks: { stepSize: 1, font: { size: 11 }, backdropColor: 'transparent' },
            pointLabels: { font: { size: 11, family: "'DM Sans', sans-serif", weight: '600' }, color: '#1a1a2e' },
            grid: { color: 'rgba(0,0,0,0.06)' },
            angleLines: { color: 'rgba(0,0,0,0.06)' }
          }
        },
        plugins: { legend: { display: false } }
      }
    });
  }

  function renderGaps(scores) {
    var container = $('#gapsContent');
    if (!container) return;
    container.innerHTML = '';

    var gaps = [];
    PRINCIPLES.forEach(function (p, i) {
      if (scores[i] < 3) gaps.push({ name: p.num + ' ' + p.name, score: scores[i], conf: state.principleConfidence[p.id] });
    });
    gaps.sort(function (a, b) { return a.score - b.score; });

    if (gaps.length === 0) {
      container.appendChild(el('p', { className: 'assess-muted', textContent: 'No significant gaps (all scores 3 or above).' }));
      return;
    }

    gaps.forEach(function (g) {
      var row = el('div', { className: 'diag-gap-row' });
      var color = g.score <= 1 ? '#dc2626' : '#d97706';
      row.appendChild(el('span', { className: 'diag-gap-dot', style: 'background:' + color }));
      row.appendChild(el('span', { className: 'diag-gap-name', textContent: g.name }));
      row.appendChild(el('span', { className: 'diag-gap-score', textContent: g.score + '/5 \u2014 ' + SCORE_LABELS[g.score] }));
      container.appendChild(row);
    });
  }

  function renderPDCA(scores) {
    var container = $('#pdcaContent');
    if (!container) return;
    container.innerHTML = '';

    // Derived PDCA: Plan = avg(P1,P5), Do = avg(P2,P3), Check = avg(P1,P4), Act = avg(P5,P6)
    var pdca = [
      { label: 'Plan', score: avg(scores[0], scores[4]), desc: 'avg(P1, P5)' },
      { label: 'Do', score: avg(scores[1], scores[2]), desc: 'avg(P2, P3)' },
      { label: 'Check', score: avg(scores[0], scores[3]), desc: 'avg(P1, P4)' },
      { label: 'Act', score: avg(scores[4], scores[5]), desc: 'avg(P5, P6)' }
    ];

    var grid = el('div', { className: 'diag-pdca-grid' });
    pdca.forEach(function (p) {
      var pct = Math.round((p.score / 5) * 100);
      var color = p.score >= 4 ? '#059669' : p.score >= 3 ? '#0065bd' : p.score >= 2 ? '#d97706' : '#dc2626';
      var cell = el('div', { className: 'diag-pdca-cell' });
      cell.appendChild(el('div', { className: 'diag-pdca-label', textContent: p.label }));
      cell.appendChild(el('div', { className: 'diag-pdca-score', textContent: p.score.toFixed(1) }));
      var bar = el('div', { className: 'diag-pdca-bar' });
      var fill = el('div', { className: 'diag-pdca-bar-fill' });
      fill.style.width = pct + '%';
      fill.style.background = color;
      bar.appendChild(fill);
      cell.appendChild(bar);
      cell.appendChild(el('div', { className: 'diag-pdca-desc', textContent: p.desc }));
      grid.appendChild(cell);
    });
    container.appendChild(grid);
  }

  function renderDecisionMap() {
    var container = $('#decisionMapContent');
    if (!container) return;
    container.innerHTML = '';

    DECISION_AREAS.forEach(function (d) {
      var score = state.decisionClarity[d.id];
      var val = (score != null && score >= 0) ? score : 0;
      var color = val >= 4 ? '#059669' : val >= 3 ? '#d97706' : '#dc2626';
      var label = (score != null && score >= 0) ? SCORE_LABELS[val] : 'Not rated';

      var row = el('div', { className: 'diag-decision-row' });
      row.appendChild(el('span', { className: 'diag-decision-row-label', textContent: d.label }));
      var barWrap = el('div', { className: 'diag-decision-bar-wrap' });
      var bar = el('div', { className: 'diag-decision-bar' });
      var fill = el('div', { className: 'diag-decision-bar-fill' });
      fill.style.width = Math.round((val / 5) * 100) + '%';
      fill.style.background = color;
      bar.appendChild(fill);
      barWrap.appendChild(bar);
      barWrap.appendChild(el('span', { className: 'diag-decision-bar-text', textContent: val + '/5 \u2014 ' + label }));
      row.appendChild(barWrap);
      container.appendChild(row);
    });
  }

  function renderSuggestions(scores) {
    var container = $('#suggestionsContent');
    if (!container) return;
    container.innerHTML = '';

    var suggestions = [];
    PRINCIPLES.forEach(function (p, i) {
      if (scores[i] < 2) suggestions.push({ area: p.num, text: 'Establish foundational processes for ' + p.name.toLowerCase() + '.' });
      else if (scores[i] < 3) suggestions.push({ area: p.num, text: 'Formalise and strengthen ' + p.name.toLowerCase() + ' capabilities.' });
      else if (scores[i] < 4) suggestions.push({ area: p.num, text: 'Integrate ' + p.name.toLowerCase() + ' across organisational systems.' });
    });

    DECISION_AREAS.forEach(function (d) {
      var v = state.decisionClarity[d.id];
      if (v >= 0 && v < 3) suggestions.push({ area: d.label, text: 'Improve clarity and effectiveness of ' + d.label.toLowerCase() + ' decisions.' });
    });

    var lowConf = PRINCIPLES.filter(function (p) { return state.principleConfidence[p.id] === 'low'; });
    if (lowConf.length > 0) {
      suggestions.push({ area: 'Confidence', text: 'Verify ' + lowConf.length + ' low-confidence rating(s) through independent review.' });
    }

    if (suggestions.length === 0) {
      suggestions.push({ area: 'General', text: 'Strong overall resilience. Focus on maintaining performance and sharing best practices.' });
    }

    var ol = el('ol', { className: 'suggestions-list' });
    suggestions.forEach(function (s) {
      ol.appendChild(el('li', {}, [
        el('strong', { textContent: s.area + ': ' }),
        document.createTextNode(s.text)
      ]));
    });
    container.appendChild(ol);
  }

  function avg(a, b) { return (a + b) / 2; }

  /* ============ EXPORT ============ */

  function exportPDF() {
    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF();
    var y = 20;
    var lm = 20;
    var pw = 170;

    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('7-Minute Resilience Diagnostic', lm, y);
    y += 8;
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text(state.system.name || 'Infrastructure Assessment', lm, y);
    y += 8;
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('Generated ' + new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }), lm, y);
    doc.text('Visioning Lab & UKCRIC  |  DEMO', lm + 90, y);
    doc.setTextColor(0);
    y += 5;
    doc.setDrawColor(0, 101, 189);
    doc.setLineWidth(0.5);
    doc.line(lm, y, lm + pw, y);
    y += 10;

    // Context
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.text('Context', lm, y); y += 7;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text('System: ' + (state.system.name || 'N/A'), lm + 5, y); y += 5;
    doc.text('Sector: ' + (state.system.sector || 'N/A'), lm + 5, y); y += 5;
    doc.text('Scale: ' + (state.system.scale || 'N/A'), lm + 5, y); y += 5;
    doc.text('Role: ' + (state.system.role || 'N/A'), lm + 5, y); y += 10;

    // Principle scores
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.text('Principle Scores', lm, y); y += 7;

    var scores = getPrincipleScoresArray();
    var tableData = PRINCIPLES.map(function (p, i) {
      return [p.num + ' ' + p.name, String(scores[i]), SCORE_LABELS[Math.min(scores[i], 5)], state.principleConfidence[p.id]];
    });
    doc.autoTable({
      startY: y,
      head: [['Principle', 'Score', 'Level', 'Confidence']],
      body: tableData,
      margin: { left: lm },
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [0, 101, 189], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 243, 240] }
    });
    y = doc.lastAutoTable.finalY + 10;

    // Radar chart image
    var canvas = document.getElementById('radarChart');
    if (canvas) {
      try {
        var imgData = canvas.toDataURL('image/png');
        if (y + 90 > 280) { doc.addPage(); y = 20; }
        doc.addImage(imgData, 'PNG', lm + 20, y, 130, 100);
        y += 105;
      } catch (e) { /* skip */ }
    }

    // Decision clarity
    if (y + 40 > 280) { doc.addPage(); y = 20; }
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.text('Decision Clarity', lm, y); y += 7;
    var decData = DECISION_AREAS.map(function (d) {
      var v = state.decisionClarity[d.id];
      var val = (v >= 0) ? v : 0;
      return [d.label, String(val), SCORE_LABELS[Math.min(val, 5)]];
    });
    doc.autoTable({
      startY: y,
      head: [['Area', 'Score', 'Level']],
      body: decData,
      margin: { left: lm },
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [0, 101, 189], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 243, 240] }
    });
    y = doc.lastAutoTable.finalY + 10;

    // Suggestions
    if (y + 30 > 280) { doc.addPage(); y = 20; }
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.text('Suggested Actions', lm, y); y += 7;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');

    var suggestions = [];
    PRINCIPLES.forEach(function (p, i) {
      if (scores[i] < 2) suggestions.push(p.num + ': Establish foundational processes for ' + p.name.toLowerCase() + '.');
      else if (scores[i] < 3) suggestions.push(p.num + ': Formalise ' + p.name.toLowerCase() + ' capabilities.');
      else if (scores[i] < 4) suggestions.push(p.num + ': Integrate ' + p.name.toLowerCase() + ' across systems.');
    });
    if (suggestions.length === 0) suggestions.push('Strong resilience profile. Maintain and share practices.');

    suggestions.forEach(function (s, i) {
      if (y + 8 > 280) { doc.addPage(); y = 20; }
      var lines = doc.splitTextToSize((i + 1) + '. ' + s, pw - 10);
      doc.text(lines, lm + 5, y);
      y += lines.length * 5 + 2;
    });

    // Reflections
    var reflKeys = Object.keys(state.principleReflections).filter(function (k) {
      return state.principleReflections[k] && state.principleReflections[k].trim();
    });
    if (reflKeys.length > 0) {
      if (y + 20 > 280) { doc.addPage(); y = 20; }
      y += 5;
      doc.setFontSize(13);
      doc.setFont(undefined, 'bold');
      doc.text('Reflections', lm, y); y += 7;
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      reflKeys.forEach(function (key) {
        if (y + 15 > 280) { doc.addPage(); y = 20; }
        var p = PRINCIPLES.find(function (pp) { return pp.id === key; });
        var label = p ? p.num + ' ' + p.name : key;
        doc.setFont(undefined, 'bold');
        doc.text(label + ':', lm + 5, y); y += 4;
        doc.setFont(undefined, 'normal');
        var lines = doc.splitTextToSize(state.principleReflections[key], pw - 15);
        doc.text(lines, lm + 10, y);
        y += lines.length * 4 + 4;
      });
    }

    // Footer
    var pageCount = doc.internal.getNumberOfPages();
    for (var i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text('7-Minute Resilience Diagnostic \u2014 Visioning Lab & UKCRIC  |  DEMO', lm, 290);
      doc.text('Page ' + i + ' of ' + pageCount, 175, 290);
    }

    doc.save('resilience-diagnostic-report.pdf');
  }
  window.exportPDF = exportPDF;

  function exportJSON() {
    var scores = getPrincipleScoresArray();
    var data = {
      meta: {
        tool: '7-Minute Resilience Diagnostic',
        version: '2.0-demo',
        exported: new Date().toISOString(),
        credit: 'Visioning Lab & UKCRIC'
      },
      mode: state.mode,
      caseStudy: state.caseStudy,
      system: state.system,
      priorities: state.priorities,
      principleScores: state.principleScores,
      principleConfidence: state.principleConfidence,
      principleReflections: state.principleReflections,
      decisionClarity: state.decisionClarity,
      results: {
        overall: calcOverall(scores),
        scores: {}
      }
    };
    PRINCIPLES.forEach(function (p, i) { data.results.scores[p.id] = scores[i]; });

    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'resilience-diagnostic-data.json';
    a.click();
    URL.revokeObjectURL(url);
  }
  window.exportJSON = exportJSON;

  /* ============ LOCAL STORAGE ============ */

  var STORAGE_KEY = 'dir-resilience-diagnostic';

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) { /* storage full */ }
  }

  function loadState() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        var parsed = JSON.parse(saved);
        state.mode = parsed.mode || 'fresh';
        state.caseStudy = parsed.caseStudy || null;
        state.currentStep = parsed.currentStep || 0;
        state.system = parsed.system || state.system;
        state.priorities = parsed.priorities || state.priorities;
        state.principleScores = parsed.principleScores || state.principleScores;
        state.principleConfidence = parsed.principleConfidence || state.principleConfidence;
        state.principleReflections = parsed.principleReflections || {};
        state.decisionClarity = parsed.decisionClarity || state.decisionClarity;
        return true;
      }
    } catch (e) { /* invalid */ }
    return false;
  }

  function saveProgress() {
    collectCurrentStep();
    saveState();
    var btn = document.querySelector('.assess-storage-btn');
    if (btn) {
      var orig = btn.textContent;
      btn.textContent = 'Saved!';
      btn.classList.add('saved');
      setTimeout(function () { btn.textContent = orig; btn.classList.remove('saved'); }, 1500);
    }
  }
  window.saveProgress = saveProgress;

  function clearProgress() {
    if (state.currentStep !== 5 && !confirm('Clear all data and start over?')) return;
    localStorage.removeItem(STORAGE_KEY);
    state = {
      mode: 'fresh',
      caseStudy: null,
      currentStep: 0,
      system: { name: '', sector: '', scale: '', role: '' },
      priorities: { outcomes: ['', '', ''], concerns: [], stakeholders: ['', '', ''] },
      principleScores: { p1: -1, p2: -1, p3: -1, p4: -1, p5: -1, p6: -1 },
      principleConfidence: { p1: 'medium', p2: 'medium', p3: 'medium', p4: 'medium', p5: 'medium', p6: 'medium' },
      principleReflections: {},
      decisionClarity: { strategy: -1, operations: -1, investment: -1, coordination: -1, monitoring: -1 }
    };
    init();
  }
  window.clearProgress = clearProgress;

  /* ============ INIT ============ */

  function init() {
    // Always start fresh — blank fields, landing page
    localStorage.removeItem(STORAGE_KEY);
    state.mode = 'fresh';
    state.caseStudy = null;
    state.currentStep = 0;
    state.system = { name: '', sector: '', scale: '', role: '' };
    state.priorities = { outcomes: ['', '', ''], concerns: [], stakeholders: ['', '', ''] };
    state.principleScores = { p1: -1, p2: -1, p3: -1, p4: -1, p5: -1, p6: -1 };
    state.principleConfidence = { p1: 'medium', p2: 'medium', p3: 'medium', p4: 'medium', p5: 'medium', p6: 'medium' };
    state.principleReflections = {};
    state.decisionClarity = { strategy: -1, operations: -1, investment: -1, coordination: -1, monitoring: -1 };

    // Case study tiles + diagnostic walkthrough
    renderCaseTiles();
    renderCaseDiagnostics();

    // Render blank lists
    renderOutcomesList();
    renderStakeholdersList();
    renderConcernsCheckboxes();

    // Start at landing page
    goToStep(0);

    // Re-render Lucide icons after dynamic content is created
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  if (document.getElementById('assessApp')) {
    document.addEventListener('DOMContentLoaded', init);
  }

})();
