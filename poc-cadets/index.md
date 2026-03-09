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


import { useState } from "react";

const chain = [
  { title: "President of the United States (POTUS)", name: "The Honorable Donald J. Trump", level: 0, icon: "★" },
  { title: "Secretary of Defense (SECDEF)", name: "The Honorable Pete B. Hegseth", level: 1, icon: "⬡" },
  { title: "Secretary of the Air Force (SECAF)", name: "Dr. Troy E. Meink", level: 2, icon: "✈" },
  { title: "Chairman of the Joint Chiefs of Staff (CJCS)", name: "General John D. Caine", level: 3, icon: "⬡", sibling: true },
  { title: "Chief of Staff of the Air Force (CSAF)", name: "General Kenneth S. Wilsbach", level: 3, icon: "✈" },
  { title: "Chief of Space Operations (CSO)", name: "General B. Chance Saltzman", level: 3, icon: "◈", sibling: true },
  { title: "Chief Master Sergeant of the Air Force (CMSAF)", name: "CMSgt David R. Wolfe", level: 4, icon: "✈" },
  { title: "AETC Commander (AETC/CC)", name: "Lt General Clark J. Quinn", level: 5, icon: "✈" },
  { title: "Air Force Accessions Center (AFAC/CC)", name: "Brig General Jeffrey W. Nelson", level: 6, icon: "✈" },
  { title: "Holm Center Commander (Holm Ctr/CC)", name: "Brig General Joseph L. Sheffield", level: 7, icon: "✈" },
  { title: "AFROTC Commander (AFROTC/CC)", name: "Colonel Eugene A. Moore III", level: 8, icon: "✈" },
  { title: "AFROTC Southwest Region (SWR/CC)", name: "Colonel Gregory K. Cyrus", level: 9, icon: "✈" },
  { title: "Det 085 Commander", name: "Lt Colonel Donald J. Fyffe", level: 10, icon: "◈" },
  { title: "Det 085 Director of Operations", name: "Lt Colonel Maxine Lucas", level: 11, icon: "◈", sibling: true },
  { title: "Det 085 Cadet Wing Commander", name: "C/Col Kurt DelaCruz", level: 11, icon: "★" },
];

const mainChain = [0,1,2,4,6,7,8,9,10,11,12,13,14];
const level3Siblings = [3,5];
const level11Siblings = [13,14];

export default function OrgChart() {
  const [hovered, setHovered] = useState(null);

  const mainNodes = [0,1,2,4,6,7,8,9,10,12];
  const l3nodes = [3,4,5];
  const l11nodes = [13,14];

  const NodeCard = ({ idx }) => {
    const node = chain[idx];
    const isHovered = hovered === idx;
    const isDetLevel = node.level >= 10;
    const accent = isDetLevel ? "#c8a84b" : node.level <= 2 ? "#c0392b" : "#1a3a6e";
    const bg = isDetLevel ? "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)" : 
               node.level <= 2 ? "linear-gradient(135deg, #1a0a0a 0%, #2d0d0d 100%)" :
               "linear-gradient(135deg, #0a0f1a 0%, #0d1b2e 100%)";

    return (
      <div
        onMouseEnter={() => setHovered(idx)}
        onMouseLeave={() => setHovered(null)}
        style={{
          background: bg,
          border: `1px solid ${isHovered ? accent : "rgba(255,255,255,0.08)"}`,
          borderLeft: `3px solid ${accent}`,
          borderRadius: "4px",
          padding: "10px 14px",
          cursor: "default",
          transition: "all 0.2s ease",
          transform: isHovered ? "translateX(4px)" : "translateX(0)",
          boxShadow: isHovered ? `0 4px 20px ${accent}33` : "0 2px 8px rgba(0,0,0,0.4)",
          minWidth: "260px",
          maxWidth: "320px",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ color: accent, fontSize: "10px", opacity: 0.8 }}>{node.icon}</span>
          <div>
            <div style={{ 
              color: "#8aa8d4", 
              fontSize: "9px", 
              fontFamily: "'Courier New', monospace",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: "3px"
            }}>
              {node.title}
            </div>
            <div style={{ 
              color: "#e8e8e8", 
              fontSize: "12px", 
              fontFamily: "Georgia, serif",
              fontWeight: "600",
              letterSpacing: "0.02em"
            }}>
              {node.name}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const Connector = ({ double }) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: double ? "28px" : "20px" }}>
      <div style={{ width: "1px", flex: 1, background: "linear-gradient(to bottom, rgba(100,140,200,0.4), rgba(100,140,200,0.15))" }} />
      <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: "rgba(100,140,200,0.4)", margin: "2px 0" }} />
      <div style={{ width: "1px", flex: 1, background: "linear-gradient(to bottom, rgba(100,140,200,0.15), rgba(100,140,200,0.4))" }} />
    </div>
  );

  const SiblingRow = ({ indices }) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0" }}>
        {indices.map((idx, i) => (
          <div key={idx} style={{ display: "flex", alignItems: "center" }}>
            {i > 0 && (
              <div style={{ width: "30px", height: "1px", background: "rgba(100,140,200,0.25)" }} />
            )}
            <NodeCard idx={idx} />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at top, #0a0f1a 0%, #050810 60%, #000 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "40px 20px",
      fontFamily: "Georgia, serif",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Background texture */}
      <div style={{
        position: "fixed", inset: 0, opacity: 0.03,
        backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(255,255,255,0.5) 40px, rgba(255,255,255,0.5) 41px), repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(255,255,255,0.5) 40px, rgba(255,255,255,0.5) 41px)",
        pointerEvents: "none"
      }} />

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <div style={{ 
          fontSize: "9px", color: "#c8a84b", letterSpacing: "0.3em", 
          fontFamily: "'Courier New', monospace", textTransform: "uppercase", marginBottom: "8px"
        }}>
          Department of the Air Force
        </div>
        <div style={{ 
          fontSize: "22px", color: "#e8e8e8", fontWeight: "700",
          letterSpacing: "0.05em", textShadow: "0 0 40px rgba(200,168,75,0.3)"
        }}>
          Chain of Command
        </div>
        <div style={{ 
          fontSize: "10px", color: "#4a6a9a", letterSpacing: "0.2em",
          fontFamily: "'Courier New', monospace", marginTop: "6px"
        }}>
          AFROTC · Det 085 · Spring 2026
        </div>
        <div style={{ width: "60px", height: "1px", background: "linear-gradient(to right, transparent, #c8a84b, transparent)", margin: "12px auto 0" }} />
      </div>

      {/* Chart */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <NodeCard idx={0} /><Connector />
        <NodeCard idx={1} /><Connector />
        <NodeCard idx={2} /><Connector />

        {/* Level 3 - three across */}
        <SiblingRow indices={[3, 4, 5]} />
        <Connector />

        {/* Continue main chain from CSAF */}
        <NodeCard idx={6} /><Connector />
        <NodeCard idx={7} /><Connector />
        <NodeCard idx={8} /><Connector />
        <NodeCard idx={9} /><Connector />
        <NodeCard idx={10} /><Connector />
        <NodeCard idx={11} /><Connector />
        <NodeCard idx={12} /><Connector />

        {/* Level 11 - two across */}
        <SiblingRow indices={[13, 14]} />
      </div>

      <div style={{ 
        marginTop: "40px", fontSize: "8px", color: "#2a3a5a",
        fontFamily: "'Courier New', monospace", letterSpacing: "0.15em"
      }}>
        UNCLASSIFIED // FOR TRAINING USE ONLY
      </div>
    </div>
  );

<!-- 
## POC Resources
-->