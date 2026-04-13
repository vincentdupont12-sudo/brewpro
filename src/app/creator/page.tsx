"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabaseClient";

export default function CreatorPage() {
  const [dbIngredients, setDbIngredients] = useState<any[]>([]);
  const [recipeName, setRecipeName] = useState("PROTOTYPE_BRASSAGE_ALPHA");
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [isFixedMode, setIsFixedMode] = useState(true); // Mode 20L par défaut

  const [config, setConfig] = useState({
    volume: 20,
    efficiency: 75,
    mashTemp: 67,
  });

  const [steps, setSteps] = useState([
    { id: "s1", type: "ACTION", label: "PRÉPARATION & CONCASSAGE", ingredients: [] as any[] },
    { id: "s2", type: "PALIER", label: "EMPÂTAGE", ingredients: [] as any[] },
    { id: "s3", type: "ACTION", label: "RINCAGE DES DRÊCHES", ingredients: [] as any[] },
    { id: "s4", type: "ACTION", label: "ÉBULLITION", ingredients: [] as any[] },
    { id: "s5", type: "ACTION", label: "FERMENTATION", ingredients: [] as any[] },
  ]);

  const [stats, setStats] = useState({ abv: 0, ebc: 0, ibu: 0, og: 1.0, waterE: 0, waterR: 0 });

  useEffect(() => {
    const fetchRefs = async () => {
      const { data } = await supabase.from("ingredient_refs").select("*");
      if (data) setDbIngredients(data);
    };
    fetchRefs();
  }, []);

  // --- MOTEUR DE CALCULS AVANCÉS ---
  useEffect(() => {
    let totalPoints = 0;
    let totalMCU = 0;
    let totalIBU = 0;
    let maltWeight = 0;
    let attenuation = 0.75; // Défaut

    const calcVol = isFixedMode ? 20 : config.volume;

    steps.forEach((step) => {
      step.ingredients.forEach((ing) => {
        if (ing.type === "MALT") {
          maltWeight += ing.qty;
          totalMCU += (ing.qty * 2.204 * (ing.ebc * 0.508)) / (calcVol * 0.264);
          totalPoints += ing.qty * 300 * (ing.yield / 100) * (config.efficiency / 100);
        }
        if (ing.type === "SUCRE") {
          totalPoints += ing.qty * 380; // Le sucre a un rendement plus élevé, pas d'EBC
        }
        if (ing.type === "YEAST") {
          attenuation = (ing.potency || 75) / 100;
        }
      });
    });

    const og = 1 + totalPoints / calcVol / 1000;

    // Calcul IBU (Seulement dans l'étape Ébullition)
    steps.forEach((step) => {
      if (step.label.toUpperCase().includes("ÉBULLITION")) {
        step.ingredients.forEach((ing) => {
          if (ing.type === "HOP") {
            const util = 1.65 * Math.pow(0.000125, og - 1) * ((1 - Math.exp(-0.04 * ing.time)) / 4.15);
            totalIBU += ((ing.alpha / 100) * (ing.qty * 1000) / calcVol) * util;
          }
        });
      }
    });

    const wE = maltWeight * 2.8;
    const wR = (calcVol * 1.1) - (wE - maltWeight);

    setStats({
      og: parseFloat(og.toFixed(3)),
      ebc: Math.round(1.49 * Math.pow(totalMCU, 0.68) * 1.97),
      abv: parseFloat(((og - 1) * 131.25 * attenuation).toFixed(1)),
      ibu: Math.round(totalIBU),
      waterE: parseFloat(wE.toFixed(1)),
      waterR: parseFloat(wR.toFixed(1))
    });
  }, [steps, config, isFixedMode]);

  // --- LOGIQUE DRAG & DROP ---
  const handleDragStart = (index: number) => setDraggedIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const newSteps = [...steps];
    const item = newSteps[draggedIndex];
    newSteps.splice(draggedIndex, 1);
    newSteps.splice(index, 0, item);
    setDraggedIndex(index);
    setSteps(newSteps);
  };

  const addIngToStep = (stepIdx: number, type: string) => {
    const newSteps = [...steps];
    let newIng: any = { id: Date.now(), type, name: "", qty: 0 };
    if (type === "MALT") newIng = { ...newIng, ebc: 0, yield: 0 };
    if (type === "HOP") newIng = { ...newIng, alpha: 0, time: 60 };
    if (type === "YEAST") newIng = { ...newIng, potency: 75 }; // Atténuation
    
    newSteps[stepIdx].ingredients.push(newIng);
    setSteps(newSteps);
  };

  const saveRecipe = async () => {
    setLoading(true);
    const { error } = await supabase.from("recipes").insert([{
      data: {
        name: recipeName,
        is_fixed_20l: isFixedMode,
        stats: stats,
        steps: steps
      }
    }]);
    if (!error) alert("RECETTE SAUVEGARDÉE");
    setLoading(false);
  };

  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <input value={recipeName} onChange={e => setRecipeName(e.target.value.toUpperCase())} style={titleStyle} />
          <div style={modeToggle} onClick={() => setIsFixedMode(!isFixedMode)}>
            {isFixedMode ? "🔒 MODE FIXE 20L" : "⚖️ MODE DYNAMIQUE"}
          </div>
        </div>
        <div style={statsBar}>
          <StatBox label="DENSITÉ (OG)" val={stats.og} />
          <StatBox label="ALCOOL (ABV)" val={stats.abv + "%"} color="#f39c12" />
          <StatBox label="AMERTUME (IBU)" val={stats.ibu} color="#27ae60" />
          <StatBox label="COULEUR (EBC)" val={stats.ebc} color="#e67e22" />
          <StatBox label="EAU EMPÂTAGE" val={stats.waterE + "L"} />
          <StatBox label="EAU RINÇAGE" val={stats.waterR + "L"} />
        </div>
      </header>

      <div style={layout}>
        <section style={timeline}>
          <h2 style={sectionTitle}>TIMELINE DE BRASSAGE</h2>
          {steps.map((step, i) => (
            <div key={step.id} onDragOver={e => handleDragOver(e, i)} style={{...stepCard, opacity: draggedIndex === i ? 0.3 : 1}}>
              <div style={stepHeader}>
                <div draggable onDragStart={() => handleDragStart(i)} onDragEnd={() => setDraggedIndex(null)} style={handle}>☰</div>
                <input value={step.label} onChange={e => {const n=[...steps]; n[i].label=e.target.value; setSteps(n)}} style={stepTitle} />
                <div style={stepActions}>
                  <button onClick={() => addIngToStep(i, "MALT")} style={ingBtn}>+MALT</button>
                  <button onClick={() => addIngToStep(i, "HOP")} style={ingBtn}>+HOP</button>
                  <button onClick={() => addIngToStep(i, "SUCRE")} style={ingBtn}>+SUCRE</button>
                  <button onClick={() => addIngToStep(i, "YEAST")} style={ingBtn}>+LEVURE</button>
                </div>
              </div>

              {step.ingredients.map((ing, ingIdx) => (
                <div key={ing.id} style={ingRow}>
                  <div style={{fontSize: '9px', color: '#444', width: '40px'}}>{ing.type}</div>
                  <select 
                    style={ingSelect}
                    onChange={e => {
                      const ref = dbIngredients.find(x => x.name === e.target.value);
                      const n = [...steps];
                      n[i].ingredients[ingIdx] = { ...ing, name: ref.name, ebc: ref.potency, yield: ref.yield, alpha: ref.potency, potency: ref.potency };
                      setSteps(n);
                    }}
                  >
                    <option>SÉLECTIONNER...</option>
                    {dbIngredients.filter(x => x.type === ing.type).map(x => <option key={x.id}>{x.name}</option>)}
                  </select>
                  <input type="number" placeholder="QTÉ" style={ingInput} onChange={e => {const n=[...steps]; n[i].ingredients[ingIdx].qty = +e.target.value; setSteps(n)}} />
                  {ing.type === "HOP" && <input type="number" placeholder="MIN" style={ingInput} onChange={e => {const n=[...steps]; n[i].ingredients[ingIdx].time = +e.target.value; setSteps(n)}} />}
                  <button onClick={() => {const n=[...steps]; n[i].ingredients.splice(ingIdx, 1); setSteps(n)}} style={delBtn}>×</button>
                </div>
              ))}
            </div>
          ))}
        </section>

        <aside style={sidebar}>
          <div style={{...beerPreview, backgroundColor: getBeerColor(stats.ebc)}} />
          <div style={configBox}>
            <h3 style={cardTitle}>PARAMÈTRES LABO</h3>
            <label style={labelStyle}>VOLUME DE BATCH (L)</label>
            <input type="number" disabled={isFixedMode} value={isFixedMode ? 20 : config.volume} onChange={e => setConfig({...config, volume: +e.target.value})} style={sideInput} />
            <label style={labelStyle}>EFFICACITÉ SYSTÈME (%)</label>
            <input type="number" value={config.efficiency} onChange={e => setConfig({...config, efficiency: +e.target.value})} style={sideInput} />
            <label style={labelStyle}>TEMP. EMPÂTAGE (°C)</label>
            <input type="number" value={config.mashTemp} onChange={e => setConfig({...config, mashTemp: +e.target.value})} style={sideInput} />
          </div>
          <button onClick={saveRecipe} disabled={loading} style={saveBtn}>
            {loading ? "ENREGISTREMENT..." : "SAUVEGARDER LA RECETTE"}
          </button>
        </aside>
      </div>
    </div>
  );
}

// --- STYLES & HELPER ---
const StatBox = ({label, val, color="#888"}: any) => (
  <div style={{ background: "#0a0a0a", padding: "10px 20px", border: "1px solid #111", textAlign: "center" as const }}>
    <div style={{ fontSize: "9px", color: "#444", marginBottom: "5px" }}>{label}</div>
    <div style={{ fontSize: "16px", fontWeight: "bold", color: color }}>{val}</div>
  </div>
);

const containerStyle = { padding: "40px", backgroundColor: "#050505", color: "#fff", minHeight: "100vh", fontFamily: "monospace" };
const headerStyle = { borderBottom: "2px solid #111", paddingBottom: "20px", marginBottom: "30px" };
const titleStyle = { background: "transparent", border: "none", color: "#f39c12", fontSize: "2rem", fontWeight: "bold", outline: "none", flex: 1 };
const statsBar = { display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "10px", marginTop: "20px" };
const modeToggle = { padding: "10px 20px", background: "#111", border: "1px solid #333", cursor: "pointer", fontSize: "11px", borderRadius: "20px" };
const layout = { display: "grid", gridTemplateColumns: "1fr 300px", gap: "30px" };
const timeline = { display: "flex", flexDirection: "column" as const, gap: "10px" };
const sectionTitle = { fontSize: "12px", color: "#444", letterSpacing: "2px", marginBottom: "10px" };
const stepCard = { background: "#0a0a0a", border: "1px solid #111", padding: "15px" };
const stepHeader = { display: "flex", alignItems: "center", gap: "15px", marginBottom: "10px" };
const handle = { cursor: "grab", color: "#333", fontSize: "20px" };
const stepTitle = { background: "transparent", border: "none", color: "#fff", fontSize: "14px", fontWeight: "bold", flex: 1, outline: "none" };
const stepActions = { display: "flex", gap: "5px" };
const ingBtn = { background: "#111", border: "1px solid #222", color: "#555", fontSize: "8px", padding: "4px 8px", cursor: "pointer" };
const ingRow = { display: "flex", gap: "10px", marginTop: "5px", background: "#000", padding: "8px", alignItems: "center" };
const ingSelect = { background: "transparent", color: "#ccc", border: "none", flex: 1, fontSize: "11px" };
const ingInput = { background: "#050505", border: "1px solid #222", color: "#f39c12", width: "55px", textAlign: "center" as const, fontSize: "11px", padding: "4px" };
const delBtn = { background: "none", border: "none", color: "#333", cursor: "pointer" };
const sidebar = { position: "sticky" as const, top: "40px", height: "fit-content" };
const beerPreview = { height: "120px", marginBottom: "20px", border: "2px solid #111" };
const configBox = { background: "#0a0a0a", padding: "20px", border: "1px solid #111" };
const cardTitle = { fontSize: "10px", color: "#444", marginBottom: "15px" };
const labelStyle = { fontSize: "9px", color: "#444", display: "block", marginBottom: "5px" };
const sideInput = { background: "#000", border: "1px solid #222", color: "#fff", width: "100%", padding: "10px", marginBottom: "15px" };
const saveBtn = { width: "100%", padding: "20px", background: "#f39c12", color: "#000", border: "none", fontWeight: "bold", marginTop: "20px", cursor: "pointer" };

function getBeerColor(ebc: number) {
  if (ebc <= 8) return "#F5F75C";
  if (ebc <= 15) return "#F1C40F";
  if (ebc <= 25) return "#D4AC0D";
  if (ebc <= 40) return "#8D4C17";
  return "#1A0506";
}