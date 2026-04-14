"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabaseClient";

export default function SuperLaboPage() {
  const [dbIngredients, setDbIngredients] = useState<any[]>([]);
  const [recipeName, setRecipeName] = useState("PROJET_EXPERIMENTAL");
  const [loading, setLoading] = useState(false);

  // --- PARAMÈTRES AVANCÉS DU LABO ---
  const [config, setConfig] = useState({
    volume: 20,
    efficiency: 75,
    mashTemp: 67,
    sugarPerL: 6, // Pour le resucrage
    boilTime: 60,
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

  // --- MOTEUR DE CALCULS "HEAVY" ---
  useEffect(() => {
    let totalPoints = 0, totalMCU = 0, totalIBU = 0, maltWeight = 0, attenuation = 0.75;

    steps.forEach(s => {
      s.ingredients.forEach(ing => {
        if (ing.type === "MALT") {
          maltWeight += ing.qty;
          totalMCU += (ing.qty * 2.204 * (ing.ebc * 0.508)) / (config.volume * 0.264);
          totalPoints += ing.qty * 300 * (ing.yield / 100) * (config.efficiency / 100);
        }
        if (ing.type === "SUCRE") totalPoints += ing.qty * 380;
        if (ing.type === "YEAST") attenuation = (ing.potency || 75) / 100;
        
        // IBU spécifique à l'étape ébullition
        if (s.label.includes("ÉBULLITION") && ing.type === "HOP") {
            const util = 1.65 * Math.pow(0.000125, (1 + totalPoints/config.volume/1000) - 1) * ((1 - Math.exp(-0.04 * ing.time)) / 4.15);
            totalIBU += ((ing.alpha / 100) * (ing.qty * 1000) / config.volume) * util;
        }
      });
    });

    const og = 1 + totalPoints / config.volume / 1000;
    const wE = maltWeight * 2.8;

    setStats({
      og: parseFloat(og.toFixed(3)),
      ebc: Math.round(1.49 * Math.pow(totalMCU, 0.68) * 1.97),
      abv: parseFloat(((og - 1) * 131.25 * attenuation).toFixed(1)),
      ibu: Math.round(totalIBU),
      waterE: parseFloat(wE.toFixed(1)),
      waterR: parseFloat(((config.volume * 1.1) - (wE - maltWeight)).toFixed(1)),
      sugarTotal: config.volume * config.sugarPerL
    });
  }, [steps, config]);

  // --- SAUVEGARDE POUR LES POTES ---
  const pushToPotes = async () => {
    setLoading(true);
    const { error } = await supabase.from("recipes").insert([{
      data: {
        name: recipeName.toUpperCase(),
        target_volume: config.volume,
        stats: stats,
        steps: steps // Ils reçoivent la timeline déjà prête
      }
    }]);
    if (!error) alert("🚀 RECETTE DISPONIBLE CÔTÉ POTES");
    setLoading(false);
  };

  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
        <div style={badge}>SUPER_LABO_V3</div>
        <input value={recipeName} onChange={e => setRecipeName(e.target.value)} style={mainTitle} />
      </header>

      <div style={grid}>
        <div style={mainPanel}>
          {/* SECTION : ESTIMATIONS TEMPS RÉEL */}
          <div style={statsGrid}>
            <StatCard label="ALCOOL" val={stats.abv + "%"} color="#f39c12" />
            <StatCard label="AMERTUME" val={stats.ibu + " IBU"} color="#27ae60" />
            <StatCard label="COULEUR" val={stats.ebc + " EBC"} color="#e67e22" />
            <StatCard label="EAU TOTAL" val={(stats.waterE + stats.waterR).toFixed(1) + " L"} />
          </div>

          {/* TIMELINE DE CONSTRUCTION */}
          {steps.map((step, i) => (
            <div key={step.id} style={stepBox}>
              <div style={stepHead}>
                <span style={stepNum}>0{i+1}</span>
                <input value={step.label} onChange={e => {const n=[...steps]; n[i].label=e.target.value; setSteps(n)}} style={stepLabel} />
                <div style={btnGrp}>
                  <button onClick={() => addIng(i, "MALT")} style={miniBtn}>+ MALT</button>
                  <button onClick={() => addIng(i, "HOP")} style={miniBtn}>+ HOP</button>
                  <button onClick={() => addIng(i, "YEAST")} style={miniBtn}>+ LEVURE</button>
                </div>
              </div>

              {step.ingredients.map((ing, idx) => (
                <div key={idx} style={ingLine}>
                  <select style={ingSelect} onChange={e => updateIng(i, idx, e.target.value)}>
                    <option>SÉLECTIONNER</option>
                    {dbIngredients.filter(x => x.type === ing.type).map(x => <option key={x.id}>{x.name}</option>)}
                  </select>
                  <input type="number" placeholder="QTÉ" style={ingInput} onChange={e => {const n=[...steps]; n[i].ingredients[idx].qty = +e.target.value; setSteps(n)}} />
                  {ing.type === "HOP" && <input type="number" placeholder="MIN" style={ingInput} onChange={e => {const n=[...steps]; n[i].ingredients[idx].time = +e.target.value; setSteps(n)}} />}
                </div>
              ))}
            </div>
          ))}
        </div>

        <div style={sidePanel}>
          <div style={{...beerColor, backgroundColor: getBeerColor(stats.ebc)}} />
          
          <div style={configCard}>
            <h4 style={cardTitle}>PARAMÈTRES SYSTÈME</h4>
            <div style={field}><label>VOLUME CIBLE</label><input type="number" value={config.volume} onChange={e => setConfig({...config, volume: +e.target.value})} /></div>
            <div style={field}><label>EFFICACITÉ %</label><input type="number" value={config.efficiency} onChange={e => setConfig({...config, efficiency: +e.target.value})} /></div>
            <div style={field}><label>SUCRE EMBOUT. (g/L)</label><input type="number" value={config.sugarPerL} onChange={e => setConfig({...config, sugarPerL: +e.target.value})} /></div>
          </div>

          <div style={calcBox}>
             <div style={calcLine}><span>Eau Empâtage :</span> <strong>{stats.waterE} L</strong></div>
             <div style={calcLine}><span>Eau Rinçage :</span> <strong>{stats.waterR} L</strong></div>
             <div style={calcLine}><span>Sucre total :</span> <strong>{stats.sugarTotal} g</strong></div>
          </div>

          <button onClick={pushToPotes} disabled={loading} style={pushBtn}>
            {loading ? "TRANSFERT..." : "DÉPLOYER CHEZ LES POTES"}
          </button>
        </div>
      </div>
    </div>
  );

  function addIng(sIdx: number, type: string) {
    const n = [...steps];
    n[sIdx].ingredients.push({ type, name: "", qty: 0, time: 60 });
    setSteps(n);
  }

  function updateIng(sIdx: number, iIdx: number, name: string) {
    const ref = dbIngredients.find(x => x.name === name);
    const n = [...steps];
    n[sIdx].ingredients[iIdx] = { ...n[sIdx].ingredients[iIdx], name, ebc: ref.potency, yield: ref.yield, alpha: ref.potency, potency: ref.potency };
    setSteps(n);
  }
}

// --- STYLES "LABO" ---
const StatCard = ({label, val, color="#fff"}: any) => (
    <div style={{background: '#111', padding: '15px', border: '1px solid #222', borderRadius: '4px'}}>
        <div style={{fontSize: '9px', color: '#444', marginBottom: '5px'}}>{label}</div>
        <div style={{fontSize: '20px', fontWeight: 'bold', color}}>{val}</div>
    </div>
);

const containerStyle = { padding: "40px", backgroundColor: "#020202", color: "#eee", minHeight: "100vh", fontFamily: "'Inter', monospace" };
const headerStyle = { marginBottom: "40px", borderLeft: "4px solid #f39c12", paddingLeft: "20px" };
const badge = { fontSize: "10px", color: "#f39c12", fontWeight: "bold", letterSpacing: "2px" };
const mainTitle = { background: "transparent", border: "none", color: "#fff", fontSize: "2.5rem", fontWeight: "900", outline: "none", width: "100%" };
const grid = { display: "grid", gridTemplateColumns: "1fr 340px", gap: "40px" };
const statsGrid = { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "15px", marginBottom: "30px" };
const mainPanel = { display: "flex", flexDirection: "column" as const, gap: "15px" };
const stepBox = { background: "#0a0a0a", border: "1px solid #111", padding: "20px" };
const stepHead = { display: "flex", alignItems: "center", gap: "15px", marginBottom: "15px" };
const stepNum = { fontSize: "24px", fontWeight: "900", color: "#111", WebkitTextStroke: "1px #222" };
const stepLabel = { background: "transparent", border: "none", color: "#fff", fontSize: "16px", fontWeight: "bold", flex: 1, outline: "none" };
const btnGrp = { display: "flex", gap: "8px" };
const miniBtn = { background: "#151515", border: "1px solid #222", color: "#666", fontSize: "9px", padding: "5px 10px", cursor: "pointer" };
const ingLine = { display: "flex", gap: "10px", marginTop: "8px", background: "#050505", padding: "10px" };
const ingSelect = { background: "transparent", border: "none", color: "#888", flex: 1, fontSize: "13px" };
const ingInput = { background: "#000", border: "1px solid #222", color: "#f39c12", width: "70px", textAlign: "center" as const, padding: "5px" };
const sidePanel = { position: "sticky" as const, top: "40px", height: "fit-content" };
const beerColor = { height: "150px", border: "1px solid #222", marginBottom: "20px" };
const configCard = { background: "#0a0a0a", padding: "20px", border: "1px solid #111" };
const cardTitle = { fontSize: "11px", color: "#444", marginBottom: "20px", letterSpacing: "1px" };
const field = { marginBottom: "15px", display: "flex", flexDirection: "column" as const, gap: "5px" };
const labelStyle = { fontSize: "9px", color: "#444" };
const sideInput = { background: "#000", border: "1px solid #222", color: "#fff", padding: "10px" };
const calcBox = { marginTop: "20px", padding: "15px", background: "#111", border: "1px solid #f39c1233" };
const calcLine = { display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "5px" };
const pushBtn = { width: "100%", padding: "20px", background: "#f39c12", color: "#000", border: "none", fontWeight: "900", marginTop: "20px", cursor: "pointer" };

function getBeerColor(ebc: number) {
    if (ebc <= 8) return "#F5F75C";
    if (ebc <= 15) return "#F1C40F";
    if (ebc <= 25) return "#D4AC0D";
    if (ebc <= 40) return "#8D4C17";
    return "#1A0506";
}