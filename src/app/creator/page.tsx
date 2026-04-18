"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../lib/supabaseClient";

// --- INTERFACES POUR LE COMPILATEUR VERCEL ---
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

interface RecipeStats {
  abv: number;
  ebc: number;
  ibu: number;
  og: number;
  maltTotal: number;
  bugu: number;
}

const noSpinnersStyle = `
  input::-webkit-outer-spin-button,
  input::-webkit-inner-spin-button { -webkit-appearance: none !important; margin: 0 !important; }
  input[type=number] { -moz-appearance: textfield !important; }
`;

export default function SuperLaboPage() {
  const [dbIngredients, setDbIngredients] = useState<any[]>([]);
  const [recipeName, setRecipeName] = useState("BRASSIN_ULTIME");
  const [loading, setLoading] = useState(false);
  const [isFixedMode, setIsFixedMode] = useState(true);

  const [config, setConfig] = useState({
    volume: 20,
    efficiency: 75,
    targetMalt: 5.0 
  });

  const [steps, setSteps] = useState<Step[]>([
    { id: "s1", label: "CONCASSAGE", ingredients: [] },
    { id: "s2", label: "EMPÂTAGE", temp: 67, ingredients: [] },
    { id: "s3", label: "RINÇAGE", temp: 78, ingredients: [] },
    { id: "s4", label: "ÉBULLITION", ingredients: [] },
    { id: "s5", label: "FERMENTATION", temp: 20, ingredients: [] },
    { id: "s6", label: "BOUTEILLE", ingredients: [] },
  ]);

  const [stats, setStats] = useState<RecipeStats>({ 
    abv: 0, ebc: 0, ibu: 0, og: 1.0, 
    maltTotal: 0, bugu: 0 
  });

  // Fetch des références
  useEffect(() => {
    const fetchRefs = async () => {
      try {
        const { data } = await supabase.from("ingredient_refs").select("*");
        if (data) setDbIngredients(data);
      } catch (err) {
        console.error("Erreur Fetch:", err);
      }
    };
    fetchRefs();
  }, []);

  // Calculs avec useCallback pour éviter les boucles infinies de rendu
  const runCalculations = useCallback(() => {
    let totalPoints = 0;
    let totalMCU = 0;
    let totalIBU = 0;
    let maltWeight = 0;
    const vol = isFixedMode ? 20 : (config.volume || 1);

    steps.forEach(step => {
      step.ingredients.forEach(ing => {
        const q = parseFloat(ing.qty as any) || 0;
        if (ing.type === "MALT") {
          maltWeight += q;
          totalMCU += (q * 2.204 * ((ing.ebc || 0) * 0.508)) / (vol * 0.264);
          totalPoints += q * 300 * ((ing.yield || 0) / 100) * (config.efficiency / 100);
        }
        if (ing.type === "HOP") {
            const currentOG = 1 + (totalPoints / vol) / 1000;
            const util = 1.65 * Math.pow(0.000125, currentOG - 1) * ((1 - Math.exp(-0.04 * (ing.time || 0))) / 4.15);
            totalIBU += (((ing.alpha || 0) / 100) * (q * 1000) / vol) * util;
        }
      });
    });

    const og = 1 + (totalPoints / vol) / 1000;
    setStats({
      og: parseFloat(og.toFixed(3)),
      ebc: Math.round(1.49 * Math.pow(totalMCU, 0.68) * 1.97) || 0,
      abv: parseFloat(((og - 1) * 131.25 * 0.75).toFixed(1)),
      ibu: Math.round(totalIBU),
      maltTotal: maltWeight,
      bugu: (og - 1) > 0 ? parseFloat((totalIBU / ((og - 1) * 1000)).toFixed(2)) : 0
    });
  }, [steps, config, isFixedMode]);

  useEffect(() => { runCalculations(); }, [runCalculations]);

  // Actions
  const addIngredient = (sIdx: number, type: any) => {
    const newSteps = [...steps];
    newSteps[sIdx].ingredients.push({ 
        id: Date.now(), 
        type, 
        name: "", 
        qty: 0, 
        time: type === "HOP" ? 60 : undefined 
    });
    setSteps(newSteps);
  };

  const updateIngredient = (sIdx: number, iIdx: number, field: keyof Ingredient, val: any) => {
    const newSteps = [...steps];
    const ing = newSteps[sIdx].ingredients[iIdx];
    
    if (field === "name") {
      const ref = dbIngredients.find(x => x.name === val);
      if (ref) {
        ing.name = val;
        ing.ebc = ref.potency;
        ing.yield = ref.yield;
        ing.alpha = ref.potency;
      }
    } else {
      (ing as any)[field] = val;
    }
    setSteps(newSteps);
  };

  const saveToCloud = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.from("recipes").insert([{ 
        data: { name: recipeName, stats, config, steps } 
      }]);
      if (error) throw error;
      alert("BRAVO : RECETTE SAUVÉE");
    } catch (err: any) {
      alert("ERREUR : " + err.message);
    }
    setLoading(false);
  };

  const maltProgress = Math.min((stats.maltTotal / (config.targetMalt || 1)) * 100, 100);

  return (
    <div style={containerStyle}>
      <style>{noSpinnersStyle}</style>
      
      <header style={{ marginBottom: "25px" }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px' }}>
          <input 
            value={recipeName} 
            onChange={e => setRecipeName(e.target.value)} 
            style={titleInputStyle} 
          />
          <button onClick={() => setIsFixedMode(!isFixedMode)} style={{ ...modeBtn, background: isFixedMode ? '#d35400' : '#111' }}>
            {isFixedMode ? "MODE 20L" : "MODE LIBRE"}
          </button>
        </div>

        {/* JAUGE GLOBALE MALT */}
        <div style={gaugeCard}>
            <div style={gaugeLabelRow}>
                <span style={{fontWeight:'900'}}>MALT : {stats.maltTotal.toFixed(2)} / {config.targetMalt} KG</span>
                <span style={{color: stats.maltTotal >= config.targetMalt ? '#27ae60' : '#f39c12'}}>{Math.round(maltProgress)}%</span>
            </div>
            <div style={gaugeTrack}>
                <div style={{ ...gaugeBar, width: `${maltProgress}%`, backgroundColor: stats.maltTotal >= config.targetMalt ? '#27ae60' : '#f39c12' }} />
            </div>
        </div>

        <div style={statsRow}>
          <StatBox label="ABV" val={stats.abv + "%"} color="#f39c12" />
          <StatBox label="IBU" val={stats.ibu} color="#27ae60" />
          <div style={{ ...statCardBase, background: getBeerColor(stats.ebc), color: stats.ebc > 20 ? '#fff' : '#000' }}>
            <div style={{fontSize:'7px', opacity:0.7}}>COULEUR</div>
            <div style={{fontSize:'14px', fontWeight:'900'}}>{stats.ebc} EBC</div>
          </div>
          <StatBox label="BU/GU" val={stats.bugu} color={stats.bugu > 0.7 ? '#e74c3c' : '#3498db'} />
        </div>
      </header>

      <main style={{ display:'flex', flexDirection:'column', gap:'15px' }}>
        {steps.map((step, sIdx) => (
          <div key={step.id} style={stepCard}>
            <div style={stepHeader}>
              <span style={stepTitle}>{step.label}</span>
              {step.temp && <span style={tempLabel}>{step.temp}°C</span>}
            </div>
            
            <div style={btnGroup}>
                {step.label.includes("CONC") && <button style={addSmallBtn} onClick={() => addIngredient(sIdx, "MALT")}>+ MALT</button>}
                {step.label.includes("ÉBUL") && <button style={addSmallBtn} onClick={() => addIngredient(sIdx, "HOP")}>+ HOUBLON</button>}
            </div>

            {step.ingredients.map((ing, iIdx) => (
              <div key={ing.id} style={ingRow}>
                <select 
                    value={ing.name} 
                    onChange={e => updateIngredient(sIdx, iIdx, "name", e.target.value)}
                    style={selectStyle}
                >
                    <option value="">Ingrédient...</option>
                    {dbIngredients.filter(x => x.type === ing.type).map(x => (
                        <option key={x.id} value={x.name}>{x.name}</option>
                    ))}
                </select>
                <div style={{ display:'flex', alignItems:'center', gap:'5px' }}>
                    <input 
                        type="number" 
                        value={ing.qty} 
                        onChange={e => updateIngredient(sIdx, iIdx, "qty", e.target.value)} 
                        style={qtyInput}
                    />
                    <span style={{fontSize:'9px', color:'#444'}}>{ing.type === "MALT" ? "KG" : "G"}</span>
                </div>
              </div>
            ))}
          </div>
        ))}
      </main>

      <footer style={footerStyle}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
            <div>
                <label style={labelStyle}>VOLUME FINAL (L)</label>
                <input type="number" value={isFixedMode ? 20 : config.volume} onChange={e => setConfig({...config, volume: parseFloat(e.target.value) || 0})} style={configInput} />
            </div>
            <div>
                <label style={labelStyle}>CIBLE MALT (KG)</label>
                <input type="number" value={config.targetMalt} onChange={e => setConfig({...config, targetMalt: parseFloat(e.target.value) || 0})} style={configInput} />
            </div>
        </div>
        <button onClick={saveToCloud} disabled={loading} style={saveButtonStyle}>
            {loading ? "SYNCHRONISATION..." : "SAUVEGARDER"}
        </button>
      </footer>
    </div>
  );
}

// --- SOUS-COMPOSANTS & STYLES ---
const StatBox = ({ label, val, color }: any) => (
    <div style={statCardBase}>
        <div style={{fontSize:'7px', color:'#444', marginBottom:'2px'}}>{label}</div>
        <div style={{fontSize:'14px', fontWeight:'900', color}}>{val}</div>
    </div>
);

const containerStyle: React.CSSProperties = { padding: "15px", backgroundColor: "#020202", color: "#eee", minHeight: "100vh", fontFamily: "monospace" };
const titleInputStyle: React.CSSProperties = { background:'transparent', border:'none', color:'#fff', fontSize:'1.4rem', fontWeight:'900', outline:'none', flex:1 };
const modeBtn: React.CSSProperties = { padding:'6px 12px', fontSize:'9px', borderRadius:'6px', border:'1px solid #333', color:'#fff', fontWeight:'bold', cursor:'pointer' };
const gaugeCard: React.CSSProperties = { background:'#080808', padding:'15px', borderRadius:'12px', border:'1px solid #111', marginBottom:'20px' };
const gaugeLabelRow: React.CSSProperties = { display:'flex', justifyContent:'space-between', fontSize:'11px', marginBottom:'8px' };
const gaugeTrack: React.CSSProperties = { height:'10px', background:'#111', borderRadius:'5px', overflow:'hidden' };
const gaugeBar: React.CSSProperties = { height:'100%', transition:'width 0.4s ease-out' };
const statsRow: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" };
const statCardBase: React.CSSProperties = { background:'#0a0a0a', padding:'10px 5px', borderRadius:'8px', border:'1px solid #111', textAlign:'center' };
const stepCard: React.CSSProperties = { background:'#080808', padding:'15px', borderRadius:'15px', border:'1px solid #151515' };
const stepHeader: React.CSSProperties = { display:'flex', justifyContent:'space-between', marginBottom:'15px', alignItems:'center' };
const stepTitle: React.CSSProperties = { color:'#f39c12', fontWeight:'900', fontSize:'14px', borderLeft:'4px solid #f39c12', paddingLeft:'10px' };
const tempLabel: React.CSSProperties = { background:'#111', padding:'3px 8px', borderRadius:'5px', fontSize:'11px', color:'#666' };
const btnGroup: React.CSSProperties = { display:'flex', gap:'8px', marginBottom:'12px' };
const addSmallBtn: React.CSSProperties = { background:'#111', border:'1px solid #222', color:'#444', fontSize:'9px', padding:'6px 12px', borderRadius:'6px', cursor:'pointer' };
const ingRow: React.CSSProperties = { display:'flex', justifyContent:'space-between', background:'#000', padding:'10px', borderRadius:'10px', border:'1px solid #111', marginBottom:'8px' };
const selectStyle: React.CSSProperties = { background:'transparent', border:'none', color:'#bbb', fontSize:'13px', width:'60%', outline:'none' };
const qtyInput: React.CSSProperties = { background:'transparent', border:'none', color:'#f39c12', fontSize:'14px', width:'50px', textAlign:'right', outline:'none', fontWeight:'bold' };
const footerStyle: React.CSSProperties = { marginTop:'30px', paddingBottom:'40px' };
const labelStyle: React.CSSProperties = { fontSize:'9px', color:'#444', display:'block', marginBottom:'5px' };
const configInput: React.CSSProperties = { background:'#080808', border:'1px solid #222', color:'#fff', padding:'12px', borderRadius:'10px', width:'100%', outline:'none' };
const saveButtonStyle: React.CSSProperties = { width:'100%', marginTop:'15px', background:'#f39c12', color:'#000', border:'none', padding:'18px', borderRadius:'12px', fontWeight:'900', fontSize:'15px', cursor:'pointer' };

function getBeerColor(ebc: number) {
  if (ebc <= 8) return "#F5F75C";
  if (ebc <= 15) return "#F1C40F";
  if (ebc <= 25) return "#D4AC0D";
  if (ebc <= 40) return "#8D4C17";
  return "#1A0506";
}