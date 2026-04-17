"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabaseClient";

const noSpinnersStyle = `
  input::-webkit-outer-spin-button,
  input::-webkit-inner-spin-button { -webkit-appearance: none !important; margin: 0 !important; }
  input[type=number] { -moz-appearance: textfield !important; }
  select { cursor: pointer; }
`;

export default function SuperLaboPage() {
  const [dbIngredients, setDbIngredients] = useState<any[]>([]);
  const [recipeName, setRecipeName] = useState("NOUVELLE_RECETTE");
  const [loading, setLoading] = useState(false);
  const [isFixedMode, setIsFixedMode] = useState(true);

  const [config, setConfig] = useState({
    volume: 20,
    efficiency: 75,
    sugarPerL: 6,
  });

  const [steps, setSteps] = useState([
    { id: "s1", label: "CONCASSAGE", ingredients: [] as any[] },
    { id: "s2", label: "EMPÂTAGE", temp: 67, ingredients: [] as any[] },
    { id: "s3", label: "RINÇAGE", temp: 78, ingredients: [] as any[] },
    { id: "s4", label: "ÉBULLITION", ingredients: [] as any[] },
    { id: "s5", label: "FERMENTATION", temp: 20, ingredients: [] as any[] },
    { id: "s6", label: "REFERMENTATION EN BOUTEILLE", ingredients: [] as any[] },
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
    n[sIdx].ingredients.push({ id: Date.now(), type, name: "", qty: 0, time: 60, alpha: 0, ebc: 0 });
    setSteps(n);
  };

  const updateIng = (sIdx: number, iIdx: number, name: string) => {
    const ref = dbIngredients.find(x => x.name === name);
    if (!ref) return;
    const n = [...steps];
    n[sIdx].ingredients[iIdx] = { ...n[sIdx].ingredients[iIdx], name, ebc: ref.potency, yield: ref.yield, alpha: ref.potency };
    setSteps(n);
  };

  const saveRecipe = async () => {
    setLoading(true);
    const payload = { name: recipeName.toUpperCase(), is_fixed_20l: isFixedMode, stats, config, steps };
    const { error } = await supabase.from("recipes").insert([{ data: payload }]);
    if (error) alert("ERREUR: " + error.message);
    else alert("🚀 RECETTE ENVOYÉE AUX POTES");
    setLoading(false);
  };

  return (
    <div style={containerStyle}>
      <style>{noSpinnersStyle}</style>
      
      <header style={headerStyle}>
        <input value={recipeName} onChange={e => setRecipeName(e.target.value)} style={mainTitle} />
        <div style={modeToggle} onClick={() => setIsFixedMode(!isFixedMode)}>
          {isFixedMode ? "🔒 MODE FIXE 20L" : "⚖️ MODE DYNAMIQUE"}
        </div>
        <div style={statsGrid}>
          <StatCard label="ABV" val={stats.abv + "%"} color="#f39c12" />
          <StatCard label="IBU" val={stats.ibu} color="#27ae60" />
          <StatCard label="EBC" val={stats.ebc} color="#e67e22" />
          <StatCard label="EAU EMP." val={stats.waterE + "L"} />
          <StatCard label="EAU RIN." val={stats.waterR + "L"} />
          <StatCard label="SUCRE" val={stats.sugarTotal + "g"} />
        </div>
      </header>

      <div style={mobileWrapper}>
        <main style={mainContainer}>
          {steps.map((step, i) => {
            const label = step.label.toUpperCase();
            const isConcassage = label.includes("CONCASSAGE");
            const isEmpatage = label.includes("EMPÂTAGE");
            const isRincage = label.includes("RINÇAGE");
            const isEbullition = label.includes("ÉBULLITION");
            const isFermentation = label.includes("FERMENTATION") && !label.includes("BOUTEILLE");
            const isBouteille = label.includes("BOUTEILLE");
            const hasTemp = isEmpatage || isRincage || isFermentation;

            return (
              <div key={step.id} style={stepBox}>
                <div style={stepHead}>
                  <div style={stepLabel}>{step.label}</div>
                  {hasTemp && (
                    <div style={tempBadge}>
                      <input type="number" style={tempInput} value={step.temp} onWheel={stopWheel} onChange={e => {const n=[...steps]; n[i].temp = e.target.value; setSteps(n)}} />
                      <span>°C</span>
                    </div>
                  )}
                </div>

                <div style={btnRow}>
                  {isConcassage && <button onClick={() => addIng(i, "MALT")} style={addBtn}>+ MALT</button>}
                  {(isEmpatage || isRincage) && <button onClick={() => addIng(i, "SALT")} style={addBtn}>+ SELS</button>}
                  {isEbullition && <><button onClick={() => addIng(i, "HOP")} style={addBtn}>+ HOUBLON</button> <button onClick={() => addIng(i, "SALT")} style={addBtn}>+ SELS</button></>}
                  {isFermentation && <button onClick={() => addIng(i, "YEAST")} style={addBtn}>+ LEVURE</button>}
                  {isBouteille && <button onClick={() => addIng(i, "SUCRE")} style={addBtn}>+ SUCRE</button>}
                </div>

                {step.ingredients.map((ing, idx) => (
                  <div key={idx} style={ingCard}>
                    <select style={ingSelect} value={ing.name} onChange={e => updateIng(i, idx, e.target.value)}>
                      <option value="">CHOISIR {ing.type}...</option>
                      {dbIngredients.filter(x => x.type === ing.type).map(x => <option key={x.id} value={x.name}>{x.name}</option>)}
                    </select>
                    <div style={{display:'flex', justifyContent:'space-between', width:'100%', alignItems:'center'}}>
                       <div style={unitBox}>
                        <input type="number" style={ingInput} value={ing.qty} onWheel={stopWheel} onChange={e => {const n=[...steps]; n[i].ingredients[idx].qty = e.target.value; setSteps(n)}} />
                        <span style={unitLabel}>{ing.type === "MALT" || ing.type === "SUCRE" ? "KG" : "G"}</span>
                      </div>
                      {ing.type === "HOP" && (
                        <div style={unitBox}>
                          <input type="number" style={ingInput} value={ing.time} onWheel={stopWheel} onChange={e => {const n=[...steps]; n[i].ingredients[idx].time = e.target.value; setSteps(n)}} />
                          <span style={unitLabel}>MIN</span>
                        </div>
                      )}
                      <button onClick={() => {const n=[...steps]; n[i].ingredients.splice(idx, 1); setSteps(n)}} style={delBtn}>SUPPR.</button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </main>

        <aside style={sideContainer}>
          <div style={{...beerPreview, backgroundColor: getBeerColor(stats.ebc)}} />
          <div style={configBox}>
            <label style={cfgLabel}>VOLUME CIBLE (L)</label>
            <input type="number" disabled={isFixedMode} value={isFixedMode ? 20 : config.volume} onChange={e => setConfig({...config, volume: +e.target.value})} style={cfgInput} />
            
            <label style={cfgLabel}>EFFICACITÉ (%)</label>
            <input type="number" value={config.efficiency} onChange={e => setConfig({...config, efficiency: +e.target.value})} style={cfgInput} />
          </div>
          <button onClick={saveRecipe} disabled={loading} style={saveBtn}>{loading ? "ENVOI..." : "DÉPLOYER LA RECETTE"}</button>
        </aside>
      </div>
    </div>
  );
}

// --- STYLES MOBILE-FIRST ---
const containerStyle = { padding: "15px", backgroundColor: "#020202", color: "#eee", minHeight: "100vh", fontFamily: "monospace" };