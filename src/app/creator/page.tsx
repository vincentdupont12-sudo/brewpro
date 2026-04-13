"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabaseClient";

export default function CreatorPage() {
  // --- 1. ÉTATS DES DONNÉES (DB & RECETTE) ---
  const [dbIngredients, setDbIngredients] = useState<any[]>([]);
  const [recipeName, setRecipeName] = useState("NOUVELLE_RECETTE_BRUTALE");
  const [loading, setLoading] = useState(false);
  
  const [recipe, setRecipe] = useState({
    malts: [] as any[],
    hops: [] as any[],
    salts: [] as any[],
    volume: 20,
    efficiency: 75,
    mashTemp: 67,
  });

  const [steps, setSteps] = useState([
    { id: 1, label: "CONCASSAGE ET PRÉPARATION" },
    { id: 2, label: "NETTOYAGE CIP MATÉRIEL" },
  ]);

  const [stats, setStats] = useState({
    abv: 0, ebc: 0, ibu: 0, ratio: 0, og: 1.0, fg: 1.0,
  });

  // --- 2. CHARGEMENT DES RÉFÉRENCES (DEPUIS INGREDIENT_REFS) ---
  useEffect(() => {
    const fetchRefs = async () => {
      const { data } = await supabase.from("ingredient_refs").select("*");
      if (data) setDbIngredients(data);
    };
    fetchRefs();
  }, []);

  const maltOptions = dbIngredients.filter((i) => i.type?.toUpperCase() === "MALT");
  const hopOptions = dbIngredients.filter((i) => i.type?.toUpperCase() === "HOP");

  // --- 3. MOTEUR DE CALCUL (LOGIQUE BRASSICOLE) ---
  useEffect(() => {
    const volGal = recipe.volume * 0.264;
    let points = 0;
    let totalMCU = 0;

    // Calcul EBC et Densité Initiale (OG)
    recipe.malts.forEach((m) => {
      totalMCU += (m.qty * 2.204 * (m.ebc * 0.508)) / volGal;
      points += m.qty * 300 * (m.yield / 100) * (recipe.efficiency / 100);
    });

    const og = 1 + points / recipe.volume / 1000;
    // Calcul Atténuation selon température d'empâtage
    const attenuation = 0.75 - (recipe.mashTemp - 67) * 0.02;
    const fg = 1 + (og - 1) * (1 - attenuation);
    const abv = (og - fg) * 131.25;

    // Calcul Amertume (IBU) - Formule de Tinseth
    let totalIBU = 0;
    recipe.hops.forEach((h) => {
      const util = 1.65 * Math.pow(0.000125, og - 1) * ((1 - Math.exp(-0.04 * h.time)) / 4.15);
      totalIBU += ((h.alpha / 100) * (h.qty * 1000) / recipe.volume) * util;
    });

    setStats({
      og: parseFloat(og.toFixed(3)) || 1.0,
      fg: parseFloat(fg.toFixed(3)) || 1.0,
      ebc: Math.round(1.49 * Math.pow(totalMCU, 0.68) * 1.97) || 0,
      abv: parseFloat(abv.toFixed(1)) || 0,
      ibu: Math.round(totalIBU) || 0,
      ratio: og > 1 ? parseFloat((totalIBU / ((og - 1) * 1000)).toFixed(2)) : 0,
    });
  }, [recipe]);

  // --- 4. GESTION DE LA TIMELINE (RÉORGANISATION) ---
  const moveStep = (index: number, direction: 'up' | 'down') => {
    const newSteps = [...steps];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSteps.length) return;
    [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
    setSteps(newSteps);
  };

  // --- 5. TRANSMISSION VERS LE BREWMASTER (TABLE RECIPES) ---
  const startBatch = async () => {
    if (!recipeName) return alert("ERREUR : NOM_RECETTE_REQUIS");
    setLoading(true);

    const formattedSteps = [
      // Étapes manuelles réorganisables
      ...steps.map((s) => ({
        id: crypto.randomUUID(),
        type: "ACTION",
        title: s.label.toUpperCase(),
        instruction: "PROTOCOLE_LOGISTIQUE",
        ingredients: [],
      })),
      // Palier d'empâtage généré
      {
        id: "mash",
        type: "PALIER",
        title: "EMPÂTAGE PRINCIPAL",
        target: `${recipe.mashTemp}°C`,
        value: "60",
        ingredients: recipe.malts.map((m) => ({ name: m.name.toUpperCase(), qty: m.qty.toString() })),
      },
      // Houblonnage chronométré
      ...recipe.hops
        .sort((a, b) => b.time - a.time)
        .map((h, i) => ({
          id: `hop-${i}`,
          type: "ACTION",
          title: `HOUBLONNAGE : ${h.name.toUpperCase()}`,
          instruction: `Ajout à T-${h.time} min.`,
          ingredients: [{ name: h.name.toUpperCase(), qty: h.qty.toString() }],
        })),
    ];

    const { error } = await supabase.from("recipes").insert([
      {
        data: {
          name: recipeName.toUpperCase(),
          eauE: (recipe.volume * 2.8).toFixed(1),
          eauR: (recipe.volume * 1.2).toFixed(1),
          steps: formattedSteps,
        },
      },
    ]);

    if (!error) alert("🚀 TRANSMIS AU BREWMASTER ! Check la section RESOURCES.");
    else alert("ERREUR_SUPABASE: " + error.message);
    setLoading(false);
  };

  return (
    <div style={containerStyle}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        
        <header style={headerStyle}>
          <div style={{ flex: 1 }}>
            <span style={labelStyle}>PROJECT_ID</span>
            <input value={recipeName} onChange={(e) => setRecipeName(e.target.value)} style={nameInputStyle} />
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={labelStyle}>TARGET_OG</span>
            <div style={ogStyle}>{stats.og}</div>
          </div>
        </header>

        <div style={mainGrid}>
          <main>
            {/* SECTION MALTS */}
            <div style={cardStyle}>
              <h3 style={cardTitle}>🌾 MALT_BILL (DB_REFS)</h3>
              {recipe.malts.map((m, i) => (
                <div key={i} style={rowStyle}>
                  <select style={selectStyle} value={m.name} onChange={(e) => {
                    const ref = maltOptions.find((x) => x.name === e.target.value);
                    const n = [...recipe.malts];
                    n[i] = { ...n[i], name: ref.name, ebc: ref.potency, yield: ref.yield };
                    setRecipe({ ...recipe, malts: n });
                  }}>
                    <option value="">SELECT_MALT</option>
                    {maltOptions.map((x) => <option key={x.id} value={x.name}>{x.name}</option>)}
                  </select>
                  <div style={unitBox}><input type="number" step="0.1" value={m.qty} onChange={(e) => { const n = [...recipe.malts]; n[i].qty = +e.target.value; setRecipe({ ...recipe, malts: n }); }} style={smallInput} /><span>KG</span></div>
                  <button onClick={() => setRecipe({ ...recipe, malts: recipe.malts.filter((_, idx) => idx !== i) })} style={delBtn}>×</button>
                </div>
              ))}
              <button onClick={() => setRecipe({ ...recipe, malts: [...recipe.malts, { name: "", qty: 0, ebc: 0, yield: 0 }] })} style={addBtn}>+ ADD_MALT</button>
            </div>

            {/* SECTION HOUBLONS */}
            <div style={cardStyle}>
              <h3 style={cardTitle}>🌿 HOP_SCHEDULE (DB_REFS)</h3>
              {recipe.hops.map((h, i) => (
                <div key={i} style={rowStyle}>
                  <select style={selectStyle} value={h.name} onChange={(e) => {
                    const ref = hopOptions.find((x) => x.name === e.target.value);
                    const n = [...recipe.hops];
                    n[i] = { ...n[i], name: ref.name, alpha: ref.potency };
                    setRecipe({ ...recipe, hops: n });
                  }}>
                    <option value="">SELECT_HOP</option>
                    {hopOptions.map((x) => <option key={x.id} value={x.name}>{x.name}</option>)}
                  </select>
                  <div style={unitBox}><input type="number" value={h.qty} onChange={(e) => { const n = [...recipe.hops]; n[i].qty = +e.target.value; setRecipe({ ...recipe, hops: n }); }} style={smallInput} /><span>G</span></div>
                  <div style={unitBox}><input type="number" value={h.time} onChange={(e) => { const n = [...recipe.hops]; n[i].time = +e.target.value; setRecipe({ ...recipe, hops: n }); }} style={smallInput} /><span>MIN</span></div>
                  <button onClick={() => setRecipe({ ...recipe, hops: recipe.hops.filter((_, idx) => idx !== i) })} style={delBtn}>×</button>
                </div>
              ))}
              <button onClick={() => setRecipe({ ...recipe, hops: [...recipe.hops, { name: "", qty: 0, time: 60, alpha: 0 }] })} style={{ ...addBtn, color: "#27ae60" }}>+ ADD_HOP</button>
            </div>

            {/* SECTION ACTIONS RÉORGANISABLES */}
            <div style={{ ...cardStyle, borderLeft: "4px solid #9b59b6" }}>
              <h3 style={{ ...cardTitle, color: "#9b59b6" }}>🎬 TIMELINE_ACTIONS (MOVEABLE)</h3>
              {steps.map((step, i) => (
                <div key={step.id} style={rowStyle}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <button onClick={() => moveStep(i, 'up')} style={{ ...moveBtn, opacity: i === 0 ? 0.2 : 1 }} disabled={i === 0}>▲</button>
                    <button onClick={() => moveStep(i, 'down')} style={{ ...moveBtn, opacity: i === steps.length - 1 ? 0.2 : 1 }} disabled={i === steps.length - 1}>▼</button>
                  </div>
                  <input style={{ ...selectStyle, textAlign: "left" }} value={step.label} onChange={(e) => { const n = [...steps]; n[i].label = e.target.value; setSteps(n); }} />
                  <button onClick={() => setSteps(steps.filter((s) => s.id !== step.id))} style={delBtn}>×</button>
                </div>
              ))}
              <button onClick={() => setSteps([...steps, { id: Date.now(), label: "NOUVELLE_ÉTAPE" }])} style={{ ...addBtn, color: "#9b59b6" }}>+ ADD_ACTION</button>
            </div>
          </main>

          <aside style={sidebarStyle}>
            <div style={{ height: "140px", backgroundColor: getBeerColor(stats.ebc), border: "2px solid #222", marginBottom: "20px" }} />
            <div style={abvStyle}>{stats.abv}%</div>
            <span style={labelStyle}>ESTIMATED_ABV</span>

            <div style={statGrid}>
              <div style={statBox}><span>IBU</span>{stats.ibu}</div>
              <div style={statBox}><span>EBC</span>{stats.ebc}</div>
              <div style={statBox}><span>R/B</span>{stats.ratio}</div>
            </div>

            <div style={configBox}>
              <div style={configRow}><span>VOLUME</span><input type="number" value={recipe.volume} onChange={e => setRecipe({...recipe, volume: +e.target.value})} />L</div>
              <div style={configRow}><span>EFFICIENCY</span><input type="number" value={recipe.efficiency} onChange={e => setRecipe({...recipe, efficiency: +e.target.value})} />%</div>
              <div style={configRow}><span>MASH_TEMP</span><input type="number" value={recipe.mashTemp} onChange={e => setRecipe({...recipe, mashTemp: +e.target.value})} />°C</div>
            </div>

            <button onClick={startBatch} disabled={loading} style={commitBtn}>
              {loading ? "TRANSMITTING..." : "PUSH_TO_BREWMASTER"}
            </button>
          </aside>
        </div>
      </div>
    </div>
  );
}

// --- STYLES (DESIGN BRUTALISTE) ---
const containerStyle = { padding: "40px", backgroundColor: "#050505", color: "#fff", minHeight: "100vh", fontFamily: "monospace", fontStyle: "italic" };
const headerStyle = { display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderBottom: "2px solid #111", paddingBottom: "20px", marginBottom: "40px" };
const nameInputStyle = { background: "transparent", border: "none", color: "#fff", fontSize: "3.5rem", fontWeight: "900", outline: "none", width: "100%", textTransform: "uppercase" as const, letterSpacing: "-2px" };
const mainGrid = { display: "grid", gridTemplateColumns: "1fr 320px", gap: "40px" };
const cardStyle = { background: "#0a0a0a", padding: "20px", border: "1px solid #111", marginBottom: "20px" };
const cardTitle = { fontSize: "10px", color: "#444", marginBottom: "15px", letterSpacing: "1px" };
const rowStyle = { display: "flex", gap: "10px", marginBottom: "10px", alignItems: "center" };
const selectStyle = { background: "#000", color: "#fff", border: "1px solid #222", padding: "12px", flex: 1, outline: "none", fontSize: "11px", fontWeight: "bold" };
const unitBox = { display: "flex", alignItems: "center", fontSize: '9px', gap: '5px' };
const smallInput = { background: "#000", color: "#fff", border: "1px solid #222", padding: "12px", width: "70px", textAlign: "center" as const, fontSize: "11px", fontWeight: "900" };
const delBtn = { background: "none", border: "none", color: "#333", cursor: "pointer", fontSize: "1.2rem" };
const addBtn = { background: "none", border: "none", color: "#f39c12", fontSize: "9px", fontWeight: "bold", cursor: "pointer", marginTop: "10px" };
const moveBtn = { background: '#111', border: '1px solid #222', color: '#9b59b6', fontSize: '8px', cursor: 'pointer', padding: '2px 4px' };
const sidebarStyle = { position: "sticky" as const, top: "40px", height: "fit-content" };
const abvStyle = { fontSize: "5rem", fontWeight: "900", color: "#f39c12", lineHeight: "0.8" };
const ogStyle = { fontSize: "2.5rem", fontWeight: "900", color: "#f39c12" };
const labelStyle = { fontSize: "10px", color: "#444", fontWeight: "bold" };
const statGrid = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", margin: "30px 0" };
const statBox = { background: "#0a0a0a", border: "1px solid #111", padding: "15px 5px", textAlign: "center" as const, fontSize: "16px", fontWeight: "900", display: "flex", flexDirection: "column" as const };
const configBox = { background: "#0e0e0e", padding: "15px", marginBottom: "20px", border: "1px solid #222" };
const configRow = { display: "flex", justifyContent: "space-between", fontSize: "9px", color: "#666", marginBottom: "8px", alignItems: "center" };
const commitBtn = { width: "100%", padding: "25px", background: "#f39c12", color: "#000", border: "none", fontWeight: "900", cursor: "pointer", fontSize: "12px", letterSpacing: "1px" };

function getBeerColor(ebc: number) {
  if (ebc <= 8) return "#F5F75C";
  if (ebc <= 15) return "#F1C40F";
  if (ebc <= 25) return "#D4AC0D";
  if (ebc <= 40) return "#8D4C17";
  if (ebc <= 60) return "#5E3311";
  return "#1A0506";
}