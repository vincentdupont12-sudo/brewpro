"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../lib/supabaseClient";

interface Ingredient {
  id: number;
  type: "MALT" | "HOP" | "YEAST" | "SALT" | "SUCRE";
  name: string;
  qty: number;
  ebc?: number;
  yield?: number;
  alpha?: number;
  time?: number;
}

interface Step {
  id: string;
  label: string;
  temp?: number;
  durationInMinutes: number;
  remainingSeconds: number;
  isRunning: boolean;
  ingredients: Ingredient[];
}

export default function SuperLaboPage() {
  const [dbIngredients, setDbIngredients] = useState<any[]>([]);
  const [recipeName, setRecipeName] = useState("BRASSIN_ULTIMATE_V4");
  const [isFixedMode, setIsFixedMode] = useState(true);
  const [sugarMode, setSugarMode] = useState(7);
  const [config, setConfig] = useState({ volume: 20, efficiency: 75, targetMalt: 5.5, targetIBU: 50 });

  const [steps, setSteps] = useState<Step[]>([
    { id: "s1", label: "CONCASSAGE", durationInMinutes: 0, remainingSeconds: 0, isRunning: false, ingredients: [] },
    { id: "s_salt", label: "AJUSTEMENT DES SELS", durationInMinutes: 0, remainingSeconds: 0, isRunning: false, ingredients: [] },
    { id: "s2", label: "EMPÂTAGE", temp: 67, durationInMinutes: 60, remainingSeconds: 3600, isRunning: false, ingredients: [] },
    { id: "s_filt", label: "FILTRATION", durationInMinutes: 0, remainingSeconds: 0, isRunning: false, ingredients: [] },
    { id: "s3", label: "RINÇAGE", temp: 78, durationInMinutes: 0, remainingSeconds: 0, isRunning: false, ingredients: [] },
    { id: "s4", label: "ÉBULLITION", durationInMinutes: 60, remainingSeconds: 3600, isRunning: false, ingredients: [] },
    { id: "s5", label: "FERMENTATION", temp: 20, durationInMinutes: 20160, remainingSeconds: 1209600, isRunning: false, ingredients: [] },
    { id: "s6", label: "MISE EN BOUTEILLES", durationInMinutes: 0, remainingSeconds: 0, isRunning: false, ingredients: [] },
  ]);

  const [stats, setStats] = useState({ abv: 0, ebc: 0, ibu: 0, og: 1.0, maltTotal: 0, waterE: 0, waterR: 0, sugarTotal: 0, yeastQty: 0 });

  // --- TIMER ENGINE ---
  useEffect(() => {
    const timer = setInterval(() => {
      setSteps(prev => prev.map(s => (s.isRunning && s.remainingSeconds > 0) ? { ...s, remainingSeconds: s.remainingSeconds - 1 } : s));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // --- CALCULATIONS ---
  const runCalculations = useCallback(() => {
    let pts = 0, mcu = 0, ibu = 0, malt = 0;
    const vol = isFixedMode ? 20 : (config.volume || 1);
    steps.forEach(s => {
      s.ingredients.forEach(ing => {
        const q = parseFloat(ing.qty as any) || 0;
        if (ing.type === "MALT") { malt += q; mcu += (q * 2.204 * ((ing.ebc || 0) * 0.508)) / (vol * 0.264); pts += q * 300 * ((ing.yield || 0) / 100) * (config.efficiency / 100); }
        if (ing.type === "HOP") {
            const ogG = 1 + (pts / vol) / 1000;
            const util = 1.65 * Math.pow(0.000125, ogG - 1) * ((1 - Math.exp(-0.04 * (ing.time || 0))) / 4.15);
            ibu += (((ing.alpha || 0) / 100) * (q * 1000) / vol) * util;
        }
      });
    });
    const og = 1 + (pts / vol) / 1000;
    setStats({ og, ebc: Math.round(1.49 * Math.pow(mcu, 0.68) * 1.97) || 0, abv: parseFloat(((og - 1) * 131.25 * 0.75).toFixed(1)), ibu: Math.round(ibu), maltTotal: malt, waterE: parseFloat((malt * 2.8).toFixed(1)), waterR: parseFloat(((vol * 1.15) - (malt * 0.8)).toFixed(1)), sugarTotal: Math.round(vol * sugarMode), yeastQty: parseFloat((vol * 0.7).toFixed(1)) });
  }, [steps, config, isFixedMode, sugarMode]);

  useEffect(() => { runCalculations(); }, [runCalculations]);

  const toggleTimer = (idx: number) => { const n=[...steps]; n[idx].isRunning = !n[idx].isRunning; setSteps(n); };
  const resetTimer = (idx: number) => { const n=[...steps]; n[idx].isRunning = false; n[idx].remainingSeconds = n[idx].durationInMinutes * 60; setSteps(n); };
  const formatTime = (s: number) => { const h=Math.floor(s/3600), m=Math.floor((s%3600)/60), sec=s%60; return `${h>0?h+'h ':''}${m.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`; };

  return (
    <div style={{ padding: "15px", backgroundColor: "#020202", color: "#eee", minHeight: "100vh", fontFamily: "monospace" }}>
      
      {/* HEADER STATS */}
      <header style={{ marginBottom: "20px" }}>
        <input value={recipeName} onChange={e => setRecipeName(e.target.value)} style={titleStyle} />
        <div style={masterGrid}>
            <div style={statBox}>
                <div style={statLabel}><span>AMERTUME IBU</span><span>CIBLE {config.targetIBU}</span></div>
                <div style={track}><div style={{...bar, width:`${(stats.ibu/config.targetIBU)*100}%`, backgroundColor:'#2ecc71'}} /></div>
                <div style={{fontSize:'14px', marginTop:'5px', fontWeight:'bold'}}>{stats.ibu}</div>
            </div>
            <div style={statBox}>
                <div style={statLabel}><span>COULEUR EBC</span><span>OG {stats.og.toFixed(3)}</span></div>
                <div style={track}><div style={{...bar, width:`${(stats.ebc/60)*100}%`, backgroundColor: getBeerColor(stats.ebc)}} /></div>
                <div style={{fontSize:'14px', marginTop:'5px', fontWeight:'bold'}}>{stats.ebc}</div>
            </div>
        </div>
      </header>

      {/* STEPS LIST */}
      <main style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
        {steps.map((step, sIdx) => (
          <div key={step.id} style={cardStyle}>
            <div style={stepHeader}>
              <div style={{flex:1}}>
                <div style={stepTitle}>{step.label}</div>
                {/* DYNAMIC DATA PER STEP */}
                {step.label === "CONCASSAGE" && <div style={subText}>CHARGE : <span style={orange}>{stats.maltTotal.toFixed(1)}kg</span></div>}
                {step.label === "AJUSTEMENT DES SELS" && <div style={subText}>GYPSE / EPSOM / CaCl2 (selon profil eau)</div>}
                {step.label === "EMPÂTAGE" && <div style={subText}>VOLUME D'EAU : <span style={orange}>{stats.waterE}L</span></div>}
                {step.label === "FERMENTATION" && <div style={subText}>LEVURE SÈCHE : <span style={orange}>{stats.yeastQty}g</span></div>}
                {step.label === "MISE EN BOUTEILLES" && <div style={subText}>SUCRE : <span style={green}>{stats.sugarTotal}g</span></div>}
              </div>

              {/* CHRONO & TEMP */}
              <div style={chronoBox}>
                {step.durationInMinutes > 0 && (
                  <>
                    <div style={{...timeDisplay, color: step.isRunning ? '#2ecc71' : '#ff4444'}}>{formatTime(step.remainingSeconds)}</div>
                    <div style={{display:'flex', gap:'5px'}}>
                        <button onClick={() => toggleTimer(sIdx)} style={btnStyle}>{step.isRunning ? "⏸" : "▶"}</button>
                        <button onClick={() => resetTimer(sIdx)} style={btnStyle}>🔄</button>
                    </div>
                  </>
                )}
                {step.temp && <div style={tempBadge}>{step.temp}°C</div>}
              </div>
            </div>

            {/* INGREDIENTS */}
            {(step.label.includes("CONC") || step.label.includes("ÉBUL") || step.label.includes("SALT")) && (
              <button style={addBtn} onClick={() => {
                  const n=[...steps]; 
                  const type = step.label.includes("CONC") ? "MALT" : step.label.includes("SALT") ? "SALT" : "HOP";
                  n[sIdx].ingredients.push({id:Date.now(), type, name:"", qty:0}); 
                  setSteps(n);
              }}>+ AJOUTER</button>
            )}

            {step.ingredients.map((ing, iIdx) => (
              <div key={ing.id} style={ingRow}>
                <input placeholder="Nom..." value={ing.name} onChange={e => {const n=[...steps]; n[sIdx].ingredients[iIdx].name=e.target.value; setSteps(n)}} style={ingName} />
                <input type="number" value={ing.qty} onChange={e => {const n=[...steps]; n[sIdx].ingredients[iIdx].qty=+e.target.value; setSteps(n)}} style={ingQty} />
                <span style={unit}>{ing.type === "MALT" ? "kg" : "g"}</span>
              </div>
            ))}
          </div>
        ))}
      </main>

      <div style={floatingABV}>{stats.abv}%<br/><span style={{fontSize:'8px'}}>ABV</span></div>
    </div>
  );
}

// --- STYLES ---
const titleStyle: React.CSSProperties = { background:'transparent', border:'none', color:'#fff', fontSize:'1.1rem', fontWeight:'900', width:'100%', marginBottom:'15px' };
const masterGrid: React.CSSProperties = { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' };
const statBox: React.CSSProperties = { background:'#080808', padding:'10px', borderRadius:'10px', border:'1px solid #111' };
const statLabel: React.CSSProperties = { display:'flex', justifyContent:'space-between', fontSize:'8px', marginBottom:'5px', color:'#555' };
const track: React.CSSProperties = { height:'4px', background:'#111', borderRadius:'2px', overflow:'hidden' };
const bar: React.CSSProperties = { height:'100%', transition:'width 0.4s' };
const cardStyle: React.CSSProperties = { background:'#080808', padding:'15px', borderRadius:'15px', border:'1px solid #151515' };
const stepHeader: React.CSSProperties = { display:'flex', justifyContent:'space-between', marginBottom:'10px' };
const stepTitle: React.CSSProperties = { color:'#f39c12', fontWeight:'900', fontSize:'12px', letterSpacing:'1px' };
const subText: React.CSSProperties = { fontSize:'10px', color:'#777', marginTop:'4px' };
const orange: React.CSSProperties = { color:'#f39c12', fontWeight:'bold' };
const green: React.CSSProperties = { color:'#2ecc71', fontWeight:'bold' };
const chronoBox: React.CSSProperties = { textAlign:'right' };
const timeDisplay: React.CSSProperties = { fontSize:'16px', fontWeight:'900', marginBottom:'5px' };
const btnStyle: React.CSSProperties = { background:'#111', border:'1px solid #222', color:'#888', padding:'3px 7px', borderRadius:'5px', cursor:'pointer' };
const tempBadge: React.CSSProperties = { background:'#111', padding:'3px 6px', borderRadius:'4px', fontSize:'10px', color:'#f39c12', marginTop:'5px', display:'inline-block' };
const addBtn: React.CSSProperties = { background:'#111', border:'1px solid #222', color:'#444', fontSize:'9px', padding:'5px 10px', borderRadius:'5px', marginBottom:'10px' };
const ingRow: React.CSSProperties = { display:'flex', background:'#000', padding:'8px 12px', borderRadius:'8px', marginBottom:'5px', alignItems:'center' };
const ingName: React.CSSProperties = { background:'transparent', border:'none', color:'#bbb', fontSize:'11px', flex:1, outline:'none' };
const ingQty: React.CSSProperties = { background:'transparent', border:'none', color:'#f39c12', fontSize:'14px', width:'50px', textAlign:'right', fontWeight:'bold' };
const unit: React.CSSProperties = { fontSize:'9px', color:'#444', marginLeft:'5px' };
const floatingABV: React.CSSProperties = { position:'fixed', bottom:'20px', right:'20px', background:'#f39c12', color:'#000', padding:'12px', borderRadius:'50%', fontWeight:'900', textAlign:'center', width:'60px', height:'60px', display:'flex', flexDirection:'column', justifyContent:'center', border:'3px solid #000' };

function getBeerColor(ebc: number) {
  if (ebc <= 8) return "#F5F75C";
  if (ebc <= 15) return "#F1C40F";
  if (ebc <= 25) return "#D4AC0D";
  if (ebc <= 40) return "#8D4C17";
  return "#1A0506";
}