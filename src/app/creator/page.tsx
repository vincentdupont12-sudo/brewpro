"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../lib/supabaseClient";

export default function LaboExpert() {
  const [dbInventory, setDbInventory] = useState<any[]>([]);
  const [recipeName, setRecipeName] = useState("BRASSIN_V5_FINAL");
  const [volFinal, setVolFinal] = useState(20);
  const [resucrageDosage, setResucrageDosage] = useState(7);
  const [isSaving, setIsSaving] = useState(false);
  
  const [steps, setSteps] = useState<any[]>([
    { id: "s1", label: "CONCASSAGE", durationInMinutes: 0, remainingSeconds: 0, isRunning: false, ingredients: [] },
    { id: "m1", label: "EMPÂTAGE", isMashBlock: true, paliers: [
        { id: "p1", name: "PALIER_INITIAL", temp: 65, duration: 60, desc: "BÊTA-AMYLASE : Sucres fermentescibles (Alcool/Sècheresse)" }
      ], ingredients: [] },
    { id: "b1", label: "ÉBULLITION", durationInMinutes: 60, remainingSeconds: 3600, isRunning: false, ingredients: [] },
    { id: "f1", label: "FERMENTATION", durationInDays: 14, ingredients: [] },
  ]);

  const [stats, setStats] = useState({ abv: 0, ebc: 0, ibu: 0, maltTotal: 0, waterE: 0, waterR: 0, sucreBouteille: 0 });

  const parseNum = (val: string) => parseFloat(val.replace(',', '.')) || 0;

  // --- LOGIQUE TEMPS FERMENTATION ---
  const formatFermTime = (days: number) => {
    const totalMinutes = days * 1440;
    const d = Math.floor(totalMinutes / 1440);
    const h = Math.floor((totalMinutes % 1440) / 60);
    const m = totalMinutes % 60;
    return `${d}J / ${h}H / ${m}MIN`;
  };

  // --- CALCULS STATS ---
  const runCalculations = useCallback(() => {
    let mTotal = 0, hTotal = 0, mcu = 0, ibuTotal = 0;
    
    steps.forEach(s => {
      // Ingredients dans les blocs classiques
      s.ingredients?.forEach((ing: any) => {
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
      maltTotal: mTotal,
      ebc: Math.round(1.49 * Math.pow(mcu, 0.68) * 1.97) || 0,
      ibu: Math.round(ibuTotal) || 0,
      abv: parseFloat(((mTotal * 0.15) / (volFinal/20)).toFixed(1)),
      waterE: parseFloat((mTotal * 3).toFixed(1)),
      waterR: parseFloat(((volFinal * 1.25) - (mTotal * 2)).toFixed(1)),
      sucreBouteille: parseFloat((volFinal * resucrageDosage).toFixed(1))
    });
  }, [steps, volFinal, resucrageDosage]);

  useEffect(() => { runCalculations(); }, [runCalculations]);

  // --- LOGIQUE PALIER INTERMÉDIAIRE ---
  const addPalier = (stepIdx: number) => {
    const n = [...steps];
    n[stepIdx].paliers.push({
      id: Date.now().toString(),
      name: "PALIER_INTERMÉDIAIRE",
      temp: 72,
      duration: 15,
      desc: "ALPHA-AMYLASE : Sucres complexes (Corps/Rondeur)"
    });
    setSteps(n);
  };

  const saveRecipe = async () => {
    setIsSaving(true);
    const { error } = await supabase.from('recipes').upsert({ 
      name: recipeName, 
      data: { steps_json: steps, stats_json: stats, config: { volFinal, resucrageDosage } } 
    }, { onConflict: 'name' });
    setIsSaving(false);
    alert(error ? "Erreur : " + error.message : "✅ RECETTE SYNCHRONISÉE");
  };

  useEffect(() => {
    const getInv = async () => {
      const { data } = await supabase.from('inventory').select('*').order('name');
      if (data) setDbInventory(data);
    };
    getInv();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white font-mono p-4 pb-40 uppercase italic">
      <header className="border-b border-zinc-800 pb-6 mb-8">
        <input className="bg-transparent text-3xl font-black outline-none mb-4 w-full text-yellow-500 italic" value={recipeName} onChange={e => setRecipeName(e.target.value)} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="bg-zinc-950 p-3 border border-zinc-900">
                <span className="text-[7px] text-zinc-500 block">EAU_EMPÂTAGE</span>
                <span className="text-xl font-black text-blue-500">{stats.waterE}L</span>
            </div>
            <div className="bg-zinc-950 p-3 border border-zinc-900">
                <span className="text-[7px] text-zinc-500 block">EAU_RINÇAGE</span>
                <span className="text-xl font-black text-cyan-400">{stats.waterR}L</span>
            </div>
            <div className="bg-zinc-900 p-3 border border-zinc-800">
                <span className="text-[7px] text-zinc-600 block">VOL_FINAL</span>
                <input type="text" className="bg-transparent font-black text-white w-full outline-none" value={volFinal} onChange={e => setVolFinal(parseNum(e.target.value))} />
            </div>
            <div className="bg-zinc-950 p-3 border border-zinc-900 text-center">
                <span className="text-[7px] text-zinc-500 block italic">LEVURE_CONSEIL</span>
                <span className="text-green-500 font-black text-xs">~{volFinal * 0.75}G</span>
            </div>
        </div>
      </header>

      <div className="space-y-6">
        {steps.map((step, sIdx) => (
          <div key={step.id} className="bg-zinc-950 border border-zinc-900 p-5">
            <h3 className="text-sm font-black text-zinc-500 mb-4 tracking-widest underline decoration-yellow-500">0{sIdx+1}_{step.label}</h3>

            {/* BLOC EMPÂTAGE SPÉCIFIQUE */}
            {step.isMashBlock ? (
              <div className="space-y-4 mb-6">
                {step.paliers.map((p: any, pIdx: number) => (
                  <div key={p.id} className="bg-black border-l-2 border-yellow-600 p-3 flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <input className="bg-transparent font-black text-xs text-white outline-none w-1/2" value={p.name} onChange={e => {const n=[...steps]; n[sIdx].paliers[pIdx].name=e.target.value; setSteps(n)}} />
                      <button onClick={() => {const n=[...steps]; n[sIdx].paliers.splice(pIdx,1); setSteps(n)}} className="text-red-900 text-[8px] font-black">SUPPR_PALIER</button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-zinc-900 p-2"><span className="text-[7px] block text-zinc-600">TEMP_°C</span><input type="text" className="bg-transparent font-black text-blue-400 w-full outline-none" value={p.temp} onChange={e => {const n=[...steps]; n[sIdx].paliers[pIdx].temp=parseNum(e.target.value); setSteps(n)}} /></div>
                      <div className="bg-zinc-900 p-2"><span className="text-[7px] block text-zinc-600">DUREE_MIN</span><input type="text" className="bg-transparent font-black text-white w-full outline-none" value={p.duration} onChange={e => {const n=[...steps]; n[sIdx].paliers[pIdx].duration=parseNum(e.target.value); setSteps(n)}} /></div>
                    </div>
                    <input className="text-[8px] text-zinc-500 bg-transparent outline-none border-b border-zinc-900 focus:border-zinc-700 pb-1" value={p.desc} onChange={e => {const n=[...steps]; n[sIdx].paliers[pIdx].desc=e.target.value; setSteps(n)}} />
                  </div>
                ))}
                <button onClick={() => addPalier(sIdx)} className="w-full bg-zinc-900 border border-dashed border-zinc-700 py-2 text-[8px] font-black text-zinc-500">+ INSÉRER_PALIER_INTERMÉDIAIRE</button>
              </div>
            ) : (
              // BLOCS STANDARDS (Timer / Fermentation)
              <div className="mb-6">
                {step.label === "FERMENTATION" ? (
                  <div className="bg-zinc-900 p-4 border border-zinc-800">
                    <span className="text-[7px] text-zinc-500 block mb-2">DURÉE_CIBLE_(JOURS)</span>
                    <input type="text" className="bg-transparent text-2xl font-black text-white outline-none" value={step.durationInDays} onChange={e => {const n=[...steps]; n[sIdx].durationInDays=parseNum(e.target.value); setSteps(n)}} />
                    <div className="text-green-500 text-[10px] font-black mt-2 tracking-widest">{formatFermTime(step.durationInDays)}</div>
                  </div>
                ) : step.durationInMinutes > 0 ? (
                  <div className="bg-zinc-900 p-2 flex justify-between items-center border border-zinc-800">
                    <div className="w-1/2 border-r border-zinc-800 pr-2">
                        <span className="text-[7px] block text-zinc-500">DURÉE_MIN</span>
                        <input type="text" className="bg-transparent font-black text-white w-full outline-none" value={step.durationInMinutes} onChange={e => {const n=[...steps]; n[sIdx].durationInMinutes=parseNum(e.target.value); setSteps(n)}} />
                    </div>
                    <div className="text-xl font-black text-zinc-700 pl-4 tabular-nums italic">--:--</div>
                  </div>
                ) : null}
              </div>
            )}

            {/* GESTION INGRÉDIENTS PAR BLOC */}
            <div className="space-y-2">
              <select className="w-full bg-zinc-900 border border-zinc-800 p-2 text-[9px] text-zinc-600 font-black outline-none"
                onChange={(e) => {
                  const item = dbInventory.find(i => i.name === e.target.value);
                  if (item) {
                    const n = [...steps];
                    n[sIdx].ingredients.push({ id: Date.now(), name: item.name, type: item.type, qty: 0, ebc: item.metadata?.ebc, alpha: item.metadata?.alpha });
                    setSteps(n);
                  }
                }}>
                <option value="">+ AJOUTER_{step.label.includes("ÉBULLITION") ? "HOUBLON" : step.label.includes("FERM") ? "LEVURE" : "MALT"}</option>
                {dbInventory
                  .filter(i => {
                    if(step.label.includes("ÉBULLITION")) return i.type === "HOUBLON";
                    if(step.label.includes("FERM")) return i.type === "LEVURE";
                    return i.type === "MALT";
                  })
                  .map(i => <option key={i.id} value={i.name}>{i.name}</option>)
                }
              </select>

              {step.ingredients?.map((ing: any, iIdx: number) => (
                <div key={ing.id} className="flex items-center gap-3 bg-black p-2 border border-zinc-900">
                  <span className="flex-1 text-[9px] font-black text-zinc-400">{ing.name}</span>
                  <input type="text" className="bg-transparent border-b border-zinc-800 w-12 text-right text-yellow-500 font-black outline-none" placeholder="0" 
                    onChange={e => {const n=[...steps]; n[sIdx].ingredients[iIdx].qty=parseNum(e.target.value); setSteps(n)}} />
                  <span className="text-[7px] text-zinc-700 font-black uppercase">{ing.type === 'MALT' ? 'KG' : 'G'}</span>
                  <button onClick={() => {const n=[...steps]; n[sIdx].ingredients.splice(iIdx,1); setSteps(n)}} className="text-red-900 font-black px-2">×</button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <footer className="fixed bottom-0 left-0 right-0 p-4 bg-black/90 backdrop-blur-md border-t border-zinc-800 grid grid-cols-4 gap-4 items-center">
          <div className="col-span-3 flex justify-around text-center border-r border-zinc-800 pr-4">
              <div><span className="text-[7px] block text-zinc-600">ABV%</span><span className="font-black text-white">{stats.abv}</span></div>
              <div><span className="text-[7px] block text-zinc-600">EBC</span><span className="font-black text-yellow-600">{stats.ebc}</span></div>
              <div><span className="text-[7px] block text-zinc-600">IBU</span><span className="font-black text-red-600">{stats.ibu}</span></div>
              <div><span className="text-[7px] block text-zinc-600">SUCRE</span><span className="font-black text-cyan-600">{stats.sucreBouteille}G</span></div>
          </div>
          <button disabled={isSaving} onClick={saveRecipe} className={`font-black py-4 text-[10px] ${isSaving ? 'bg-zinc-800' : 'bg-yellow-500'} text-black`}>
            {isSaving ? 'SYNC...' : 'ENVOYER'}
          </button>
      </footer>
    </div>
  );
}