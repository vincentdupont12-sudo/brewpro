"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabaseClient";

const noSpinnersStyle = `
  input::-webkit-outer-spin-button,
  input::-webkit-inner-spin-button { -webkit-appearance: none !important; margin: 0 !important; }
  input[type=number] { -moz-appearance: textfield !important; }
`;

export default function SuperLaboPage() {
  const [dbIngredients, setDbIngredients] = useState<any[]>([]);
  const [recipeName, setRecipeName] = useState("NOUVELLE_RECETTE");
  const [loading, setLoading] = useState(false);
  const [isFixedMode, setIsFixedMode] = useState(true);

  const [config, setConfig] = useState({
    volume: 20,
    efficiency: 75,
    mashTemp: 67,
    sugarPerL: 6,
  });

  const [steps, setSteps] = useState([
    { id: "s1", type: "ACTION", label: "CONCASSAGE", ingredients: [] as any[] },
    { id: "s2", type: "PALIER", label: "EMPÂTAGE", ingredients: [] as any[] },
    { id: "s3", type: "ACTION", label: "RINÇAGE", ingredients: [] as any[] },
    { id: "s4", type: "ACTION", label: "ÉBULLITION", ingredients: [] as any[] },
    { id: "s5", type: "ACTION", label: "FERMENTATION", ingredients: [] as any[] },
    { id: "s6", type: "ACTION", label: "REFERMENTATION EN BOUTEILLE", ingredients: [] as any[] },
  ]);

  const [stats, setStats] = useState({ abv: 0, ebc: 0, ibu: 0, og: 1.0, waterE: 0, waterR: 0, sugarTotal: 0, maltTotal: 0 });

  useEffect(() => {
    const fetchRefs = async () => {
      const { data } = await supabase.from("ingredient_refs").select("*");
      if (data) setDbIngredients(data);
    };
    fetchRefs();
  }, []);

  const stopWheel = (e: any) => e.target.blur();

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
      sugarTotal: parseFloat((calcVol * config.sugarPerL).toFixed(1)),
      maltTotal: parseFloat(maltWeight.toFixed(2))
    });
  }, [steps, config, isFixedMode]);

  const addIng = (sIdx: number, type: string) => {
    const n = [...steps];
    n[sIdx].ingredients.push({ id: Date.now(), type, name: "", qty: 0, time: 60, alpha: 0, ebc: 0, yield: 0, potency: 75 });
    setSteps(n);
  };

  const updateIng = (sIdx: number, iIdx: number, name: string) => {
    const ref = dbIngredients.find(x => x.name === name);
    if (!ref) return;
    const n = [...steps];
    n[sIdx].ingredients[iIdx] = { ...n[sIdx].ingredients[iIdx], name, ebc: ref.potency, yield: ref.yield, alpha: ref.potency, potency: ref.potency };
    setSteps(n);
  };

  const saveRecipe = async () => {
    setLoading(true);
    const payload = { name: recipeName.toUpperCase(), is_fixed_20l: isFixedMode, stats, config, steps };
    const { error } = await supabase.from("recipes").insert([{ data: payload }]);
    if (error) alert("ERREUR: " + error.message);
    else alert("🚀 RECETTE DÉPLOYÉE");
    setLoading(false);
  };

  return (
    <div style={containerStyle}>
      <style>{noSpinnersStyle}</style>
      
      <header style={headerStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <input value={recipeName} onChange={e => setRecipeName(e.target.value)} style={mainTitle} />
          <div style={modeToggle} onClick={() => setIsFixedMode(!isFixedMode)}>
            {isFixedMode ? "🔒 FIXE 20L" : "⚖️ DYNAMIQUE"}
          </div>
        </div>
        <div style={statsGrid}>
          <StatCard label="ABV" val={stats.abv + "%"} color="#f39c12" />
          <StatCard label="IBU" val={stats.ibu} color="#27ae60" />
          <StatCard label="EBC" val={stats.ebc} color="#e67e22" />
          <StatCard label="OG" val={stats.og} />
          <StatCard label="MALT TOTAL" val={stats.maltTotal + "kg"} />
          <StatCard label="SUCRE TOTAL" val={stats.sugarTotal + "g"} />
        </div>
      </header>

      <div style={grid}>
        <main style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {steps.map((step, i) => {
            const label = step.label.toUpperCase();
            const isConcassage = label.includes("CONCASSAGE");
            const isEmpatage = label.includes("EMPÂTAGE");
            const isRincage = label.includes("RINÇAGE");
            const isEbullition = label.includes("ÉBULLITION");
            const isFermentation = label.includes("FERMENTATION") && !label.includes("BOUTEILLE");
            const isBouteille = label.includes("BOUTEILLE");

            return (
              <div key={step.id} style={stepBox}>
                <div style={stepHead}>
                  <div style={stepLabel}>{step.label}</div>
                  <div style={btnGrp}>
                    {isConcassage && <button onClick={() => addIng(i, "MALT")} style={addBtn}>+ MALT</button>}
                    {isEbullition && <button onClick={() => addIng(i, "HOP")} style={addBtn}>+ HOUBLON</button>}
                    {isFermentation && <button onClick={() => addIng(i, "YEAST")} style={addBtn}>+ LEVURE</button>}
                    {isBouteille && <button onClick={() => addIng(i, "SUCRE")} style={addBtn}>+ SUCRE</button>}
                  </div>
                </div>

                {(isEmpatage || isRincage) && (
                  <div style={waterNotice}>
                    💧 EAU REQUISE : <span style={{color:'#f39c12'}}>{isEmpatage ? stats.waterE : stats.waterR} LITRES</span>
                  </div>
                )}

                {step.ingredients.map((ing, idx) => (
                  <div key={idx} style={ingLine}>
                    <select style={ingSelect} value={ing.name} onChange={e => updateIng(i, idx, e.target.value)}>
                      <option value="">SÉLECTIONNER...</option>
                      {dbIngredients.filter(x => x.type === ing.type).map(x => <option key={x.id} value={x.name}>{x.name}</option>)}
                    </select>
                    <div style={unitWrapper}>
                      <input type="number" style={ingInput} value={ing.qty} onWheel={stopWheel} onChange={e => {const n=[...steps]; n[i].ingredients[idx].qty = e.target.value; setSteps(n)}} />
                      <span style={unitTag}>{ing.type === "MALT" || ing.type === "SUCRE" ? "KG" : "G"}</span>
                    </div>
                    {ing.type === "HOP" && (
                      <div style={unitWrapper}>
                        <input type="number" style={ingInput} value={ing.time} onWheel={stopWheel} onChange={e => {const n=[...steps]; n[i].ingredients[idx].time = e.target.value; setSteps(n)}} />
                        <span style={unitTag}>MIN</span>
                      </div>
                    )}
                    <button onClick={() => {const n=[...steps]; n[i].ingredients.splice(idx, 1); setSteps(n)}} style={delBtn}>×</button>
                  </div>
                ))}
              </div>
            );
          })}
        </main>

        <aside>
          <div style={{...beerColor, backgroundColor: getBeerColor(stats.ebc)}} />
          <div style={configCard}>
            <div style={field}><label style={labelStyle}>VOLUME FINAL (L)</label>
              <input type="number" disabled={isFixedMode} value={isFixedMode ? 20 : config.volume} onChange={e => setConfig({...config, volume: +e.target.value})} style={sideInput} />
            </div>
            <div style={field}><label style={labelStyle}>EFFICACITÉ (%)</label>
              <input type="number" value={config.efficiency} onChange={e => setConfig({...config, efficiency: +e.target.value})} style={sideInput} />
            </div>
            <div style={field}><label style={labelStyle}>SUCRE EMBOUT. (g/L)</label>
              <input type="number" value={config.sugarPerL} onChange={e => setConfig({...config, sugarPerL: +e.target.value})} style={sideInput} />
            </div>
          </div>
          <button onClick={saveRecipe} disabled={loading} style={pushBtn}>{loading ? "SYCHRONISATION..." : "ENVOYER AUX POTES"}</button>
        </aside>
      </div>
    </div>
  );
}

const StatCard = ({label, val, color="#fff"}: any) => (
  <div style={{background: '#0a0a0a', padding: '10px', border: '1px solid #111', textAlign: 'center' as const}}>
    <div style={{fontSize: '8px', color: '#444', marginBottom: '2px', letterSpacing:'1px'}}>{label}</div>
    <div style={{fontSize: '16px', fontWeight: 'bold', color}}>{val}</div>
  </div>
);

const containerStyle = { padding: "30px", backgroundColor: "#020202", color: "#eee", minHeight: "100vh", fontFamily: "monospace" };
const headerStyle = { marginBottom: "25px", borderBottom: "1px solid #111", paddingBottom: "15px" };
const mainTitle = { background: "transparent", border: "none", color: "#fff", fontSize: "1.8rem", fontWeight: "900", outline: "none", flex: 1 };
const statsGrid = { display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "10px", marginTop: "15px" };
const modeToggle = { padding: "6px 12px", background: "#111", border: "1px solid #333", cursor: "pointer", fontSize: "9px", borderRadius: "2px" };
const grid = { display: "grid", gridTemplateColumns: "1fr 280px", gap: "25px" };
const stepBox = { background: "#080808", border: "1px solid #111", padding: "15px" };
const stepHead = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" };
const stepLabel = { color: "#f39c12", fontSize: "12px", fontWeight: "bold", letterSpacing: "1px" };
const btnGrp = { display: "flex", gap: "8px" };
const addBtn = { background: "#111", border: "1px solid #222", color: "#666", fontSize: "8px", padding: "4px 8px", cursor: "pointer" };
const waterNotice = { padding: "10px", background: "#000", border: "1px dashed #222", fontSize: "11px", marginBottom: "10px", textAlign: "center" as const };
const ingLine = { display: "flex", gap: "10px", marginTop: "5px", background: "#040404", padding: "6px", alignItems: "center" };
const ingSelect = { background: "transparent", border: "none", color: "#999", flex: 1, fontSize: "11px", outline: "none" };
const unitWrapper = { display: "flex", alignItems: "center", background: "#000", border: "1px solid #111", paddingRight: "5px" };
const ingInput = { background: "transparent", border: "none", color: "#f39c12", width: "45px", textAlign: "center" as const, fontSize: "12px", padding: "4px" };
const unitTag = { fontSize: "8px", color: "#333" };
const delBtn = { background: "none", border: "none", color: "#333", cursor: "pointer", fontSize: "14px" };
const beerColor = { height: "100px", border: "1px solid #111", marginBottom: "15px" };
const configCard = { background: "#0a0a0a", padding: "15px", border: "1px solid #111" };
const field = { marginBottom: "12px" };
const labelStyle = { fontSize: "8px", color: "#444", display: "block", marginBottom: "4px" };
const sideInput = { background: "#000", border: "1px solid #222", color: "#fff", width: "100%", padding: "8px", fontSize: "11px" };
const pushBtn = { width: "100%", padding: "15px", background: "#f39c12", color: "#000", border: "none", fontWeight: "900", marginTop: "15px", cursor: "pointer", fontSize: "10px" };

function getBeerColor(ebc: number) {
  if (ebc <= 8) return "#F5F75C";
  if (ebc <= 15) return "#F1C40F";
  if (ebc <= 25) return "#D4AC0D";
  if (ebc <= 40) return "#8D4C17";
  return "#1A0506";
}