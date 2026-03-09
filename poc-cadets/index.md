---
title: POC Cadets
layout: default
nav_order: 13
---

# POC Cadets

<div style="position: relative; width: 100%; height: 0; padding-top: 50.0000%;
 padding-bottom: 0; box-shadow: 0 2px 8px 0 rgba(63,69,81,0.16); margin-top: 1.6em; margin-bottom: 0.9em; overflow: hidden;
 border-radius: 8px; will-change: transform;">
  <iframe loading="lazy" style="position: absolute; width: 100%; height: 100%; top: 0; left: 0; border: none; padding: 0;margin: 0;"
    src="https://www.canva.com/design/DAG33OHKFts/TzEJiLVmiX0oFLLiYLuobw/view?embed" allowfullscreen="allowfullscreen" allow="fullscreen">
  </iframe>
</div>
<a href="https:&#x2F;&#x2F;www.canva.com&#x2F;design&#x2F;DAG33OHKFts&#x2F;TzEJiLVmiX0oFLLiYLuobw&#x2F;view?utm_content=DAG33OHKFts&amp;utm_campaign=designshare&amp;utm_medium=embeds&amp;utm_source=link" target="_blank" rel="noopener">

# Chain of Command

<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>DAF Chain of Command</title>
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;600;700&family=Source+Serif+4:ital,wght@0,300;0,400;1,300&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    background: #0b0e14;
    color: #dde3ee;
    font-family: 'Source Serif 4', serif;
    min-height: 100vh;
    overflow-x: hidden;
  }

  .stars {
    position: fixed; inset: 0; pointer-events: none; z-index: 0;
    background: 
      radial-gradient(1px 1px at 20% 30%, rgba(255,255,255,0.15) 0%, transparent 100%),
      radial-gradient(1px 1px at 80% 10%, rgba(255,255,255,0.1) 0%, transparent 100%),
      radial-gradient(1px 1px at 50% 80%, rgba(255,255,255,0.12) 0%, transparent 100%),
      radial-gradient(1px 1px at 10% 60%, rgba(255,255,255,0.08) 0%, transparent 100%),
      radial-gradient(1px 1px at 90% 70%, rgba(255,255,255,0.1) 0%, transparent 100%),
      radial-gradient(600px at 50% 0%, rgba(30,60,120,0.15) 0%, transparent 70%);
  }

  header {
    text-align: center;
    padding: 48px 20px 32px;
    position: relative; z-index: 1;
  }

  .eyebrow {
    font-family: 'Oswald', sans-serif;
    font-size: 11px;
    letter-spacing: 0.35em;
    color: #b8960c;
    text-transform: uppercase;
    margin-bottom: 10px;
  }

  h1 {
    font-family: 'Oswald', sans-serif;
    font-size: clamp(24px, 4vw, 42px);
    font-weight: 700;
    letter-spacing: 0.06em;
    color: #eef2ff;
    line-height: 1.1;
  }

  .subtitle {
    font-size: 13px;
    color: #5a7aaa;
    letter-spacing: 0.15em;
    margin-top: 10px;
    font-style: italic;
  }

  .divider {
    width: 80px; height: 2px;
    background: linear-gradient(to right, transparent, #b8960c, transparent);
    margin: 16px auto 0;
  }

  /* Chart container */
  .chart {
    position: relative; z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 10px 20px 60px;
    gap: 0;
  }

  .node-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .connector {
    width: 2px;
    height: 32px;
    background: linear-gradient(to bottom, #2a4a7a, #1a3060);
    position: relative;
  }
  .connector::after {
    content: '';
    position: absolute;
    bottom: -4px; left: 50%; transform: translateX(-50%);
    width: 8px; height: 8px;
    border-right: 2px solid #3a5a9a;
    border-bottom: 2px solid #3a5a9a;
    transform: translateX(-50%) rotate(45deg);
  }

  .node {
    position: relative;
    background: linear-gradient(135deg, #111827 0%, #0d1520 100%);
    border: 1px solid #1e2d45;
    border-top: 2px solid var(--accent, #2a4a8a);
    border-radius: 3px;
    padding: 12px 20px;
    text-align: center;
    min-width: 220px;
    max-width: 280px;
    transition: all 0.25s ease;
    cursor: default;
  }

  .node:hover {
    border-color: var(--accent, #4a7acc);
    border-top-color: var(--accent, #4a7acc);
    background: linear-gradient(135deg, #16202e 0%, #111a28 100%);
    box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(74,122,204,0.1);
    transform: translateY(-2px);
  }

  .node-title {
    font-family: 'Oswald', sans-serif;
    font-size: 9px;
    letter-spacing: 0.2em;
    color: var(--accent, #4a7acc);
    text-transform: uppercase;
    margin-bottom: 5px;
  }

  .node-name {
    font-size: 13px;
    font-weight: 400;
    color: #c8d4e8;
    line-height: 1.3;
  }

  .node-badge {
    position: absolute;
    top: -8px; left: 50%; transform: translateX(-50%);
    background: var(--accent, #2a4a8a);
    color: #fff;
    font-family: 'Oswald', sans-serif;
    font-size: 7px;
    letter-spacing: 0.15em;
    padding: 2px 8px;
    border-radius: 2px;
    white-space: nowrap;
  }

  /* Sibling rows */
  .siblings {
    display: flex;
    align-items: flex-start;
    gap: 0;
    position: relative;
  }

  .siblings::before {
    content: '';
    position: absolute;
    top: 0; left: 50%;
    transform: translateX(-50%);
    width: calc(100% - 140px);
    height: 2px;
    background: linear-gradient(to right, transparent 0%, #1e3060 20%, #1e3060 80%, transparent 100%);
  }

  .sibling-item {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .sibling-drop {
    width: 2px;
    height: 24px;
    background: #1e3060;
  }

  /* Level colors */
  .lvl-potus  { --accent: #c0392b; }
  .lvl-secdef { --accent: #c0392b; }
  .lvl-secaf  { --accent: #b8960c; }
  .lvl-joint  { --accent: #5a7aaa; }
  .lvl-csaf   { --accent: #2e6bbf; }
  .lvl-cso    { --accent: #1a8a6e; }
  .lvl-cmsaf  { --accent: #2e6bbf; }
  .lvl-aetc   { --accent: #3a7acc; }
  .lvl-afac   { --accent: #3a7acc; }
  .lvl-holm   { --accent: #3a7acc; }
  .lvl-rotc   { --accent: #4a8acc; }
  .lvl-swr    { --accent: #5a9acc; }
  .lvl-det    { --accent: #b8960c; }
  .lvl-do     { --accent: #c8a84b; }
  .lvl-cwc    { --accent: #c8a84b; }

  footer {
    text-align: center;
    padding: 20px;
    font-family: 'Oswald', sans-serif;
    font-size: 9px;
    letter-spacing: 0.25em;
    color: #1e2d45;
    position: relative; z-index: 1;
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .node-wrap { animation: fadeUp 0.4s ease both; }
  .node-wrap:nth-child(1)  { animation-delay: 0.05s; }
  .node-wrap:nth-child(2)  { animation-delay: 0.10s; }
  .node-wrap:nth-child(3)  { animation-delay: 0.15s; }
  .node-wrap:nth-child(4)  { animation-delay: 0.20s; }
  .node-wrap:nth-child(5)  { animation-delay: 0.25s; }
  .node-wrap:nth-child(6)  { animation-delay: 0.30s; }
  .node-wrap:nth-child(7)  { animation-delay: 0.35s; }
  .node-wrap:nth-child(8)  { animation-delay: 0.40s; }
  .node-wrap:nth-child(9)  { animation-delay: 0.45s; }
  .node-wrap:nth-child(10) { animation-delay: 0.50s; }
  .node-wrap:nth-child(11) { animation-delay: 0.55s; }
</style>
</head>
<body>
<div class="stars"></div>

<header>
  <div class="eyebrow">Department of the Air Force</div>
  <h1>Chain of Command</h1>
  <div class="subtitle">AFROTC &nbsp;·&nbsp; Detachment 085 &nbsp;·&nbsp; Spring 2026</div>
  <div class="divider"></div>
</header>

<div class="chart">

  <!-- POTUS -->
  <div class="node-wrap">
    <div class="node lvl-potus">
      <div class="node-badge">Commander in Chief</div>
      <div class="node-title">President of the United States (POTUS)</div>
      <div class="node-name">The Honorable Donald J. Trump</div>
    </div>
  </div>
  <div class="connector"></div>

  <!-- SECDEF -->
  <div class="node-wrap">
    <div class="node lvl-secdef">
      <div class="node-title">Secretary of Defense (SECDEF)</div>
      <div class="node-name">The Honorable Pete B. Hegseth</div>
    </div>
  </div>
  <div class="connector"></div>

  <!-- SECAF -->
  <div class="node-wrap">
    <div class="node lvl-secaf">
      <div class="node-title">Secretary of the Air Force (SECAF)</div>
      <div class="node-name">Dr. Troy E. Meink</div>
    </div>
  </div>
  <div class="connector"></div>

  <!-- Level 3: CJCS | CSAF | CSO -->
  <div class="node-wrap">
    <div class="siblings">
      <div class="sibling-item">
        <div class="sibling-drop"></div>
        <div class="node lvl-joint" style="min-width:190px;max-width:220px;">
          <div class="node-title">CJCS</div>
          <div class="node-name">General John D. Caine</div>
        </div>
      </div>
      <div style="width:40px;height:2px;background:#1e3060;margin-top:24px;"></div>
      <div class="sibling-item">
        <div class="sibling-drop"></div>
        <div class="node lvl-csaf" style="min-width:190px;max-width:220px;">
          <div class="node-badge">Main Chain</div>
          <div class="node-title">Chief of Staff of the Air Force (CSAF)</div>
          <div class="node-name">General Kenneth S. Wilsbach</div>
        </div>
      </div>
      <div style="width:40px;height:2px;background:#1e3060;margin-top:24px;"></div>
      <div class="sibling-item">
        <div class="sibling-drop"></div>
        <div class="node lvl-cso" style="min-width:190px;max-width:220px;">
          <div class="node-title">Chief of Space Operations (CSO)</div>
          <div class="node-name">General B. Chance Saltzman</div>
        </div>
      </div>
    </div>
  </div>
  <div class="connector"></div>

  <!-- CMSAF -->
  <div class="node-wrap">
    <div class="node lvl-cmsaf">
      <div class="node-title">Chief Master Sergeant of the Air Force (CMSAF)</div>
      <div class="node-name">CMSgt David R. Wolfe</div>
    </div>
  </div>
  <div class="connector"></div>

  <!-- AETC -->
  <div class="node-wrap">
    <div class="node lvl-aetc">
      <div class="node-title">AETC Commander (AETC/CC)</div>
      <div class="node-name">Lt General Clark J. Quinn</div>
    </div>
  </div>
  <div class="connector"></div>

  <!-- AFAC -->
  <div class="node-wrap">
    <div class="node lvl-afac">
      <div class="node-title">Air Force Accessions Center (AFAC/CC)</div>
      <div class="node-name">Brig General Jeffrey W. Nelson</div>
    </div>
  </div>
  <div class="connector"></div>

  <!-- Holm -->
  <div class="node-wrap">
    <div class="node lvl-holm">
      <div class="node-title">Holm Center Commander (Holm Ctr/CC)</div>
      <div class="node-name">Brig General Joseph L. Sheffield</div>
    </div>
  </div>
  <div class="connector"></div>

  <!-- AFROTC -->
  <div class="node-wrap">
    <div class="node lvl-rotc">
      <div class="node-title">AFROTC Commander (AFROTC/CC)</div>
      <div class="node-name">Colonel Eugene A. Moore III</div>
    </div>
  </div>
  <div class="connector"></div>

  <!-- SWR -->
  <div class="node-wrap">
    <div class="node lvl-swr">
      <div class="node-title">AFROTC Southwest Region (SWR/CC)</div>
      <div class="node-name">Colonel Gregory K. Cyrus</div>
    </div>
  </div>
  <div class="connector"></div>

  <!-- Det 085 CC -->
  <div class="node-wrap">
    <div class="node lvl-det">
      <div class="node-badge">Detachment 085</div>
      <div class="node-title">Det 085 Commander</div>
      <div class="node-name">Lt Colonel Donald J. Fyffe</div>
    </div>
  </div>
  <div class="connector"></div>

  <!-- Det DO + CWC -->
  <div class="node-wrap">
    <div class="siblings">
      <div class="sibling-item">
        <div class="sibling-drop"></div>
        <div class="node lvl-do" style="min-width:200px;max-width:240px;">
          <div class="node-title">Director of Operations</div>
          <div class="node-name">Lt Colonel Maxine Lucas</div>
        </div>
      </div>
      <div style="width:40px;height:2px;background:#1e3060;margin-top:24px;"></div>
      <div class="sibling-item">
        <div class="sibling-drop"></div>
        <div class="node lvl-cwc" style="min-width:200px;max-width:240px;">
          <div class="node-title">Cadet Wing Commander</div>
          <div class="node-name">C/Col Kurt DelaCruz</div>
        </div>
      </div>
    </div>
  </div>

</div>

<footer>UNCLASSIFIED &nbsp;//&nbsp; FOR TRAINING USE ONLY &nbsp;//&nbsp; DET 085 AFROTC</footer>
</body>
</html>
<!-- 
## POC Resources
-->