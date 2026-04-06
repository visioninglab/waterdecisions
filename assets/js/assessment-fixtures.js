/* ============================================================
   Water Case Study Fixtures for 7-Minute Resilience Diagnostic
   ============================================================ */
var CASE_STUDY_FIXTURES = {

  'singapore-dtss': {
    title: 'Singapore Deep Tunnel Sewerage System (DTSS)',
    link: 'singapore-dtss.html',
    system: {
      name: 'Singapore Deep Tunnel Sewerage System (DTSS)',
      sector: 'water',
      scale: 'national',
      role: 'Public Utilities Board (PUB) \u2014 National Water Agency'
    },
    priorities: {
      outcomes: [
        'National water security and self-sufficiency',
        'Sustainable used-water reclamation (NEWater)',
        '100-year design lifespan with climate resilience'
      ],
      concerns: ['climate', 'interdep', 'supply'],
      stakeholders: [
        'Public Utilities Board (PUB)',
        'Government of Singapore',
        'AECOM / Black & Veatch (Phase 2 JV)'
      ]
    },
    principleScores: { p1: 4, p2: 5, p3: 4, p4: 3, p5: 5, p6: 4 },
    principleConfidence: { p1: 'medium', p2: 'high', p3: 'high', p4: 'medium', p5: 'high', p6: 'high' },
    principleReflections: {
      p2: 'Deep tunnels at 30\u201360m provide flood resilience; 206km gravity-flow network.',
      p3: 'Tuas WRP integrates water and waste; NEWater supplies 55% of needs.',
      p5: 'Centralised PUB governance with Four National Taps strategy.'
    },
    decisionClarity: { strategy: 5, operations: 5, investment: 5, coordination: 4, monitoring: 4 },
    sdgs: ['SDG 6', 'SDG 9', 'SDG 11', 'SDG 13', 'SDG 17']
  },

  'china-hydraulic': {
    title: 'Dujiangyan Irrigation System',
    link: 'china-hydraulic.html',
    system: {
      name: 'Dujiangyan Irrigation System',
      sector: 'water',
      scale: 'regional',
      role: 'Heritage and water resource manager'
    },
    priorities: {
      outcomes: [
        'Flood control without damming the river',
        'Agricultural irrigation for the Chengdu Plain',
        'World Heritage cultural preservation'
      ],
      concerns: ['flood', 'climate', 'social'],
      stakeholders: [
        'Sichuan Provincial Government',
        'Local farming communities',
        'UNESCO World Heritage Committee'
      ]
    },
    principleScores: { p1: 5, p2: 5, p3: 5, p4: 4, p5: 3, p6: 5 },
    principleConfidence: { p1: 'high', p2: 'high', p3: 'high', p4: 'medium', p5: 'medium', p6: 'high' },
    principleReflections: {
      p1: '2,300 years of empirical learning through annual dredging and maintenance.',
      p3: 'Zero environmental impact \u2014 works with natural river dynamics, no dam.',
      p4: '2003: public campaign halted the destructive Yangliuhu dam project.'
    },
    decisionClarity: { strategy: 4, operations: 5, investment: 3, coordination: 3, monitoring: 4 },
    sdgs: ['SDG 6', 'SDG 9', 'SDG 11', 'SDG 13']
  },

  'uk-thames-barrier': {
    title: 'UK Thames Flood Barrier',
    link: 'uk-thames-barrier.html',
    system: {
      name: 'Thames Flood Barrier & TE2100 Programme',
      sector: 'water',
      scale: 'regional',
      role: 'Environment Agency \u2014 Thames Estuary Flood Risk'
    },
    priorities: {
      outcomes: [
        'Protect London from tidal surge flooding',
        'Adaptive long-term strategy through TE2100 plan',
        'Coordinate multi-agency flood risk management'
      ],
      concerns: ['flood', 'climate', 'ageing', 'interdep'],
      stakeholders: [
        'Environment Agency',
        'London boroughs',
        'Thames Water'
      ]
    },
    principleScores: { p1: 4, p2: 5, p3: 2, p4: 2, p5: 4, p6: 5 },
    principleConfidence: { p1: 'high', p2: 'high', p3: 'low', p4: 'low', p5: 'high', p6: 'high' },
    principleReflections: {
      p1: 'Every barrier closure generates operational data that informs forecasting and asset management.',
      p2: 'Built proactively after 1953 flood; active deployable defence tested monthly.',
      p6: 'TE2100 provides adaptive pathways with decision points based on actual sea level rise.'
    },
    decisionClarity: { strategy: 5, operations: 4, investment: 4, coordination: 3, monitoring: 4 },
    sdgs: ['SDG 6', 'SDG 11', 'SDG 13']
  }
};
