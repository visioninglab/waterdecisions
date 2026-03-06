---
title: "European Union &mdash; CyberSecurity for Critical Infrastructure"
slug: europe-cybersecurity
description: "EU CyberSecurity for Critical Infrastructure - NIS2 and CER directives protecting critical entities from cyber threats."
country: European Union
sector: digital
status: published
nav_active: case-studies

# Hero
subtitle: "NIS2 and CER directives to protect critical entities and network/information systems from cyber threats across all EU member states."
breadcrumb_sector_label: Digital
breadcrumb_sector_filter: digital
hero_tags:
  - CyberSecurity
  - NIS2 Directive
  - Critical Infrastructure
  - EU Regulation

# Stats bar
stats:
  - { value: "&euro;31.2B/yr", label: "NIS2 Implementation Cost" }
  - { value: "$2.6B", label: "Ransomware Payouts to 2023" }
  - { value: "27", label: "EU Member States" }

# Infobox
infobox:
  title: "Quick Facts &mdash; EU CyberSecurity"
  items:
    - { label: "Last reviewed", value: "February 2026" }
    - { label: "Infrastructure", value: "Information and Telecommunications for infrastructure" }
    - { label: "Focus", value: "Protect critical infrastructures from cyber attack" }
    - { label: "Resilience Type", value: "Reporting, safeguarding, risk management of cyber threats" }
    - { label: "Owner", value: "Critical Entities &mdash; public or private providing essential services" }
    - { label: "Location", value: "European Union (all Member States)" }
    - { label: "Users", value: "Public and private sector organisations and individuals" }

# Homepage card
card:
  category: "Digital &bull; European Union"
  short_title: "CyberSecurity for Critical Infrastructure"
  short_desc: "NIS2 and CER directives to protect critical entities and network systems from cyber threats across all EU member states."
  banner_gradient: "linear-gradient(90deg, #8b5cf6, #6d28d9)"
  footer_text: "&euro;31.2B/yr NIS2 cost &bull; 27 member states"
  tags:
    - CyberSecurity
    - NIS2 Directive
  filters:
    sector: digital
    hazard: cyber
    location: eu

# Sections
sections:
  - id: overview
    icon_emoji: "&#x1F510;"
    content: |
      **Directive 2022/2555 (NIS2)** replaces NIS1 and aims to improve cybersecurity by protecting network and information systems, their users, and other affected individuals from cyber incidents and threats. **Directive 2022/2557 (CER)** aims to strengthen the resilience of critical entities against natural hazards, terrorist attacks, insider threats, sabotage, and public health emergencies.

      Industry 4.0 technologies have driven massive distributed systems creating new vulnerabilities beyond traditional cybersecurity. Various laws exist in specific sectors: ENISA (energy), DORA (financial), NCCS (cross-border electricity). Compliance with standards (notably ISO/IEC 27001:2022) is **insufficient for infrastructure resilience**.

  - id: timeline
    content: |
      **2016:** NIS1 directive. **2022:** NIS2 directive launched. **2023:** CER directive launched. Location: **European Union, all 27 member states**.

  - id: stakeholders
    content: |
      Critical Entities (public and private). Private and public sector technology firms. **ENISA** (EU Agency for Cybersecurity). NIST (US reference framework). Sector-specific regulators.

  - id: sectors
    title: "Sector Threats"
    icon_emoji: "&#x26A1;"
    icon_bg: "#fff7ed"
    icon_color: "#ea580c"
    content: |
      <div class="principle-card"><h4>Utilities &amp; Energy</h4><p>Data integrity risks, predictive maintenance manipulation.</p></div>
      <div class="principle-card"><h4>Telecommunications</h4><p>Denial-of-service attacks, side-channel attacks, physical security risks.</p></div>
      <div class="principle-card"><h4>Manufacturing &amp; Industry 4.0</h4><p>Intellectual property theft, process sabotage, systemic vulnerabilities.</p></div>
      <div class="principle-card"><h4>Healthcare</h4><p>Data breaches, adversarial AI attacks, device manipulation, digital twin exploitation.</p></div>
      <div class="principle-card"><h4>Defence &amp; Aviation</h4><p>Digital twin and AI exploitation, mission planning compromise, edge and IoT vulnerabilities.</p></div>
      <div class="principle-card"><h4>Transportation</h4><p>Data breaches, AI manipulation, digital twin exploitation, privacy risks, service disruptions.</p></div>

  - id: digitalisation
    content: |
      Digital approaches include: AI, cryptography, education/workforce, emerging technologies, human-centred cybersecurity, identity/access management, privacy, risk management, trusted networks.

      Data sources classified into: **network** (IDS logs, firewall logs, traffic data, packet data, honeypot data), **host** (OS logs, database access logs, web server logs, email logs), and **hybrid**.

  - id: hazards
    type: hazards
    exogenous: "Cyber attacks by external attackers targeting critical infrastructure systems."
    endogenous: "Deliberate exposure of vulnerabilities by inside attackers. Threats from Industry 4.0 technology integration &mdash; while technologies like AI with Blockchain enhance threat detection, they also amplify adversarial attacks."

  - id: cost-benefit
    content: |
      **Cost:** Estimated **&euro;31.2 billion per year** to implement NIS2 alone.

      **Benefit:** Minimisation of disruptions to essential services; avoidance of fines for personal data loss; avoiding large ransomware payments (cumulative $2.6B to 2023); reducing repair and recovery costs.

  - id: principles
    type: principles
    assessments:
      - principle: "Shared Responsibility (P5)"
        status: done
        content: "Collaboration between digital providers and critical infrastructure designers, architects, engineers, operators."
      - principle: "Proactively Protected (P2)"
        status: done
        content: "PKI used for digital identity but fails to address systemic vulnerabilities including over-reliance on centralised trust hierarchies, inconsistent governance and slow response. Protection needs to be adaptive to emerging technologies and attack vectors."
      - principle: "Environmentally Integrated (P3)"
        status: todo
        content: "Issues with additional energy consumption for cybersecurity processes."
      - principle: "Socially Engaged (P4)"
        status: done
        content: "ENISA promotes cyber hygiene for individuals: strong passwords, 2FA, software updates, email caution, data backups, secure Wi-Fi, antivirus, education, limiting personal info sharing, monitoring accounts."
      - principle: "Adaptively Transforming (P6)"
        status: done
        content: "As digitalisation grows, new threats require approaches beyond traditional methods. Supported through Socially Engaged principle (citizen information) plus Continuously Learning."
      - principle: "Continuously Learning (P1)"
        status: todo
        content: "Details pending."

  - id: futures
    content: |
      The most expensive reported cyber breaches relate to technical data integrity inconsistencies leading to confidentiality breaches for which no standards controls exist. Use of **open data standards for interoperability** and responsibility for data integrity are essential for infrastructure resilience.

# Related studies
related_studies:
  - slug: usa-challenger
    category: "Space &bull; USA"
    title: "Space Shuttle Challenger Disaster"
    desc: "Analysis of organisational decision-making failures."
    banner_gradient: "linear-gradient(90deg, #1e293b, #475569)"
  - slug: usa-broward-county
    category: "Climate &bull; USA"
    title: "Broward County Resilience Plan"
    desc: "County-wide flood and heat risk resilience in South Florida."
    banner_gradient: "linear-gradient(90deg, #f59e0b, #dc2626)"
  - slug: china-ev-charging
    category: "Energy &bull; China"
    title: "EV Charging Infrastructure"
    desc: "Three-year plan to build 28M charging facilities nationwide."
    banner_gradient: "linear-gradient(90deg, #f59e0b, #ea580c)"

footer_text: "DIR Case Study Wiki &mdash; European Union CyberSecurity &bull; Last updated February 2026 &bull; <a href='https://github.com/visioninglab/DIRwiki/issues' style='color:var(--accent);text-decoration:none;'>Suggest an edit</a>"
---
