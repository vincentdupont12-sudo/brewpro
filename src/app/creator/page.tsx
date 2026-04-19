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
  const [dbInventory, setDbInventory] = useState<any[]>([]);
  const [recipeName, setRecipeName] = useState("NOUVELLE_RECETTE_V1");
  const [config, setConfig] = useState({ volume: 20, efficiency: 75, targetIBU: 50 });
  const [steps, setSteps] = useState<Step[]>([
    { id: "s1", label: "CONCASSAGE", durationInMinutes: 0, remainingSeconds: 0, isRunning: false, ingredients: [] },
    { id: "s_salt", label: "AJUSTEMENT DES SELS", durationInMinutes: 0, remainingSeconds: 0, isRunning: false, ingredients: [], desc: "Cible : Équilibrer le ratio Sulfate/Chlorure" },
    { id: "s2", label: "EMPÂTAGE", temp: 67, durationInMinutes: 60, remainingSeconds: 3600, isRunning: false, ingredients: [], desc: "Conversion de l'amidon" },
    { id: "s4", label: "ÉBULLITION", durationInMinutes: 60, remainingSeconds: 3600, isRunning: false, ingredients: [] },
  ]);

  const [stats, setStats] = useState({ abv: 0, ebc: 0, ibu: 0, og: 1.0, maltTotal: 0, hopTotal: 0, waterE: 0, waterR: 0 });

  // --- CHARGEMENT INVENTAIRE ---
  useEffect(() => {
    const getInv = async () => {
      const { data } = await supabase.from('inventory').select('*').order('name');
      if (data) setDbInventory(data);
    };
    getInv();
  }, []);

  // --- CALCULS DYNAMIQUES ---
  const runCalculations = useCallback(() => {
    let pts = 0, mcu = 0, ibuTotal = 0, maltTotal = 0, hopTotal = 0;
    const vol = config.volume || 1;

    steps.forEach(s => {
      s.ingredients.forEach(ing => {
        const q = parseFloat(ing.qty as any) || 0;
        if (ing.type === "MALT") {
          maltTotal += q;
          const ebc = ing.ebc || 0;
          mcu += (q * 2.204 * (ebc * 0.508)) / (vol * 0.264);
          pts += q * 300 * (0.80) * (config.efficiency / 100); // Base rendement 80%
        }
        if (ing.type === "HOP") {
          hopTotal += q;
          const ogG = 1 + (pts / vol) / 1000;
          const util = 1.65 * Math.pow(0.000125, ogG - 1) * ((1 - Math.exp(-0.04 * (ing.time || 60))) / 4.15);
          ibuTotal += (((ing.alpha || 0) / 100) * (q * 1000) / vol) * util;
        }
      });
    });

    const og = 1 + (pts / vol) / 1000;
    setStats({
      og,
      ebc: Math.round(1.49 * Math.pow(mcu, 0.68) * 1.97) || 0,
      abv: parseFloat(((og - 1) * 131.25 * 0.75).toFixed(1)),
      ibu: Math.round(ibuTotal),
      maltTotal,
      hopTotal,
      waterE: parseFloat((maltTotal * 2.8).toFixed(1)),
      waterR: parseFloat(((vol * 1.15) - (maltTotal * 0.8)).toFixed(1)),
    });
  }, [steps, config]);

  useEffect(() => { runCalculations(); }, [runCalculations]);

  // --- AJOUT DYNAMIQUE DEPUIS STOCK ---
  const addIngredientFromStock = (sIdx: number, itemName: string) => {
    const item = dbInventory.find(i => i.name === itemName);
    if (!item) return;

    const n = [...steps];
    const newIng: Ingredient = {
      id: Date.now(),
      name: item.name,
      type: item.type === "HOUBLON" ? "HOP" : item.type as any,
      qty: 0,
      ebc: item.metadata?.ebc || 0,
      alpha: item.metadata?.alpha || 0,
      time: 60
    };
    n[sIdx].ingredients.push(newIng);
    setSteps(n);
  };

  const handleSave = async () => {
    const { error } = await supabase.from("recipes").upsert({ 
        name: recipeName, 
        data: { steps_json: steps, stats_json: stats, config_json: config } 
    }, { onConflict: 'name' });
    error ? alert("Erreur") : alert("✅ Envoyé aux Potes");
  };

  return (
    <div style={containerStyle}>
      {/* HEADER : NOM + VOLUME DYNAMIQUE */}
      <header style={headerStyle}>
        <div style={{ flex: 1 }}>
          <input value={recipeName} onChange={e => setRecipeName(e.target.value)} style={titleInp} />
          <div style={{ color: '#555', fontSize: '10px' }}>LABO_CREATION_V4</div>
        </div>
        <div style={volSelector}>
          <label style={cfgLab}>VOLUME_FINAL (L)</label>
          <input type="number" value={config.volume} onChange={e => setConfig({...config, volume: +e.target.value})} style={volInp} />
        </div>
      </header>

      {/* DASHBOARD STATS & JAUGES */}
      <div style={statGrid}>
        <div style={statBox}>
          <span style={statLabel}>ABV / OG</span>
          <div style={statVal}>{stats.abv}% <span style={{fontSize:'12px', color:'#444'}}>{stats.og.toFixed(3)}</span></div>
        </div>
        <div style={statBox}>
          <span style={statLabel}>IBU / EBC</span>
          <div style={statVal}>{stats.ibu} / {stats.ebc}</div>
          <div style={track}><div style={{...bar, width:`${(stats.ebc/50)*100}%`, backgroundColor: getBeerColor(stats.ebc)}} /></div>
        </div>
        <div style={statBox}>
          <span style={statLabel}>CHARGE_MALT (KG)</span>
          <div style={statVal}>{stats.maltTotal.toFixed(2)}</div>
          <div style={track}><div style={{...bar, width:`${(stats.maltTotal/10)*100}%`, backgroundColor: '#e67e22'}} /></div>
        </div>
        <div style={statBox}>
          <span style={statLabel}>CHARGE_HOUBLON (G)</span>
          <div style={statVal}>{stats.hopTotal}</div>
          <div style={track}><div style={{...bar, width:`${(stats.hopTotal/200)*100}%`, backgroundColor: '#27ae60'}} /></div>
        </div>
      </div>

      {/* ÉTAPES */}
      <main style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {steps.map((step, sIdx) => (
          <div key={step.id} style={card}>
            <div style={cardHeader}>
              <span style={stepTitle}>{step.label}</span>
              {step.temp && <span style={tempTag}>{step.temp}°C</span>}
            </div>
            
            {/* SÉLECTEUR D'INGRÉDIENTS DEPUIS LE STOCK */}
            <div style={{marginBottom:'10px'}}>
                <select 
                    style={stockSelect}
                    onChange={(e) => { if(e.target.value) addIngredientFromStock(sIdx, e.target.value); e.target.value=""; }}
                >
                    <option value="">+ AJOUTER_DEPUIS_STOCK...</option>
                    {dbInventory.map(item => (
                        <option key={item.id} value={item.name}>{item.name} ({item.type})</option>
                    ))}
                </select>
            </div>

            {step.ingredients.map((ing, iIdx) => (
              <div key={ing.id} style={ingRow}>
                <div style={{flex:1}}>
                    <div style={ingName}>{ing.name}</div>
                    <div style={ingMeta}>
                        {ing.type === "MALT" ? `EBC: ${ing.ebc}` : `ALPHA: ${ing.alpha}%`}
                    </div>
                </div>
                <input type="number" value={ing.qty} onChange={e => {const n=[...steps]; n[sIdx].ingredients[iIdx].qty=+e.target.value; setSteps(n)}} style={ingVal} />
                <span style={unit}>{ing.type === "MALT" ? "kg" : "g"}</span>
                <button onClick={() => {const n=[...steps]; n[sIdx].ingredients.splice(iIdx,1); setSteps(n)}} style={delBtn}>×</button>
              </div>
            ))}
          </div>
        ))}
      </main>

      <footer style={footerStyle}>
        <div style={{fontSize:'10px', color:'#444'}}>
            EAU_MASH: {stats.waterE}L | EAU_RINSE: {stats.waterR}L
        </div>
        <button onClick={handleSave} style={saveBtn}>CRÉER_FEUILLE_DE_MARCHE</button>
      </footer>
    </div>
  );
}

// --- STYLES ---
const containerStyle: React.CSSProperties = { padding: "20px", backgroundColor: "#000", color: "#fff", minHeight: "100vh", fontFamily: "monospace", paddingBottom:'120px' };
const headerStyle: React.CSSProperties = { display:'flex', alignItems:'center', marginBottom:'30px', borderBottom:'1px solid #111', paddingBottom:'20px' };
const volSelector: React.CSSProperties = { background:'#080808', padding:'10px', border:'1px solid #222', textAlign:'right' };
const volInp: React.CSSProperties = { background:'transparent', border:'none', color:'#f39c12', fontSize:'24px', fontWeight:'900', width:'60px', textAlign:'right', outline:'none' };
const titleInp: React.CSSProperties = { background:'transparent', border:'none', color:'#fff', fontSize:'24px', fontWeight:'900', outline:'none', width:'100%' };
const statGrid: React.CSSProperties = { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' };
const statBox: React.CSSProperties = { background:'#050505', padding:'15px', border:'1px solid #111' };
const statLabel: React.CSSProperties = { fontSize:'8px', color:'#444', display:'block', marginBottom:'5px' };
const statVal: React.CSSProperties = { fontSize:'20px', fontWeight:'900' };
const track: React.CSSProperties = { height:'2px', background:'#111', marginTop:'8px' };
const bar: React.CSSProperties = { height:'100%', transition:'0.5s' };
const card: React.CSSProperties = { background:'#050505', padding:'15px', border:'1px solid #111' };
const cardHeader: React.CSSProperties = { display:'flex', justifyContent:'space-between', marginBottom:'15px', borderBottom:'1px solid #111', paddingBottom:'5px' };
const stepTitle: React.CSSProperties = { color:'#f39c12', fontWeight:'900', fontSize:'14px' };
const stockSelect: React.CSSProperties = { width:'100%', background:'#111', border:'1px solid #222', color:'#666', padding:'8px', fontSize:'10px', outline:'none' };
const ingRow: React.CSSProperties = { display:'flex', alignItems:'center', padding:'10px 0', borderBottom:'1px solid #111' };
const ingName: React.CSSProperties = { fontSize:'12px', fontWeight:'bold', color:'#ddd' };
const ingMeta: React.CSSProperties = { fontSize:'9px', color:'#444' };
const ingVal: React.CSSProperties = { background:'#111', border:'none', color:'#f39c12', fontSize:'16px', width:'60px', textAlign:'right', fontWeight:'900', outline:'none' };
const unit: React.CSSProperties = { fontSize:'10px', color:'#333', marginLeft:'5px', width:'20px' };
const delBtn: React.CSSProperties = { color:'#cc0000', background:'none', border:'none', fontSize:'20px', marginLeft:'10px', cursor:'pointer' };
const saveBtn: React.CSSProperties = { background:'#f39c12', color:'#000', border:'none', padding:'15px 30px', fontWeight:'900', fontSize:'12px', cursor:'pointer' };
const footerStyle: React.CSSProperties = { position:'fixed', bottom:0, left:0, right:0, background:'#000', padding:'20px', borderTop:'1px solid #111', display:'flex', justifyContent:'space-between', alignItems:'center' };
const tempTag: React.CSSProperties = { color:'#3498db', fontWeight:'900' };
const cfgLab: React.CSSProperties = { fontSize:'7px', color:'#444', display:'block' };

function getBeerColor(ebc: number) {
  if (ebc <= 8) return "#F5F75C";
  if (ebc <= 15) return "#F1C40F";
  if (ebc <= 25) return "#D4AC0D";
  if (ebc <= 40) return "#8D4C17";
  return "#1A0506";
}