/* Water Quality Ontology Explorer
   Loads CWQ data from cwq-data.json and connects to EA Flood Monitoring API */

(function () {
  'use strict';

  const BASE = document.querySelector('meta[name="base-url"]')
    ? document.querySelector('meta[name="base-url"]').content
    : (document.querySelector('link[rel="icon"]')?.href?.replace(/\/favicon\.svg$/, '') || '');

  /* ── Resolve asset path ── */
  function assetPath(rel) {
    // Try to get baseurl from the page
    const base = document.querySelector('link[rel="icon"]');
    if (base) {
      const href = base.getAttribute('href');
      const m = href.match(/^(\/[^/]+)\//);
      if (m) return m[1] + '/' + rel;
    }
    return '/' + rel;
  }

  /* ── Load JSON data ── */
  let DATA = null;

  async function loadData() {
    const resp = await fetch(assetPath('assets/js/cwq-data.json'));
    DATA = await resp.json();
    renderDeterminands();
    renderGlossary();
    renderSection82();
  }

  /* ── Tabs ── */
  document.querySelectorAll('.wq-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.wq-tab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.wq-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('panel-' + btn.dataset.tab).classList.add('active');
    });
  });

  /* ── Determinands ── */
  function statusColor(status) {
    if (status === 'good') return '#16a34a';
    if (status === 'moderate') return '#d97706';
    return '#dc2626';
  }

  function renderDeterminands(filter) {
    const grid = document.getElementById('detGrid');
    if (!DATA) return;
    const q = (filter || '').toLowerCase();
    const items = DATA.thresholds.filter(d =>
      !q || d.determinand.toLowerCase().includes(q) ||
      d.definition.toLowerCase().includes(q) ||
      d.source.toLowerCase().includes(q)
    );
    grid.innerHTML = items.map(d => `
      <div class="wq-det-card">
        <div class="wq-det-header">
          <h3>${d.determinand}</h3>
          <span class="wq-det-unit">${d.unit}</span>
        </div>
        <p class="wq-det-def">${d.definition}</p>
        <div class="wq-threshold-bar">
          <div class="wq-th-segment wq-th-good" title="Good: ${d.good}">
            <span class="wq-th-label">Good</span>
            <span class="wq-th-value">${d.good}</span>
          </div>
          <div class="wq-th-segment wq-th-moderate" title="Moderate: ${d.moderate}">
            <span class="wq-th-label">Moderate</span>
            <span class="wq-th-value">${d.moderate}</span>
          </div>
          <div class="wq-th-segment wq-th-poor" title="Poor: ${d.poor}">
            <span class="wq-th-label">Poor</span>
            <span class="wq-th-value">${d.poor}</span>
          </div>
        </div>
        <div class="wq-det-meta">
          <span class="wq-det-source" title="Governance source"><i data-lucide="bookmark" style="width:12px;height:12px;display:inline;vertical-align:-2px;margin-right:3px;"></i>${d.source}</span>
          ${d.class_statistic ? `<span class="wq-det-stat" title="Class statistic">${d.class_statistic}</span>` : ''}
        </div>
        ${d.ontology_mapping ? `<div class="wq-det-onto" title="Ontology mapping"><code>${d.ontology_mapping}</code></div>` : ''}
      </div>
    `).join('');
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  const detSearch = document.getElementById('detSearch');
  if (detSearch) {
    detSearch.addEventListener('input', () => renderDeterminands(detSearch.value));
  }

  /* ── Glossary ── */
  function renderGlossary(filter, catFilter) {
    const list = document.getElementById('wqGlossaryList');
    const catDiv = document.getElementById('catFilters');
    if (!DATA) return;

    // Category filter buttons
    const cats = [...new Set(DATA.glossary.map(g => g.category))].sort();
    catDiv.innerHTML = `<button class="wq-cat-btn ${!catFilter ? 'active' : ''}" data-cat="">All</button>` +
      cats.map(c => `<button class="wq-cat-btn ${catFilter === c ? 'active' : ''}" data-cat="${c}">${c}</button>`).join('');
    catDiv.querySelectorAll('.wq-cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        renderGlossary(document.getElementById('glossarySearchWQ').value, btn.dataset.cat || null);
      });
    });

    const q = (filter || '').toLowerCase();
    const items = DATA.glossary.filter(g =>
      (!q || g.label.toLowerCase().includes(q) || g.definition.toLowerCase().includes(q)) &&
      (!catFilter || g.category === catFilter)
    );

    list.innerHTML = items.map(g => `
      <div class="wq-gloss-item">
        <div class="wq-gloss-head">
          <span class="wq-gloss-cat">${g.category}</span>
          <h4>${g.label}</h4>
          ${g.code ? `<code class="wq-gloss-code">${g.code}</code>` : ''}
        </div>
        <p>${g.definition}</p>
        <div class="wq-gloss-meta">
          ${g.unit && g.unit !== 'N/A' ? `<span class="wq-gloss-unit">Unit: ${g.unit}</span>` : ''}
          <span class="wq-gloss-source">Source: ${g.source}</span>
          ${g.ontology_relation ? `<span class="wq-gloss-rel">Relation: <code>${g.ontology_relation}</code></span>` : ''}
        </div>
        ${g.notes ? `<p class="wq-gloss-notes">${g.notes}</p>` : ''}
      </div>
    `).join('');
  }

  const glossarySearchWQ = document.getElementById('glossarySearchWQ');
  if (glossarySearchWQ) {
    glossarySearchWQ.addEventListener('input', () => {
      const activeCat = document.querySelector('.wq-cat-btn.active');
      renderGlossary(glossarySearchWQ.value, activeCat?.dataset.cat || null);
    });
  }

  /* ── Section 82 ── */
  function renderSection82() {
    const el = document.getElementById('s82Content');
    if (!DATA) return;
    // Group paragraphs into sections based on numbered headings
    let html = '';
    DATA.section82.forEach(line => {
      if (/^\d+\.\s/.test(line)) {
        html += `<h3 class="wq-s82-heading">${line}</h3>`;
      } else if (line.startsWith('Section 82') || line.startsWith('(Environment Act')) {
        html += `<div class="wq-s82-title">${line}</div>`;
      } else {
        html += `<p>${line}</p>`;
      }
    });
    el.innerHTML = html;
  }

  /* ── Live Monitoring (EA Flood Monitoring API) ── */
  const EA_API = 'https://environment.data.gov.uk/flood-monitoring';

  // Regions defined by lat/long centre + search radius (km)
  const REGIONS = {
    'london':      { lat: 51.51, long: -0.12, dist: 15, label: 'London' },
    'manchester':  { lat: 53.48, long: -2.24, dist: 20, label: 'Manchester' },
    'birmingham':  { lat: 52.49, long: -1.89, dist: 20, label: 'Birmingham' },
    'leeds':       { lat: 53.80, long: -1.55, dist: 20, label: 'Leeds / Yorkshire' },
    'bristol':     { lat: 51.45, long: -2.59, dist: 20, label: 'Bristol / South West' },
    'newcastle':   { lat: 54.97, long: -1.61, dist: 20, label: 'Newcastle / North East' },
    'nottingham':  { lat: 52.95, long: -1.15, dist: 20, label: 'Nottingham / Trent' },
    'cambridge':   { lat: 52.21, long:  0.12, dist: 25, label: 'Cambridge / Anglian' },
    'oxford':      { lat: 51.75, long: -1.26, dist: 20, label: 'Oxford / Thames Valley' },
    'exeter':      { lat: 50.72, long: -3.53, dist: 25, label: 'Exeter / Devon' }
  };

  document.getElementById('liveLoadBtn')?.addEventListener('click', loadLiveData);

  async function loadLiveData() {
    const regionKey = document.getElementById('liveRegion').value;
    const grid = document.getElementById('liveGrid');
    const status = document.getElementById('liveStatus');

    if (!regionKey) {
      status.innerHTML = '<span class="wq-warn">Please select a region.</span>';
      return;
    }

    const region = REGIONS[regionKey];
    status.innerHTML = `<span class="wq-loading">Loading live data for ${region.label} from Environment Agency&hellip;</span>`;
    grid.innerHTML = '';

    try {
      // Find stations within radius of the region centre
      const url = `${EA_API}/id/stations?lat=${region.lat}&long=${region.long}&dist=${region.dist}&_limit=50`;
      const resp = await fetch(url);
      const data = await resp.json();
      const stations = data.items || [];

      if (stations.length === 0) {
        status.innerHTML = '<span class="wq-warn">No stations found near ' + region.label + '.</span>';
        return;
      }

      status.innerHTML = `<span class="wq-ok">Found ${stations.length} stations near ${region.label}. Loading latest readings&hellip;</span>`;

      // Get latest reading for each station's first measure
      const readingPromises = stations.slice(0, 16).map(async station => {
        try {
          const measures = station.measures;
          if (!measures || (Array.isArray(measures) && measures.length === 0)) return null;
          const measure = Array.isArray(measures) ? measures[0] : measures;
          const measureId = typeof measure === 'string' ? measure : measure['@id'];
          if (!measureId) return null;

          const readUrl = measureId + '/readings?_sorted&_limit=1';
          const rResp = await fetch(readUrl);
          const rData = await rResp.json();
          const reading = (rData.items || [])[0];
          if (!reading || reading.value === undefined) return null;

          const paramName = (typeof measure === 'object' ? measure.parameterName : null) || 'Level';
          const unitName = (typeof measure === 'object' ? measure.unitName : null) || '';

          return {
            name: station.label || station.notation || 'Unknown',
            river: station.riverName || '',
            town: station.town || '',
            catchment: station.catchmentName || '',
            value: reading.value,
            dateTime: reading.dateTime,
            param: paramName,
            unit: unitName || (paramName.includes('Rainfall') ? 'mm' : 'mASD')
          };
        } catch (e) { return null; }
      });

      const results = (await Promise.all(readingPromises)).filter(Boolean);

      if (results.length === 0) {
        status.innerHTML = '<span class="wq-warn">No recent readings available for ' + region.label + '.</span>';
        return;
      }

      status.innerHTML = `<span class="wq-ok">${results.length} stations with live data near ${region.label} &bull; Updated: ${new Date().toLocaleTimeString()}</span>`;

      grid.innerHTML = results.map(r => {
        const time = new Date(r.dateTime);
        const ago = Math.round((Date.now() - time) / 60000);
        const agoText = ago < 60 ? `${ago} min ago` : ago < 1440 ? `${Math.round(ago / 60)}h ago` : `${Math.round(ago / 1440)}d ago`;
        return `
          <div class="wq-live-card">
            <div class="wq-live-name">${r.name}</div>
            <div class="wq-live-river">${[r.river, r.catchment, r.town].filter(Boolean).join(' &bull; ')}</div>
            <div class="wq-live-value">${typeof r.value === 'number' ? r.value.toFixed(3) : r.value} <span class="wq-live-unit">${r.unit}</span></div>
            <div class="wq-live-meta"><span class="wq-live-param">${r.param}</span> &bull; <span class="wq-live-time">${agoText}</span></div>
          </div>
        `;
      }).join('');

    } catch (err) {
      status.innerHTML = `<span class="wq-warn">Error loading data: ${err.message}</span>`;
    }
  }

  /* ── Init ── */
  loadData();
})();
