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
  time?: number; // Durée globale de l'étape
  ingredients: Ingredient[];
}

const customCSS = `
  input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none !important; margin: 0 !important; }
  input[type=number] { -moz-appearance: textfield !important; }
  .floating-abv { position: fixed; bottom: 20px; right: 20px; background: #f39c12; color: #000; padding: 12px; border-radius: 50%; font-weight: 900; box-shadow: 0 4px 15px rgba(243,156,18,0.5); z-index: 100; display: flex; flex-direction: column; align-items: center; justify-content: center; width: 64px; height: 64px; border: 3px solid #000; font-size: 14px; }
  select, input { color: #ddd !important; }
`;

export default function SuperLaboPage() {
  const [dbIngredients, setDbIngredients] = useState<any[]>([]);
  const [recipeName, setRecipeName] = useState("BRASSIN_PRECISION_LAB");
  const [isFixedMode, setIsFixedMode] = useState(true);
  const [sugarMode, setSugarMode] = useState(7);
  const [config, setConfig] = useState({ volume: 20, efficiency: 75, targetMalt: 5.5, targetIBU: 50 });

  const [steps, setSteps] = useState<Step[]>([
    { id: "s1", label: "CONCASSAGE", ingredients: [] },
    { id: "s2", label: "EMPÂTAGE", temp: 67, time: 60, ingredients: [] },
    { id: "s_filt", label: "FILTRATION", ingredients: [] },
    { id: "s3", label: "RINÇAGE", temp: 78, ingredients: [] },
    { id: "s4", label: "ÉBULLITION", time: 60, ingredients: [] },
    { id: "s5", label: "FERMENTATION", temp: 20, time: 14, ingredients: [] },
    { id: "s6", label: "MISE EN BOUTEILLES", ingredients: [] },
  ]);

  const [stats, setStats] = useState({ abv: 0, ebc: 0, ibu: 0, og: 1.0, maltTotal: 0, waterE: 0, waterR: 0, sugarTotal: 0, yeastTotal: 0 });

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
      sugarTotal: Math.round(vol * sugarMode),
      yeastTotal: parseFloat((vol * 0.6).toFixed(1))
    });
  }, [steps, config, isFixedMode, sugarMode]);

  useEffect(() => { runCalculations(); }, [runCalculations]);

  const updateStepTime = (sIdx: number, val: number) => {
    const n = [...steps];
    n[sIdx].time = val;
    setSteps(n);
  };

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
      <style>{customCSS}</style>

      <div className="floating-abv">
        <span style={{fontSize:'10px', opacity:0.8}}>ABV</span>
        <span>{stats.abv}%</span>
      </div>
      
      <header style={{ marginBottom: "25px" }}>
        <input value={recipeName} onChange={e => setRecipeName(e.target.value)} style={titleStyle} />
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

      <main style={{ display:'flex', flexDirection:'column', gap:'15px' }}>
        {steps.map((step, sIdx) => (
          <div key={step.id} style={cardStyle}>
            <div style={stepHeader}>
              <div style={{flex:1}}>
                <div style={stepTitle}>{step.label}</div>
                
                {step.label === "CONCASSAGE" && (
                   <div style={gaugeWrapper}>
                       <div style={gaugeText}>CHARGE MALT : {stats.maltTotal.toFixed(1)}kg / {config.targetMalt}kg</div>
                       <div style={track}><div style={{...bar, width:`${Math.min((stats.maltTotal/config.targetMalt)*100, 100)}%`, backgroundColor:'#f39c12'}} /></div>
                   </div>
                )}

                {step.label === "ÉBULLITION" && (
                   <div style={gaugeWrapper}>
                       <div style={gaugeText}>EXTRACTION IBU : {stats.ibu} / {config.targetIBU}</div>
                       <div style={track}><div style={{...bar, width:`${Math.min((stats.ibu/config.targetIBU)*100, 100)}%`, backgroundColor:'#2ecc71'}} /></div>
                   </div>
                )}

                {step.label === "EMPÂTAGE" && <div style={subInfo}>VOLUME D'EAU INITIAL : <span style={highlight}>{stats.waterE}L</span></div>}
                {step.label === "RINÇAGE" && <div style={subInfo}>EAU DE RINÇAGE : <span style={highlight}>{stats.waterR}L</span></div>}
                {step.label === "FERMENTATION" && <div style={subInfo}>ESTIMATION LEVURE : <span style={highlight}>{stats.yeastTotal}G</span></div>}
                {step.label === "MISE EN BOUTEILLES" && <div style={subInfo}>SUCRE TOTAL : <span style={{color:'#2ecc71', fontWeight:'bold'}}>{stats.sugarTotal}G</span></div>}
              </div>

              {/* SECTION TIMERS ET TEMPÉRATURES */}
              <div style={{display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'5px'}}>
                {step.temp && <div style={tempBadge}>{step.temp}°C</div>}
                {step.time !== undefined && (
                    <div style={timeBadge}>
                        <input 
                            type="number" 
                            value={step.time} 
                            onChange={(e) => updateStepTime(sIdx, parseInt(e.target.value) || 0)} 
                            style={timeInput}
                        />
                        <span style={{fontSize:'8px', opacity:0.5}}>{step.label === "FERMENTATION" ? "J" : "MIN"}</span>
                    </div>
                )}
              </div>
            </div>

            {/* CARTE FILTRATION SPÉCIFIQUE (Pas d'ingrédients) */}
            {step.label === "FILTRATION" && (
                <div style={{fontSize:'10px', color:'#555', borderTop:'1px solid #111', paddingTop:'10px', fontStyle:'italic'}}>
                    Recirculation du moût jusqu'à clarification, puis transfert vers la cuve d'ébullition.
                </div>
            )}

            <div style={{display:'flex', gap:'8px', marginBottom:'12px'}}>
                {step.label.includes("CONC") && <button style={addBtn} onClick={() => {const n=[...steps]; n[sIdx].ingredients.push({id:Date.now(), type:"MALT", name:"", qty:0}); setSteps(n)}}>+ MALT</button>}
                {step.label.includes("ÉBUL") && <button style={addBtn} onClick={() => {const n=[...steps]; n[sIdx].ingredients.push({id:Date.now(), type:"HOP", name:"", qty:0, time:60}); setSteps(n)}}>+ HOUBLON</button>}
            </div>

            {step.ingredients.map((ing, iIdx) => (
              <div key={ing.id} style={ingRow}>
                <select value={ing.name} onChange={e => updateIngredient(sIdx, iIdx, "name", e.target.value)} style={selectStyle}>
                    <option value="">Ingrédient...</option>
                    {dbIngredients.filter(x => x.type === ing.type).map(x => <option key={x.id} value={x.name}>{x.name}</option>)}
                </select>
                <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                  {ing.type === "HOP" && (
                      <div style={{display:'flex', alignItems:'center', gap:'3px'}}>
                        <input type="number" value={ing.time} onChange={e => updateIngredient(sIdx, iIdx, "time", e.target.value)} style={ingTimeInput} />
                        <span style={{fontSize:'7px', color:'#333'}}>m</span>
                      </div>
                  )}
                  <input type="number" value={ing.qty} onChange={e => updateIngredient(sIdx, iIdx, "qty", e.target.value)} style={qtyInput} />
                  <span style={unitStyle}>{ing.type === "MALT" ? "KG" : "G"}</span>
                </div>
              </div>
            ))}
          </div>
        ))}
      </main>

      <footer style={footerStyle}>
          <div style={cfgCard}><label style={cfgLabel}>VOLUME</label><input type="number" value={isFixedMode ? 20 : config.volume} onChange={e => setConfig({...config, volume: +e.target.value})} style={cfgInp} /></div>
          <div style={cfgCard}><label style={cfgLabel}>CIBLE MALT</label><input type="number" value={config.targetMalt} onChange={e => setConfig({...config, targetMalt: +e.target.value})} style={cfgInp} /></div>
          <div style={cfgCard}><label style={cfgLabel}>CIBLE IBU</label><input type="number" value={config.targetIBU} onChange={e => setConfig({...config, targetIBU: +e.target.value})} style={cfgInp} /></div>
          <button style={modeBtn} onClick={() => setIsFixedMode(!isFixedMode)}>{isFixedMode ? "VERROUILLÉ 20L" : "LITRAGE LIBRE"}</button>
      </footer>
    </div>
  );
}

// --- STYLES ---
const containerStyle: React.CSSProperties = { padding: "20px", backgroundColor: "#020202", color: "#ddd", minHeight: "100vh", fontFamily: "monospace" };
const titleStyle: React.CSSProperties = { background:'transparent', border:'none', color:'#fff', fontSize:'1.1rem', fontWeight:'900', width:'100%', outline:'none', marginBottom:'20px' };
const masterGrid: React.CSSProperties = { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' };
const statBox: React.CSSProperties = { background:'#080808', padding:'10px', borderRadius:'10px', border:'1px solid #111' };
const statLabel: React.CSSProperties = { display:'flex', justifyContent:'space-between', fontSize:'8px', marginBottom:'5px', color:'#555' };
const track: React.CSSProperties = { height:'6px', background:'#111', borderRadius:'3px', overflow:'hidden' };
const bar: React.CSSProperties = { height:'100%', transition:'width 0.4s ease' };
const cardStyle: React.CSSProperties = { background:'#080808', padding:'18px', borderRadius:'18px', border:'1px solid #151515' };
const stepHeader: React.CSSProperties = { display:'flex', justifyContent:'space-between', marginBottom:'15px', alignItems:'flex-start' };
const stepTitle: React.CSSProperties = { color:'#f39c12', fontWeight:'900', fontSize:'13px', letterSpacing:'1px' };
const gaugeWrapper: React.CSSProperties = { marginTop:'10px', width:'95%' };
const gaugeText: React.CSSProperties = { fontSize:'9px', color:'#444', marginBottom:'4px' };
const subInfo: React.CSSProperties = { fontSize:'10px', color:'#666', marginTop:'6px' };
const highlight: React.CSSProperties = { color:'#f39c12', fontWeight:'bold' };
const tempBadge: React.CSSProperties = { background:'#111', padding:'4px 8px', borderRadius:'6px', fontSize:'10px', color:'#f39c12', border:'1px solid #222', fontWeight:'bold' };
const timeBadge: React.CSSProperties = { background:'#000', padding:'4px 8px', borderRadius:'6px', fontSize:'10px', color:'#888', border:'1px solid #222', display:'flex', alignItems:'center', gap:'4px' };
const timeInput: React.CSSProperties = { background:'transparent', border:'none', color:'#888', width:'25px', textAlign:'center', outline:'none', fontWeight:'bold', fontSize:'11px' };
const addBtn: React.CSSProperties = { background:'#111', border:'1px solid #222', color:'#444', fontSize:'9px', padding:'6px 12px', borderRadius:'6px' };
const ingRow: React.CSSProperties = { display:'flex', alignItems:'center', background:'#000', padding:'10px 14px', borderRadius:'10px', border:'1px solid #111', marginBottom:'6px', gap:'10px' };
const selectStyle: React.CSSProperties = { background:'transparent', border:'none', color:'#bbb', fontSize:'11px', flex:1, outline:'none' };
const qtyInput: React.CSSProperties = { background:'transparent', border:'none', color:'#f39c12', fontSize:'15px', width:'50px', textAlign:'right', outline:'none', fontWeight:'bold' };
const ingTimeInput: React.CSSProperties = { background:'#080808', border:'none', color:'#444', fontSize:'11px', width:'25px', textAlign:'center', outline:'none' };
const unitStyle: React.CSSProperties = { fontSize:'8px', color:'#333', fontWeight:'bold' };
const footerStyle: React.CSSProperties = { marginTop:'30px', paddingBottom:'80px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' };
const cfgCard: React.CSSProperties = { background:'#080808', padding:'10px', borderRadius:'10px', border:'1px solid #111' };
const cfgLabel: React.CSSProperties = { fontSize:'8px', color:'#333', display:'block', marginBottom:'4px' };
const cfgInp: React.CSSProperties = { background:'transparent', border:'none', color:'#fff', width:'100%', fontSize:'14px', outline:'none' };
const modeBtn: React.CSSProperties = { gridColumn:'span 2', background:'#111', border:'1px solid #333', color:'#555', padding:'12px', borderRadius:'10px', fontSize:'10px', fontWeight:'bold' };

function getBeerColor(ebc: number) {
  if (ebc <= 8) return "#F5F75C";
  if (ebc <= 15) return "#F1C40F";
  if (ebc <= 25) return "#D4AC0D";
  if (ebc <= 40) return "#8D4C17";
  return "#1A0506";
}