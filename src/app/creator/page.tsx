"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
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
  durationInMinutes: number; // Durée réglée
  remainingSeconds: number; // Temps restant actuel
  isRunning: boolean;
  ingredients: Ingredient[];
}

const customCSS = `
  input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none !important; margin: 0 !important; }
  input[type=number] { -moz-appearance: textfield !important; }
  .floating-abv { position: fixed; bottom: 20px; right: 20px; background: #f39c12; color: #000; padding: 12px; border-radius: 50%; font-weight: 900; z-index: 100; display: flex; align-items: center; justify-content: center; width: 64px; height: 64px; border: 3px solid #000; font-size: 14px; }
`;

export default function SuperLaboPage() {
  const [dbIngredients, setDbIngredients] = useState<any[]>([]);
  const [recipeName, setRecipeName] = useState("BRASSIN_CHRONO_LAB");
  const [isFixedMode, setIsFixedMode] = useState(true);
  const [sugarMode, setSugarMode] = useState(7);
  const [config, setConfig] = useState({ volume: 20, efficiency: 75, targetMalt: 5.5, targetIBU: 50 });

  const [steps, setSteps] = useState<Step[]>([
    { id: "s1", label: "CONCASSAGE", durationInMinutes: 0, remainingSeconds: 0, isRunning: false, ingredients: [] },
    { id: "s2", label: "EMPÂTAGE", temp: 67, durationInMinutes: 60, remainingSeconds: 3600, isRunning: false, ingredients: [] },
    { id: "s_filt", label: "FILTRATION", durationInMinutes: 0, remainingSeconds: 0, isRunning: false, ingredients: [] },
    { id: "s3", label: "RINÇAGE", temp: 78, durationInMinutes: 0, remainingSeconds: 0, isRunning: false, ingredients: [] },
    { id: "s4", label: "ÉBULLITION", durationInMinutes: 60, remainingSeconds: 3600, isRunning: false, ingredients: [] },
    { id: "s5", label: "FERMENTATION", temp: 20, durationInMinutes: 20160, remainingSeconds: 1209600, isRunning: false, ingredients: [] },
    { id: "s6", label: "MISE EN BOUTEILLES", durationInMinutes: 0, remainingSeconds: 0, isRunning: false, ingredients: [] },
  ]);

  const [stats, setStats] = useState({ abv: 0, ebc: 0, ibu: 0, og: 1.0, maltTotal: 0, waterE: 0, waterR: 0, sugarTotal: 0 });

  // --- LOGIQUE CHRONO ---
  useEffect(() => {
    const timer = setInterval(() => {
      setSteps(prev => prev.map(step => {
        if (step.isRunning && step.remainingSeconds > 0) {
          return { ...step, remainingSeconds: step.remainingSeconds - 1 };
        }
        if (step.remainingSeconds === 0 && step.isRunning) {
          return { ...step, isRunning: false };
        }
        return step;
      }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleTimer = (idx: number) => {
    const n = [...steps];
    n[idx].isRunning = !n[idx].isRunning;
    setSteps(n);
  };

  const resetTimer = (idx: number) => {
    const n = [...steps];
    n[idx].isRunning = false;
    n[idx].remainingSeconds = n[idx].durationInMinutes * 60;
    setSteps(n);
  };

  const updateDuration = (idx: number, mins: number) => {
    const n = [...steps];
    n[idx].durationInMinutes = mins;
    n[idx].remainingSeconds = mins * 60;
    setSteps(n);
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + 'h ' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // --- LOGIQUE CALCULS ---
  const runCalculations = useCallback(() => {
    let pts = 0, mcu = 0, ibu = 0, malt = 0;
    const vol = isFixedMode ? 20 : (config.volume || 1);
    steps.forEach(s => {
      s.ingredients.forEach(ing => {
        const q = parseFloat(ing.qty as any) || 0;
        if (ing.type === "MALT") {
          malt += q;
          mcu += (q * 2.204 * ((ing.ebc || 0) * 0.508)) / (vol * 0.264);
          pts += q * 300 * ((ing.yield || 0) / 100) * (config.efficiency / 100);
        }
        if (ing.type === "HOP") {
            const ogG = 1 + (pts / vol) / 1000;
            const util = 1.65 * Math.pow(0.000125, ogG - 1) * ((1 - Math.exp(-0.04 * (ing.time || 0))) / 4.15);
            ibu += (((ing.alpha || 0) / 100) * (q * 1000) / vol) * util;
        }
      });
    });
    const og = 1 + (pts / vol) / 1000;
    setStats({ og, ebc: Math.round(1.49 * Math.pow(mcu, 0.68) * 1.97) || 0, abv: parseFloat(((og - 1) * 131.25 * 0.75).toFixed(1)), ibu: Math.round(ibu), maltTotal: malt, waterE: parseFloat((malt * 2.8).toFixed(1)), waterR: parseFloat(((vol * 1.15) - (malt * 0.8)).toFixed(1)), sugarTotal: Math.round(vol * sugarMode) });
  }, [steps, config, isFixedMode, sugarMode]);

  useEffect(() => { runCalculations(); }, [runCalculations]);

  useEffect(() => {
    const fetchRefs = async () => {
      const { data } = await supabase.from("ingredient_refs").select("*");
      if (data) setDbIngredients(data);
    };
    fetchRefs();
  }, []);

  return (
    <div style={containerStyle}>
      <style>{customCSS}</style>

      <div className="floating-abv"><span>{stats.abv}%</span></div>
      
      <header style={{ marginBottom: "20px" }}>
        <input value={recipeName} onChange={e => setRecipeName(e.target.value)} style={titleStyle} />
        <div style={masterGrid}>
            <div style={statBox}>
                <div style={statLabel}><span>IBU : {stats.ibu}</span><span>MAX {config.targetIBU}</span></div>
                <div style={track}><div style={{...bar, width:`${(stats.ibu/config.targetIBU)*100}%`, backgroundColor:'#2ecc71'}} /></div>
            </div>
            <div style={statBox}>
                <div style={statLabel}><span>EBC : {stats.ebc}</span><span>OG: {stats.og.toFixed(3)}</span></div>
                <div style={track}><div style={{...bar, width:`${(stats.ebc/60)*100}%`, backgroundColor: getBeerColor(stats.ebc)}} /></div>
            </div>
        </div>
      </header>

      <main style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
        {steps.map((step, sIdx) => (
          <div key={step.id} style={cardStyle}>
            <div style={stepHeader}>
              <div style={{flex:1}}>
                <div style={stepTitle}>{step.label}</div>
                {step.label === "CONCASSAGE" && <div style={subText}>CHARGE : {stats.maltTotal.toFixed(1)}kg / {config.targetMalt}kg</div>}
                {step.label === "EMPÂTAGE" && <div style={subText}>EAU : {stats.waterE}L</div>}
                {step.label === "RINÇAGE" && <div style={subText}>EAU : {stats.waterR}L</div>}
                {step.label === "MISE EN BOUTEILLES" && <div style={subText}>SUCRE : {stats.sugarTotal}G</div>}
              </div>

              {/* CHRONO SECTION */}
              {(step.durationInMinutes > 0 || step.label === "ÉBULLITION" || step.label === "EMPÂTAGE") && (
                <div style={chronoContainer}>
                  <div style={{...timeDisplay, color: step.isRunning ? '#2ecc71' : '#e74c3c'}}>
                    {formatTime(step.remainingSeconds)}
                  </div>
                  <div style={chronoControls}>
                    <button onClick={() => toggleTimer(sIdx)} style={chronoBtn}>{step.isRunning ? "⏸" : "▶"}</button>
                    <button onClick={() => resetTimer(sIdx)} style={chronoBtn}>🔄</button>
                    <input 
                      type="number" 
                      onChange={(e) => updateDuration(sIdx, parseInt(e.target.value) || 0)} 
                      placeholder="min" 
                      style={smallInp}
                    />
                  </div>
                </div>
              )}
              {step.temp && <div style={tempBadge}>{step.temp}°C</div>}
            </div>

            {step.label === "FILTRATION" && <div style={{fontSize:'10px', color:'#444'}}>Clarification du moût avant ébullition.</div>}

            <div style={{display:'flex', gap:'8px', marginBottom:'10px'}}>
                {step.label.includes("CONC") && <button style={addBtn} onClick={() => {const n=[...steps]; n[sIdx].ingredients.push({id:Date.now(), type:"MALT", name:"", qty:0}); setSteps(n)}}>+ MALT</button>}
                {step.label.includes("ÉBUL") && <button style={addBtn} onClick={() => {const n=[...steps]; n[sIdx].ingredients.push({id:Date.now(), type:"HOP", name:"", qty:0, time:60}); setSteps(n)}}>+ HOUBLON</button>}
            </div>

            {step.ingredients.map((ing, iIdx) => (
              <div key={ing.id} style={ingRow}>
                <select style={selectStyle} onChange={e => {
                  const n=[...steps]; const ref=dbIngredients.find(x=>x.name===e.target.value);
                  if(ref) Object.assign(n[sIdx].ingredients[iIdx], {name:e.target.value, ebc:ref.potency, yield:ref.yield, alpha:ref.potency});
                  setSteps(n);
                }}>
                    <option value="">Ingrédient...</option>
                    {dbIngredients.filter(x => x.type === ing.type).map(x => <option key={x.id} value={x.name}>{x.name}</option>)}
                </select>
                <input type="number" value={ing.qty} onChange={e => {const n=[...steps]; n[sIdx].ingredients[iIdx].qty=+e.target.value; setSteps(n)}} style={qtyInp} />
              </div>
            ))}
          </div>
        ))}
      </main>

      <footer style={footerStyle}>
          <div style={cfgCard}><label style={cfgLabel}>VOLUME</label><input type="number" value={isFixedMode ? 20 : config.volume} onChange={e => setConfig({...config, volume: +e.target.value})} style={cfgInp} /></div>
          <div style={cfgCard}><label style={cfgLabel}>CIBLE MALT</label><input type="number" value={config.targetMalt} onChange={e => setConfig({...config, targetMalt: +e.target.value})} style={cfgInp} /></div>
          <button style={modeBtn} onClick={() => setIsFixedMode(!isFixedMode)}>{isFixedMode ? "VERROUILLÉ 20L" : "LITRAGE LIBRE"}</button>
      </footer>
    </div>
  );
}

// --- STYLES ---
const containerStyle: React.CSSProperties = { padding: "15px", backgroundColor: "#020202", color: "#ddd", minHeight: "100vh", fontFamily: "monospace" };
const titleStyle: React.CSSProperties = { background:'transparent', border:'none', color:'#fff', fontSize:'1.1rem', fontWeight:'900', width:'100%', marginBottom:'15px' };
const masterGrid: React.CSSProperties = { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'20px' };
const statBox: React.CSSProperties = { background:'#080808', padding:'10px', borderRadius:'10px', border:'1px solid #111' };
const statLabel: React.CSSProperties = { display:'flex', justifyContent:'space-between', fontSize:'8px', marginBottom:'5px', color:'#555' };
const track: React.CSSProperties = { height:'4px', background:'#111', borderRadius:'2px', overflow:'hidden' };
const bar: React.CSSProperties = { height:'100%', transition:'width 0.3s ease' };
const cardStyle: React.CSSProperties = { background:'#080808', padding:'15px', borderRadius:'15px', border:'1px solid #111' };
const stepHeader: React.CSSProperties = { display:'flex', justifyContent:'space-between', marginBottom:'12px', alignItems:'flex-start' };
const stepTitle: React.CSSProperties = { color:'#f39c12', fontWeight:'900', fontSize:'13px' };
const subText: React.CSSProperties = { fontSize:'9px', color:'#444', marginTop:'4px' };
const chronoContainer: React.CSSProperties = { textAlign:'right', display:'flex', flexDirection:'column', gap:'4px' };
const timeDisplay: React.CSSProperties = { fontSize:'16px', fontWeight:'900', fontVariantNumeric:'tabular-nums' };
const chronoControls: React.CSSProperties = { display:'flex', gap:'5px', justifyContent:'flex-end' };
const chronoBtn: React.CSSProperties = { background:'#111', border:'1px solid #222', color:'#888', padding:'2px 6px', borderRadius:'4px', fontSize:'10px', cursor:'pointer' };
const smallInp: React.CSSProperties = { background:'#000', border:'1px solid #222', color:'#444', width:'30px', fontSize:'9px', textAlign:'center', borderRadius:'4px' };
const tempBadge: React.CSSProperties = { background:'#111', padding:'3px 6px', borderRadius:'4px', fontSize:'10px', color:'#f39c12', marginLeft:'5px' };
const addBtn: React.CSSProperties = { background:'#111', border:'1px solid #222', color:'#444', fontSize:'9px', padding:'5px 10px', borderRadius:'5px' };
const ingRow: React.CSSProperties = { display:'flex', background:'#000', padding:'8px 12px', borderRadius:'8px', marginBottom:'5px', alignItems:'center' };
const selectStyle: React.CSSProperties = { background:'transparent', border:'none', color:'#bbb', fontSize:'11px', flex:1 };
const qtyInp: React.CSSProperties = { background:'transparent', border:'none', color:'#f39c12', fontSize:'14px', width:'50px', textAlign:'right', fontWeight:'bold' };
const footerStyle: React.CSSProperties = { marginTop:'30px', paddingBottom:'80px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' };
const cfgCard: React.CSSProperties = { background:'#080808', padding:'10px', borderRadius:'10px' };
const cfgLabel: React.CSSProperties = { fontSize:'8px', color:'#333', display:'block' };
const cfgInp: React.CSSProperties = { background:'transparent', border:'none', color:'#fff', width:'100%', fontSize:'14px' };
const modeBtn: React.CSSProperties = { gridColumn:'span 2', background:'#111', border:'1px solid #333', color:'#444', padding:'12px', borderRadius:'10px', fontSize:'10px' };

function getBeerColor(ebc: number) {
  if (ebc <= 8) return "#F5F75C";
  if (ebc <= 15) return "#F1C40F";
  if (ebc <= 25) return "#D4AC0D";
  if (ebc <= 40) return "#8D4C17";
  return "#1A0506";
}