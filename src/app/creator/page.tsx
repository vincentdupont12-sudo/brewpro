"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function SuperLaboExpert() {
  const [dbInventory, setDbInventory] = useState<any[]>([]);
  const [recipeName, setRecipeName] = useState("BRASSIN_MULTI_PALIERS");
  const [volFinal, setVolFinal] = useState(20);
  const [resucrageDosage, setResucrageDosage] = useState(7);
  const [isSaving, setIsSaving] = useState(false);
  
  // État initial avec paliers types
  const [steps, setSteps] = useState<any[]>([
    { id: "step-1", label: "CONCASSAGE", durationInMinutes: 0, remainingSeconds: 0, isRunning: false, ingredients: [] },
    { id: "mash-1", label: "PALIER_MASH", temp: 65, durationInMinutes: 60, remainingSeconds: 3600, isRunning: false, ingredients: [] },
    { id: "boil-1", label: "ÉBULLITION", durationInMinutes: 60, remainingSeconds: 3600, isRunning: false, ingredients: [] },
  ]);

  const [stats, setStats] = useState({ abv: 0, ebc: 0, ibu: 0, maltTotal: 0, hopTotal: 0, waterE: 0, waterR: 0, sucreBouteille: 0 });

  const parseNum = (val: string) => parseFloat(val.replace(',', '.')) || 0;

  // --- LOGIQUE PÉDAGOGIQUE ---
  const getTempInfo = (temp: number) => {
    if (temp >= 45 && temp <= 55) return "PROTÉINIQUE : Améliore la tenue de mousse et l'azote.";
    if (temp >= 60 && temp <= 65) return "BÊTA-AMYLASE : Favorise les sucres fermentescibles (Bière sèche/Alcool).";
    if (temp >= 67 && temp <= 72) return "ALPHA-AMYLASE : Favorise les sucres non-fermentescibles (Corps/Rondeur).";
    if (temp >= 75 && temp <= 78) return "MASH-OUT : Désactive les enzymes, facilite la filtration.";
    return "Palier personnalisé.";
  };

  // --- CALCULS DES RATIONS CONSEILLÉES (basé sur volFinal) ---
  const advice = {
    levure: (volFinal * 0.5).toFixed(1) + "g à " + (volFinal * 1).toFixed(1) + "g", // 0.5g à 1g par litre
    houblon: (volFinal * 3).toFixed(0) + "g total (base)",
    ratioEau: (stats.maltTotal * 3).toFixed(1) + "L min."
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
    setStats({
      maltTotal: mTotal, hopTotal: hTotal,
      ebc: Math.round(1.49 * Math.pow(mcu, 0.68) * 1.97) || 0,
      ibu: Math.round(ibuTotal) || 0,
      abv: parseFloat(((mTotal * 0.15) / (volFinal/20)).toFixed(1)),
      waterE: parseFloat((mTotal * 3).toFixed(1)),
      waterR: parseFloat((volFinal * 1.25).toFixed(1)),
      sucreBouteille: parseFloat((volFinal * resucrageDosage).toFixed(1))
    });
  }, [steps, volFinal, resucrageDosage]);

  useEffect(() => { runCalculations(); }, [runCalculations]);

  // Ajouter un palier de mash dynamiquement
  const addMashStep = () => {
    const newStep = { id: `mash-${Date.now()}`, label: "NOUVEAU_PALIER", temp: 68, durationInMinutes: 15, remainingSeconds: 900, isRunning: false, ingredients: [] };
    const boilIdx = steps.findIndex(s => s.label.includes("ÉBULLITION"));
    const newSteps = [...steps];
    newSteps.splice(boilIdx, 0, newStep);
    setSteps(newSteps);
  };

  const saveRecipe = async () => {
    setIsSaving(true);
    const { error } = await supabase.from('recipes').upsert({ 
      name: recipeName, 
      data: { steps_json: steps, stats_json: stats, config: { volFinal, resucrageDosage } } 
    }, { onConflict: 'name' });
    setIsSaving(false);
    alert(error ? "Erreur" : "✅ ENVOYÉ AUX POTES");
  };

  return (
    <div className="min-h-screen bg-black text-white font-mono p-6 pb-40">
      
      {/* HEADER & VOL FINAL */}
      <header className="border-b border-zinc-800 pb-6 mb-8 flex justify-between items-end">
        <div className="flex-1">
          <input className="bg-transparent text-4xl font-black outline-none border-b border-zinc-800 focus:border-yellow-500 w-full" value={recipeName} onChange={e => setRecipeName(e.target.value)} />
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="bg-zinc-950 p-2 border border-zinc-900">
                <span className="text-[7px] text-zinc-500 block">EAU_EMPATAGE</span>
                <span className="text-blue-400 font-black text-xs">{stats.waterE} L</span>
            </div>
            <div className="bg-zinc-950 p-2 border border-zinc-900">
                <span className="text-[7px] text-zinc-500 block">EAU_RINÇAGE</span>
                <span className="text-cyan-400 font-black text-xs">{stats.waterR} L</span>
            </div>
            <div className="bg-zinc-950 p-2 border border-zinc-900">
                <span className="text-[7px] text-zinc-500 block">CONSEIL_LEVURE</span>
                <span className="text-green-500 font-black text-xs">{advice.levure}</span>
            </div>
          </div>
        </div>
        <div className="ml-8 text-right">
          <label className="text-[8px] text-zinc-600 block mb-1 font-black italic">VOLUME_CIBLE</label>
          <div className="flex items-center gap-2 bg-zinc-900 p-2 border border-zinc-800">
            <input type="text" className="bg-transparent text-2xl font-black text-yellow-500 w-16 text-right outline-none" value={volFinal} onChange={e => setVolFinal(parseNum(e.target.value))} />
            <span className="text-zinc-700 font-black">L</span>
          </div>
        </div>
      </header>

      {/* ETAPES */}
      <div className="space-y-6">
        {steps.map((step, sIdx) => (
          <div key={step.id} className="bg-zinc-950 border border-zinc-900 p-6 relative group">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                <span className="text-zinc-800 font-black text-3xl italic">0{sIdx+1}</span>
                <input className="bg-transparent font-black text-xl uppercase outline-none" value={step.label} onChange={e => {const n=[...steps]; n[sIdx].label=e.target.value; setSteps(n)}} />
              </div>
              <button onClick={() => {const n=[...steps]; n.splice(sIdx,1); setSteps(n)}} className="opacity-0 group-hover:opacity-100 text-red-900 text-[10px] font-black underline transition-opacity">SUPPRIMER_ETAPE</button>
            </div>

            {/* GESTION TEMPERATURE & DUREE */}
            {(step.label.includes("PALIER") || step.label.includes("MASH") || step.label.includes("ÉBULLITION")) && (
              <div className="mb-6">
                <div className="flex gap-4">
                    {step.label.includes("PALIER") || step.label.includes("MASH") ? (
                        <div className="flex-1">
                            <label className="text-[7px] text-zinc-600 font-black mb-1 block">TEMPÉRATURE (°C)</label>
                            <input type="text" className="w-full bg-zinc-900 p-3 text-blue-400 font-black outline-none border border-zinc-800" value={step.temp} onChange={e => {const n=[...steps]; n[sIdx].temp=parseNum(e.target.value); setSteps(n)}} />
                        </div>
                    ) : null}
                    <div className="flex-1">
                        <label className="text-[7px] text-zinc-600 font-black mb-1 block">DURÉE (MIN)</label>
                        <input type="text" className="w-full bg-zinc-900 p-3 text-white font-black outline-none border border-zinc-800" value={step.durationInMinutes} onChange={e => {const n=[...steps]; n[sIdx].durationInMinutes=parseNum(e.target.value); n[sIdx].remainingSeconds=(n[sIdx].durationInMinutes*60); setSteps(n)}} />
                    </div>
                </div>
                {step.temp && (
                    <p className="mt-2 text-[9px] text-zinc-500 italic bg-black/50 p-2 border-l border-zinc-700">
                        💡 {getTempInfo(step.temp)}
                    </p>
                )}
              </div>
            )}

            {/* INGREDIENTS */}
            <div className="space-y-2">
              <select 
                className="w-full bg-zinc-900 border border-zinc-800 p-2 text-[10px] text-zinc-600 font-black outline-none uppercase"
                onChange={(e) => {
                  const item = dbInventory.find(i => i.name === e.target.value);
                  if (item) {
                    const n = [...steps];
                    n[sIdx].ingredients.push({ id: Date.now(), name: item.name, type: item.type, qty: 0, ebc: item.metadata?.ebc, alpha: item.metadata?.alpha });
                    setSteps(n);
                  }
                }}
              >
                <option value="">+ AJOUTER_STOCK ({step.label.includes("ÉBULLITION") ? "HOUBLON" : "MALT/AUTRE"})</option>
                {dbInventory
                  .filter(i => {
                    if(step.label.includes("ÉBULLITION")) return i.type === "HOUBLON";
                    if(step.label.includes("PALIER") || step.label.includes("MASH")) return i.type === "MALT";
                    return true;
                  })
                  .map(i => <option key={i.id} value={i.name}>{i.name} ({i.type})</option>)
                }
              </select>

              {step.ingredients.map((ing: any, iIdx: number) => (
                <div key={ing.id} className="flex items-center gap-3 bg-black/40 p-2 border border-zinc-900">
                  <span className="flex-1 text-[11px] font-bold text-zinc-400">{ing.name}</span>
                  <input type="text" className="bg-transparent border-b border-zinc-800 w-16 text-right text-yellow-500 font-black outline-none" placeholder="0.0" 
                    onChange={e => {const n=[...steps]; n[sIdx].ingredients[iIdx].qty=parseNum(e.target.value); setSteps(n)}} />
                  <span className="text-[8px] text-zinc-700 font-black uppercase">{ing.type === 'MALT' ? 'KG' : 'G'}</span>
                  <button onClick={() => {const n=[...steps]; n[sIdx].ingredients.splice(iIdx,1); setSteps(n)}} className="text-red-900 px-2 font-black text-xs">×</button>
                </div>
              ))}
            </div>
          </div>
        ))}
        
        <button onClick={addMashStep} className="w-full border-2 border-dashed border-zinc-800 p-4 text-[10px] font-black text-zinc-600 hover:text-white hover:border-zinc-500 transition-all uppercase italic">
            + INSÉRER_UN_PALIER_MASH_INTERMÉDIAIRE
        </button>
      </div>

      {/* FOOTER STATS & SAVE */}
      <footer className="fixed bottom-0 left-0 right-0 p-4 bg-black/90 backdrop-blur-xl border-t border-zinc-900 grid grid-cols-4 gap-4 z-50">
        <div className="col-span-3 grid grid-cols-4 gap-2">
            <div className="text-center border-r border-zinc-800"><span className="block text-[7px] text-zinc-600 uppercase">ABV%</span><span className="text-xl font-black">{stats.abv}</span></div>
            <div className="text-center border-r border-zinc-800"><span className="block text-[7px] text-zinc-600 uppercase">EBC</span><span className="text-xl font-black text-yellow-600">{stats.ebc}</span></div>
            <div className="text-center border-r border-zinc-800"><span className="block text-[7px] text-zinc-600 uppercase">IBU</span><span className="text-xl font-black text-red-600">{stats.ibu}</span></div>
            <div className="text-center"><span className="block text-[7px] text-zinc-600 uppercase">SUCRE</span><span className="text-xl font-black text-cyan-600">{stats.sucreBouteille}G</span></div>
        </div>
        <button 
          disabled={isSaving}
          onClick={saveRecipe} 
          className={`font-black uppercase italic text-[10px] ${isSaving ? 'bg-zinc-800' : 'bg-yellow-500'} text-black`}
        >
          {isSaving ? 'SYNC...' : 'ENVOYER'}
        </button>
      </footer>
    </div>
  );
}