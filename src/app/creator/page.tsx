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
}

const customCSS = `
  input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none !important; margin: 0 !important; }
  input[type=number] { -moz-appearance: textfield !important; }
  .floating-abv { position: fixed; bottom: 85px; right: 20px; background: #f39c12; color: #000; padding: 12px; border-radius: 50%; font-weight: 900; z-index: 99; display: flex; flex-direction: column; align-items: center; justify-content: center; width: 60px; height: 60px; border: 3px solid #000; font-size: 13px; box-shadow: 0 4px 15px rgba(0,0,0,0.5); }
`;

export default function SuperLaboPage() {
  const [dbIngredients, setDbIngredients] = useState<any[]>([]);
  const [recipeName, setRecipeName] = useState("MA_NOUVELLE_RECETTE");
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

  // --- LOGIQUE CHRONO ---
  useEffect(() => {
    const timer = setInterval(() => {
      setSteps(prev => prev.map(s => (s.isRunning && s.remainingSeconds > 0) ? { ...s, remainingSeconds: s.remainingSeconds - 1 } : s));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleTimer = (idx: number) => { const n = [...steps]; n[idx].isRunning = !n[idx].isRunning; setSteps(n); };
  const resetTimer = (idx: number) => { const n = [...steps]; n[idx].isRunning = false; n[idx].remainingSeconds = n[idx].durationInMinutes * 60; setSteps(n); };
  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return `${h > 0 ? h + 'h ' : ''}${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  // --- CALCULS ---
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
    setStats({
      og,
      ebc: Math.round(1.49 * Math.pow(mcu, 0.68) * 1.97) || 0,
      abv: parseFloat(((og - 1) * 131.25 * 0.75).toFixed(1)),
      ibu: Math.round(ibu),
      maltTotal: malt,
      waterE: parseFloat((malt * 2.8).toFixed(1)),
      waterR: parseFloat(((vol * 1.15) - (malt * 0.8)).toFixed(1)),
      sugarTotal: Math.round(vol * sugarMode),
      yeastQty: parseFloat((vol * 0.7).toFixed(1))
    });
  }, [steps, config, isFixedMode, sugarMode]);

  useEffect(() => { runCalculations(); }, [runCalculations]);

  useEffect(() => {
    const fetchRefs = async () => {
      const { data } = await supabase.from("ingredient_refs").select("*");
      if (data) setDbIngredients(data);
    };
    fetchRefs();
  }, []);

  const handleSave = async () => {
    try {
      const { error } = await supabase.from("recipes").upsert({
        name: recipeName, config_json: config, steps_json: steps, stats_json: stats, updated_at: new Date()
      }, { onConflict: 'name' });
      if (error) throw error;
      alert("✅ RECETTE SAUVEGARDÉE");
    } catch (e) { alert("❌ ERREUR SUPABASE"); }
  };

  return (
    <div style={{ padding: "15px", backgroundColor: "#020202", color: "#eee", minHeight: "100vh", fontFamily: "monospace", paddingBottom: "100px" }}>
      <style>{customCSS}</style>

      <div className="floating-abv">{stats.abv}%<br /><span style={{ fontSize: '8px' }}>ABV</span></div>

      <header style={{ marginBottom: "20px" }}>
        <input value={recipeName} onChange={e => setRecipeName(e.target.value)} style={titleStyle} />
        <div style={masterGrid}>
          <div style={statBox}>
            <div style={statLabel}><span>AMERTUME IBU</span><span>CIBLE {config.targetIBU}</span></div>
            <div style={track}><div style={{ ...bar, width: `${(stats.ibu / config.targetIBU) * 100}%`, backgroundColor: '#2ecc71' }} /></div>
            <div style={statValue}>{stats.ibu}</div>
          </div>
          <div style={statBox}>
            <div style={statLabel}><span>COULEUR EBC</span><span>OG {stats.og.toFixed(3)}</span></div>
            <div style={track}><div style={{ ...bar, width: `${(stats.ebc / 60) * 100}%`, backgroundColor: getBeerColor(stats.ebc) }} /></div>
            <div style={statValue}>{stats.ebc}</div>
          </div>
        </div>
      </header>

      <main style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {steps.map((step, sIdx) => (
          <div key={step.id} style={cardStyle}>
            <div style={stepHeader}>
              <div style={{ flex: 1 }}>
                <div style={stepTitle}>{step.label}</div>
                {step.label === "CONCASSAGE" && <div style={subText}>MALT : <span style={orange}>{stats.maltTotal.toFixed(1)}kg</span> / {config.targetMalt}kg</div>}
                {step.label === "EMPÂTAGE" && <div style={subText}>EAU : <span style={orange}>{stats.waterE}L</span></div>}
                {step.label === "RINÇAGE" && <div style={subText}>EAU : <span style={orange}>{stats.waterR}L</span></div>}
                {step.label === "FERMENTATION" && <div style={subText}>LEVURE : <span style={orange}>{stats.yeastQty}g</span></div>}
                {step.label === "MISE EN BOUTEILLES" && <div style={subText}>SUCRE : <span style={green}>{stats.sugarTotal}g</span></div>}
                {step.label === "AJUSTEMENT DES SELS" && <div style={subText}>PROFIL D'EAU (Gypse, Epsom...)</div>}
              </div>

              <div style={chronoBox}>
                {step.durationInMinutes > 0 && (
                  <>
                    <div style={{ ...timeDisplay, color: step.isRunning ? '#2ecc71' : '#ff4444' }}>{formatTime(step.remainingSeconds)}</div>
                    <div style={{ display: 'flex', gap: '5px', justifyContent: 'flex-end' }}>
                      <button onClick={() => toggleTimer(sIdx)} style={btnStyle}>{step.isRunning ? "⏸" : "▶"}</button>
                      <button onClick={() => resetTimer(sIdx)} style={btnStyle}>🔄</button>
                    </div>
                  </>
                )}
                {step.temp && <div style={tempBadge}>{step.temp}°C</div>}
              </div>
            </div>

            {(step.label.includes("CONC") || step.label.includes("ÉBUL") || step.label.includes("SALT")) && (
              <button style={addBtn} onClick={() => {
                const n = [...steps];
                const type = step.label.includes("CONC") ? "MALT" : step.label.includes("SALT") ? "SALT" : "HOP";
                n[sIdx].ingredients.push({ id: Date.now(), type, name: "", qty: 0, time: 60 });
                setSteps(n);
              }}>+ AJOUTER</button>
            )}

            {step.ingredients.map((ing, iIdx) => (
              <div key={ing.id} style={ingRow}>
                <input placeholder="Nom..." value={ing.name} onChange={e => { const n = [...steps]; n[sIdx].ingredients[iIdx].name = e.target.value; setSteps(n) }} style={ingName} />
                {ing.type === "HOP" && (
                  <input type="number" placeholder="min" value={ing.time} onChange={e => { const n = [...steps]; n[sIdx].ingredients[iIdx].time = +e.target.value; setSteps(n) }} style={ingTime} />
                )}
                <input type="number" value={ing.qty} onChange={e => { const n = [...steps]; n[sIdx].ingredients[iIdx].qty = +e.target.value; setSteps(n) }} style={ingQty} />
                <span style={unit}>{ing.type === "MALT" ? "kg" : "g"}</span>
              </div>
            ))}
          </div>
        ))}
      </main>

      <footer style={actionToolbar}>
        <div style={{ display: 'flex', gap: '10px', flex: 1 }}>
          <div style={miniCfg}><label style={cfgLabel}>VOL L</label><input type="number" value={config.volume} onChange={e => setConfig({ ...config, volume: +e.target.value })} style={cfgInp} /></div>
          <div style={miniCfg}><label style={cfgLabel}>IBU</label><input type="number" value={config.targetIBU} onChange={e => setConfig({ ...config, targetIBU: +e.target.value })} style={cfgInp} /></div>
        </div>
        <button onClick={handleSave} style={saveBtn}>💾 ENREGISTRER</button>
      </footer>
    </div>
  );
}

// --- STYLES ---
const titleStyle: React.CSSProperties = { background: 'transparent', border: 'none', color: '#fff', fontSize: '1.2rem', fontWeight: '900', width: '100%', marginBottom: '15px', outline: 'none' };
const masterGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' };
const statBox: React.CSSProperties = { background: '#080808', padding: '10px', borderRadius: '10px', border: '1px solid #111' };
const statLabel: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', fontSize: '8px', marginBottom: '5px', color: '#555' };
const track: React.CSSProperties = { height: '4px', background: '#111', borderRadius: '2px', overflow: 'hidden' };
const bar: React.CSSProperties = { height: '100%', transition: 'width 0.4s' };
const statValue: React.CSSProperties = { fontSize: '15px', marginTop: '5px', fontWeight: 'bold' };
const cardStyle: React.CSSProperties = { background: '#080808', padding: '15px', borderRadius: '18px', border: '1px solid #151515' };
const stepHeader: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'flex-start' };
const stepTitle: React.CSSProperties = { color: '#f39c12', fontWeight: '900', fontSize: '12px', letterSpacing: '1px' };
const subText: React.CSSProperties = { fontSize: '10px', color: '#777', marginTop: '4px' };
const orange: React.CSSProperties = { color: '#f39c12', fontWeight: 'bold' };
const green: React.CSSProperties = { color: '#2ecc71', fontWeight: 'bold' };
const chronoBox: React.CSSProperties = { textAlign: 'right' };
const timeDisplay: React.CSSProperties = { fontSize: '18px', fontWeight: '900', marginBottom: '5px', fontVariantNumeric: 'tabular-nums' };
const btnStyle: React.CSSProperties = { background: '#111', border: '1px solid #222', color: '#888', padding: '4px 8px', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' };
const tempBadge: React.CSSProperties = { background: '#111', padding: '3px 6px', borderRadius: '4px', fontSize: '10px', color: '#f39c12', marginTop: '8px', display: 'inline-block', border: '1px solid #222' };
const addBtn: React.CSSProperties = { background: '#111', border: '1px solid #222', color: '#444', fontSize: '9px', padding: '5px 12px', borderRadius: '6px', marginBottom: '10px' };
const ingRow: React.CSSProperties = { display: 'flex', background: '#000', padding: '10px 14px', borderRadius: '10px', marginBottom: '6px', alignItems: 'center' };
const ingName: React.CSSProperties = { background: 'transparent', border: 'none', color: '#bbb', fontSize: '12px', flex: 1, outline: 'none' };
const ingQty: React.CSSProperties = { background: 'transparent', border: 'none', color: '#f39c12', fontSize: '15px', width: '55px', textAlign: 'right', fontWeight: 'bold' };
const ingTime: React.CSSProperties = { background: '#080808', border: 'none', color: '#444', fontSize: '10px', width: '30px', textAlign: 'center', marginRight: '5px' };
const unit: React.CSSProperties = { fontSize: '9px', color: '#444', marginLeft: '5px' };
const actionToolbar: React.CSSProperties = { position: 'fixed', bottom: 0, left: 0, right: 0, background: '#080808', borderTop: '2px solid #1a1a1a', padding: '15px', display: 'flex', alignItems: 'center', gap: '15px', zIndex: 1000 };
const saveBtn: React.CSSProperties = { background: '#2ecc71', color: '#000', border: 'none', padding: '12px 20px', borderRadius: '8px', fontWeight: '900', fontSize: '12px', cursor: 'pointer' };
const miniCfg: React.CSSProperties = { background: '#000', padding: '5px 10px', borderRadius: '6px', border: '1px solid #222' };
const cfgLabel: React.CSSProperties = { fontSize: '7px', color: '#444', display: 'block' };
const cfgInp: React.CSSProperties = { background: 'transparent', border: 'none', color: '#fff', width: '35px', fontSize: '12px', fontWeight: 'bold', outline: 'none' };

function getBeerColor(ebc: number) {
  if (ebc <= 8) return "#F5F75C";
  if (ebc <= 15) return "#F1C40F";
  if (ebc <= 25) return "#D4AC0D";
  if (ebc <= 40) return "#8D4C17";
  return "#1A0506";
}