/* ============================================================
   Water Quality Dashboard — Client-Side Logic
   Reads pre-fetched JSON data, renders map + cards + charts
   ============================================================ */

(function () {
  'use strict';

  // --- State ---
  let stations = [];
  let readings = {};      // stationId -> [{measure, value, dateTime}]
  let floodWarnings = [];
  let determinands = [];
  let dataMeta = {};
  let map = null;
  let markers = [];
  let markerLayer = null;
  let currentPage = 1;
  const PAGE_SIZE = 24;
  let filteredStations = [];
  let detChart = null;

  // --- Data Loading ---
  async function loadData() {
    const base = document.querySelector('link[rel="icon"]')?.href?.replace(/favicon\.svg.*/, '') || './';
    const dataBase = base + '_data/water-quality/';

    // Try loading from Jekyll-injected data first, fall back to fetch
    try {
      const [stationsRes, readingsRes, floodsRes, detRes, metaRes] = await Promise.allSettled([
        fetch(dataBase + 'stations.json'),
        fetch(dataBase + 'latest-readings.json'),
        fetch(dataBase + 'flood-warnings.json'),
        fetch(dataBase + 'determinands.json'),
        fetch(dataBase + 'data-meta.json')
      ]);

      if (stationsRes.status === 'fulfilled' && stationsRes.value.ok) {
        const d = await stationsRes.value.json();
        stations = d.stations || [];
      }
      if (readingsRes.status === 'fulfilled' && readingsRes.value.ok) {
        const d = await readingsRes.value.json();
        indexReadings(d.readings || []);
      }
      if (floodsRes.status === 'fulfilled' && floodsRes.value.ok) {
        const d = await floodsRes.value.json();
        floodWarnings = d.warnings || [];
      }
      if (detRes.status === 'fulfilled' && detRes.value.ok) {
        const d = await detRes.value.json();
        determinands = d.determinands || [];
      }
      if (metaRes.status === 'fulfilled' && metaRes.value.ok) {
        dataMeta = await metaRes.value.json();
      }
    } catch (e) {
      console.warn('Data loading error:', e);
    }

    // If no pre-fetched stations, load live from EA API as fallback
    if (stations.length === 0) {
      await loadLiveData();
    }

    renderAll();
  }

  async function loadLiveData() {
    const API = 'https://environment.data.gov.uk/flood-monitoring';
    try {
      const [stRes, rdRes, flRes] = await Promise.allSettled([
        fetch(API + '/id/stations?status=Active&_limit=10000'),
        fetch(API + '/data/readings?latest&_limit=10000'),
        fetch(API + '/id/floods')
      ]);

      if (stRes.status === 'fulfilled' && stRes.value.ok) {
        const d = await stRes.value.json();
        stations = (d.items || []).map(s => ({
          id: s.notation || s.stationReference || '',
          label: s.label || '',
          river: s.riverName || '',
          catchment: s.catchmentName || '',
          town: s.town || '',
          lat: s.lat || null,
          lng: s.long || null,
          type: (s.type || '').toString().split('/').pop() || 'Unknown',
          dateOpened: s.dateOpened || '',
          measures: (Array.isArray(s.measures) ? s.measures : (s.measures ? [s.measures] : [])).map(m => ({
            id: (m.notation || m['@id'] || '').toString().split('/').pop(),
            parameter: m.parameter || '',
            parameterName: m.parameterName || '',
            qualifier: m.qualifier || '',
            unit: m.unitName || '',
            period: m.period || null
          }))
        })).filter(s => s.lat && s.lng);
      }

      if (rdRes.status === 'fulfilled' && rdRes.value.ok) {
        const d = await rdRes.value.json();
        const rds = (d.items || []).map(r => {
          const mid = (r.measure || '').toString().split('/').pop();
          return { stationId: mid.split('-')[0], measure: mid, value: r.value, dateTime: r.dateTime || '' };
        });
        indexReadings(rds);
      }

      if (flRes.status === 'fulfilled' && flRes.value.ok) {
        const d = await flRes.value.json();
        floodWarnings = (d.items || []).map(w => ({
          severity: w.severityLevel || null,
          severityLabel: w.severity || '',
          area: w.floodArea ? (w.floodArea.label || '') : '',
          message: w.message || '',
          timeRaised: w.timeRaised || ''
        })).filter(w => w.severity && w.severity <= 3);
      }

      dataMeta = { lastFetch: new Date().toISOString(), stationCount: stations.length, note: 'Live API fallback' };
    } catch (e) {
      console.warn('Live API fallback failed:', e);
    }
  }

  function indexReadings(rds) {
    readings = {};
    rds.forEach(r => {
      if (!readings[r.stationId]) readings[r.stationId] = [];
      readings[r.stationId].push(r);
    });
  }

  // --- Render All ---
  function renderAll() {
    updateFreshnessBar();
    initMap();
    populateCatchmentFilter();
    applyFilters();
    renderDeterminands();
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  // --- Freshness Bar ---
  function updateFreshnessBar() {
    const dot = document.getElementById('wqFreshnessDot');
    const text = document.getElementById('wqFreshnessText');
    const sc = document.getElementById('wqStationCount');
    const rc = document.getElementById('wqReadingCount');
    const wc = document.getElementById('wqWarningCount');

    sc.textContent = stations.length.toLocaleString();
    rc.textContent = Object.values(readings).reduce((s, a) => s + a.length, 0).toLocaleString();
    wc.textContent = floodWarnings.length;

    if (dataMeta.lastFetch) {
      const age = Math.round((Date.now() - new Date(dataMeta.lastFetch).getTime()) / 3600000);
      dot.className = 'wq-freshness-dot ' + (age < 7 ? 'wq-fresh' : age < 24 ? 'wq-stale' : 'wq-old');
      text.textContent = age < 1 ? 'Data updated less than 1 hour ago' : 'Data updated ' + age + ' hours ago';
      if (dataMeta.note) text.textContent += ' (' + dataMeta.note + ')';
    } else {
      dot.className = 'wq-freshness-dot wq-stale';
      text.textContent = 'No pre-fetched data — run GitHub Actions workflow to populate';
    }
  }

  // --- Flood Warnings ---
  function renderFloodWarnings() {
    const panel = document.getElementById('wqFloodPanel');
    const list = document.getElementById('wqFloodList');
    if (!floodWarnings.length) { panel.style.display = 'none'; return; }

    panel.style.display = 'block';
    list.innerHTML = floodWarnings.slice(0, 20).map(w => {
      const cls = w.severity === 1 ? 'wq-flood-severe' : w.severity === 2 ? 'wq-flood-warning' : 'wq-flood-alert';
      const icon = w.severity === 1 ? 'alert-octagon' : w.severity === 2 ? 'alert-triangle' : 'info';
      const label = w.severity === 1 ? 'SEVERE' : w.severity === 2 ? 'WARNING' : 'ALERT';
      const time = w.timeRaised ? new Date(w.timeRaised).toLocaleString() : '';
      return '<div class="wq-flood-card ' + cls + '">' +
        '<div class="wq-flood-header"><i data-lucide="' + icon + '" style="width:16px;height:16px;display:inline;vertical-align:-2px;margin-right:4px;"></i><strong>' + label + '</strong> — ' + escHtml(w.area) + '</div>' +
        '<div class="wq-flood-msg">' + escHtml(w.message).substring(0, 200) + '</div>' +
        (time ? '<div class="wq-flood-time">Raised: ' + time + '</div>' : '') +
        '</div>';
    }).join('');
  }

  // --- Map ---
  function initMap() {
    if (map) { map.remove(); map = null; }
    map = L.map('wqMap').setView([53.5, -1.5], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18
    }).addTo(map);
    markerLayer = L.layerGroup().addTo(map);
    plotMarkers(stations);
  }

  function plotMarkers(stns) {
    markerLayer.clearLayers();
    markers = [];
    const bounds = [];

    stns.forEach(s => {
      if (!s.lat || !s.lng) return;
      const hasReadings = readings[s.id] && readings[s.id].length > 0;
      const color = hasReadings ? '#059669' : '#9ca3af';
      const marker = L.circleMarker([s.lat, s.lng], {
        radius: 5, fillColor: color, color: '#fff', weight: 1, fillOpacity: 0.8
      });
      marker.bindPopup(
        '<strong>' + escHtml(s.label) + '</strong><br>' +
        (s.river ? 'River: ' + escHtml(s.river) + '<br>' : '') +
        (s.catchment ? 'Catchment: ' + escHtml(s.catchment) + '<br>' : '') +
        (s.town ? 'Town: ' + escHtml(s.town) + '<br>' : '') +
        (hasReadings ? '<br><em>' + readings[s.id].length + ' readings</em>' : '<em>No current readings</em>') +
        '<br><a href="javascript:void(0)" onclick="showStationDetail(\'' + s.id + '\')">View detail &rarr;</a>'
      );
      marker.on('click', () => showStationDetail(s.id));
      markerLayer.addLayer(marker);
      markers.push({ marker, station: s });
      bounds.push([s.lat, s.lng]);
    });

    if (bounds.length > 0) map.fitBounds(bounds, { padding: [20, 20] });
  }

  // --- Catchment Filter ---
  function populateCatchmentFilter() {
    const sel = document.getElementById('wqCatchmentFilter');
    const catchments = [...new Set(stations.map(s => s.catchment).filter(Boolean))].sort();
    sel.innerHTML = '<option value="">All catchments (' + catchments.length + ')</option>' +
      catchments.map(c => '<option value="' + escHtml(c) + '">' + escHtml(c) + '</option>').join('');
    sel.addEventListener('change', applyFilters);
    document.getElementById('wqSearchInput').addEventListener('input', applyFilters);
  }

  function applyFilters() {
    const catchment = document.getElementById('wqCatchmentFilter').value.toLowerCase();
    const search = document.getElementById('wqSearchInput').value.toLowerCase().trim();

    filteredStations = stations.filter(s => {
      if (catchment && (s.catchment || '').toLowerCase() !== catchment) return false;
      if (search) {
        const haystack = (s.label + ' ' + s.river + ' ' + s.town + ' ' + s.catchment + ' ' + s.id).toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });

    currentPage = 1;
    renderStationCards();
    plotMarkers(filteredStations);
    updateSummary();
  }

  function updateSummary() {
    document.getElementById('wqTotalStations').textContent = filteredStations.length.toLocaleString();
    const catchments = new Set(filteredStations.map(s => s.catchment).filter(Boolean));
    document.getElementById('wqTotalCatchments').textContent = catchments.size;
    const withReadings = filteredStations.filter(s => readings[s.id] && readings[s.id].length > 0).length;
    const pct = filteredStations.length > 0 ? Math.round(withReadings / filteredStations.length * 100) : 0;
    document.getElementById('wqGoodPct').textContent = pct;
    document.getElementById('wqFilteredCount').textContent = filteredStations.length + ' stations';
  }

  // --- Station Cards ---
  function renderStationCards() {
    const container = document.getElementById('wqStationCards');
    const start = (currentPage - 1) * PAGE_SIZE;
    const page = filteredStations.slice(start, start + PAGE_SIZE);

    if (page.length === 0) {
      container.innerHTML = '<div class="wq-loading">No stations match your filters</div>';
      document.getElementById('wqPagination').innerHTML = '';
      return;
    }

    container.innerHTML = page.map(s => {
      const rds = readings[s.id] || [];
      const primary = rds[0];
      const trend = getTrend(s.id);
      const trendIcon = trend === 'rising' ? '&#8599;' : trend === 'falling' ? '&#8600;' : '&#8594;';

      return '<div class="wq-station-card" onclick="showStationDetail(\'' + s.id + '\')">' +
        '<div class="wq-sc-header">' +
          '<span class="wq-sc-dot ' + (rds.length ? 'wq-dot-active' : 'wq-dot-inactive') + '"></span>' +
          '<strong>' + escHtml(s.label) + '</strong>' +
        '</div>' +
        (s.river ? '<div class="wq-sc-river">' + escHtml(s.river) + '</div>' : '') +
        '<div class="wq-sc-reading">' +
          (primary ? '<span class="wq-sc-value">' + primary.value + '</span>' : '<span class="wq-sc-nodata">No data</span>') +
          (primary ? ' <span class="wq-sc-trend">' + trendIcon + '</span>' : '') +
        '</div>' +
        (s.catchment ? '<div class="wq-sc-catchment">' + escHtml(s.catchment) + '</div>' : '') +
        '<div class="wq-sc-footer">' + rds.length + ' measure' + (rds.length !== 1 ? 's' : '') + '</div>' +
        '</div>';
    }).join('');

    renderPagination();
  }

  function renderPagination() {
    const total = Math.ceil(filteredStations.length / PAGE_SIZE);
    if (total <= 1) { document.getElementById('wqPagination').innerHTML = ''; return; }
    let html = '';
    if (currentPage > 1) html += '<button onclick="goPage(' + (currentPage - 1) + ')">&laquo; Prev</button>';
    html += '<span>Page ' + currentPage + ' of ' + total + '</span>';
    if (currentPage < total) html += '<button onclick="goPage(' + (currentPage + 1) + ')">Next &raquo;</button>';
    document.getElementById('wqPagination').innerHTML = html;
  }

  function getTrend(stationId) {
    // Placeholder — with historical data from archives, calculate actual trend
    const rds = readings[stationId] || [];
    if (rds.length < 2) return 'stable';
    return 'stable';
  }

  // --- Station Detail ---
  window.showStationDetail = function (id) {
    const s = stations.find(st => st.id === id);
    if (!s) return;

    const panel = document.getElementById('wqStationDetail');
    panel.style.display = 'block';
    document.getElementById('wqDetailTitle').textContent = s.label;

    const rds = readings[id] || [];
    const measures = s.measures || [];

    document.getElementById('wqDetailMeta').innerHTML =
      '<div class="wq-dm-grid">' +
      '<div><strong>Station ID</strong><br>' + escHtml(s.id) + '</div>' +
      '<div><strong>River</strong><br>' + escHtml(s.river || 'N/A') + '</div>' +
      '<div><strong>Catchment</strong><br>' + escHtml(s.catchment || 'N/A') + '</div>' +
      '<div><strong>Town</strong><br>' + escHtml(s.town || 'N/A') + '</div>' +
      '<div><strong>Type</strong><br>' + escHtml(s.type || 'Unknown') + '</div>' +
      '<div><strong>Opened</strong><br>' + escHtml(s.dateOpened || 'N/A') + '</div>' +
      '<div><strong>Coordinates</strong><br>' + (s.lat ? s.lat.toFixed(4) + ', ' + s.lng.toFixed(4) : 'N/A') + '</div>' +
      '<div><strong>Measures</strong><br>' + measures.length + '</div>' +
      '</div>';

    let readingsHtml = '<table class="wq-table wq-table-sm"><thead><tr><th>Measure</th><th>Value</th><th>Unit</th><th>Time</th></tr></thead><tbody>';
    if (rds.length > 0) {
      rds.forEach(r => {
        const m = measures.find(mm => r.measure && r.measure.startsWith(mm.id));
        readingsHtml += '<tr><td>' + escHtml(m ? (m.parameterName + ' (' + m.qualifier + ')') : r.measure) + '</td>' +
          '<td><strong>' + r.value + '</strong></td>' +
          '<td>' + escHtml(m ? m.unit : '') + '</td>' +
          '<td>' + (r.dateTime ? new Date(r.dateTime).toLocaleString() : '') + '</td></tr>';
      });
    } else {
      readingsHtml += '<tr><td colspan="4">No current readings available</td></tr>';
    }
    readingsHtml += '</tbody></table>';
    document.getElementById('wqDetailReadings').innerHTML = readingsHtml;

    // Simple bar chart of readings
    renderDetailChart(rds, measures);

    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  function renderDetailChart(rds, measures) {
    const ctx = document.getElementById('wqDetailChart');
    if (detChart) { detChart.destroy(); detChart = null; }
    if (rds.length === 0) return;

    const labels = rds.map(r => {
      const m = measures.find(mm => r.measure && r.measure.startsWith(mm.id));
      return m ? m.parameterName + ' (' + m.qualifier + ')' : r.measure.substring(0, 20);
    });

    detChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Latest Reading',
          data: rds.map(r => r.value),
          backgroundColor: 'rgba(200, 150, 45, 0.6)',
          borderColor: 'rgba(200, 150, 45, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } }
      }
    });
  }

  window.closeStationDetail = function () {
    document.getElementById('wqStationDetail').style.display = 'none';
    if (detChart) { detChart.destroy(); detChart = null; }
  };

  window.goPage = function (p) {
    currentPage = p;
    renderStationCards();
    document.getElementById('wqStationCards').scrollIntoView({ behavior: 'smooth' });
  };

  // --- Determinands Table ---
  function renderDeterminands() {
    const tbody = document.getElementById('wqDetBody');
    if (!determinands.length) {
      tbody.innerHTML = '<tr><td colspan="7">Loading determinands data...</td></tr>';
      return;
    }
    renderDetRows(determinands);
  }

  function renderDetRows(dets) {
    const tbody = document.getElementById('wqDetBody');
    tbody.innerHTML = dets.map(d => {
      const t = d.thresholds || {};
      return '<tr>' +
        '<td><strong>' + escHtml(d.name) + '</strong><br><small>' + escHtml(d.desc || '') + '</small></td>' +
        '<td><span class="wq-cat-badge wq-cat-' + d.category + '">' + capitalize(d.category) + '</span></td>' +
        '<td>' + escHtml(d.unit) + '</td>' +
        '<td class="wq-td-good">' + formatThreshold(t.good) + '</td>' +
        '<td class="wq-td-mod">' + formatThreshold(t.moderate) + '</td>' +
        '<td class="wq-td-poor">' + formatThreshold(t.poor) + '</td>' +
        '<td>' + capitalize(d.waterBodyType) + '</td>' +
        '</tr>';
    }).join('');
  }

  function formatThreshold(t) {
    if (!t) return '—';
    return (t.op || '') + ' ' + t.val;
  }

  window.filterDeterminands = function () {
    const search = document.getElementById('wqDetSearch').value.toLowerCase();
    const cat = document.getElementById('wqDetCategory').value;
    const filtered = determinands.filter(d => {
      if (cat && d.category !== cat) return false;
      if (search && !(d.name + ' ' + d.desc).toLowerCase().includes(search)) return false;
      return true;
    });
    renderDetRows(filtered);
  };

  let detSortCol = -1, detSortAsc = true;
  window.sortDetTable = function (col) {
    if (detSortCol === col) detSortAsc = !detSortAsc;
    else { detSortCol = col; detSortAsc = true; }
    const keys = ['name', 'category', 'unit'];
    if (col < keys.length) {
      determinands.sort((a, b) => {
        const va = (a[keys[col]] || '').toLowerCase();
        const vb = (b[keys[col]] || '').toLowerCase();
        return detSortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      });
      filterDeterminands();
    }
  };

  // --- Section Toggle ---
  window.toggleSection = function (id) {
    const el = document.getElementById(id);
    const icon = document.getElementById(id + 'Icon');
    el.classList.toggle('wq-open');
    if (icon) icon.style.transform = el.classList.contains('wq-open') ? 'rotate(180deg)' : '';
  };

  // --- Export Functions ---
  window.exportCSV = function () {
    const rows = [['Station', 'River', 'Catchment', 'Town', 'Lat', 'Lng', 'Measure', 'Value', 'DateTime']];
    filteredStations.forEach(s => {
      const rds = readings[s.id] || [];
      if (rds.length === 0) {
        rows.push([s.label, s.river, s.catchment, s.town, s.lat, s.lng, '', '', '']);
      } else {
        rds.forEach(r => rows.push([s.label, s.river, s.catchment, s.town, s.lat, s.lng, r.measure, r.value, r.dateTime]));
      }
    });
    const csv = rows.map(r => r.map(c => '"' + String(c || '').replace(/"/g, '""') + '"').join(',')).join('\n');
    download('water-quality-data.csv', csv, 'text/csv');
  };

  window.exportJSON = function () {
    const data = {
      exported: new Date().toISOString(),
      stations: filteredStations.map(s => ({ ...s, readings: readings[s.id] || [] })),
      meta: dataMeta
    };
    download('water-quality-data.json', JSON.stringify(data, null, 2), 'application/json');
  };

  window.exportPDF = function () {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Water Quality Briefing', 14, 20);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Generated: ' + new Date().toLocaleString(), 14, 28);
    doc.text('Data updated: ' + (dataMeta.lastFetch || 'Unknown'), 14, 34);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary', 14, 44);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Stations: ' + filteredStations.length, 14, 52);
    doc.text('Active flood warnings: ' + floodWarnings.length, 14, 58);
    const catchments = [...new Set(filteredStations.map(s => s.catchment).filter(Boolean))];
    doc.text('Catchments: ' + catchments.length, 14, 64);

    if (floodWarnings.length > 0) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Flood Warnings', 14, 76);
      const fRows = floodWarnings.slice(0, 10).map(w => [
        w.severity === 1 ? 'SEVERE' : w.severity === 2 ? 'WARNING' : 'ALERT',
        w.area.substring(0, 40),
        w.timeRaised ? new Date(w.timeRaised).toLocaleDateString() : ''
      ]);
      doc.autoTable({ startY: 80, head: [['Severity', 'Area', 'Raised']], body: fRows, theme: 'grid', styles: { fontSize: 8 } });
    }

    doc.save('water-quality-briefing.pdf');
  };

  window.copyClipboard = function () {
    const lines = [
      'WATER QUALITY SUMMARY',
      'Date: ' + new Date().toLocaleDateString(),
      'Stations: ' + filteredStations.length,
      'Flood Warnings: ' + floodWarnings.length,
      'Data updated: ' + (dataMeta.lastFetch || 'Unknown'),
      '',
      'Source: EA Flood Monitoring API (OGL v3.0)'
    ];
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      const btn = document.querySelector('.wq-export-buttons button:last-child');
      const orig = btn.innerHTML;
      btn.innerHTML = '<i data-lucide="check" style="width:14px;height:14px;display:inline;vertical-align:-2px;margin-right:4px;"></i>Copied!';
      setTimeout(() => { btn.innerHTML = orig; if (typeof lucide !== 'undefined') lucide.createIcons(); }, 2000);
    });
  };

  // --- Utilities ---
  function escHtml(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
  }

  function capitalize(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  }

  function download(filename, content, type) {
    const blob = new Blob([content], { type: type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // --- Init ---
  document.addEventListener('DOMContentLoaded', loadData);
})();
