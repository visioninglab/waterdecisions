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
    'london':      { lat: 51.51, long: -0.12, dist: 30, label: 'London' },
    'manchester':  { lat: 53.48, long: -2.24, dist: 30, label: 'Manchester' },
    'birmingham':  { lat: 52.49, long: -1.89, dist: 30, label: 'Birmingham' },
    'leeds':       { lat: 53.80, long: -1.55, dist: 30, label: 'Leeds / Yorkshire' },
    'bristol':     { lat: 51.45, long: -2.59, dist: 30, label: 'Bristol / South West' },
    'newcastle':   { lat: 54.97, long: -1.61, dist: 30, label: 'Newcastle / North East' },
    'nottingham':  { lat: 52.95, long: -1.15, dist: 30, label: 'Nottingham / Trent' },
    'cambridge':   { lat: 52.21, long:  0.12, dist: 35, label: 'Cambridge / Anglian' },
    'oxford':      { lat: 51.75, long: -1.26, dist: 30, label: 'Oxford / Thames Valley' },
    'exeter':      { lat: 50.72, long: -3.53, dist: 35, label: 'Exeter / Devon' }
  };

  // Haversine distance (km) between two lat/long points
  function distKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  document.getElementById('liveLoadBtn')?.addEventListener('click', loadLiveData);

  const FETCH_OPTS = { headers: { 'Accept': 'application/json' } };

  async function loadLiveData() {
    const regionKey = document.getElementById('liveRegion').value;
    const grid = document.getElementById('liveGrid');
    const statusEl = document.getElementById('liveStatus');

    if (!regionKey) {
      statusEl.innerHTML = '<span class="wq-warn">Please select a region.</span>';
      return;
    }

    const region = REGIONS[regionKey];
    const btn = document.getElementById('liveLoadBtn');
    btn.disabled = true;
    btn.textContent = 'Loading\u2026';
    statusEl.innerHTML = `<span class="wq-loading">Connecting to Environment Agency API for ${region.label}&hellip;</span>`;
    grid.innerHTML = '';

    try {
      // Two parallel API calls: nearby stations + latest readings
      const [stationsResp, readingsResp] = await Promise.all([
        fetch(`${EA_API}/id/stations?lat=${region.lat}&long=${region.long}&dist=${region.dist}&_limit=100`, FETCH_OPTS),
        fetch(`${EA_API}/data/readings?latest&_limit=2000`, FETCH_OPTS)
      ]);

      if (!stationsResp.ok) throw new Error(`Stations API returned ${stationsResp.status}`);
      if (!readingsResp.ok) throw new Error(`Readings API returned ${readingsResp.status}`);

      const stationsData = await stationsResp.json();
      const readingsData = await readingsResp.json();

      const stations = stationsData.items || [];
      const readings = readingsData.items || [];

      statusEl.innerHTML = `<span class="wq-loading">Found ${stations.length} stations and ${readings.length} readings. Matching&hellip;</span>`;

      // Build a lookup: station reference -> station info
      const stationMap = {};
      stations.forEach(s => {
        const ref = s.stationReference || (s['@id'] || '').split('/').pop();
        if (ref) {
          stationMap[ref] = {
            name: s.label || ref,
            river: s.riverName || '',
            town: s.town || '',
            catchment: s.catchmentName || '',
            lat: s.lat,
            long: s.long
          };
        }
      });

      // Match readings to nearby stations
      const results = [];
      readings.forEach(r => {
        const measureUrl = (typeof r.measure === 'string') ? r.measure : (r.measure?.['@id'] || '');
        const parts = measureUrl.split('/measures/');
        if (parts.length < 2) return;
        const measureId = parts[1];
        const stationRef = measureId.split('-')[0];

        if (!stationMap[stationRef]) return;
        const s = stationMap[stationRef];
        const km = (s.lat && s.long) ? distKm(region.lat, region.long, s.lat, s.long) : 0;

        // Parse parameter from measure string
        const paramParts = measureId.split('-');
        const param = paramParts.length > 1 ? paramParts[1] : 'level';

        results.push({
          name: s.name,
          river: s.river,
          town: s.town,
          catchment: s.catchment,
          value: r.value,
          dateTime: r.dateTime,
          param: param,
          km: Math.round(km * 10) / 10
        });
      });

      if (results.length === 0) {
        statusEl.innerHTML = `<span class="wq-warn">No live readings matched stations near ${region.label}. The EA API may have limited real-time data. Try London or Oxford for best coverage.</span>`;
        return;
      }

      results.sort((a, b) => a.km - b.km);
      const display = results.slice(0, 20);

      statusEl.innerHTML = `<span class="wq-ok">${results.length} readings from ${Object.keys(stationMap).length} stations near ${region.label} &bull; ${new Date().toLocaleTimeString()}</span>`;

      grid.innerHTML = display.map(r => {
        const time = new Date(r.dateTime);
        const ago = Math.round((Date.now() - time) / 60000);
        const agoText = ago < 60 ? `${ago} min ago` : ago < 1440 ? `${Math.round(ago / 60)}h ago` : `${Math.round(ago / 1440)}d ago`;
        const paramLabel = r.param === 'level' ? 'Water Level' : r.param === 'flow' ? 'Flow' : r.param === 'rainfall' ? 'Rainfall' : r.param;
        return `
          <div class="wq-live-card">
            <div class="wq-live-name">${r.name}</div>
            <div class="wq-live-river">${[r.river, r.catchment, r.town].filter(Boolean).join(' &bull; ')}</div>
            <div class="wq-live-value">${typeof r.value === 'number' ? r.value.toFixed(3) : r.value} <span class="wq-live-unit">${paramLabel}</span></div>
            <div class="wq-live-meta"><span class="wq-live-param">${r.km} km away</span> &bull; <span class="wq-live-time">${agoText}</span></div>
          </div>
        `;
      }).join('');

    } catch (err) {
      statusEl.innerHTML = `<span class="wq-warn">Error: ${err.message}. Check browser console for details.</span>`;
      console.error('Live monitoring error:', err);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Load Data';
    }
  }

  /* ── Init ── */
  loadData();
})();
