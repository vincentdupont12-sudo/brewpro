"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabaseClient";

// CSS pour supprimer les flèches (spinners) des inputs number
const noSpinnersStyle = `
  input::-webkit-outer-spin-button,
  input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
  input[type=number] { -moz-appearance: textfield; }
`;

export default function SuperLaboPage() {
  const [dbIngredients, setDbIngredients] = useState<any[]>([]);
  const [recipeName, setRecipeName] = useState("PROTOTYPE_ALPHA");
  const [loading, setLoading] = useState(false);
  const [isFixedMode, setIsFixedMode] = useState(true);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const [config, setConfig] = useState({
    volume: 20,
    efficiency: 75,
    mashTemp: 67,
    sugarPerL: 6,
  });

  const [steps, setSteps] = useState([
    { id: "s1", type: "ACTION", label: "PRÉPARATION & CONCASSAGE", ingredients: [] as any[] },
    { id: "s2", type: "PALIER", label: "EMPÂTAGE", ingredients: [] as any[] },
    { id: "s3", type: "ACTION", label: "FILTRATION & RINCAGE", ingredients: [] as any[] },
    { id: "s4", type: "ACTION", label: "ÉBULLITION", ingredients: [] as any[] },
    { id: "s5", type: "ACTION", label: "FERMENTATION", ingredients: [] as any[] },
  ]);

  const [stats, setStats] = useState({ abv: 0, ebc: 0, ibu: 0, og: 1.0, waterE: 0, waterR: 0, sugarTotal: 0 });

  useEffect(() => {
    const fetchRefs = async () => {
      const { data } = await supabase.from("ingredient_refs").select("*");
      if (data) setDbIngredients(data);
    };
    fetchRefs();
  }, []);

  // --- MOTEUR DE CALCULS ---
  useEffect(() => {
    let totalPoints = 0, totalMCU = 0, totalIBU = 0, maltWeight = 0, attenuation = 0.75;
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
        if (ing.type === "YEAST") attenuation = (ing.potency || 75) / 100;
      });
    });

    const og = 1 + (totalPoints / (calcVol > 0 ? calcVol : 1)) / 1000;

    steps.forEach(s => {
      if (s.label.toUpperCase().includes("ÉBULLITION")) {
        s.ingredients.forEach(ing => {
          if (ing.type === "HOP") {
            const qty = parseFloat(ing.qty) || 0;
            const alpha = parseFloat(ing.alpha) || 0;
            const time = parseFloat(ing.time) || 0;
            if (qty > 0 && alpha > 0) {
              const util = 1.65 * Math.pow(0.000125, og - 1) * ((1 - Math.exp(-0.04 * time)) / 4.15);
              totalIBU += ((alpha / 100) * (qty * 1000) / calcVol) * util;
            }
          }
        });
      }
    });

    const wE = maltWeight * 2.8;
    setStats({
      og: parseFloat(og.toFixed(3)),
      ebc: Math.round(1.49 * Math.pow(totalMCU, 0.68) * 1.97) || 0,
      abv: parseFloat(((og - 1) * 131.25 * attenuation).toFixed(1)) || 0,
      ibu: Math.round(totalIBU) || 0,
      waterE: parseFloat(wE.toFixed(1)),
      waterR: parseFloat(((calcVol * 1.1) - (wE - maltWeight)).toFixed(1)),
      sugarTotal: calcVol * config.sugarPerL
    });
  }, [steps, config, isFixedMode]);

  // --- ACTIONS ---
  const addIng = (sIdx: number, type: string) => {
    const n = [...steps];
    const newIng = { id: Date.now(), type, name: "", qty: 0, time: 60, alpha: 0, ebc: 0, yield: 0, potency: 75 };
    n[sIdx].ingredients.push(newIng);
    setSteps(n);
  };

  const updateIng = (sIdx: number, iIdx: number, name: string) => {
    const ref = dbIngredients.find(x => x.name === name);
    if (!ref) return;
    const n = [...steps];
    n[sIdx].ingredients[iIdx] = { 
      ...n[sIdx].ingredients[iIdx], 
      name, 
      ebc: ref.potency, 
      yield: ref.yield, 
      alpha: ref.potency, 
      potency: ref.potency 
    };
    setSteps(n);
  };

  const saveRecipe = async () => {
    setLoading(true);
    // Payload structuré pour éviter les NULL
    const payload = {
      name: recipeName.toUpperCase(),
      is_fixed_20l: isFixedMode,
      stats: stats,
      config: config,
      steps: steps
    };

    const { error } = await supabase.from("recipes").insert([{ data: payload }]);
    if (error) alert("ERREUR SUPABASE: " + error.message);
    else alert("🚀 RECETTE TRANSMISE !");
    setLoading(false);
  };

  const handleDragOver = (e: any, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const n = [...steps];
    const item = n[draggedIndex];
    n.splice(draggedIndex, 1);
    n.splice(index, 0, item);
    setDraggedIndex(index);
    setSteps(n);
  };

  return (
    <div style={containerStyle}>
      <style>{noSpinnersStyle}</style>
      <header style={headerStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <input value={recipeName} onChange={e => setRecipeName(e.target.value)} style={mainTitle} />
          <div style={modeToggle} onClick={() => setIsFixedMode(!isFixedMode)}>
            {isFixedMode ? "🔒 MODE FIXE 20L" : "⚖️ MODE DYNAMIQUE"}
          </div>
        </div>
        <div style={statsGrid}>
          <StatCard label="DENSITÉ (OG)" val={stats.og} />
          <StatCard label="ALCOOL (ABV)" val={stats.abv + "%"} color="#f39c12" />
          <StatCard label="AMERTUME (IBU)" val={stats.ibu} color="#27ae60" />
          <StatCard label="COULEUR (EBC)" val={stats.ebc} color="#e67e22" />
          <StatCard label="EAU EMPÂTAGE" val={stats.waterE + "L"} />
          <StatCard label="EAU RINÇAGE" val={stats.waterR + "L"} />
        </div>
      </header>

      <div style={grid}>
        <main style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          {steps.map((step, i) => (
            <div key={step.id} onDragOver={e => handleDragOver(e, i)} style={{...stepBox, opacity: draggedIndex === i ? 0.4 : 1}}>
              <div style={stepHead}>
                <div draggable onDragStart={() => setDraggedIndex(i)} onDragEnd={() => setDraggedIndex(null)} style={handle}>☰</div>
                <input value={step.label} onChange={e => {const n=[...steps]; n[i].label=e.target.value; setSteps(n)}} style={stepLabel} />
                <div style={btnGrp}>
                  <button onClick={() => addIng(i, "MALT")} style={miniBtn}>+ MALT</button>
                  <button onClick={() => addIng(i, "HOP")} style={miniBtn}>+ HOP</button>
                  <button onClick={() => addIng(i, "YEAST")} style={miniBtn}>+ LEVURE</button>
                </div>
              </div>
              {step.ingredients.map((ing, idx) => (
                <div key={idx} style={ingLine}>
                  <span style={{fontSize: '8px', color: '#444', width: '35px'}}>{ing.type}</span>
                  <select style={ingSelect} value={ing.name} onChange={e => updateIng(i, idx, e.target.value)}>
                    <option value="">SÉLECTIONNER...</option>
                    {dbIngredients.filter(x => x.type === ing.type).map(x => <option key={x.id} value={x.name}>{x.name}</option>)}
                  </select>
                  <div style={unitWrapper}>
                    <input type="number" style={ingInput} value={ing.qty} onChange={e => {const n=[...steps]; n[i].ingredients[idx].qty = e.target.value; setSteps(n)}} />
                    <span style={unitTag}>{ing.type === "MALT" ? "KG" : "G"}</span>
                  </div>
                  {ing.type === "HOP" && (
                    <div style={unitWrapper}>
                      <input type="number" style={ingInput} value={ing.time} onChange={e => {const n=[...steps]; n[i].ingredients[idx].time = e.target.value; setSteps(n)}} />
                      <span style={unitTag}>MIN</span>
                    </div>
                  )}
                  <button onClick={() => {const n=[...steps]; n[i].ingredients.splice(idx, 1); setSteps(n)}} style={delBtn}>×</button>
                </div>
              ))}
            </div>
          ))}
        </main>

        <aside style={sidePanel}>
          <div style={{...beerColor, backgroundColor: getBeerColor(stats.ebc)}} />
          <div style={configCard}>
            <div style={field}><label style={labelStyle}>VOLUME CIBLE (L)</label>
              <input type="number" disabled={isFixedMode} value={isFixedMode ? 20 : config.volume} onChange={e => setConfig({...config, volume: +e.target.value})} style={sideInput} />
            </div>
            <div style={field}><label style={labelStyle}>EFFICACITÉ (%)</label>
              <input type="number" value={config.efficiency} onChange={e => setConfig({...config, efficiency: +e.target.value})} style={sideInput} />
            </div>
          </div>
          <button onClick={saveRecipe} disabled={loading} style={pushBtn}>{loading ? "SYNC..." : "DÉPLOYER LA RECETTE"}</button>
        </aside>
      </div>
    </div>
  );
}

// --- STYLES ---
const StatCard = ({label, val, color="#888"}: any) => (
  <div style={{background: '#0a0a0a', padding: '12px', border: '1px solid #111', textAlign: 'center' as const}}>
    <div style={{fontSize: '9px', color: '#444', marginBottom: '4px'}}>{label}</div>
    <div style={{fontSize: '16px', fontWeight: 'bold', color}}>{val}</div>
  </div>
);

const containerStyle = { padding: "40px", backgroundColor: "#020202", color: "#eee", minHeight: "100vh", fontFamily: "monospace" };
const headerStyle = { marginBottom: "30px", borderBottom: "1px solid #111", paddingBottom: "20px" };
const mainTitle = { background: "transparent", border: "none", color: "#f39c12", fontSize: "2.2rem", fontWeight: "900", outline: "none", flex: 1 };
const statsGrid = { display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "10px", marginTop: "20px" };
const modeToggle = { padding: "8px 15px", background: "#111", border: "1px solid #333", cursor: "pointer", fontSize: "10px", borderRadius: "4px" };
const grid = { display: "grid", gridTemplateColumns: "1fr 300px", gap: "30px" };
const stepBox = { background: "#0a0a0a", border: "1px solid #111", padding: "15px" };
const stepHead = { display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" };
const handle = { cursor: "grab", color: "#222", fontSize: "18px" };
const stepLabel = { background: "transparent", border: "none", color: "#fff", fontSize: "14px", fontWeight: "bold", flex: 1, outline: "none" };
const btnGrp = { display: "flex", gap: "5px" };
const miniBtn = { background: "#111", border: "1px solid #222", color: "#444", fontSize: "8px", padding: "4px 8px", cursor: "pointer" };
const ingLine = { display: "flex", gap: "10px", marginTop: "5px", background: "#000", padding: "8px", alignItems: "center" };
const ingSelect = { background: "transparent", border: "none", color: "#888", flex: 1, fontSize: "12px", outline: "none" };
const unitWrapper = { display: "flex", alignItems: "center", background: "#050505", border: "1px solid #111", paddingRight: "5px" };
const ingInput = { background: "transparent", border: "none", color: "#f39c12", width: "50px", textAlign: "center" as const, fontSize: "12px", padding: "5px" };
const unitTag = { fontSize: "8px", color: "#333", fontWeight: "bold" };
const delBtn = { background: "none", border: "none", color: "#222", cursor: "pointer" };
const sidePanel = { position: "sticky" as const, top: "20px", height: "fit-content" };
const beerColor = { height: "120px", border: "1px solid #111", marginBottom: "15px" };
const configCard = { background: "#0a0a0a", padding: "15px", border: "1px solid #111" };
const field = { marginBottom: "10px" };
const labelStyle = { fontSize: "8px", color: "#444", display: "block", marginBottom: "3px" };
const sideInput = { background: "#000", border: "1px solid #222", color: "#fff", width: "100%", padding: "8px", fontSize: "12px" };
const pushBtn = { width: "100%", padding: "18px", background: "#f39c12", color: "#000", border: "none", fontWeight: "900", marginTop: "15px", cursor: "pointer", fontSize: "11px" };

function getBeerColor(ebc: number) {
  if (ebc <= 8) return "#F5F75C";
  if (ebc <= 15) return "#F1C40F";
  if (ebc <= 25) return "#D4AC0D";
  if (ebc <= 40) return "#8D4C17";
  return "#1A0506";
}