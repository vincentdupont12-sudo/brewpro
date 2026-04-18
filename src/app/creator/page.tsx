"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../lib/supabaseClient";

// --- TYPES & INTERFACES ---
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
  ingredients: Ingredient[];
}

const noSpinnersStyle = `
  input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none !important; margin: 0 !important; }
  input[type=number] { -moz-appearance: textfield !important; }
  .floating-abv { position: fixed; bottom: 20px; right: 20px; background: #f39c12; color: #000; padding: 15px; borderRadius: 50%; font-weight: 900; box-shadow: 0 4px 15px rgba(243,156,18,0.5); z-index: 100; display: flex; flex-direction: column; align-items: center; justify-content: center; width: 60px; height: 60px; border: 2px solid #000; }
`;

export default function SuperLaboPage() {
  const [dbIngredients, setDbIngredients] = useState<any[]>([]);
  const [recipeName, setRecipeName] = useState("BRASSIN_PRO_V3");
  const [isFixedMode, setIsFixedMode] = useState(true);
  const [sugarMode, setSugarMode] = useState(7); // g/L

  const [config, setConfig] = useState({
    volume: 20,
    efficiency: 75,
    targetMalt: 5.5,
    targetIBU: 50
  });

  const [steps, setSteps] = useState<Step[]>([
    { id: "s1", label: "CONCASSAGE", ingredients: [] },
    { id: "s2", label: "EMPÂTAGE", temp: 67, ingredients: [] },
    { id: "s3", label: "RINÇAGE", temp: 78, ingredients: [] },
    { id: "s4", label: "ÉBULLITION", ingredients: [] },
    { id: "s5", label: "FERMENTATION", temp: 20, ingredients: [] },
    { id: "s6", label: "MISE EN BOUTEILLES", ingredients: [] },
  ]);

  const [stats, setStats] = useState({ abv: 0, ebc: 0, ibu: 0, og: 1.0, maltTotal: 0, waterE: 0, waterR: 0, sugarTotal: 0 });

  useEffect(() => {
    const fetchRefs = async () => {
      const { data } = await supabase.from("ingredient_refs").select("*");
      if (data) setDbIngredients(data);
    };
    fetchRefs();
  }, []);

  const runCalculations = useCallback(() => {
    let points = 0, mcu = 0, totalIbu = 0, maltW = 0;
    const vol = isFixedMode ? 20 : (config.volume || 1);

    steps.forEach(s => {
      s.ingredients.forEach(ing => {
        const q = parseFloat(ing.qty as any) || 0;
        if (ing.type === "MALT") {
          maltW += q;
          mcu += (q * 2.204 * ((ing.ebc || 0) * 0.508)) / (vol * 0.264);
          points += q * 300 * ((ing.yield || 0) / 100) * (config.efficiency / 100);
        }
        if (ing.type === "HOP") {
            const ogG = 1 + (points / vol) / 1000;
            const util = 1.65 * Math.pow(0.000125, ogG - 1) * ((1 - Math.exp(-0.04 * (ing.time || 0))) / 4.15);
            totalIbu += (((ing.alpha || 0) / 100) * (q * 1000) / vol) * util;
        }
      });
    });

    const og = 1 + (points / vol) / 1000;
    setStats({
      og: parseFloat(og.toFixed(3)),
      ebc: Math.round(1.49 * Math.pow(mcu, 0.68) * 1.97) || 0,
      abv: parseFloat(((og - 1) * 131.25 * 0.75).toFixed(1)),
      ibu: Math.round(totalIbu),
      maltTotal: maltW,
      waterE: parseFloat((maltW * 2.8).toFixed(1)),
      waterR: parseFloat(((vol * 1.15) - (maltW * 0.8)).toFixed(1)),
      sugarTotal: Math.round(vol * sugarMode)
    });
  }, [steps, config, isFixedMode, sugarMode]);

  useEffect(() => { runCalculations(); }, [runCalculations]);

  const updateIngredient = (sIdx: number, iIdx: number, field: string, val: any) => {
    const n = [...steps];
    const ing = n[sIdx].ingredients[iIdx];
    if (field === "name") {
      const ref = dbIngredients.find(x => x.name === val);
      if (ref) { Object.assign(ing, { name: val, ebc: ref.potency, yield: ref.yield, alpha: ref.potency }); }
    } else { (ing as any)[field] = val; }
    setSteps(n);
  };

  return (
    <div style={containerStyle}>
      <style>{noSpinnersStyle}</style>

      {/* 1. BADGE FLOTTANT (Concept 1) */}
      <div className="floating-abv">
        <span style={{fontSize:'8px'}}>ABV</span>
        <span>{stats.abv}%</span>
      </div>
      
      <header style={{ marginBottom: "20px" }}>
        <input value={recipeName} onChange={e => setRecipeName(e.target.value)} style={titleStyle} />
        
        {/* JAUGES EBC ET IBU (Concept Master) */}
        <div style={masterGrid}>
            <div style={statBox}>
                <div style={statLabel}><span>AMERTUME (IBU)</span><span>{stats.ibu}/{config.targetIBU}</span></div>
                <div style={track}><div style={{...bar, width:`${Math.min((stats.ibu/config.targetIBU)*100, 100)}%`, backgroundColor:'#27ae60'}} /></div>
            </div>
            <div style={statBox}>
                <div style={statLabel}><span>COULEUR (EBC)</span><span>{stats.ebc}</span></div>
                <div style={track}><div style={{...bar, width:`${Math.min((stats.ebc/60)*100, 100)}%`, backgroundColor: getBeerColor(stats.ebc)}} /></div>
            </div>
        </div>
      </header>

      <main style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
        {steps.map((step, sIdx) => (
          <div key={step.id} style={cardStyle}>
            <div style={stepHeader}>
              <div style={{flex:1}}>
                <div style={stepTitle}>{step.label}</div>
                
                {/* JAUGE MALT DANS CARTE CONCASSAGE */}
                {step.label === "CONCASSAGE" && (
                   <div style={{marginTop:'8px'}}>
                       <div style={{fontSize:'9px', color:'#444', marginBottom:'3px'}}>CHARGE : {stats.maltTotal.toFixed(1)}kg / {config.targetMalt}kg</div>
                       <div style={{...track, height:'4px', width:'100%'}}>
                            <div style={{...bar, width:`${Math.min((stats.maltTotal/config.targetMalt)*100, 100)}%`, backgroundColor:'#f39c12'}} />
                       </div>
                   </div>
                )}

                {/* VOLUMES D'EAU DYNAMIQUES */}
                {step.label === "EMPÂTAGE" && <div style={subText}>EAU À CHAUFFER : <strong style={{color:'#f39c12'}}>{stats.waterE}L</strong></div>}
                {step.label === "RINÇAGE" && <div style={subText}>EAU DE RINÇAGE : <strong style={{color:'#f39c12'}}>{stats.waterR}L</strong></div>}
                
                {/* SUCRE INTELLIGENT */}
                {step.label === "MISE EN BOUTEILLES" && (
                    <div style={{marginTop:'10px'}}>
                        <div style={subText}>SUCRE TOTAL : <strong style={{color:'#27ae60'}}>{stats.sugarTotal}G</strong></div>
                        <div style={{display:'flex', gap:'5px', marginTop:'5px'}}>
                            {[5, 7, 9].map(v => (
                                <button key={v} onClick={() => setSugarMode(v)} style={{...miniBtn, borderColor: sugarMode === v ? '#27ae60' : '#222'}}>{v}g/L</button>
                            ))}
                        </div>
                    </div>
                )}
              </div>
              {step.temp && <div style={tempBadge}>{step.temp}°C</div>}
            </div>

            <div style={{display:'flex', gap:'8px', marginBottom:'10px'}}>
                {step.label.includes("CONC") && <button style={addBtn} onClick={() => {const n=[...steps]; n[sIdx].ingredients.push({id:Date.now(), type:"MALT", name:"", qty:0}); setSteps(n)}}>+ MALT</button>}
                {step.label.includes("ÉBUL") && <button style={addBtn} onClick={() => {const n=[...steps]; n[sIdx].ingredients.push({id:Date.now(), type:"HOP", name:"", qty:0, time:60}); setSteps(n)}}>+ HOUBLON</button>}
            </div>

            {step.ingredients.map((ing, iIdx) => (
              <div key={ing.id} style={ingRow}>
                <select value={ing.name} onChange={e => updateIngredient(sIdx, iIdx, "name", e.target.value)} style={selectStyle}>
                    <option value="">Ingrédient...</option>
                    {dbIngredients.filter(x => x.type === ing.type).map(x => <option key={x.id} value={x.name}>{x.name}</option>)}
                </select>
                <input type="number" value={ing.qty} onChange={e => updateIngredient(sIdx, iIdx, "qty", e.target.value)} style={qtyInput} />
                <span style={{fontSize:'8px', color:'#333'}}>{ing.type === "MALT" ? "KG" : "G"}</span>
              </div>
            ))}
          </div>
        ))}
      </main>

      <footer style={footerStyle}>
          <div style={cfgCard}><label style={cfgLabel}>VOLUME (L)</label><input type="number" value={isFixedMode ? 20 : config.volume} onChange={e => setConfig({...config, volume: +e.target.value})} style={cfgInp} /></div>
          <div style={cfgCard}><label style={cfgLabel}>CIBLE MALT (KG)</label><input type="number" value={config.targetMalt} onChange={e => setConfig({...config, targetMalt: +e.target.value})} style={cfgInp} /></div>
          <div style={cfgCard}><label style={cfgLabel}>CIBLE IBU</label><input type="number" value={config.targetIBU} onChange={e => setConfig({...config, targetIBU: +e.target.value})} style={cfgInp} /></div>
          <button style={modeBtn} onClick={() => setIsFixedMode(!isFixedMode)}>{isFixedMode ? "MODE 20L" : "LIBRE"}</button>
      </footer>
    </div>
  );
}

// --- STYLES ---
const containerStyle: React.CSSProperties = { padding: "15px", backgroundColor: "#020202", color: "#eee", minHeight: "100vh", fontFamily: "monospace" };
const titleStyle: React.CSSProperties = { background:'transparent', border:'none', color:'#fff', fontSize:'1.2rem', fontWeight:'900', width:'100%', outline:'none', marginBottom:'15px' };
const masterGrid: React.CSSProperties = { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' };
const statBox: React.CSSProperties = { background:'#080808', padding:'10px', borderRadius:'8px', border:'1px solid #111' };
const statLabel: React.CSSProperties = { display:'flex', justifyContent:'space-between', fontSize:'8px', marginBottom:'5px', color:'#444' };
const track: React.CSSProperties = { height:'6px', background:'#111', borderRadius:'3px', overflow:'hidden' };
const bar: React.CSSProperties = { height:'100%', transition:'width 0.4s ease' };
const cardStyle: React.CSSProperties = { background:'#080808', padding:'15px', borderRadius:'15px', border:'1px solid #151515' };
const stepHeader: React.CSSProperties = { display:'flex', justifyContent:'space-between', marginBottom:'12px' };
const stepTitle: React.CSSProperties = { color:'#f39c12', fontWeight:'900', fontSize:'12px', letterSpacing:'1px' };
const subText: React.CSSProperties = { fontSize:'10px', color:'#555', marginTop:'5px' };
const tempBadge: React.CSSProperties = { background:'#111', padding:'3px 8px', borderRadius:'5px', fontSize:'10px', color:'#f39c12', border:'1px solid #222', height:'fit-content' };
const addBtn: React.CSSProperties = { background:'#111', border:'1px solid #222', color:'#444', fontSize:'9px', padding:'5px 10px', borderRadius:'5px' };
const ingRow: React.CSSProperties = { display:'flex', alignItems:'center', background:'#000', padding:'8px 12px', borderRadius:'8px', border:'1px solid #111', marginBottom:'5px', gap:'10px' };
const selectStyle: React.CSSProperties = { background:'transparent', border:'none', color:'#ccc', fontSize:'11px', flex:1, outline:'none' };
const qtyInput: React.CSSProperties = { background:'transparent', border:'none', color:'#f39c12', fontSize:'14px', width:'45px', textAlign:'right', outline:'none', fontWeight:'bold' };
const footerStyle: React.CSSProperties = { marginTop:'20px', paddingBottom:'80px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' };
const cfgCard: React.CSSProperties = { background:'#080808', padding:'8px', borderRadius:'8px', border:'1px solid #111' };
const cfgLabel: React.CSSProperties = { fontSize:'7px', color:'#333', display:'block', marginBottom:'2px' };
const cfgInp: React.CSSProperties = { background:'transparent', border:'none', color:'#fff', width:'100%', fontSize:'13px', outline:'none' };
const modeBtn: React.CSSProperties = { gridColumn:'span 2', background:'#111', border:'1px solid #333', color:'#666', padding:'10px', borderRadius:'8px', fontSize:'10px' };
const miniBtn: React.CSSProperties = { background:'#000', border:'1px solid #222', color:'#444', fontSize:'8px', padding:'3px 6px', borderRadius:'4px' };

function getBeerColor(ebc: number) {
  if (ebc <= 8) return "#F5F75C";
  if (ebc <= 15) return "#F1C40F";
  if (ebc <= 25) return "#D4AC0D";
  if (ebc <= 40) return "#8D4C17";
  return "#1A0506";
}