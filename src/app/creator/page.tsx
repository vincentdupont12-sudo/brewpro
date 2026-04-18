"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../lib/supabaseClient";

// --- TYPES ---
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
  desc?: string;
}

export default function SuperLaboPage() {
  const [dbIngredients, setDbIngredients] = useState<any[]>([]);
  const [recipeName, setRecipeName] = useState("BRASSIN_EXPERT_V5");
  const [config, setConfig] = useState({ volume: 20, efficiency: 75, targetMalt: 5.5, targetIBU: 50 });
  const [sugarMode, setSugarMode] = useState(7);
  
  const [steps, setSteps] = useState<Step[]>([
    { id: "s1", label: "CONCASSAGE", durationInMinutes: 0, remainingSeconds: 0, isRunning: false, ingredients: [] },
    { id: "s_salt", label: "AJUSTEMENT DES SELS", durationInMinutes: 0, remainingSeconds: 0, isRunning: false, ingredients: [], desc: "Cible : Équilibrer le ratio Sulfate/Chlorure" },
    { id: "s2", label: "EMPÂTAGE", temp: 67, durationInMinutes: 60, remainingSeconds: 3600, isRunning: false, ingredients: [], desc: "Conversion de l'amidon en sucres" },
    { id: "s_filt", label: "FILTRATION", durationInMinutes: 0, remainingSeconds: 0, isRunning: false, ingredients: [] },
    { id: "s3", label: "RINÇAGE", temp: 78, durationInMinutes: 0, remainingSeconds: 0, isRunning: false, ingredients: [] },
    { id: "s4", label: "ÉBULLITION", durationInMinutes: 60, remainingSeconds: 3600, isRunning: false, ingredients: [] },
    { id: "s5", label: "FERMENTATION", temp: 20, durationInMinutes: 20160, remainingSeconds: 1209600, isRunning: false, ingredients: [] },
    { id: "s6", label: "MISE EN BOUTEILLES", durationInMinutes: 0, remainingSeconds: 0, isRunning: false, ingredients: [] },
  ]);

  const [stats, setStats] = useState({ abv: 0, ebc: 0, ibu: 0, og: 1.0, maltTotal: 0, waterE: 0, waterR: 0, sugarTotal: 0, yeastQty: 0 });

  // --- LOGIQUE CHRONO ---
  useEffect(() => {
    const timer = setInterval(() => {
      setSteps(prev => prev.map(s => (s.isRunning && s.remainingSeconds > 0) ? { ...s, remainingSeconds: s.remainingSeconds - 1 } : s));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // --- CALCULS ---
  const runCalculations = useCallback(() => {
    let pts = 0, mcu = 0, ibu = 0, malt = 0;
    const vol = config.volume || 1;
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
  }, [steps, config, sugarMode]);

  useEffect(() => { runCalculations(); }, [runCalculations]);

  // --- ACTIONS ---
  const setMashProfile = (type: 'sec' | 'equi' | 'corps') => {
    const profiles = {
        sec: { t: 63, d: "Favorise la Beta-Amylase : Alcool + / Corps -" },
        equi: { t: 67, d: "Équilibre Alpha/Beta : Profil standard" },
        corps: { t: 69, d: "Favorise l'Alpha-Amylase : Alcool - / Corps +" }
    };
    const n = [...steps];
    const idx = n.findIndex(s => s.label === "EMPÂTAGE");
    n[idx].temp = profiles[type].t;
    n[idx].desc = profiles[type].d;
    setSteps(n);
  };

  const handleSave = async () => {
    const { error } = await supabase.from("recipes").upsert({ name: recipeName, config_json: config, steps_json: steps, stats_json: stats, updated_at: new Date() }, { onConflict: 'name' });
    error ? alert("Erreur") : alert("✅ Enregistré");
  };

  return (
    <div style={containerStyle}>
      <header style={{ marginBottom: "20px" }}>
        <input value={recipeName} onChange={e => setRecipeName(e.target.value)} style={titleInp} />
        <div style={statGrid}>
          <div style={statBox}>
             <span style={statLabel}>IBU / {config.targetIBU}</span>
             <div style={statVal}>{stats.ibu}</div>
             <div style={track}><div style={{...bar, width:`${(stats.ibu/config.targetIBU)*100}%`, backgroundColor:'#2ecc71'}} /></div>
          </div>
          <div style={statBox}>
             <span style={statLabel}>EBC / OG {stats.og.toFixed(3)}</span>
             <div style={statVal}>{stats.ebc}</div>
             <div style={track}><div style={{...bar, width:`${(stats.ebc/60)*100}%`, backgroundColor: getBeerColor(stats.ebc)}} /></div>
          </div>
        </div>
      </header>

      <main style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {steps.map((step, sIdx) => (
          <div key={step.id} style={card}>
            <div style={cardHeader}>
              <div style={{flex:1}}>
                <div style={stepTitle}>{step.label}</div>
                <div style={stepDesc}>{step.desc}</div>
                
                {/* LOGIQUE MÉMO SELS */}
                {step.label === "AJUSTEMENT DES SELS" && (
                    <div style={memoBox}>
                        <div>🧪 <b>Gypse :</b> + Sec / Houblon</div>
                        <div>🧪 <b>Chlorure :</b> + Rond / Malt</div>
                    </div>
                )}

                {/* LOGIQUE PALIERS EMPÂTAGE */}
                {step.label === "EMPÂTAGE" && (
                    <div style={{display:'flex', gap:'5px', marginTop:'10px'}}>
                        <button onClick={() => setMashProfile('sec')} style={miniBtn}>SEC (63°)</button>
                        <button onClick={() => setMashProfile('equi')} style={miniBtn}>ÉQUIL (67°)</button>
                        <button onClick={() => setMashProfile('corps')} style={miniBtn}>CORPS (69°)</button>
                    </div>
                )}

                {/* RÉCAPS VOLUMES */}
                {step.label === "EMPÂTAGE" && <div style={volTag}>EAU : {stats.waterE}L</div>}
                {step.label === "RINÇAGE" && <div style={volTag}>EAU : {stats.waterR}L</div>}
                {step.label === "FERMENTATION" && <div style={volTag}>LEVURE : {stats.yeastQty}g</div>}
              </div>

              <div style={{textAlign:'right'}}>
                {step.durationInMinutes > 0 && (
                    <div style={chronoWrap}>
                        <div style={{...time, color: step.isRunning ? '#2ecc71' : '#ff4444'}}>{Math.floor(step.remainingSeconds/60)}:{(step.remainingSeconds%60).toString().padStart(2,'0')}</div>
                        <div style={{display:'flex', gap:'4px', justifyContent:'flex-end'}}>
                            <button onClick={() => {const n=[...steps]; n[sIdx].isRunning=!n[sIdx].isRunning; setSteps(n)}} style={btn}>{step.isRunning?'⏸':'▶'}</button>
                            <button onClick={() => {const n=[...steps]; n[sIdx].isRunning=false; n[sIdx].remainingSeconds=step.durationInMinutes*60; setSteps(n)}} style={btn}>🔄</button>
                        </div>
                    </div>
                )}
                {step.temp && <div style={tempTag}>{step.temp}°C</div>}
              </div>
            </div>

            {/* AJOUT INGRÉDIENTS */}
            {(step.label.includes("CONC") || step.label.includes("ÉBUL") || step.label.includes("SALT")) && (
              <button style={addBtn} onClick={() => {const n=[...steps]; const type=step.label.includes("CONC")?"MALT":step.label.includes("SALT")?"SALT":"HOP"; n[sIdx].ingredients.push({id:Date.now(), type, name:"", qty:0, time:60}); setSteps(n)}}>+ {step.label.includes("SALT") ? "SEL" : "INGRÉDIENT"}</button>
            )}

            {step.ingredients.map((ing, iIdx) => (
              <div key={ing.id} style={ingRow}>
                <input placeholder="Nom..." value={ing.name} onChange={e => {const n=[...steps]; n[sIdx].ingredients[iIdx].name=e.target.value; setSteps(n)}} style={ingInp} />
                <input type="number" value={ing.qty} onChange={e => {const n=[...steps]; n[sIdx].ingredients[iIdx].qty=+e.target.value; setSteps(n)}} style={ingVal} />
                <span style={unit}>{ing.type === "MALT" ? "kg" : "g"}</span>
              </div>
            ))}
          </div>
        ))}
      </main>

      <footer style={toolbar}>
          <div style={cfgWrap}>
              <div style={miniCfg}><label style={cfgLab}>VOL L</label><input type="number" value={config.volume} onChange={e => setConfig({...config, volume: +e.target.value})} style={cfgInpVal} /></div>
              <div style={miniCfg}><label style={cfgLab}>IBU</label><input type="number" value={config.targetIBU} onChange={e => setConfig({...config, targetIBU: +e.target.value})} style={cfgInpVal} /></div>
          </div>
          <button onClick={handleSave} style={saveBtn}>💾 SAUVEGARDER</button>
      </footer>

      <div style={abvCircle}>{stats.abv}%<br/><span style={{fontSize:'8px'}}>ABV</span></div>
    </div>
  );
}

// --- STYLES ---
const containerStyle: React.CSSProperties = { padding: "15px", backgroundColor: "#020202", color: "#ddd", minHeight: "100vh", fontFamily: "monospace", paddingBottom:'120px' };
const titleInp: React.CSSProperties = { background:'transparent', border:'none', color:'#fff', fontSize:'1.2rem', fontWeight:'900', marginBottom:'15px', outline:'none' };
const statGrid: React.CSSProperties = { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' };
const statBox: React.CSSProperties = { background:'#080808', padding:'10px', borderRadius:'10px', border:'1px solid #111' };
const statLabel: React.CSSProperties = { fontSize:'8px', color:'#555', display:'block', marginBottom:'5px' };
const statVal: React.CSSProperties = { fontSize:'18px', fontWeight:'900', marginBottom:'5px' };
const track: React.CSSProperties = { height:'4px', background:'#111', borderRadius:'2px', overflow:'hidden' };
const bar: React.CSSProperties = { height:'100%', transition:'0.3s' };
const card: React.CSSProperties = { background:'#080808', padding:'15px', borderRadius:'15px', border:'1px solid #151515' };
const cardHeader: React.CSSProperties = { display:'flex', justifyContent:'space-between', marginBottom:'10px' };
const stepTitle: React.CSSProperties = { color:'#f39c12', fontWeight:'900', fontSize:'13px' };
const stepDesc: React.CSSProperties = { fontSize:'9px', color:'#444', marginTop:'2px' };
const memoBox: React.CSSProperties = { background:'#000', padding:'8px', borderRadius:'6px', marginTop:'8px', fontSize:'10px', color:'#777', border:'1px solid #111' };
const miniBtn: React.CSSProperties = { background:'#111', border:'1px solid #222', color:'#666', fontSize:'8px', padding:'4px 8px', borderRadius:'4px' };
const volTag: React.CSSProperties = { fontSize:'10px', color:'#f39c12', marginTop:'10px', fontWeight:'bold' };
const chronoWrap: React.CSSProperties = { marginBottom:'8px' };
const time: React.CSSProperties = { fontSize:'20px', fontWeight:'900', fontVariantNumeric:'tabular-nums' };
const btn: React.CSSProperties = { background:'#111', border:'1px solid #222', color:'#888', padding:'4px 8px', borderRadius:'5px' };
const tempTag: React.CSSProperties = { background:'#111', color:'#f39c12', padding:'4px 8px', borderRadius:'5px', fontSize:'11px', fontWeight:'bold', border:'1px solid #222' };
const addBtn: React.CSSProperties = { background:'#111', border:'1px solid #222', color:'#444', fontSize:'9px', padding:'6px 12px', borderRadius:'6px', marginBottom:'10px' };
const ingRow: React.CSSProperties = { display:'flex', alignItems:'center', background:'#000', padding:'8px 12px', borderRadius:'8px', marginBottom:'5px' };
const ingInp: React.CSSProperties = { background:'transparent', border:'none', color:'#bbb', fontSize:'12px', flex:1, outline:'none' };
const ingVal: React.CSSProperties = { background:'transparent', border:'none', color:'#f39c12', fontSize:'15px', width:'50px', textAlign:'right', fontWeight:'bold' };
const unit: React.CSSProperties = { fontSize:'9px', color:'#444', marginLeft:'5px' };
const toolbar: React.CSSProperties = { position:'fixed', bottom:0, left:0, right:0, background:'#080808', borderTop:'2px solid #1a1a1a', padding:'15px', display:'flex', alignItems:'center', gap:'15px' };
const cfgWrap: React.CSSProperties = { display:'flex', gap:'8px', flex:1 };
const miniCfg: React.CSSProperties = { background:'#000', padding:'5px 10px', borderRadius:'6px', border:'1px solid #222' };
const cfgLab: React.CSSProperties = { fontSize:'7px', color:'#444', display:'block' };
const cfgInpVal: React.CSSProperties = { background:'transparent', border:'none', color:'#fff', width:'30px', fontSize:'12px', fontWeight:'bold' };
const saveBtn: React.CSSProperties = { background:'#2ecc71', color:'#000', padding:'12px 20px', borderRadius:'8px', fontWeight:'900', border:'none' };
const abvCircle: React.CSSProperties = { position:'fixed', bottom:'90px', right:'20px', background:'#f39c12', color:'#000', width:'55px', height:'55px', borderRadius:'50%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', fontWeight:'900', fontSize:'13px', border:'3px solid #000' };

function getBeerColor(ebc: number) {
  if (ebc <= 8) return "#F5F75C";
  if (ebc <= 15) return "#F1C40F";
  if (ebc <= 25) return "#D4AC0D";
  if (ebc <= 40) return "#8D4C17";
  return "#1A0506";
}