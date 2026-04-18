"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabaseClient";

const noSpinnersStyle = `
  input::-webkit-outer-spin-button,
  input::-webkit-inner-spin-button { -webkit-appearance: none !important; margin: 0 !important; }
  input[type=number] { -moz-appearance: textfield !important; }
  textarea { resize: none; outline: none; }
  select { outline: none; }
`;

export default function SuperLaboPage() {
  const [dbIngredients, setDbIngredients] = useState<any[]>([]);
  const [recipeName, setRecipeName] = useState("NOUVELLE_RECETTE");
  const [loading, setLoading] = useState(false);
  const [isFixedMode, setIsFixedMode] = useState(true);
  const [showPHModal, setShowPHModal] = useState<number | null>(null);

  const [config, setConfig] = useState({
    volume: 20,
    efficiency: 75,
    sugarPerL: 6,
  });

  const [steps, setSteps] = useState([
    { id: "s1", label: "CONCASSAGE", ingredients: [] as any[] },
    { id: "s2", label: "EMPÂTAGE", temp: 67, phNote: "", lastPH: "", ingredients: [] as any[] },
    { id: "s3", label: "RINÇAGE", temp: 78, phNote: "", lastPH: "", ingredients: [] as any[] },
    { id: "s4", label: "ÉBULLITION", ingredients: [] as any[] },
    { id: "s5", label: "FERMENTATION", temp: 20, ingredients: [] as any[] },
    { id: "s6", label: "REFERMENTATION EN BOUTEILLE", ingredients: [] as any[] },
  ]);

  const [stats, setStats] = useState({ abv: 0, ebc: 0, ibu: 0, og: 1.0, waterE: 0, waterR: 0, sugarTotal: 0, maltTotal: 0, hopTotal: 0 });

  useEffect(() => {
    const fetchRefs = async () => {
      const { data } = await supabase.from("ingredient_refs").select("*");
      if (data) setDbIngredients(data);
    };
    fetchRefs();
  }, []);

  const stopWheel = (e: any) => e.target.blur();

  // CALCULS DYNAMIQUES
  useEffect(() => {
    let totalPoints = 0, totalMCU = 0, totalIBU = 0, maltWeight = 0, hopWeight = 0, attenuation = 0.75;
    const calcVol = isFixedMode ? 20 : config.volume;

    steps.forEach(s => {
      s.ingredients.forEach(ing => {
        const qty = parseFloat(ing.qty) || 0;
        if (ing.type === "MALT") {
          maltWeight += qty;
          totalMCU += (qty * 2.204 * ((ing.ebc || 0) * 0.508)) / (calcVol * 0.264);
          totalPoints += qty * 300 * ((ing.yield || 0) / 100) * (config.efficiency / 100);
        }
        if (ing.type === "SUCRE") totalPoints += qty * 380;
        if (ing.type === "HOP") {
            hopWeight += qty;
            const alpha = parseFloat(ing.alpha) || 0;
            const time = parseFloat(ing.time) || 0;
            const ogGuess = 1 + (totalPoints / calcVol) / 1000;
            const util = 1.65 * Math.pow(0.000125, ogGuess - 1) * ((1 - Math.exp(-0.04 * time)) / 4.15);
            totalIBU += ((alpha / 100) * (qty * 1000) / calcVol) * util;
        }
        if (ing.type === "YEAST") attenuation = (ing.potency || 75) / 100;
      });
    });

    const og = 1 + (totalPoints / (calcVol > 0 ? calcVol : 1)) / 1000;
    const wE = maltWeight * 2.8;

    setStats({
      og: parseFloat(og.toFixed(3)),
      ebc: Math.round(1.49 * Math.pow(totalMCU, 0.68) * 1.97) || 0,
      abv: parseFloat(((og - 1) * 131.25 * attenuation).toFixed(1)) || 0,
      ibu: Math.round(totalIBU) || 0,
      waterE: parseFloat(wE.toFixed(1)),
      waterR: parseFloat(((calcVol * 1.1) - (wE - maltWeight)).toFixed(1)),
      sugarTotal: parseFloat((calcVol * config.sugarPerL).toFixed(1)),
      maltTotal: maltWeight,
      hopTotal: hopWeight
    });
  }, [steps, config, isFixedMode]);

  const updateIng = (sIdx: number, iIdx: number, field: string, value: any) => {
    const n = [...steps];
    const ing = n[sIdx].ingredients[iIdx];
    
    if (field === "name") {
        const ref = dbIngredients.find(x => x.name === value);
        if (ref) {
            n[sIdx].ingredients[iIdx] = { ...ing, name: value, ebc: ref.potency, yield: ref.yield, alpha: ref.potency };
        }
    } else {
        n[sIdx].ingredients[iIdx][field] = value;
    }
    setSteps(n);
  };

  const saveRecipe = async () => {
    setLoading(true);
    const payload = { name: recipeName.toUpperCase(), is_fixed_20l: isFixedMode, stats, config, steps };
    const { error } = await supabase.from("recipes").insert([{ data: payload }]);
    if (error) alert("ERREUR: " + error.message);
    else alert("🚀 RECETTE ENVOYÉE");
    setLoading(false);
  };

  const PHAssistant = () => {
    if (showPHModal === null) return null;
    const step = steps[showPHModal];
    const [measuredPH, setMeasuredPH] = useState(step.lastPH || "");
    const ph = parseFloat(measuredPH);
    const diff = ph - 5.4;

    return (
      <div style={modalOverlay}>
        <div style={modalContent}>
          <div style={{display:'flex', justifyContent:'space-between', marginBottom:'15px'}}>
            <h3 style={{color: '#f39c12', fontSize: '16px', margin:0}}>🧪 CONTRÔLE pH</h3>
            <button onClick={() => setShowPHModal(null)} style={{background:'none', border:'none', color:'#444', fontSize:'20px'}}>✕</button>
          </div>
          <input type="number" step="0.01" style={cfgInput} value={measuredPH} onChange={(e) => setMeasuredPH(e.target.value)} placeholder="pH mesuré..." />
          {ph > 5.4 && (
            <div style={recoBox}>
              <p style={{fontSize: '10px', color: '#e74c3c', marginBottom: '10px'}}>⚠️ ALCALIN (+{diff.toFixed(2)})</p>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
                <div style={choiceCard}><small>LACTIQUE</small><br/><strong>{(diff * 12).toFixed(1)}ml</strong></div>
                <div style={choiceCard}><small>PHOSPHO</small><br/><strong>{(diff * 25).toFixed(1)}ml</strong></div>
              </div>
            </div>
          )}
          <textarea style={noteArea} value={step.phNote} onChange={(e) => {const n=[...steps]; n[showPHModal].phNote=e.target.value; setSteps(n)}} placeholder="Notes (ex: +2ml acide)..." />
          <button style={saveBtn} onClick={() => {const n=[...steps]; n[showPHModal].lastPH=measuredPH; setSteps(n); setShowPHModal(null)}}>VALIDER</button>
        </div>
      </div>
    );
  };

  return (
    <div style={containerStyle}>
      <style>{noSpinnersStyle}</style>
      <PHAssistant />
      
      <header style={headerStyle}>
        <input value={recipeName} onChange={e => setRecipeName(e.target.value)} style={mainTitle} />
        
        <div style={statsGrid}>
          <StatCard label="ALCOOL" val={stats.abv + "%"} color="#f39c12" />
          <StatCard label="AMERTUME" val={stats.ibu + " IBU"} color="#27ae60" />
          <div style={{...StatCardStyle, background: getBeerColor(stats.ebc), color: stats.ebc > 20 ? '#fff' : '#000'}}>
             <div style={{fontSize: '7px', opacity: 0.6}}>COULEUR</div>
             <div style={{fontSize: '13px', fontWeight: 'bold'}}>{stats.ebc} EBC</div>
          </div>
          <StatCard label="DENSITÉ" val={stats.og} />
          <StatCard label="EAU TOTALE" val={(stats.waterE + stats.waterR).toFixed(0) + "L"} />
          <div style={modeToggle} onClick={() => setIsFixedMode(!isFixedMode)}>
            {isFixedMode ? "FIXE 20L" : "DYNAMIQUE"}
          </div>
        </div>
      </header>

      <div style={mobileWrapper}>
        <main style={mainContainer}>
          {steps.map((step, i) => (
            <div key={step.id} style={stepBox}>
              <div style={stepHead}>
                <div style={stepLabel}>{step.label}</div>
                <div style={{display:'flex', gap:'8px'}}>
                    {(step.label.includes("EMP") || step.label.includes("RIN")) && (
                        <button onClick={() => setShowPHModal(i)} style={phIconBtn}>{step.lastPH ? `🧪 ${step.lastPH}` : "🧪 pH"}</button>
                    )}
                    {step.temp && <div style={tempBadge}>{step.temp}°C</div>}
                </div>
              </div>

              <div style={btnRow}>
                {step.label.includes("CONC") && <button onClick={() => {const n=[...steps]; n[i].ingredients.push({id:Date.now(), type:"MALT", name:"", qty:0}); setSteps(n)}} style={addBtn}>+ MALT</button>}
                {step.label.includes("ÉBUL") && <button onClick={() => {const n=[...steps]; n[i].ingredients.push({id:Date.now(), type:"HOP", name:"", qty:0, time:60, alpha:0}); setSteps(n)}} style={addBtn}>+ HOUBLON</button>}
                {step.label.includes("FERM") && !step.label.includes("BOUT") && <button onClick={() => {const n=[...steps]; n[i].ingredients.push({id:Date.now(), type:"YEAST", name:"", qty:0}); setSteps(n)}} style={addBtn}>+ LEVURE</button>}
                {step.label.includes("BOUT") && <button onClick={() => {const n=[...steps]; n[i].ingredients.push({id:Date.now(), type:"SUCRE", name:"", qty:0}); setSteps(n)}} style={addBtn}>+ SUCRE</button>}
                {(step.label.includes("EMP") || step.label.includes("RIN") || step.label.includes("ÉBUL")) && <button onClick={() => {const n=[...steps]; n[i].ingredients.push({id:Date.now(), type:"SALT", name:"", qty:0}); setSteps(n)}} style={addBtn}>+ SELS</button>}
              </div>

              {step.ingredients.map((ing, idx) => {
                const totalTypeWeight = ing.type === "MALT" ? stats.maltTotal : (ing.type === "HOP" ? stats.hopTotal : 0);
                const percent = totalTypeWeight > 0 ? (parseFloat(ing.qty) / totalTypeWeight) * 100 : 0;
                
                return (
                  <div key={idx} style={ingCard}>
                    <div style={{display:'flex', justifyContent:'space-between', marginBottom:'5px'}}>
                        <select style={ingSelect} value={ing.name} onChange={e => updateIng(i, idx, "name", e.target.value)}>
                            <option value="">CHOISIR {ing.type}...</option>
                            {dbIngredients.filter(x => x.type === ing.type).map(x => <option key={x.id} value={x.name}>{x.name}</option>)}
                        </select>
                        <button onClick={() => {const n=[...steps]; n[i].ingredients.splice(idx, 1); setSteps(n)}} style={delBtn}>✕</button>
                    </div>
                    
                    <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
                        <div style={unitBox}>
                            <input type="number" style={ingInput} value={ing.qty} onWheel={stopWheel} onChange={e => updateIng(i, idx, "qty", e.target.value)} />
                            <span style={unitLabel}>{ing.type === "MALT" || ing.type === "SUCRE" ? "KG" : "G"}</span>
                        </div>
                        {ing.type === "HOP" && (
                            <div style={unitBox}>
                                <input type="number" style={ingInput} value={ing.time} onWheel={stopWheel} onChange={e => updateIng(i, idx, "time", e.target.value)} />
                                <span style={unitLabel}>MIN</span>
                            </div>
                        )}
                        {/* JAUGE DE GRANDEUR */}
                        {(ing.type === "MALT" || ing.type === "HOP") && (
                            <div style={gaugeBg}>
                                <div style={{...gaugeFill, width: `${percent}%`, backgroundColor: ing.type === "MALT" ? '#d35400' : '#27ae60'}} />
                            </div>
                        )}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </main>

        <aside style={sideContainer}>
          <div style={configBox}>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
                <div><label style={cfgLabel}>VOL (L)</label><input type="number" disabled={isFixedMode} value={isFixedMode ? 20 : config.volume} onChange={e => setConfig({...config, volume: +e.target.value})} style={cfgInput} /></div>
                <div><label style={cfgLabel}>EFFICACITÉ</label><input type="number" value={config.efficiency} onChange={e => setConfig({...config, efficiency: +e.target.value})} style={cfgInput} /></div>
            </div>
          </div>
          <button onClick={saveRecipe} disabled={loading} style={saveBtn}>{loading ? "SYNCHRO..." : "LANCER LE BRASSAGE"}</button>
        </aside>
      </div>
    </div>
  );
}

// STYLES
const StatCardStyle = { background: '#0a0a0a', padding: '8px', border: '1px solid #111', textAlign: 'center' as const, borderRadius: '6px' };
const StatCard = ({label, val, color="#fff"}: any) => (
  <div style={StatCardStyle}>
    <div style={{fontSize: '7px', color: '#444', textTransform: 'uppercase'}}>{label}</div>
    <div style={{fontSize: '13px', fontWeight: 'bold', color}}>{val}</div>
  </div>
);

const containerStyle = { padding: "15px", backgroundColor: "#020202", color: "#eee", minHeight: "100vh", fontFamily: "monospace" };
const headerStyle = { marginBottom: "20px" };
const mainTitle = { background: "transparent", border: "none", color: "#fff", fontSize: "1.8rem", fontWeight: "900", width: "100%", marginBottom: "15px", outline:'none' };
const statsGrid = { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" };
const modeToggle = { display: 'flex', alignItems:'center', justifyContent:'center', background: '#111', fontSize: '8px', border: '1px solid #333', borderRadius: '6px', cursor: 'pointer', color:'#666' };
const mobileWrapper = { display: "flex", flexDirection: "column" as const, gap: "15px", maxWidth: "500px", margin: "0 auto" };
const mainContainer = { display: "flex", flexDirection: "column" as const, gap: "12px" };
const stepBox = { background: "#080808", border: "1px solid #151515", padding: "15px", borderRadius: "10px" };
const stepHead = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" };
const stepLabel = { color: "#fff", fontSize: "14px", fontWeight: "900", letterSpacing: "1px" }; // TITRES PLUS LISIBLES
const phIconBtn = { background: '#111', border: '1px solid #333', color: '#27ae60', fontSize: '10px', padding: '4px 8px', borderRadius: '4px' };
const tempBadge = { color: '#f39c12', fontSize: '12px', fontWeight: 'bold' };
const btnRow = { display: "flex", gap: "6px", marginBottom: "12px", flexWrap: "wrap" as const };
const addBtn = { background: "#111", border: "1px solid #222", color: "#444", fontSize: "8px", padding: "6px 10px", borderRadius: "4px" };
const ingCard = { background: "#000", padding: "10px", borderRadius: "8px", marginBottom: "8px", border: "1px solid #111" };
const ingSelect = { background: "transparent", border: "none", color: "#999", fontSize: "12px", width:'80%' };
const unitBox = { background: "#0a0a0a", padding: "4px 8px", borderRadius: "4px", border: "1px solid #222", display:'flex', alignItems:'center' };
const ingInput = { background: "transparent", border: "none", color: "#f39c12", width: "40px", textAlign: "center" as const, fontSize: "14px" };
const unitLabel = { fontSize: "8px", color: "#333", marginLeft: "4px" };
const gaugeBg = { flex: 1, height: "4px", background: "#111", borderRadius: "2px", overflow: "hidden" };
const gaugeFill = { height: "100%", transition: "width 0.3s ease" };
const delBtn = { color: "#333", border: "none", background: "none", fontSize: "14px" };
const sideContainer = { display: "flex", flexDirection: "column" as const, gap: "15px", paddingBottom: "40px" };
const configBox = { background: "#080808", padding: "15px", borderRadius: "10px", border: "1px solid #111" };
const cfgLabel = { fontSize: "8px", color: "#444", display: "block", marginBottom: "4px" };
const cfgInput = { background: "#000", border: "1px solid #222", color: "#fff", width: "100%", padding: "10px", borderRadius: "6px", fontSize: "14px" };
const saveBtn = { background: "#f39c12", color: "#000", border: "none", padding: "20px", fontWeight: "900", borderRadius: "10px", fontSize: "14px" };
const modalOverlay = { position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' };
const modalContent = { background: '#080808', border: '1px solid #333', padding: '20px', borderRadius: '15px', width: '100%', maxWidth: '350px' };
const recoBox = { margin: '15px 0', padding: '12px', background: '#000', borderRadius: '8px', border: '1px dashed #333' };
const choiceCard = { background: "#111", border: "1px solid #333", padding: "10px", borderRadius: "6px", textAlign: "center" as const };
const noteArea = { width: '100%', background: '#000', border: '1px solid #222', color: '#ccc', padding: '12px', fontSize: '12px', borderRadius: '6px', height: '80px', marginBottom: '15px' };

function getBeerColor(ebc: number) {
  if (ebc <= 8) return "#F5F75C";
  if (ebc <= 15) return "#F1C40F";
  if (ebc <= 25) return "#D4AC0D";
  if (ebc <= 40) return "#8D4C17";
  return "#1A0506";
}