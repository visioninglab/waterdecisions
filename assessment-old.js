/* ============================================================
   Resilient Infrastructure Assessment Tool — JavaScript
   ISO-aligned self-assessment for digitalised infrastructure
   ============================================================ */

(function () {
  'use strict';

  /* ============ EDITABLE SCHEMA ============
     Modify these objects to change questions, labels, and prompts.
     The tool UI is generated dynamically from this schema.
     ========================================== */

  var SCORE_LABELS = [
    'Absent', 'Ad hoc', 'Emerging', 'Operational', 'Integrated', 'Adaptive'
  ];

  var PRINCIPLES = [
    {
      id: 'p1',
      name: 'Continuously Learning',
      fullName: 'P1 \u2014 Continuously learning and improving',
      scores: [
        { id: 'assumptions', label: 'Assumptions validated', prompt: 'How systematically are assumptions in models, plans and operating systems exposed, tested and reviewed?' },
        { id: 'monitoring', label: 'Monitoring and intervention', prompt: 'How effectively is infrastructure performance monitored and how timely are interventions when issues arise?' },
        { id: 'lessons', label: 'Lessons captured', prompt: 'How systematically are lessons from incidents, operations and stress tests captured, analysed and applied?' }
      ],
      reflections: [
        { id: 'notlearned', prompt: 'What lessons are not being captured or acted upon?' },
        { id: 'sharing', prompt: 'How are lessons and knowledge shared across teams and organisations?' }
      ]
    },
    {
      id: 'p2',
      name: 'Proactively Protected',
      fullName: 'P2 \u2014 Proactively protected by design',
      scores: [
        { id: 'safety', label: 'Safety requirements', prompt: 'How well are essential safety requirements raised and maintained across the infrastructure system?' },
        { id: 'interdependencies', label: 'Interdependency management', prompt: 'How effectively are complex interdependencies between infrastructure systems considered and managed?' },
        { id: 'emergency', label: 'Emergency preparedness', prompt: 'How well is emergency management embedded, including fail-safe design and long-term maintenance commitments?' }
      ],
      reflections: [
        { id: 'unknown', prompt: 'What are the biggest unknown or under-assessed risks?' },
        { id: 'surprises', prompt: 'Where have surprises or unexpected failures occurred in the past?' }
      ]
    },
    {
      id: 'p3',
      name: 'Environmentally Integrated',
      fullName: 'P3 \u2014 Environmentally integrated with natural systems',
      scores: [
        { id: 'impact', label: 'Environmental impact', prompt: 'How effectively is the environmental impact of infrastructure minimised through design and operation?' },
        { id: 'solutions', label: 'Environmental solutions', prompt: 'How well are environmental and nature-based solutions used to enhance infrastructure resilience?' },
        { id: 'ecosystem', label: 'Ecosystem integration', prompt: 'How well is ecosystem information integrated into planning, and are natural systems and local sustainable resources maintained?' }
      ],
      reflections: [
        { id: 'blindspots', prompt: 'What are the environmental blind spots in current planning?' },
        { id: 'integration', prompt: 'How could environmental data be better integrated into operational decisions?' }
      ]
    },
    {
      id: 'p4',
      name: 'Socially Engaged',
      fullName: 'P4 \u2014 Socially engaged with communities and stakeholders',
      scores: [
        { id: 'information', label: 'Disruption information', prompt: 'How effectively are people informed about disruptions and resilience risks?' },
        { id: 'literacy', label: 'Resilience literacy', prompt: 'How well is resilience literacy raised across communities and stakeholders?' },
        { id: 'participation', label: 'Community participation', prompt: 'How meaningfully are communities encouraged to participate in infrastructure decision-making?' }
      ],
      reflections: [
        { id: 'missing', prompt: 'Who is missing from current decision-making processes?' },
        { id: 'influence', prompt: 'How does stakeholder input actually influence outcomes and decisions?' }
      ]
    },
    {
      id: 'p5',
      name: 'Shared Responsibility',
      fullName: 'P5 \u2014 Shared responsibility for coordinated benefits',
      scores: [
        { id: 'standards', label: 'Open standards', prompt: 'How well are open standards harmonised to facilitate data sharing across sectors?' },
        { id: 'collaboration', label: 'Collaborative management', prompt: 'How effectively is collaborative management cultivated with clear accountability across stakeholders?' },
        { id: 'datasharing', label: 'Data safety and sharing', prompt: 'How well is data safety assured to develop trust, and how transparently is risk-and-return information shared?' }
      ],
      reflections: [
        { id: 'blur', prompt: 'Where do responsibilities blur or overlap in practice?' },
        { id: 'fails', prompt: 'Where does coordination fail or break down between teams or organisations?' }
      ]
    },
    {
      id: 'p6',
      name: 'Adaptively Transforming',
      fullName: 'P6 \u2014 Adaptively transforming to changing needs',
      scores: [
        { id: 'manageable', label: 'Manageable solutions', prompt: 'How well are infrastructure solutions chosen to be manageable given available skills and resources?' },
        { id: 'capacity', label: 'Adaptive capacity', prompt: 'How effectively is adaptive capacity created and maintained to respond to changing conditions?' },
        { id: 'flexibility', label: 'Flexible management', prompt: 'How well does management allow for flexibility, transformation, and human discretion in decision-making?' }
      ],
      reflections: [
        { id: 'hardest', prompt: 'What is hardest to change in the current system or organisation?' },
        { id: 'needed', prompt: 'Where is innovation most needed to improve resilience?' }
      ]
    }
  ];

  var CAPABILITIES = [
    { id: 'decision', label: 'Decision clarity', prompt: 'How clear and effective are decision-making processes for resilience?' },
    { id: 'evidence', label: 'Evidence sufficiency', prompt: 'How sufficient is the evidence base for resilience decisions?' },
    { id: 'datasystems', label: 'Data systems', prompt: 'How adequate are data systems and digital infrastructure for resilience management?' },
    { id: 'coordination', label: 'Coordination capacity', prompt: 'How effective is coordination across organisational boundaries?' }
  ];

  var PDCA = [
    { id: 'plan', label: 'Plan', prompt: 'Are resilience strategies clearly defined and documented?', reflection: 'What gaps exist in current resilience planning?' },
    { id: 'do', label: 'Do', prompt: 'Are planned resilience actions being implemented effectively?', reflection: 'What barriers prevent effective implementation?' },
    { id: 'check', label: 'Check', prompt: 'Are resilience systems regularly tested, monitored, and evaluated?', reflection: 'What is not being measured or tested that should be?' },
    { id: 'act', label: 'Act', prompt: 'Are improvements made based on monitoring and evaluation findings?', reflection: 'What prevents improvement actions from being completed?' }
  ];

  /* ============ STATE ============ */
  var state = {
    currentStep: 1,
    currentPrinciple: 0,
    context: { sector: '', scale: '', systemName: '', role: '' },
    objectives: { outcomes: [''], responsibilities: [''], stakeholders: [''] },
    scores: {},
    confidence: {},
    reflections: {}
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

  /* ============ NAVIGATION ============ */
  function goToStep(n) {
    if (n < 1 || n > 7) return;
    state.currentStep = n;

    $$('.assess-step').forEach(function (s) { s.classList.remove('active'); });
    var target = $('#step' + n);
    if (target) target.classList.add('active');

    $$('.assess-progress-step').forEach(function (s) {
      var sn = parseInt(s.dataset.step);
      s.classList.remove('active', 'completed');
      if (sn === n) s.classList.add('active');
      else if (sn < n) s.classList.add('completed');
    });

    $('#btnPrev').style.display = n === 1 ? 'none' : '';
    $('#btnNext').textContent = n === 7 ? 'Finish' : 'Next';
    $('#navStatus').textContent = 'Step ' + n + ' of 7';

    if (n === 6) renderResults();
    if (n === 7) renderExportSummary();

    saveState();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function nextStep() {
    collectCurrentStep();
    if (state.currentStep < 7) goToStep(state.currentStep + 1);
  }
  window.nextStep = nextStep;

  function prevStep() {
    collectCurrentStep();
    if (state.currentStep > 1) goToStep(state.currentStep - 1);
  }
  window.prevStep = prevStep;

  function collectCurrentStep() {
    var step = state.currentStep;
    if (step === 1) {
      state.context.sector = $('#ctxSector').value;
      state.context.scale = $('#ctxScale').value;
      state.context.systemName = $('#ctxSystem').value;
      state.context.role = $('#ctxRole').value;
    }
    if (step === 2) collectObjectives();
  }

  /* ============ STEP 2: OBJECTIVES ============ */
  function collectObjectives() {
    ['outcomes', 'responsibilities', 'stakeholders'].forEach(function (key) {
      var inputs = $$('#' + key + 'List input');
      state.objectives[key] = [];
      inputs.forEach(function (inp) {
        if (inp.value.trim()) state.objectives[key].push(inp.value.trim());
      });
      if (state.objectives[key].length === 0) state.objectives[key] = [''];
    });
  }

  function renderObjectivesList(key) {
    var container = $('#' + key + 'List');
    if (!container) return;
    container.innerHTML = '';
    state.objectives[key].forEach(function (val, i) {
      var row = el('div', { className: 'assess-list-row' }, [
        el('input', { type: 'text', value: val, placeholder: 'Enter ' + key.slice(0, -1) + '...' }),
        el('button', { className: 'assess-remove-btn', textContent: 'Remove', onClick: function () { removeListItem(key, i); } })
      ]);
      container.appendChild(row);
    });
  }

  function addListItem(key) {
    collectObjectives();
    if (state.objectives[key].length >= 5 && key === 'outcomes') return;
    state.objectives[key].push('');
    renderObjectivesList(key);
  }
  window.addListItem = addListItem;

  function removeListItem(key, idx) {
    collectObjectives();
    state.objectives[key].splice(idx, 1);
    if (state.objectives[key].length === 0) state.objectives[key] = [''];
    renderObjectivesList(key);
  }

  /* ============ STEP 3: PRINCIPLES ============ */
  function renderPrincipleNav() {
    var nav = $('#principleNav');
    if (!nav) return;
    nav.innerHTML = '';
    PRINCIPLES.forEach(function (p, i) {
      var btn = el('button', {
        className: 'principle-nav-btn' + (i === state.currentPrinciple ? ' active' : ''),
        textContent: (i + 1) + '. ' + p.name,
        onClick: function () { switchPrinciple(i); }
      });
      nav.appendChild(btn);
    });
  }

  function switchPrinciple(idx) {
    state.currentPrinciple = idx;
    $$('.principle-nav-btn').forEach(function (b, i) {
      b.classList.toggle('active', i === idx);
    });
    renderPrincipleContent();
  }

  function renderPrincipleContent() {
    var container = $('#principleContent');
    if (!container) return;
    container.innerHTML = '';

    var p = PRINCIPLES[state.currentPrinciple];

    var header = el('div', { className: 'assess-principle-header' }, [
      el('h3', { textContent: p.fullName }),
      el('span', { className: 'assess-principle-num', textContent: 'Principle ' + (state.currentPrinciple + 1) + ' of 6' })
    ]);
    container.appendChild(header);

    // Hard measurement section
    var hardSection = el('div', { className: 'assess-section-label' }, [
      el('span', { className: 'assess-section-tag hard', textContent: 'HARD MEASUREMENT' }),
      el('span', { textContent: ' Scored assessment (0\u20135)' })
    ]);
    container.appendChild(hardSection);

    p.scores.forEach(function (s) {
      container.appendChild(buildScoreItem(p.id + '.' + s.id, s.label, s.prompt));
    });

    // Soft sensemaking section
    var softSection = el('div', { className: 'assess-section-label' }, [
      el('span', { className: 'assess-section-tag soft', textContent: 'SOFT SENSEMAKING' }),
      el('span', { textContent: ' Reflective assessment' })
    ]);
    container.appendChild(softSection);

    p.reflections.forEach(function (r) {
      container.appendChild(buildReflectionItem(p.id + '.' + r.id, r.prompt));
    });

    // Principle navigation
    var pNav = el('div', { className: 'assess-principle-nav' });
    if (state.currentPrinciple > 0) {
      pNav.appendChild(el('button', { className: 'assess-nav-btn assess-nav-prev', textContent: 'Previous principle', onClick: function () { switchPrinciple(state.currentPrinciple - 1); } }));
    }
    if (state.currentPrinciple < 5) {
      pNav.appendChild(el('button', { className: 'assess-nav-btn assess-nav-next', textContent: 'Next principle', onClick: function () { switchPrinciple(state.currentPrinciple + 1); } }));
    }
    container.appendChild(pNav);
  }

  /* ============ STEP 4: CAPABILITIES ============ */
  function renderCapabilities() {
    var container = $('#capabilityContent');
    if (!container) return;
    container.innerHTML = '';

    var hardSection = el('div', { className: 'assess-section-label' }, [
      el('span', { className: 'assess-section-tag hard', textContent: 'HARD MEASUREMENT' }),
      el('span', { textContent: ' Scored assessment (0\u20135)' })
    ]);
    container.appendChild(hardSection);

    CAPABILITIES.forEach(function (c) {
      container.appendChild(buildScoreItem('cap.' + c.id, c.label, c.prompt));
    });

    var softSection = el('div', { className: 'assess-section-label' }, [
      el('span', { className: 'assess-section-tag soft', textContent: 'SOFT SENSEMAKING' }),
      el('span', { textContent: ' Reflective assessment' })
    ]);
    container.appendChild(softSection);

    container.appendChild(buildReflectionItem('cap.gaps', 'What capability gaps matter most for your infrastructure resilience?'));
  }

  /* ============ STEP 5: PDCA ============ */
  function renderPDCA() {
    var container = $('#pdcaContent');
    if (!container) return;
    container.innerHTML = '';

    PDCA.forEach(function (phase) {
      var card = el('div', { className: 'assess-pdca-card' });
      card.appendChild(el('h3', { className: 'assess-pdca-label', textContent: phase.label }));

      card.appendChild(el('div', { className: 'assess-section-label' }, [
        el('span', { className: 'assess-section-tag hard', textContent: 'SCORE' })
      ]));
      card.appendChild(buildScoreItem('pdca.' + phase.id, phase.label, phase.prompt));

      card.appendChild(el('div', { className: 'assess-section-label' }, [
        el('span', { className: 'assess-section-tag soft', textContent: 'REFLECT' })
      ]));
      card.appendChild(buildReflectionItem('pdca.' + phase.id, phase.reflection));

      container.appendChild(card);
    });
  }

  /* ============ SCORE & REFLECTION BUILDERS ============ */
  function buildScoreItem(key, label, prompt) {
    var currentScore = state.scores[key] != null ? state.scores[key] : -1;
    var currentConf = state.confidence[key] || 'medium';

    var item = el('div', { className: 'assess-score-item' });
    item.appendChild(el('div', { className: 'assess-score-label', textContent: label }));
    item.appendChild(el('div', { className: 'assess-score-prompt', textContent: prompt }));

    // Score buttons
    var selector = el('div', { className: 'assess-score-selector' });
    for (var i = 0; i <= 5; i++) {
      (function (val) {
        var btn = el('button', {
          className: 'assess-score-btn' + (val === currentScore ? ' active' : ''),
          onClick: function () {
            state.scores[key] = val;
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
    item.appendChild(selector);

    // Confidence selector
    var confRow = el('div', { className: 'assess-confidence-row' });
    confRow.appendChild(el('span', { className: 'assess-confidence-label', textContent: 'Confidence:' }));
    ['high', 'medium', 'low'].forEach(function (level) {
      var btn = el('button', {
        className: 'assess-confidence-btn' + (level === currentConf ? ' active' : '') + ' conf-' + level,
        textContent: level.charAt(0).toUpperCase() + level.slice(1),
        onClick: function () {
          state.confidence[key] = level;
          confRow.querySelectorAll('.assess-confidence-btn').forEach(function (b) { b.classList.remove('active'); });
          btn.classList.add('active');
          saveState();
        }
      });
      confRow.appendChild(btn);
    });
    item.appendChild(confRow);

    return item;
  }

  function buildReflectionItem(key, prompt) {
    var currentVal = state.reflections[key] || '';
    var item = el('div', { className: 'assess-reflection-item' });
    item.appendChild(el('label', { className: 'assess-reflection-label', textContent: prompt }));
    var textarea = el('textarea', {
      className: 'assess-reflection-input',
      rows: '3',
      placeholder: 'Reflect on your experience\u2026',
      value: currentVal
    });
    textarea.value = currentVal;
    textarea.addEventListener('input', function () {
      state.reflections[key] = textarea.value;
      saveState();
    });
    item.appendChild(textarea);
    return item;
  }

  /* ============ STEP 6: RESULTS ============ */
  function renderResults() {
    var avgs = calculatePrincipleAverages();
    var capAvgs = calculateCapabilityAverages();
    var pdcaAvgs = calculatePDCAAverages();
    var allScores = avgs.concat(capAvgs, pdcaAvgs);
    var overallAvg = 0;
    var count = 0;
    allScores.forEach(function (v) { if (v > 0) { overallAvg += v; count++; } });
    overallAvg = count > 0 ? overallAvg / count : 0;

    // Radar chart
    renderRadarChart(avgs);

    // Maturity
    var maturityEl = $('#maturityContent');
    if (maturityEl) {
      var level = Math.round(overallAvg);
      var pct = Math.round((overallAvg / 5) * 100);
      maturityEl.innerHTML = '';
      maturityEl.appendChild(el('div', { className: 'maturity-score', textContent: overallAvg.toFixed(1) }));
      maturityEl.appendChild(el('div', { className: 'maturity-label', textContent: SCORE_LABELS[Math.min(level, 5)] }));
      var bar = el('div', { className: 'maturity-bar' });
      var fill = el('div', { className: 'maturity-bar-fill' });
      fill.style.width = pct + '%';
      bar.appendChild(fill);
      maturityEl.appendChild(bar);
      maturityEl.appendChild(el('div', { className: 'maturity-pct', textContent: pct + '% of maximum score' }));
    }

    // Confidence
    var confEl = $('#confidenceContent');
    if (confEl) {
      confEl.innerHTML = '';
      var lowConf = [];
      Object.keys(state.confidence).forEach(function (key) {
        if (state.confidence[key] === 'low') lowConf.push(key);
      });
      if (lowConf.length === 0) {
        confEl.appendChild(el('p', { className: 'assess-muted', textContent: 'No low-confidence ratings recorded.' }));
      } else {
        var ul = el('ul', { className: 'confidence-list' });
        lowConf.forEach(function (key) {
          ul.appendChild(el('li', { textContent: formatKey(key) + ' (score: ' + (state.scores[key] != null ? state.scores[key] : 'N/A') + ')' }));
        });
        confEl.appendChild(el('p', { textContent: lowConf.length + ' item(s) rated with low confidence:' }));
        confEl.appendChild(ul);
      }
    }

    // Gaps
    var gapsEl = $('#gapsContent');
    if (gapsEl) {
      gapsEl.innerHTML = '';
      var gaps = identifyGaps();
      if (gaps.length === 0) {
        gapsEl.appendChild(el('p', { className: 'assess-muted', textContent: 'No significant gaps identified (all scores 3 or above).' }));
      } else {
        var table = el('table', { className: 'gaps-table' });
        var thead = el('thead', {}, [
          el('tr', {}, [
            el('th', { textContent: 'Area' }),
            el('th', { textContent: 'Item' }),
            el('th', { textContent: 'Score' }),
            el('th', { textContent: 'Level' }),
            el('th', { textContent: 'Confidence' })
          ])
        ]);
        table.appendChild(thead);
        var tbody = el('tbody');
        gaps.forEach(function (g) {
          tbody.appendChild(el('tr', { className: g.score <= 1 ? 'gap-critical' : '' }, [
            el('td', { textContent: g.area }),
            el('td', { textContent: g.item }),
            el('td', { textContent: String(g.score) }),
            el('td', { textContent: SCORE_LABELS[g.score] }),
            el('td', { textContent: g.confidence })
          ]));
        });
        table.appendChild(tbody);
        gapsEl.appendChild(table);
      }
    }

    // Suggestions
    var sugEl = $('#suggestionsContent');
    if (sugEl) {
      sugEl.innerHTML = '';
      var suggestions = generateSuggestions(avgs, capAvgs, pdcaAvgs);
      var ol = el('ol', { className: 'suggestions-list' });
      suggestions.forEach(function (s) {
        ol.appendChild(el('li', {}, [
          el('strong', { textContent: s.area + ': ' }),
          document.createTextNode(s.text)
        ]));
      });
      sugEl.appendChild(ol);
    }
  }

  function calculatePrincipleAverages() {
    return PRINCIPLES.map(function (p) {
      var sum = 0; var count = 0;
      p.scores.forEach(function (s) {
        var v = state.scores[p.id + '.' + s.id];
        if (v != null && v >= 0) { sum += v; count++; }
      });
      return count > 0 ? sum / count : 0;
    });
  }

  function calculateCapabilityAverages() {
    return CAPABILITIES.map(function (c) {
      var v = state.scores['cap.' + c.id];
      return (v != null && v >= 0) ? v : 0;
    });
  }

  function calculatePDCAAverages() {
    return PDCA.map(function (p) {
      var v = state.scores['pdca.' + p.id];
      return (v != null && v >= 0) ? v : 0;
    });
  }

  function identifyGaps() {
    var gaps = [];
    PRINCIPLES.forEach(function (p) {
      p.scores.forEach(function (s) {
        var key = p.id + '.' + s.id;
        var score = state.scores[key];
        if (score != null && score < 3) {
          gaps.push({ area: p.name, item: s.label, score: score, confidence: state.confidence[key] || 'medium' });
        }
      });
    });
    CAPABILITIES.forEach(function (c) {
      var key = 'cap.' + c.id;
      var score = state.scores[key];
      if (score != null && score < 3) {
        gaps.push({ area: 'Capabilities', item: c.label, score: score, confidence: state.confidence[key] || 'medium' });
      }
    });
    PDCA.forEach(function (p) {
      var key = 'pdca.' + p.id;
      var score = state.scores[key];
      if (score != null && score < 3) {
        gaps.push({ area: 'Operational Cycle', item: p.label, score: score, confidence: state.confidence[key] || 'medium' });
      }
    });
    gaps.sort(function (a, b) { return a.score - b.score; });
    return gaps;
  }

  function generateSuggestions(pAvgs, cAvgs, pdcaAvgs) {
    var suggestions = [];

    PRINCIPLES.forEach(function (p, i) {
      var avg = pAvgs[i];
      if (avg < 2) suggestions.push({ area: p.name, text: 'Establish foundational processes and governance for ' + p.fullName.toLowerCase() + '.' });
      else if (avg < 3) suggestions.push({ area: p.name, text: 'Formalise and strengthen capabilities for ' + p.fullName.toLowerCase() + '.' });
      else if (avg < 4) suggestions.push({ area: p.name, text: 'Integrate ' + p.fullName.toLowerCase() + ' across organisational systems and processes.' });
    });

    var capAvg = 0; cAvgs.forEach(function (v) { capAvg += v; }); capAvg /= cAvgs.length || 1;
    if (capAvg < 3) suggestions.push({ area: 'Capabilities', text: 'Strengthen organisational capabilities, particularly in areas scoring below Operational level.' });

    var pdcaAvg = 0; pdcaAvgs.forEach(function (v) { pdcaAvg += v; }); pdcaAvg /= pdcaAvgs.length || 1;
    if (pdcaAvg < 3) suggestions.push({ area: 'Operational Cycle', text: 'Develop a more structured Plan-Do-Check-Act cycle for resilience management.' });

    // Low confidence items
    var lowConf = Object.keys(state.confidence).filter(function (k) { return state.confidence[k] === 'low'; });
    if (lowConf.length > 0) suggestions.push({ area: 'Confidence', text: 'Verify assessment of ' + lowConf.length + ' low-confidence item(s) through independent review or additional data gathering.' });

    if (suggestions.length === 0) suggestions.push({ area: 'General', text: 'Assessment indicates strong overall resilience maturity. Focus on maintaining performance and sharing practices externally.' });

    return suggestions;
  }

  function formatKey(key) {
    var parts = key.split('.');
    var area = parts[0]; var item = parts[1];
    if (area.charAt(0) === 'p') {
      var pIdx = parseInt(area.slice(1)) - 1;
      var p = PRINCIPLES[pIdx];
      if (p) {
        var s = p.scores.find(function (sc) { return sc.id === item; });
        return p.name + ' \u2014 ' + (s ? s.label : item);
      }
    }
    if (area === 'cap') {
      var c = CAPABILITIES.find(function (cc) { return cc.id === item; });
      return 'Capability \u2014 ' + (c ? c.label : item);
    }
    if (area === 'pdca') {
      var pd = PDCA.find(function (pp) { return pp.id === item; });
      return 'PDCA \u2014 ' + (pd ? pd.label : item);
    }
    return key;
  }

  function renderRadarChart(avgs) {
    var canvas = $('#radarChart');
    if (!canvas) return;

    if (radarChart) radarChart.destroy();

    var labels = PRINCIPLES.map(function (p) { return p.name; });

    radarChart = new Chart(canvas, {
      type: 'radar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Principle Score',
          data: avgs,
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
            min: 0,
            max: 5,
            ticks: { stepSize: 1, font: { size: 11 }, backdropColor: 'transparent' },
            pointLabels: { font: { size: 12, family: "'DM Sans', sans-serif", weight: '600' }, color: '#1a1a2e' },
            grid: { color: 'rgba(0,0,0,0.06)' },
            angleLines: { color: 'rgba(0,0,0,0.06)' }
          }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  }

  /* ============ STEP 7: EXPORT ============ */
  function renderExportSummary() {
    var container = $('#exportSummary');
    if (!container) return;
    container.innerHTML = '';

    var avgs = calculatePrincipleAverages();
    var overall = 0; var cnt = 0;
    avgs.forEach(function (v) { if (v > 0) { overall += v; cnt++; } });
    overall = cnt > 0 ? overall / cnt : 0;

    container.appendChild(el('div', { className: 'export-summary-card' }, [
      el('h3', { textContent: 'Assessment Summary' }),
      el('div', { className: 'export-summary-grid' }, [
        el('div', {}, [el('strong', { textContent: 'System: ' }), document.createTextNode(state.context.systemName || 'Not specified')]),
        el('div', {}, [el('strong', { textContent: 'Sector: ' }), document.createTextNode(state.context.sector || 'Not specified')]),
        el('div', {}, [el('strong', { textContent: 'Scale: ' }), document.createTextNode(state.context.scale || 'Not specified')]),
        el('div', {}, [el('strong', { textContent: 'Role: ' }), document.createTextNode(state.context.role || 'Not specified')]),
        el('div', {}, [el('strong', { textContent: 'Overall maturity: ' }), document.createTextNode(overall.toFixed(1) + ' / 5.0 \u2014 ' + SCORE_LABELS[Math.min(Math.round(overall), 5)])]),
        el('div', {}, [el('strong', { textContent: 'Gaps identified: ' }), document.createTextNode(String(identifyGaps().length))]),
        el('div', {}, [el('strong', { textContent: 'Date: ' }), document.createTextNode(new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }))])
      ])
    ]));
  }

  function exportPDF() {
    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF();
    var y = 20;
    var lm = 20;
    var pw = 170;

    // Title
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('Resilient Infrastructure', lm, y);
    y += 8;
    doc.text('Assessment Report', lm, y);
    y += 10;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
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
    doc.text('1. Context', lm, y); y += 7;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text('System: ' + (state.context.systemName || 'Not specified'), lm + 5, y); y += 5;
    doc.text('Sector: ' + (state.context.sector || 'Not specified'), lm + 5, y); y += 5;
    doc.text('Scale: ' + (state.context.scale || 'Not specified'), lm + 5, y); y += 5;
    doc.text('Role: ' + (state.context.role || 'Not specified'), lm + 5, y); y += 10;

    // Objectives
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.text('2. Objectives', lm, y); y += 7;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    if (state.objectives.outcomes.filter(Boolean).length > 0) {
      doc.text('Key outcomes:', lm + 5, y); y += 5;
      state.objectives.outcomes.filter(Boolean).forEach(function (o) {
        doc.text('\u2022 ' + o, lm + 10, y); y += 5;
      });
    }
    y += 5;

    // Principle scores
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.text('3. Principle Scores', lm, y); y += 7;

    var avgs = calculatePrincipleAverages();
    var tableData = PRINCIPLES.map(function (p, i) {
      return [p.name, avgs[i].toFixed(1), SCORE_LABELS[Math.min(Math.round(avgs[i]), 5)]];
    });
    doc.autoTable({
      startY: y,
      head: [['Principle', 'Score', 'Level']],
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
      } catch (e) { /* chart image failed, skip */ }
    }

    // Gaps
    if (y + 30 > 280) { doc.addPage(); y = 20; }
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.text('4. Key Gaps', lm, y); y += 7;
    var gaps = identifyGaps();
    if (gaps.length === 0) {
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text('No significant gaps identified.', lm + 5, y); y += 10;
    } else {
      var gapData = gaps.slice(0, 10).map(function (g) {
        return [g.area, g.item, String(g.score), SCORE_LABELS[g.score], g.confidence];
      });
      doc.autoTable({
        startY: y,
        head: [['Area', 'Item', 'Score', 'Level', 'Confidence']],
        body: gapData,
        margin: { left: lm },
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [0, 101, 189], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 243, 240] }
      });
      y = doc.lastAutoTable.finalY + 10;
    }

    // Suggestions
    if (y + 30 > 280) { doc.addPage(); y = 20; }
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.text('5. Suggested Actions', lm, y); y += 7;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    var suggestions = generateSuggestions(avgs, calculateCapabilityAverages(), calculatePDCAAverages());
    suggestions.forEach(function (s, i) {
      if (y + 10 > 280) { doc.addPage(); y = 20; }
      var lines = doc.splitTextToSize((i + 1) + '. ' + s.area + ': ' + s.text, pw - 10);
      doc.text(lines, lm + 5, y);
      y += lines.length * 5 + 2;
    });

    // Reflections
    if (y + 20 > 280) { doc.addPage(); y = 20; }
    y += 5;
    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.text('6. Reflection Highlights', lm, y); y += 7;
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    var reflKeys = Object.keys(state.reflections).filter(function (k) { return state.reflections[k] && state.reflections[k].trim(); });
    if (reflKeys.length === 0) {
      doc.text('No reflections recorded.', lm + 5, y);
    } else {
      reflKeys.forEach(function (key) {
        if (y + 15 > 280) { doc.addPage(); y = 20; }
        doc.setFont(undefined, 'bold');
        doc.text(formatKey(key) + ':', lm + 5, y); y += 4;
        doc.setFont(undefined, 'normal');
        var lines = doc.splitTextToSize(state.reflections[key], pw - 15);
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
      doc.text('Resilient Infrastructure Assessment Tool \u2014 Visioning Lab & UKCRIC  |  DEMO', lm, 290);
      doc.text('Page ' + i + ' of ' + pageCount, 175, 290);
    }

    doc.save('resilience-assessment-report.pdf');
  }
  window.exportPDF = exportPDF;

  function exportJSON() {
    var data = {
      meta: {
        tool: 'Resilient Infrastructure Assessment Tool',
        version: '1.0-demo',
        exported: new Date().toISOString(),
        credit: 'Visioning Lab & UKCRIC'
      },
      context: state.context,
      objectives: state.objectives,
      scores: state.scores,
      confidence: state.confidence,
      reflections: state.reflections,
      results: {
        principleAverages: {},
        overallMaturity: 0
      }
    };

    var avgs = calculatePrincipleAverages();
    PRINCIPLES.forEach(function (p, i) { data.results.principleAverages[p.id] = avgs[i]; });
    var sum = 0; avgs.forEach(function (v) { sum += v; });
    data.results.overallMaturity = avgs.length > 0 ? sum / avgs.length : 0;

    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'resilience-assessment-data.json';
    a.click();
    URL.revokeObjectURL(url);
  }
  window.exportJSON = exportJSON;

  /* ============ LOCAL STORAGE ============ */
  var STORAGE_KEY = 'dir-resilience-assessment';

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) { /* storage full or disabled */ }
  }

  function loadState() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        var parsed = JSON.parse(saved);
        state.currentStep = parsed.currentStep || 1;
        state.currentPrinciple = parsed.currentPrinciple || 0;
        state.context = parsed.context || state.context;
        state.objectives = parsed.objectives || state.objectives;
        state.scores = parsed.scores || {};
        state.confidence = parsed.confidence || {};
        state.reflections = parsed.reflections || {};
        return true;
      }
    } catch (e) { /* invalid data */ }
    return false;
  }

  function saveProgress() {
    collectCurrentStep();
    saveState();
    var btn = document.querySelector('.assess-storage-btn');
    if (btn) {
      var orig = btn.textContent;
      btn.textContent = 'Saved';
      btn.classList.add('saved');
      setTimeout(function () { btn.textContent = orig; btn.classList.remove('saved'); }, 1500);
    }
  }
  window.saveProgress = saveProgress;

  function clearProgress() {
    if (!confirm('Clear all assessment data and start over?')) return;
    localStorage.removeItem(STORAGE_KEY);
    state = {
      currentStep: 1,
      currentPrinciple: 0,
      context: { sector: '', scale: '', systemName: '', role: '' },
      objectives: { outcomes: [''], responsibilities: [''], stakeholders: [''] },
      scores: {},
      confidence: {},
      reflections: {}
    };
    init();
  }
  window.clearProgress = clearProgress;

  /* ============ INIT ============ */
  function init() {
    var resumed = loadState();

    // Populate context fields
    if (state.context.sector) $('#ctxSector').value = state.context.sector;
    if (state.context.scale) $('#ctxScale').value = state.context.scale;
    if (state.context.systemName) $('#ctxSystem').value = state.context.systemName;
    if (state.context.role) $('#ctxRole').value = state.context.role;

    // Render objectives
    ['outcomes', 'responsibilities', 'stakeholders'].forEach(function (key) {
      renderObjectivesList(key);
    });

    // Render dynamic content
    renderPrincipleNav();
    renderPrincipleContent();
    renderCapabilities();
    renderPDCA();

    // Go to saved step
    goToStep(state.currentStep);
  }

  if (document.getElementById('assessProgress')) {
    document.addEventListener('DOMContentLoaded', init);
  }

})();
