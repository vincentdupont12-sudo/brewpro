"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabaseClient";

export default function CreatorPage() {
  const [dbIngredients, setDbIngredients] = useState<any[]>([]);
  const [recipeName, setRecipeName] = useState("BATCH_DYNAMIC_PROTOTYPE");
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // Configuration de base
  const [config, setConfig] = useState({
    volume: 20,
    efficiency: 75,
    mashTemp: 67,
  });

  // La Timeline est l'unique source de vérité
  const [steps, setSteps] = useState([
    { id: "s1", type: "ACTION", label: "CONCASSAGE DES GRAINS", ingredients: [] as any[] },
    { id: "s2", type: "PALIER", label: "EMPÂTAGE", ingredients: [] as any[] },
    { id: "s3", type: "ACTION", label: "RINCAGE", ingredients: [] as any[] },
    { id: "s4", type: "ACTION", label: "EBULLITION", ingredients: [] as any[] },
    { id: "s5", type: "ACTION", label: "REFROIDISSEMENT", ingredients: [] as any[] },
  ]);

  const [stats, setStats] = useState({ abv: 0, ebc: 0, ibu: 0, og: 1.0, waterE: 0, waterR: 0 });

  useEffect(() => {
    const fetchRefs = async () => {
      const { data } = await supabase.from("ingredient_refs").select("*");
      if (data) setDbIngredients(data);
    };
    fetchRefs();
  }, []);

  // --- MOTEUR DE CALCULS DYNAMIQUES ---
  useEffect(() => {
    let totalPoints = 0;
    let totalMCU = 0;
    let totalIBU = 0;
    let maltWeight = 0;

    steps.forEach((step) => {
      step.ingredients.forEach((ing) => {
        if (ing.type === "MALT") {
          maltWeight += ing.qty;
          totalMCU += (ing.qty * 2.204 * (ing.ebc * 0.508)) / (config.volume * 0.264);
          totalPoints += ing.qty * 300 * (ing.yield / 100) * (config.efficiency / 100);
        }
      });
    });

    const og = 1 + totalPoints / config.volume / 1000;

    // Calcul IBU basé sur les ingrédients présents dans l'étape "EBULLITION"
    steps.forEach((step) => {
      if (step.label.includes("EBULLITION")) {
        step.ingredients.forEach((ing) => {
          if (ing.type === "HOP") {
            const util = 1.65 * Math.pow(0.000125, og - 1) * ((1 - Math.exp(-0.04 * ing.time)) / 4.15);
            totalIBU += ((ing.alpha / 100) * (ing.qty * 1000) / config.volume) * util;
          }
        });
      }
    });

    const wE = maltWeight * 2.8;
    const wR = (config.volume * 1.1) - (wE - maltWeight);

    setStats({
      og: parseFloat(og.toFixed(3)),
      ebc: Math.round(1.49 * Math.pow(totalMCU, 0.68) * 1.97),
      abv: parseFloat(((og - 1) * 131.25 * 0.75).toFixed(1)),
      ibu: Math.round(totalIBU),
      waterE: parseFloat(wE.toFixed(1)),
      waterR: parseFloat(wR.toFixed(1))
    });
  }, [steps, config]);

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

  // --- AJOUT INGREDIENTS DANS UNE ÉTAPE PRÉCISE ---
  const addIngToStep = (stepIdx: number, type: "MALT" | "HOP") => {
    const newSteps = [...steps];
    const newIng = type === "MALT" 
      ? { id: Date.now(), type: "MALT", name: "", qty: 0, ebc: 0, yield: 0 }
      : { id: Date.now(), type: "HOP", name: "", qty: 0, alpha: 0, time: 60 };
    newSteps[stepIdx].ingredients.push(newIng);
    setSteps(newSteps);
  };

  const saveToDb = async () => {
    setLoading(true);
    const { error } = await supabase.from("recipes").insert([{
      data: {
        name: recipeName,
        eauE: stats.waterE,
        eauR: stats.waterR,
        steps: steps.map(s => ({
          ...s,
          instruction: s.label.includes("EMPÂTAGE") ? `Eau: ${stats.waterE}L` : s.label.includes("RINCAGE") ? `Eau: ${stats.waterR}L` : "Action standard"
        }))
      }
    }]);
    if (!error) alert("TRANSMISSION RÉUSSIE");
    setLoading(false);
  };

  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
        <input value={recipeName} onChange={e => setRecipeName(e.target.value.toUpperCase())} style={titleStyle} />
        <div style={statsBar}>
          <Stat label="OG" val={stats.og} />
          <Stat label="ABV" val={stats.abv + "%"} color="#f39c12" />
          <Stat label="IBU" val={stats.ibu} color="#27ae60" />
          <Stat label="EBC" val={stats.ebc} />
          <Stat label="EAU_E" val={stats.waterE + "L"} />
          <Stat label="EAU_R" val={stats.waterR + "L"} />
        </div>
      </header>

      <div style={layout}>
        <section style={timeline}>
          {steps.map((step, i) => (
            <div key={step.id} onDragOver={e => handleDragOver(e, i)} style={{...stepCard, opacity: draggedIndex === i ? 0.3 : 1}}>
              <div style={stepHeader}>
                <div draggable onDragStart={() => handleDragStart(i)} onDragEnd={() => setDraggedIndex(null)} style={handle}>☰</div>
                <input value={step.label} onChange={e => {const n=[...steps]; n[i].label=e.target.value; setSteps(n)}} style={stepTitle} />
                <div style={stepActions}>
                  <button onClick={() => addIngToStep(i, "MALT")} style={ingBtn}>+MALT</button>
                  <button onClick={() => addIngToStep(i, "HOP")} style={ingBtn}>+HOP</button>
                </div>
              </div>

              {step.ingredients.map((ing, ingIdx) => (
                <div key={ing.id} style={ingRow}>
                  <select 
                    style={ingSelect}
                    onChange={e => {
                      const ref = dbIngredients.find(x => x.name === e.target.value);
                      const n = [...steps];
                      n[i].ingredients[ingIdx] = { ...ing, name: ref.name, ebc: ref.potency, yield: ref.yield, alpha: ref.potency };
                      setSteps(n);
                    }}
                  >
                    <option>INGREDIENT...</option>
                    {dbIngredients.filter(x => x.type === ing.type).map(x => <option key={x.id}>{x.name}</option>)}
                  </select>
                  <input type="number" placeholder="QTY" style={ingInput} onChange={e => {const n=[...steps]; n[i].ingredients[ingIdx].qty = +e.target.value; setSteps(n)}} />
                  {ing.type === "HOP" && <input type="number" placeholder="MIN" style={ingInput} onChange={e => {const n=[...steps]; n[i].ingredients[ingIdx].time = +e.target.value; setSteps(n)}} />}
                </div>
              ))}
            </div>
          ))}
        </section>

        <aside style={sidebar}>
          <div style={{...colorBox, backgroundColor: getBeerColor(stats.ebc)}} />
          <div style={configBox}>
            <label style={labelStyle}>VOLUME FINAL (L)</label>
            <input type="number" value={config.volume} onChange={e => setConfig({...config, volume: +e.target.value})} style={sideInput} />
            <label style={labelStyle}>EFFICACITÉ (%)</label>
            <input type="number" value={config.efficiency} onChange={e => setConfig({...config, efficiency: +e.target.value})} style={sideInput} />
          </div>
          <button onClick={saveToDb} disabled={loading} style={saveBtn}>{loading ? "SYCHRONISATION..." : "ENVOYER AU BREWMASTER"}</button>
        </aside>
      </div>
    </div>
  );
}

// --- SOUS-COMPOSANTS & STYLES ---
const Stat = ({label, val, color="#666"}: any) => (
  <div style={{textAlign: 'center'}}>
    <div style={{fontSize: '10px', color: '#444'}}>{label}</div>
    <div style={{fontSize: '18px', fontWeight: 'bold', color: color}}>{val}</div>
  </div>
);

const containerStyle = { padding: "40px", backgroundColor: "#050505", color: "#fff", minHeight: "100vh", fontFamily: "monospace" };
const headerStyle = { borderBottom: "2px solid #111", paddingBottom: "20px", marginBottom: "30px" };
const titleStyle = { background: "transparent", border: "none", color: "#f39c12", fontSize: "2rem", fontWeight: "bold", outline: "none", width: "100%" };
const statsBar = { display: "flex", gap: "30px", marginTop: "20px" };
const layout = { display: "grid", gridTemplateColumns: "1fr 300px", gap: "30px" };
const timeline = { display: "flex", flexDirection: "column" as const, gap: "10px" };
const stepCard = { background: "#0a0a0a", border: "1px solid #111", padding: "15px", borderRadius: "4px" };
const stepHeader = { display: "flex", alignItems: "center", gap: "15px", marginBottom: "10px" };
const handle = { cursor: "grab", color: "#333", fontSize: "20px" };
const stepTitle = { background: "transparent", border: "none", color: "#fff", fontSize: "14px", fontWeight: "bold", flex: 1, outline: "none" };
const stepActions = { display: "flex", gap: "5px" };
const ingBtn = { background: "#111", border: "1px solid #222", color: "#666", fontSize: "9px", padding: "5px 10px", cursor: "pointer" };
const ingRow = { display: "flex", gap: "10px", marginTop: "5px", background: "#000", padding: "10px", borderRadius: "2px" };
const ingSelect = { background: "transparent", color: "#ccc", border: "none", flex: 1, fontSize: "12px" };
const ingInput = { background: "#050505", border: "1px solid #222", color: "#f39c12", width: "60px", textAlign: "center" as const, fontSize: "12px" };
const sidebar = { position: "sticky" as const, top: "40px", height: "fit-content" };
const colorBox = { height: "100px", borderRadius: "4px", marginBottom: "20px", border: "2px solid #111" };
const configBox = { background: "#0a0a0a", padding: "20px", border: "1px solid #111" };
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