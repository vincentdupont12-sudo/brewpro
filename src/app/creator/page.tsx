"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabaseClient";

const noSpinnersStyle = `
  input::-webkit-outer-spin-button,
  input::-webkit-inner-spin-button { -webkit-appearance: none !important; margin: 0 !important; }
  input[type=number] { -moz-appearance: textfield !important; }
  textarea { resize: none; }
`;

export default function SuperLaboPage() {
  const [dbIngredients, setDbIngredients] = useState<any[]>([]);
  const [recipeName, setRecipeName] = useState("NOUVELLE_RECETTE");
  const [loading, setLoading] = useState(false);
  const [isFixedMode, setIsFixedMode] = useState(true);
  const [showPHModal, setShowPHModal] = useState<number | null>(null);

  const [config, setConfig] = useState({
    volume: 20,
    efficiency: 75,
    sugarPerL: 6,
  });

  const [steps, setSteps] = useState([
    { id: "s1", label: "CONCASSAGE", ingredients: [] as any[] },
    { id: "s2", label: "EMPÂTAGE", temp: 67, phNote: "", lastPH: "", ingredients: [] as any[] },
    { id: "s3", label: "RINÇAGE", temp: 78, phNote: "", lastPH: "", ingredients: [] as any[] },
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

  const saveRecipe = async () => {
    setLoading(true);
    const payload = { name: recipeName.toUpperCase(), is_fixed_20l: isFixedMode, stats, config, steps };
    const { error } = await supabase.from("recipes").insert([{ data: payload }]);
    if (error) alert("ERREUR: " + error.message);
    else alert("🚀 RECETTE ENVOYÉE AUX POTES");
    setLoading(false);
  };

  // --- COMPOSANT ASSISTANT PH ---
  const PHAssistant = () => {
    if (showPHModal === null) return null;
    const step = steps[showPHModal];
    const [measuredPH, setMeasuredPH] = useState(step.lastPH || "");
    const [phNote, setPhNote] = useState(step.phNote || "");
    const ph = parseFloat(measuredPH);
    const diff = ph - 5.4;

    return (
      <div style={modalOverlay}>
        <div style={modalContent}>
          <div style={{display:'flex', justifyContent:'space-between'}}>
            <h3 style={{color: '#f39c12', fontSize: '14px', margin:0}}>ASSISTANT pH</h3>
            <button onClick={() => setShowPHModal(null)} style={{background:'none', border:'none', color:'#444'}}>✕</button>
          </div>
          
          <p style={{fontSize:'10px', color:'#444', marginBottom:'15px'}}>{step.label}</p>

          <label style={cfgLabel}>MESURE DU pH-MÈTRE</label>
          <input type="number" step="0.01" style={cfgInput} value={measuredPH} onChange={(e) => setMeasuredPH(e.target.value)} placeholder="ex: 5.85" />

          {ph > 5.4 ? (
            <div style={recoBox}>
              <p style={{fontSize: '9px', color: '#666', marginBottom: '8px'}}>CORRECTION POUR {isFixedMode ? 20 : config.volume}L :</p>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
                <div style={{...choiceCard, borderColor:'#3498db'}}>
                  <span style={{fontSize:'7px', display:'block'}}>LACTIQUE (80%)</span>
                  <strong style={{fontSize:'14px', color:'#3498db'}}>{(diff * 12).toFixed(1)} ml</strong>
                </div>
                <div style={{...choiceCard, borderColor:'#9b59b6'}}>
                  <span style={{fontSize:'7px', display:'block'}}>PHOSPHO (10%)</span>
                  <strong style={{fontSize:'14px', color:'#9b59b6'}}>{(diff * 25).toFixed(1)} ml</strong>
                </div>
              </div>
              <p style={{fontSize:'8px', color:'#444', marginTop:'10px'}}>💡 Gypse recommandé si besoin de Calcium.</p>
            </div>
          ) : measuredPH && <div style={{textAlign:'center', color:'#27ae60', padding:'10px', fontSize:'12px'}}>✅ pH DANS LA CIBLE</div>}

          <label style={cfgLabel}>NOTES DE RÉPÉTABILITÉ</label>
          <textarea style={noteArea} value={phNote} onChange={(e) => setPhNote(e.target.value)} placeholder="Saisir les ajouts réels pour la prochaine fois..." />

          <button style={saveBtn} onClick={() => {
            const n = [...steps];
            n[showPHModal].phNote = phNote;
            n[showPHModal].lastPH = measuredPH;
            setSteps(n);
            setShowPHModal(null);
          }}>ENREGISTRER</button>
        </div>
      </div>
    );
  };

  return (
    <div style={containerStyle}>
      <style>{noSpinnersStyle}</style>
      <PHAssistant />
      
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
                  <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
                    {(isEmpatage || isRincage) && (
                      <button onClick={() => setShowPHModal(i)} style={{...phBtn, borderColor: step.phNote ? '#27ae60' : '#333'}}>
                        {step.phNote ? "✅ pH" : "🧪 pH"}
                      </button>
                    )}
                    {hasTemp && (
                      <div style={tempBadge}>
                        <input type="number" style={tempInput} value={step.temp} onWheel={stopWheel} onChange={e => {const n=[...steps]; n[i].temp = e.target.value; setSteps(n)}} />
                        <span>°C</span>
                      </div>
                    )}
                  </div>
                </div>

                <div style={btnRow}>
                  {isConcassage && <button onClick={() => {const n=[...steps]; n[i].ingredients.push({id:Date.now(), type:"MALT", name:"", qty:0}); setSteps(n)}} style={addBtn}>+ MALT</button>}
                  {(isEmpatage || isRincage) && <button onClick={() => {const n=[...steps]; n[i].ingredients.push({id:Date.now(), type:"SALT", name:"", qty:0}); setSteps(n)}} style={addBtn}>+ SELS</button>}
                  {isEbullition && <><button onClick={() => {const n=[...steps]; n[i].ingredients.push({id:Date.now(), type:"HOP", name:"", qty:0, alpha:0, time:60}); setSteps(n)}} style={addBtn}>+ HOUBLON</button> <button onClick={() => {const n=[...steps]; n[i].ingredients.push({id:Date.now(), type:"SALT", name:"", qty:0}); setSteps(n)}} style={addBtn}>+ SELS</button></>}
                  {isFermentation && <button onClick={() => {const n=[...steps]; n[i].ingredients.push({id:Date.now(), type:"YEAST", name:"", qty:0}); setSteps(n)}} style={addBtn}>+ LEVURE</button>}
                  {isBouteille && <button onClick={() => {const n=[...steps]; n[i].ingredients.push({id:Date.now(), type:"SUCRE", name:"", qty:0}); setSteps(n)}} style={addBtn}>+ SUCRE</button>}
                </div>

                {step.ingredients.map((ing, idx) => (
                  <div key={idx} style={ingCard}>
                    <select style={ingSelect} value={ing.name} onChange={e => updateIng(i, idx, e.target.value)}>
                      <option value="">CHOISIR {ing.type}...</option>
                      {dbIngredients.filter(x => x.type === ing.type).map(x => <option key={x.id} value={x.name}>{x.name}</option>)}
                    </select>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
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
                      <button onClick={() => {const n=[...steps]; n[i].ingredients.splice(idx, 1); setSteps(n)}} style={delBtn}>✕</button>
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
            <label style={cfgLabel}>VOLUME (L)</label>
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
const headerStyle = { marginBottom: "20px", textAlign: "center" as const };
const mainTitle = { background: "transparent", border: "none", color: "#fff", fontSize: "1.4rem", fontWeight: "900", textAlign: "center" as const, width: "100%", marginBottom: "5px" };
const modeToggle = { padding: "6px 12px", background: "#111", fontSize: "9px", border: "1px solid #333", borderRadius: "4px", display: "inline-block", cursor: "pointer" };
const statsGrid = { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "5px", marginTop: "15px" };
const mobileWrapper = { display: "flex", flexDirection: "column" as const, gap: "15px", maxWidth: "500px", margin: "0 auto" };
const mainContainer = { display: "flex", flexDirection: "column" as const, gap: "10px" };
const stepBox = { background: "#0a0a0a", border: "1px solid #151515", padding: "12px", borderRadius: "8px" };
const stepHead = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" };
const stepLabel = { color: "#f39c12", fontSize: "10px", fontWeight: "bold", letterSpacing: "1px" };
const phBtn = { background: "#000", border: "1px solid #333", color: "#888", fontSize: "9px", padding: "4px 8px", borderRadius: "4px" };
const tempBadge = { background: "#111", padding: "4px 8px", borderRadius: "4px", display: "flex", alignItems: "center", gap: "2px", fontSize: "11px" };
const tempInput = { background: "transparent", border: "none", color: "#fff", width: "30px", textAlign: "center" as const };
const btnRow = { display: "flex", gap: "6px", marginBottom: "10px", flexWrap: "wrap" as const };
const addBtn = { background: "#1a1a1a", border: "1px solid #333", color: "#666", fontSize: "8px", padding: "5px 8px", borderRadius: "4px" };
const ingCard = { background: "#040404", padding: "8px", borderRadius: "6px", marginBottom: "6px", border: "1px solid #111" };
const ingSelect = { background: "transparent", border: "none", color: "#fff", width: "100%", fontSize: "12px", marginBottom: "5px" };
const unitBox = { background: "#111", padding: "3px 6px", borderRadius: "4px", display: "flex", alignItems: "center", border: "1px solid #222" };
const ingInput = { background: "transparent", border: "none", color: "#f39c12", width: "40px", textAlign: "center" as const, fontSize: "13px" };
const unitLabel = { fontSize: "8px", color: "#333", marginLeft: "3px" };
const delBtn = { color: "#333", border: "none", background: "none", fontSize: "12px" };
const sideContainer = { display: "flex", flexDirection: "column" as const, gap: "15px", paddingBottom: "30px" };
const beerPreview = { height: "50px", borderRadius: "6px", border: "1px solid #222" };
const configBox = { background: "#0a0a0a", padding: "12px", borderRadius: "8px", border: "1px solid #111" };
const cfgLabel = { fontSize: "8px", color: "#444", display: "block", marginBottom: "3px" };
const cfgInput = { background: "#000", border: "1px solid #222", color: "#fff", width: "100%", padding: "10px", marginBottom: "10px", borderRadius: "4px", fontSize: "13px" };
const saveBtn = { background: "#f39c12", color: "#000", border: "none", padding: "16px", fontWeight: "900", borderRadius: "8px", fontSize: "12px", cursor: "pointer" };
const modalOverlay = { position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' };
const modalContent = { background: '#0a0a0a', border: '1px solid #333', padding: '20px', borderRadius: '12px', width: '100%', maxWidth: '350px' };
const recoBox = { margin: '15px 0', padding: '10px', background: '#050505', borderRadius: '6px', border: '1px dashed #333' };
const choiceCard = { background: "#111", border: "1px solid #333", padding: "8px", borderRadius: "6px", textAlign: "center" as const };
const noteArea = { width: '100%', background: '#000', border: '1px solid #222', color: '#ccc', padding: '10px', fontSize: '11px', borderRadius: '4px', height: '60px', marginBottom: '15px', fontFamily: 'monospace' };

const StatCard = ({label, val, color="#fff"}: any) => (
  <div style={{background: '#0a0a0a', padding: '8px', border: '1px solid #111', textAlign: 'center' as const, borderRadius: '4px'}}>
    <div style={{fontSize: '7px', color: '#444', textTransform: 'uppercase'}}>{label}</div>
    <div style={{fontSize: '13px', fontWeight: 'bold', color}}>{val}</div>
  </div>
);

function getBeerColor(ebc: number) {
  if (ebc <= 8) return "#F5F75C";
  if (ebc <= 15) return "#F1C40F";
  if (ebc <= 25) return "#D4AC0D";
  if (ebc <= 40) return "#8D4C17";
  return "#1A0506";
}