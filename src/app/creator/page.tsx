"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabaseClient";

export default function CreatorPage() {
  // --- 1. ÉTATS ---
  const [dbIngredients, setDbIngredients] = useState<any[]>([]);
  const [recipeName, setRecipeName] = useState("RECETTE_FOND_DE_SAC");
  const [loading, setLoading] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  
  const [recipe, setRecipe] = useState({
    malts: [] as any[],
    hops: [] as any[],
    volume: 20,
    efficiency: 75,
    mashTemp: 67,
  });

  const [steps, setSteps] = useState([
    { id: "1", label: "CONCASSAGE DES GRAINS", type: "ACTION" },
    { id: "2", label: "EMPÂTAGE (MASH-IN)", type: "PALIER" },
    { id: "3", label: "FILTRATION ET RINÇAGE", type: "ACTION" },
    { id: "4", label: "ÉBULLITION (60 MIN)", type: "ACTION" },
    { id: "5", label: "REFROIDISSEMENT", type: "ACTION" },
  ]);

  const [stats, setStats] = useState({ abv: 0, ebc: 0, ibu: 0, og: 1.0 });

  // --- 2. CHARGEMENT DES RÉFÉRENCES ---
  useEffect(() => {
    const fetchRefs = async () => {
      const { data } = await supabase.from("ingredient_refs").select("*");
      if (data) setDbIngredients(data);
    };
    fetchRefs();
  }, []);

  const maltOptions = dbIngredients.filter(i => i.type?.toUpperCase() === "MALT");
  const hopOptions = dbIngredients.filter(i => i.type?.toUpperCase() === "HOP");

  // --- 3. CALCULATEUR D'EAU (LOGIQUE FOND DE SAC) ---
  const totalMalt = recipe.malts.reduce((acc, m) => acc + (parseFloat(m.qty) || 0), 0);
  const waterEmpatage = parseFloat((totalMalt * 2.8).toFixed(1));
  // Formule : (Volume visé * 1.1 évaporation) - (Eau empâtage - Malt absorbé)
  const waterRincage = parseFloat(((recipe.volume * 1.1) - (waterEmpatage - totalMalt)).toFixed(1));

  // --- 4. MOTEUR DE STATS ---
  useEffect(() => {
    let points = 0; let mcu = 0;
    recipe.malts.forEach(m => {
      mcu += (m.qty * 2.204 * (m.ebc * 0.508)) / (recipe.volume * 0.264);
      points += m.qty * 300 * (m.yield / 100) * (recipe.efficiency / 100);
    });
    const og = 1 + points / recipe.volume / 1000;
    
    let totalIBU = 0;
    recipe.hops.forEach(h => {
      const util = 1.65 * Math.pow(0.000125, og - 1) * ((1 - Math.exp(-0.04 * h.time)) / 4.15);
      totalIBU += ((h.alpha / 100) * (h.qty * 1000) / recipe.volume) * util;
    });

    setStats({
      og: parseFloat(og.toFixed(3)),
      ebc: Math.round(1.49 * Math.pow(mcu, 0.68) * 1.97),
      abv: parseFloat(((og - 1) * 131.25 * 0.75).toFixed(1)),
      ibu: Math.round(totalIBU)
    });
  }, [recipe, totalMalt]);

  // --- 5. LOGIQUE DRAG & DROP ---
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

  // --- 6. SAUVEGARDE VERS SUPABASE ---
  const saveRecipe = async () => {
    setLoading(true);
    const finalSteps = steps.map(s => {
      let ings = [];
      let instr = "PROCÉDURE_STANDARD";
      
      if (s.label.includes("EMPÂTAGE")) {
        ings = recipe.malts.map(m => ({ name: m.name, qty: `${m.qty}kg` }));
        instr = `Verser ${waterEmpatage}L d'eau.`;
      }
      if (s.label.includes("RINÇAGE")) {
        instr = `Rincer avec ${waterRincage}L d'eau à 78°C.`;
      }
      if (s.label.includes("ÉBULLITION")) {
        ings = recipe.hops.map(h => ({ name: h.name, qty: `${h.qty}g (T-${h.time})` }));
      }
      
      return {
        id: crypto.randomUUID(),
        type: s.type,
        title: s.label,
        instruction: instr,
        target: s.label.includes("EMPÂTAGE") ? `${recipe.mashTemp}°C` : "",
        ingredients: ings
      };
    });

    const { error } = await supabase.from("recipes").insert([{
      data: {
        name: recipeName.toUpperCase(),
        eauE: waterEmpatage,
        eauR: waterRincage,
        steps: finalSteps
      }
    }]);

    if (!error) alert("🚀 RECETTE ENVOYÉE AUX POTES");
    setLoading(false);
  };

  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
        <input value={recipeName} onChange={e => setRecipeName(e.target.value)} style={nameInputStyle} />
        <div style={statBar}>
          <span>OG: <strong>{stats.og}</strong></span>
          <span>ABV: <strong>{stats.abv}%</strong></span>
          <span>IBU: <strong>{stats.ibu}</strong></span>
          <span style={{color: '#f39c12'}}>TOTAL_MALT: <strong>{totalMalt.toFixed(2)} KG</strong></span>
        </div>
      </header>

      <div style={mainGrid}>
        <main>
          {/* CALCULATEUR D'EAU DYNAMIQUE */}
          <div style={waterCard}>
            <div style={waterBox}>
              <span style={waterLabel}>💧 EAU EMPÂTAGE</span>
              <span style={waterVal}>{waterEmpatage} L</span>
            </div>
            <div style={waterBox}>
              <span style={waterLabel}>🚰 EAU RINÇAGE</span>
              <span style={waterVal}>{waterRincage > 0 ? waterRincage : 0} L</span>
            </div>
          </div>

          {/* INGRÉDIENTS */}
          <div style={cardStyle}>
            <h3 style={cardTitle}>GESTION DES FONDS DE SAC</h3>
            {recipe.malts.map((m, i) => (
              <div key={i} style={rowStyle}>
                <select style={selectStyle} value={m.name} onChange={e => {
                  const ref = maltOptions.find(x => x.name === e.target.value);
                  const n = [...recipe.malts];
                  n[i] = { ...n[i], name: ref.name, ebc: ref.potency, yield: ref.yield };
                  setRecipe({ ...recipe, malts: n });
                }}>
                  <option>Choisir Malt</option>
                  {maltOptions.map(x => <option key={x.id}>{x.name}</option>)}
                </select>
                <input type="number" step="0.01" value={m.qty} onChange={e => {const n=[...recipe.malts]; n[i].qty=e.target.value; setRecipe({...recipe, malts:n})}} style={smallInput} />
                <button onClick={() => setRecipe({...recipe, malts: recipe.malts.filter((_, idx) => idx !== i)})} style={delBtn}>×</button>
              </div>
            ))}
            <button onClick={() => setRecipe({...recipe, malts: [...recipe.malts, {name:'', qty:0}]})} style={addBtn}>+ AJOUTER MALT</button>
          </div>

          {/* TIMELINE INTERVERTIBLE */}
          <div style={cardStyle}>
            <h3 style={cardTitle}>TIMELINE ACTIONS (DRAG ☰)</h3>
            {steps.map((step, i) => (
              <div key={step.id} onDragOver={(e) => handleDragOver(e, i)} style={{...stepRow, opacity: draggedIndex === i ? 0.3 : 1}}>
                <div draggable onDragStart={() => handleDragStart(i)} onDragEnd={() => setDraggedIndex(null)} style={dragHandle}>☰</div>
                <input value={step.label} onChange={e => {const n=[...steps]; n[i].label=e.target.value; setSteps(n)}} style={stepInput} />
                <button onClick={() => setSteps(steps.filter((_, idx) => idx !== i))} style={delBtn}>×</button>
              </div>
            ))}
            <button onClick={() => setSteps([...steps, {id: Date.now().toString(), label: "NOUVELLE ÉTAPE", type: "ACTION"}])} style={addBtn}>+ AJOUTER ÉTAPE</button>
          </div>
        </main>

        <aside>
          <div style={{...previewColor, backgroundColor: getBeerColor(stats.ebc)}} />
          <div style={configBox}>
            <label style={labelStyle}>VOLUME CIBLE (L)</label>
            <input type="number" value={recipe.volume} onChange={e => setRecipe({...recipe, volume: +e.target.value})} style={sideInput}/>
            <label style={labelStyle}>T° EMPÂTAGE (°C)</label>
            <input type="number" value={recipe.mashTemp} onChange={e => setRecipe({...recipe, mashTemp: +e.target.value})} style={sideInput}/>
          </div>
          <button onClick={saveRecipe} disabled={loading} style={saveBtn}>
            {loading ? "TRANSFERT..." : "ENVOYER AU BREWMASTER"}
          </button>
        </aside>
      </div>
    </div>
  );
}

// --- STYLES ---
const containerStyle = { padding: "40px", backgroundColor: "#050505", color: "#fff", minHeight: "100vh", fontFamily: "monospace" };
const headerStyle = { borderBottom: "2px solid #111", paddingBottom: "20px", marginBottom: "30px" };
const nameInputStyle = { background: "transparent", border: "none", color: "#f39c12", fontSize: "2.5rem", fontWeight: "bold", width: "100%", outline: "none" };
const statBar = { display: "flex", gap: "20px", fontSize: "12px", color: "#666", marginTop: "10px" };
const mainGrid = { display: "grid", gridTemplateColumns: "1fr 320px", gap: "30px" };
const waterCard = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px" };
const waterBox = { background: "#111", padding: "20px", border: "1px solid #222", display: "flex", flexDirection: "column" as const };
const waterLabel = { fontSize: "10px", color: "#666", marginBottom: "5px" };
const waterVal = { fontSize: "24px", fontWeight: "bold", color: "#f39c12" };
const cardStyle = { background: "#0a0a0a", border: "1px solid #111", padding: "20px", marginBottom: "20px" };
const cardTitle = { fontSize: "10px", color: "#444", marginBottom: "15px", letterSpacing: "2px" };
const rowStyle = { display: "flex", gap: "10px", marginBottom: "10px" };
const selectStyle = { background: "#000", color: "#fff", border: "1px solid #222", padding: "12px", flex: 1, fontSize: "13px" };
const smallInput = { background: "#000", color: "#fff", border: "1px solid #222", width: "100px", textAlign: "center" as const, fontWeight: "bold" };
const stepRow = { display: "flex", alignItems: "center", gap: "10px", background: "#000", padding: "12px", marginBottom: "5px", border: "1px solid #111" };
const dragHandle = { cursor: "grab", color: "#f39c12", fontSize: "20px", padding: "0 5px" };
const stepInput = { background: "transparent", border: "none", color: "#fff", flex: 1, outline: "none", fontSize: "13px" };
const addBtn = { background: "none", border: "1px dashed #333", color: "#444", width: "100%", padding: "12px", cursor: "pointer", marginTop: "10px", fontSize: "11px" };
const delBtn = { background: "none", border: "none", color: "#444", cursor: "pointer", fontSize: "18px" };
const configBox = { background: "#0a0a0a", padding: "20px", border: "1px solid #111" };
const labelStyle = { fontSize: "10px", color: "#444", display: "block", marginBottom: "5px" };
const sideInput = { background: "#000", color: "#fff", border: "1px solid #222", padding: "12px", width: "100%", marginBottom: "15px", fontWeight: "bold" };
const saveBtn = { width: "100%", padding: "25px", background: "#f39c12", color: "#000", border: "none", fontWeight: "bold", marginTop: "20px", cursor: "pointer" };
const previewColor = { height: "120px", width: "100%", marginBottom: "20px", border: "2px solid #222" };

function getBeerColor(ebc: number) {
  if (ebc <= 8) return "#F5F75C";
  if (ebc <= 15) return "#F1C40F";
  if (ebc <= 25) return "#D4AC0D";
  if (ebc <= 40) return "#8D4C17";
  return "#1A0506";
}