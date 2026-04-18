"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabaseClient";

const noSpinnersStyle = `
  input::-webkit-outer-spin-button,
  input::-webkit-inner-spin-button { -webkit-appearance: none !important; margin: 0 !important; }
  input[type=number] { -moz-appearance: textfield !important; }
  textarea { resize: none; outline: none; }
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
    targetMalt: 5.0 // Ton objectif de 10kg par ex.
  });

  const [steps, setSteps] = useState([
    { id: "s1", label: "CONCASSAGE", ingredients: [] as any[] },
    { id: "s2", label: "EMPÂTAGE", temp: 67, phNote: "", lastPH: "", ingredients: [] as any[] },
    { id: "s3", label: "RINÇAGE", temp: 78, phNote: "", lastPH: "", ingredients: [] as any[] },
    { id: "s4", label: "ÉBULLITION", ingredients: [] as any[] },
    { id: "s5", label: "FERMENTATION", temp: 20, ingredients: [] as any[] },
    { id: "s6", label: "REFERMENTATION EN BOUTEILLE", ingredients: [] as any[] },
  ]);

  const [stats, setStats] = useState({ 
    abv: 0, ebc: 0, ibu: 0, og: 1.0, 
    waterE: 0, waterR: 0, sugarTotal: 0, 
    maltTotal: 0, bugu: 0 
  });

  useEffect(() => {
    const fetchRefs = async () => {
      try {
        const { data } = await supabase.from("ingredient_refs").select("*");
        if (data) setDbIngredients(data);
      } catch (e) { console.error(e); }
    };
    fetchRefs();
  }, []);

  const stopWheel = (e: any) => e.target.blur();

  useEffect(() => {
    let totalPoints = 0, totalMCU = 0, totalIBU = 0, maltWeight = 0;
    const currentVol = isFixedMode ? 20 : (config.volume || 1);

    steps.forEach(s => {
      s.ingredients.forEach(ing => {
        const qty = parseFloat(ing.qty) || 0;
        if (ing.type === "MALT") {
          maltWeight += qty;
          const ebc = parseFloat(ing.ebc) || 0;
          const yieldVal = parseFloat(ing.yield) || 0;
          totalMCU += (qty * 2.204 * (ebc * 0.508)) / (currentVol * 0.264);
          totalPoints += qty * 300 * (yieldVal / 100) * (config.efficiency / 100);
        }
        if (ing.type === "SUCRE") totalPoints += qty * 380;
        if (ing.type === "HOP") {
            const alpha = parseFloat(ing.alpha) || 0;
            const time = parseFloat(ing.time) || 0;
            const ogGuess = 1 + (totalPoints / currentVol) / 1000;
            const util = 1.65 * Math.pow(0.000125, ogGuess - 1) * ((1 - Math.exp(-0.04 * time)) / 4.15);
            totalIBU += ((alpha / 100) * (qty * 1000) / currentVol) * util;
        }
      });
    });

    const og = 1 + (totalPoints / currentVol) / 1000;
    const bugu = (og - 1) > 0 ? totalIBU / ((og - 1) * 1000) : 0;

    setStats({
      og: parseFloat(og.toFixed(3)),
      ebc: Math.round(1.49 * Math.pow(totalMCU, 0.68) * 1.97) || 0,
      abv: parseFloat(((og - 1) * 131.25 * 0.75).toFixed(1)) || 0,
      ibu: Math.round(totalIBU) || 0,
      waterE: parseFloat((maltWeight * 2.8).toFixed(1)),
      waterR: parseFloat(((currentVol * 1.1) - (maltWeight * 1.8)).toFixed(1)),
      sugarTotal: parseFloat((currentVol * config.sugarPerL).toFixed(1)),
      maltTotal: maltWeight,
      bugu: parseFloat(bugu.toFixed(2))
    });
  }, [steps, config, isFixedMode]);

  const updateIng = (sIdx: number, iIdx: number, field: string, value: any) => {
    const n = [...steps];
    if (field === "name") {
        const ref = dbIngredients.find(x => x.name === value);
        if (ref) n[sIdx].ingredients[iIdx] = { ...n[sIdx].ingredients[iIdx], name: value, ebc: ref.potency, yield: ref.yield, alpha: ref.potency };
    } else {
        n[sIdx].ingredients[iIdx][field] = value;
    }
    setSteps(n);
  };

  const maltProgress = Math.min((stats.maltTotal / (config.targetMalt || 1)) * 100, 100);

  return (
    <div style={containerStyle}>
      <style>{noSpinnersStyle}</style>
      
      <header style={headerStyle}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px'}}>
            <input value={recipeName} onChange={e => setRecipeName(e.target.value)} style={mainTitle} />
            <div style={{...modeToggle, background: isFixedMode ? '#d35400' : '#111'}} onClick={() => setIsFixedMode(!isFixedMode)}>
                {isFixedMode ? "FIXE 20L" : "DYNAMIQUE"}
            </div>
        </div>

        {/* JAUGE MALT GLOBALE AMÉLIORÉE */}
        <div style={globalGaugeContainer}>
            <div style={gaugeTextRow}>
                <span style={{fontWeight:'900'}}>MALT TOTAL: {stats.maltTotal.toFixed(2)}kg</span>
                <span style={{color:'#666'}}>CIBLE: {config.targetMalt}kg</span>
            </div>
            <div style={gaugeBg}>
                <div style={{...gaugeFill, width: `${maltProgress}%`, backgroundColor: stats.maltTotal >= config.targetMalt ? '#27ae60' : '#f39c12'}} />
            </div>
        </div>
        
        <div style={statsGrid}>
          <StatCard label="ABV" val={stats.abv + "%"} color="#f39c12" />
          <StatCard label="IBU" val={stats.ibu} color="#27ae60" />
          <div style={{...StatCardStyle, background: getBeerColor(stats.ebc), color: stats.ebc > 20 ? '#fff' : '#000'}}>
             <div style={{fontSize: '7px', opacity: 0.6}}>EBC</div>
             <div style={{fontSize: '13px', fontWeight: 'bold'}}>{stats.ebc}</div>
          </div>
          <StatCard label="BU/GU" val={stats.bugu} color={stats.bugu > 0.6 ? '#e74c3c' : '#3498db'} />
          <StatCard label="DENSITÉ" val={stats.og} />
          <StatCard label="EAU" val={(stats.waterE + stats.waterR).toFixed(0) + "L"} />
        </div>
      </header>

      <div style={mobileWrapper}>
        <main style={mainContainer}>
          {steps.map((step, i) => (
            <div key={step.id} style={stepBox}>
              <div style={stepHead}>
                <div style={stepLabel}>{step.label}</div>
                {step.temp && <div style={tempBadge}>{step.temp}°C</div>}
              </div>

              <div style={btnRow}>
                {step.label.includes("CONC") && <button onClick={() => {const n=[...steps]; n[i].ingredients.push({id:Date.now(), type:"MALT", name:"", qty:0}); setSteps(n)}} style={addBtn}>+ MALT</button>}
                {step.label.includes("ÉBUL") && <button onClick={() => {const n=[...steps]; n[i].ingredients.push({id:Date.now(), type:"HOP", name:"", qty:0, time:60, alpha:0}); setSteps(n)}} style={addBtn}>+ HOUBLON</button>}
                {(step.label.includes("EMP") || step.label.includes("RIN") || step.label.includes("ÉBUL")) && <button onClick={() => {const n=[...steps]; n[i].ingredients.push({id:Date.now(), type:"SALT", name:"", qty:0}); setSteps(n)}} style={addBtn}>+ SELS</button>}
              </div>

              {step.ingredients.map((ing, idx) => (
                  <div key={idx} style={ingCard}>
                    <div style={{display:'flex', justifyContent:'space-between', marginBottom:'8px'}}>
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
                    </div>
                  </div>
              ))}
            </div>
          ))}
        </main>

        <aside style={sideContainer}>
          <div style={configBox}>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px'}}>
                <div>
                    <label style={cfgLabel}>VOLUME FINAL (L)</label>
                    <input type="number" value={isFixedMode ? 20 : config.volume} onChange={e => setConfig({...config, volume: parseFloat(e.target.value) || 0})} style={cfgInput} />
                </div>
                <div>
                    <label style={cfgLabel}>CIBLE MALT (KG)</label>
                    <input type="number" value={config.targetMalt} onChange={e => setConfig({...config, targetMalt: parseFloat(e.target.value) || 0})} style={cfgInput} />
                </div>
            </div>
          </div>
          <button onClick={saveRecipe} disabled={loading} style={saveBtn}>{loading ? "CHARGEMENT..." : "SAUVEGARDER RECETTE"}</button>
        </aside>
      </div>
    </div>
  );
}

// STYLES
const StatCardStyle = { background: '#0a0a0a', padding: '10px 5px', border: '1px solid #111', textAlign: 'center' as const, borderRadius: '8px' };
const StatCard = ({label, val, color="#fff"}: any) => (
  <div style={StatCardStyle}>
    <div style={{fontSize: '7px', color: '#444', marginBottom: '2px'}}>{label}</div>
    <div style={{fontSize: '13px', fontWeight: 'bold', color}}>{val}</div>
  </div>
);

const containerStyle = { padding: "15px", backgroundColor: "#020202", color: "#eee", minHeight: "100vh", fontFamily: "monospace" };
const headerStyle = { marginBottom: "25px" };
const mainTitle = { background: "transparent", border: "none", color: "#fff", fontSize: "1.5rem", fontWeight: "900", outline:'none', flex:1 };
const statsGrid = { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" };
const modeToggle = { padding:'6px 10px', fontSize:'9px', borderRadius:'6px', cursor:'pointer', border:'1px solid #333', fontWeight:'bold' };
const globalGaugeContainer = { marginBottom: '20px', background: '#080808', padding: '12px', borderRadius: '10px', border: '1px solid #111' };
const gaugeTextRow = { display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '8px' };
const gaugeBg = { height: "8px", background: "#111", borderRadius: "4px", overflow: "hidden" };
const gaugeFill = { height: "100%", transition: "width 0.4s ease-out" };
const mobileWrapper = { display: "flex", flexDirection: "column" as const, gap: "15px", maxWidth: "500px", margin: "0 auto" };
const mainContainer = { display: "flex", flexDirection: "column" as const, gap: "12px" };
const stepBox = { background: "#080808", border: "1px solid #151515", padding: "15px", borderRadius: "12px" };
const stepHead = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" };
const stepLabel = { color: "#fff", fontSize: "14px", fontWeight: "900", borderLeft:'4px solid #f39c12', paddingLeft:'10px' };
const tempBadge = { color: '#f39c12', fontSize: '12px', fontWeight: 'bold', background:'#111', padding:'2px 8px', borderRadius:'4px' };
const btnRow = { display: "flex", gap: "8px", marginBottom: "15px", flexWrap: "wrap" as const };
const addBtn = { background: "#111", border: "1px solid #222", color: "#666", fontSize: "9px", padding: "8px 12px", borderRadius: "6px" };
const ingCard = { background: "#000", padding: "12px", borderRadius: "10px", marginBottom: "10px", border: "1px solid #111" };
const ingSelect = { background: "transparent", border: "none", color: "#bbb", fontSize: "13px", width:'85%', outline:'none' };
const unitBox = { background: "#0a0a0a", padding: "6px 10px", borderRadius: "6px", border: "1px solid #222", display:'flex', alignItems:'center' };
const ingInput = { background: "transparent", border: "none", color: "#f39c12", width: "50px", textAlign: "center" as const, fontSize: "15px", outline:'none' };
const unitLabel = { fontSize: "9px", color: "#444", marginLeft: "5px" };
const delBtn = { color: "#444", border: "none", background: "none", fontSize: "16px", cursor:'pointer' };
const sideContainer = { display: "flex", flexDirection: "column" as const, gap: "15px", paddingBottom: "50px" };
const configBox = { background: "#080808", padding: "15px", borderRadius: "12px", border: "1px solid #111" };
const cfgLabel = { fontSize: "8px", color: "#555", display: "block", marginBottom: "5px", fontWeight:'bold' };
const cfgInput = { background: "#000", border: "1px solid #222", color: "#fff", width: "100%", padding: "12px", borderRadius: "8px", fontSize: "15px", outline:'none' };
const saveBtn = { background: "#f39c12", color: "#000", border: "none", padding: "20px", fontWeight: "900", borderRadius: "12px", fontSize: "14px", cursor: "pointer" };

function getBeerColor(ebc: number) {
  if (ebc <= 8) return "#F5F75C";
  if (ebc <= 15) return "#F1C40F";
  if (ebc <= 25) return "#D4AC0D";
  if (ebc <= 40) return "#8D4C17";
  return "#1A0506";
}