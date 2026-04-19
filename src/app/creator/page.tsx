"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function SuperLaboUltime() {
  const [dbInventory, setDbInventory] = useState<any[]>([]);
  const [recipeName, setRecipeName] = useState("BRASSIN_V5_MASTER");
  const [volFinal, setVolFinal] = useState(20);
  const [resucrageDosage, setResucrageDosage] = useState(7);
  const [isSaving, setIsSaving] = useState(false);
  
  const [steps, setSteps] = useState<any[]>([
    { id: "s1", label: "CONCASSAGE", durationInMinutes: 0, remainingSeconds: 0, isRunning: false, ingredients: [] },
    { id: "m1", label: "EMPATAGE : PALIER_MASH", temp: 65, durationInMinutes: 60, remainingSeconds: 3600, isRunning: false, ingredients: [] },
    { id: "b1", label: "ÉBULLITION", durationInMinutes: 60, remainingSeconds: 3600, isRunning: false, ingredients: [] },
    { id: "f1", label: "FERMENTATION", durationInMinutes: 14400, remainingSeconds: 0, isRunning: false, ingredients: [] }, // 10 jours par défaut
  ]);

  const [stats, setStats] = useState({ abv: 0, ebc: 0, ibu: 0, maltTotal: 0, hopTotal: 0, waterE: 0, waterR: 0, sucreBouteille: 0 });

  const parseNum = (val: string) => parseFloat(val.replace(',', '.')) || 0;

  // --- CALCULS AUTOMATIQUES VOLUMES D'EAU ---
  // Empâtage : 3L d'eau par KG de grain
  // Rinçage : (Vol Final * 1.25) - (Eau Empâtage - Absorption grain [1L/kg])
  const calculateWater = (maltKg: number) => {
    const empatage = maltKg * 3;
    const rincage = (volFinal * 1.25) - (empatage - maltKg);
    return { empatage: parseFloat(empatage.toFixed(1)), rincage: parseFloat(Math.max(0, rincage).toFixed(1)) };
  };

  const getTempInfo = (temp: number) => {
    if (temp >= 45 && temp <= 55) return "PROTÉINIQUE : Tenue de mousse.";
    if (temp >= 60 && temp <= 65) return "BÊTA-AMYLASE : Bière sèche / Alcool.";
    if (temp >= 67 && temp <= 72) return "ALPHA-AMYLASE : Corps / Rondeur.";
    if (temp >= 75 && temp <= 78) return "MASH-OUT : Fin de brassage.";
    return "Palier personnalisé.";
  };

  useEffect(() => {
    const getInv = async () => {
      const { data } = await supabase.from('inventory').select('*').order('name');
      if (data) setDbInventory(data);
    };
    getInv();
  }, []);

  const runCalculations = useCallback(() => {
    let mTotal = 0, hTotal = 0, mcu = 0, ibuTotal = 0;
    steps.forEach(s => {
      s.ingredients.forEach((ing: any) => {
        if (ing.type === "MALT") {
          mTotal += ing.qty;
          mcu += (ing.qty * 2.204 * ((ing.ebc || 0) * 0.508)) / (volFinal * 0.264);
        }
        if (ing.type === "HOUBLON") {
          hTotal += ing.qty;
          ibuTotal += (ing.qty * (ing.alpha || 0) * 0.25) / (volFinal / 10);
        }
      });
    });

    const water = calculateWater(mTotal);
    setStats({
      maltTotal: mTotal, hopTotal: hTotal,
      ebc: Math.round(1.49 * Math.pow(mcu, 0.68) * 1.97) || 0,
      ibu: Math.round(ibuTotal) || 0,
      abv: parseFloat(((mTotal * 0.15) / (volFinal/20)).toFixed(1)),
      waterE: water.empatage,
      waterR: water.rincage,
      sucreBouteille: parseFloat((volFinal * resucrageDosage).toFixed(1))
    });
  }, [steps, volFinal, resucrageDosage]);

  useEffect(() => { runCalculations(); }, [runCalculations]);

  // Gestion des timers
  useEffect(() => {
    const interval = setInterval(() => {
      setSteps(prev => prev.map(s => (s.isRunning && s.remainingSeconds > 0) ? { ...s, remainingSeconds: s.remainingSeconds - 1 } : s));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const addMashStep = () => {
    const boilIdx = steps.findIndex(s => s.label.includes("ÉBULLITION"));
    const newSteps = [...steps];
    newSteps.splice(boilIdx, 0, { id: `m-${Date.now()}`, label: "PALIER_INTERMÉDIAIRE", temp: 68, durationInMinutes: 15, remainingSeconds: 900, isRunning: false, ingredients: [] });
    setSteps(newSteps);
  };

  const saveRecipe = async () => {
    setIsSaving(true);
    const { error } = await supabase.from('recipes').upsert({ 
      name: recipeName, 
      data: { steps_json: steps, stats_json: stats, config: { volFinal, resucrageDosage } } 
    }, { onConflict: 'name' });
    setIsSaving(false);
    alert(error ? "Erreur" : "✅ RECETTE ENVOYÉE");
  };

  return (
    <div className="min-h-screen bg-black text-white font-mono p-4 pb-48">
      
      {/* SECTION HEADER : CALCULS AUTO */}
      <header className="border-b border-zinc-800 pb-4 mb-8">
        <input className="bg-transparent text-3xl font-black outline-none mb-4 w-full text-yellow-500" value={recipeName} onChange={e => setRecipeName(e.target.value)} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="bg-zinc-950 p-3 border border-zinc-900">
                <span className="text-[7px] text-zinc-500 block uppercase">Eau Empâtage (3L/kg)</span>
                <span className="text-xl font-black text-blue-500">{stats.waterE} L</span>
            </div>
            <div className="bg-zinc-950 p-3 border border-zinc-900">
                <span className="text-[7px] text-zinc-500 block uppercase">Eau Rinçage</span>
                <span className="text-xl font-black text-cyan-400">{stats.waterR} L</span>
            </div>
            <div className="bg-zinc-950 p-3 border border-zinc-900">
                <span className="text-[7px] text-zinc-500 block uppercase">Houblon Conseillé</span>
                <span className="text-xl font-black text-green-600">~{volFinal * 4} G</span>
            </div>
            <div className="bg-zinc-900 p-3 border border-yellow-900/30">
                <span className="text-[7px] text-yellow-600 block uppercase italic font-black">Volume Final</span>
                <input type="text" className="bg-transparent text-xl font-black text-white w-full outline-none" value={volFinal} onChange={e => setVolFinal(parseNum(e.target.value))} />
            </div>
        </div>
      </header>

      {/* ÉTAPES */}
      <div className="space-y-4">
        {steps.map((step, sIdx) => (
          <div key={step.id} className="bg-zinc-950 border border-zinc-900 p-5">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-[10px] text-zinc-600 block mb-1 font-black italic">PHASE_0{sIdx+1}</span>
                <input className="bg-transparent font-black text-lg uppercase outline-none text-white focus:text-yellow-500" value={step.label} onChange={e => {const n=[...steps]; n[sIdx].label=e.target.value; setSteps(n)}} />
              </div>
              
              {/* TIMER RE-INTÉGRÉ */}
              {step.durationInMinutes > 0 && (
                <div className="bg-black border border-zinc-800 p-2 flex items-center gap-3">
                    <div className="text-lg font-black tabular-nums text-white">
                        {Math.floor(step.remainingSeconds/60)}:{String(step.remainingSeconds%60).padStart(2,'0')}
                    </div>
                    <button onClick={() => {const n=[...steps]; n[sIdx].isRunning=!n[sIdx].isRunning; setSteps(n)}} 
                        className={`px-3 py-1 text-[8px] font-black ${step.isRunning ? 'bg-red-600' : 'bg-green-600'} text-white`}>
                        {step.isRunning ? 'PAUSE' : 'PLAY'}
                    </button>
                </div>
              )}
            </div>

            {/* PARAMETRES TECHNIQUES */}
            {(step.label.includes("PALIER") || step.label.includes("MASH") || step.label.includes("ÉBULLITION") || step.label.includes("FERMENTATION")) && (
              <div className="grid grid-cols-2 gap-4 mb-4">
                {step.temp !== undefined && (
                   <div className="bg-zinc-900 p-2 border border-zinc-800">
                      <span className="text-[7px] text-zinc-500 block">TEMPÉRATURE (°C)</span>
                      <input type="text" className="bg-transparent font-black text-blue-400 outline-none w-full" value={step.temp} onChange={e => {const n=[...steps]; n[sIdx].temp=parseNum(e.target.value); setSteps(n)}} />
                      <p className="text-[7px] text-zinc-600 mt-1 italic">{getTempInfo(step.temp)}</p>
                   </div>
                )}
                <div className="bg-zinc-900 p-2 border border-zinc-800">
                    <span className="text-[7px] text-zinc-500 block">DURÉE ({step.label.includes("FERM") ? "JOURS" : "MIN"})</span>
                    <input type="text" className="bg-transparent font-black text-white outline-none w-full" value={step.durationInMinutes} 
                        onChange={e => {
                            const n=[...steps]; n[sIdx].durationInMinutes=parseNum(e.target.value); 
                            n[sIdx].remainingSeconds=step.label.includes("FERM") ? 0 : (n[sIdx].durationInMinutes*60); 
                            setSteps(n)
                        }} />
                </div>
              </div>
            )}

            {/* INGREDIENTS : FILTRAGE PAR TYPE */}
            <div className="space-y-2">
              <select className="w-full bg-zinc-900 border border-zinc-800 p-2 text-[9px] text-zinc-500 font-black outline-none"
                onChange={(e) => {
                  const item = dbInventory.find(i => i.name === e.target.value);
                  if (item) {
                    const n = [...steps];
                    n[sIdx].ingredients.push({ id: Date.now(), name: item.name, type: item.type, qty: 0, ebc: item.metadata?.ebc, alpha: item.metadata?.alpha });
                    setSteps(n);
                  }
                }}>
                <option value="">+ AJOUTER {step.label.includes("ÉBULLITION") ? "HOUBLONS" : step.label.includes("FERM") ? "LEVURE" : "MALTS"}</option>
                {dbInventory
                  .filter(i => {
                    if(step.label.includes("ÉBULLITION")) return i.type === "HOUBLON";
                    if(step.label.includes("FERM")) return i.type === "LEVURE";
                    return i.type === "MALT";
                  })
                  .map(i => <option key={i.id} value={i.name}>{i.name} ({i.type})</option>)
                }
              </select>

              {step.ingredients.map((ing: any, iIdx: number) => (
                <div key={ing.id} className="flex items-center gap-3 bg-black p-2 border border-zinc-900">
                  <span className="flex-1 text-[10px] font-black text-zinc-400">{ing.name}</span>
                  <input type="text" className="bg-transparent border-b border-zinc-800 w-12 text-right text-yellow-500 font-black outline-none" placeholder="0" 
                    onChange={e => {const n=[...steps]; n[sIdx].ingredients[iIdx].qty=parseNum(e.target.value); setSteps(n)}} />
                  <span className="text-[8px] text-zinc-600">{ing.type === 'MALT' ? 'KG' : 'G'}</span>
                  <button onClick={() => {const n=[...steps]; n[sIdx].ingredients.splice(iIdx,1); setSteps(n)}} className="text-red-900 font-black px-2">×</button>
                </div>
              ))}
              {step.label.includes("FERM") && <p className="text-[8px] text-green-800 font-black">CONSEIL LEVURE : {(volFinal * 0.5).toFixed(1)}G À {volFinal}G TOTAL</p>}
            </div>
            
            {/* BOUTON AJOUT PALIER INTERMEDIAIRE DANS LE BLOC EMPATAGE */}
            {step.label.includes("EMPATAGE") && (
                <button onClick={addMashStep} className="mt-4 w-full bg-zinc-900 border border-dashed border-zinc-700 py-2 text-[9px] font-black text-zinc-500 hover:text-white uppercase">
                    + Insérer Palier de température supplémentaire
                </button>
            )}
          </div>
        ))}
      </div>

      {/* FOOTER RÉCAPITULATIF STATS */}
      <footer className="fixed bottom-0 left-0 right-0 p-4 bg-black/90 backdrop-blur-md border-t border-zinc-800 z-50">
        <div className="max-w-xl mx-auto flex justify-between items-center gap-4">
            <div className="flex gap-4 overflow-x-auto pb-2">
                <div className="text-center"><span className="text-[7px] block text-zinc-500">ABV</span><span className="font-black">{stats.abv}%</span></div>
                <div className="text-center"><span className="text-[7px] block text-zinc-500">EBC</span><span className="font-black text-yellow-600">{stats.ebc}</span></div>
                <div className="text-center"><span className="text-[7px] block text-zinc-500">IBU</span><span className="font-black text-red-600">{stats.ibu}</span></div>
                <div className="text-center"><span className="text-[7px] block text-zinc-500">SUCRE</span><span className="font-black text-cyan-600">{stats.sucreBouteille}G</span></div>
            </div>
            <button disabled={isSaving} onClick={saveRecipe} 
                className={`px-8 py-4 ${isSaving ? 'bg-zinc-800' : 'bg-yellow-500'} text-black font-black uppercase italic text-xs shadow-lg`}>
                {isSaving ? 'SYNC...' : 'ENVOYER'}
            </button>
        </div>
      </footer>
    </div>
  );
}