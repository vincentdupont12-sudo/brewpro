"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient";

interface Ingredient {
  id: number;
  type: string;
  name: string;
  qty: number;
  ebc?: number;
  alpha?: number;
}

interface Step {
  id: string;
  label: string;
  temp?: number;
  durationInMinutes: number;
  remainingSeconds: number;
  isRunning: boolean;
  ingredients: Ingredient[];
  target?: string;
}

export default function SuperLabo() {
  const [dbInventory, setDbInventory] = useState<any[]>([]);
  const [recipeName, setRecipeName] = useState("MA_NOUVELLE_BIERE");
  const [volFinal, setVolFinal] = useState(20);
  const [resucrageDosage, setResucrageDosage] = useState(7);
  
  const [steps, setSteps] = useState<Step[]>([
    { id: "s1", label: "CONCASSAGE", durationInMinutes: 0, remainingSeconds: 0, isRunning: false, ingredients: [] },
    { id: "p1", label: "PALIER_MASH", temp: 65, durationInMinutes: 60, remainingSeconds: 3600, isRunning: false, ingredients: [], target: "Extraction des sucres" },
    { id: "s4", label: "ÉBULLITION", durationInMinutes: 60, remainingSeconds: 3600, isRunning: false, ingredients: [] },
  ]);

  const [stats, setStats] = useState({ abv: 0, ebc: 0, ibu: 0, maltTotal: 0, hopTotal: 0, waterE: 0, waterR: 0, sucreBouteille: 0 });

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
      s.ingredients.forEach(ing => {
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

  const toggleTimer = (id: string) => setSteps(prev => prev.map(s => s.id === id ? { ...s, isRunning: !s.isRunning } : s));
  const resetTimer = (id: string) => setSteps(prev => prev.map(s => s.id === id ? { ...s, remainingSeconds: s.durationInMinutes * 60, isRunning: false } : s));

  useEffect(() => {
    const interval = setInterval(() => {
      setSteps(prev => prev.map(s => (s.isRunning && s.remainingSeconds > 0) ? { ...s, remainingSeconds: s.remainingSeconds - 1 } : s));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white font-mono p-6 pb-32">
      <header className="border-b border-zinc-800 pb-6 mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-zinc-600 text-[10px] font-black tracking-[0.3em] mb-2 uppercase">Interface_Labo_Alpha</h1>
          <input className="bg-transparent text-4xl font-black outline-none border-b border-zinc-800 focus:border-yellow-500 w-full" value={recipeName} onChange={e => setRecipeName(e.target.value)} />
          <div className="text-[10px] mt-4 flex gap-4 font-bold uppercase">
            <span className="text-blue-500">Empatage: {stats.waterE}L</span>
            <span className="text-cyan-500">Rinçage: {stats.waterR}L</span>
          </div>
        </div>
        <div className="text-right">
          <label className="text-[10px] text-zinc-600 block mb-1 font-black">CIBLE_LITRES</label>
          <input type="number" className="bg-zinc-900 border border-zinc-800 text-2xl font-black text-yellow-500 w-20 p-2 text-right outline-none" value={volFinal} onChange={e => setVolFinal(+e.target.value)} />
        </div>
      </header>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-zinc-950 border border-zinc-900 p-4"><span className="text-[8px] text-zinc-500 block mb-1">MALT_KG</span><div className="text-2xl font-black">{stats.maltTotal.toFixed(1)}</div></div>
        <div className="bg-zinc-950 border border-zinc-900 p-4"><span className="text-[8px] text-zinc-500 block mb-1">HOP_G</span><div className="text-2xl font-black">{stats.hopTotal}</div></div>
        <div className="bg-zinc-950 border border-zinc-900 p-4"><span className="text-[8px] text-zinc-500 block mb-1 text-yellow-600">EBC</span><div className="text-2xl font-black text-yellow-600">{stats.ebc}</div></div>
        <div className="bg-zinc-950 border border-zinc-900 p-4"><span className="text-[8px] text-zinc-500 block mb-1 text-red-600">IBU</span><div className="text-2xl font-black text-red-600">{stats.ibu}</div></div>
      </div>

      <div className="space-y-6">
        {steps.map((step, sIdx) => (
          <div key={step.id} className="bg-zinc-950 border border-zinc-900 p-6">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                <span className="text-zinc-800 font-black text-3xl italic">0{sIdx+1}</span>
                <input className="bg-transparent font-black text-xl uppercase outline-none" value={step.label} onChange={e => {const n=[...steps]; n[sIdx].label=e.target.value; setSteps(n)}} />
              </div>
              {step.durationInMinutes > 0 && (
                <div className="flex items-center gap-3 bg-black p-2 border border-zinc-800">
                  <div className="text-xl font-black tabular-nums">{Math.floor(step.remainingSeconds/60)}:{String(step.remainingSeconds%60).padStart(2,'0')}</div>
                  <button onClick={() => toggleTimer(step.id)} className={`px-3 py-1 text-[8px] font-black ${step.isRunning ? 'bg-red-600' : 'bg-green-600'}`}>{step.isRunning ? 'STOP' : 'START'}</button>
                  <button onClick={() => resetTimer(step.id)} className="px-2 py-1 text-[8px] font-black bg-zinc-800">RAZ</button>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <select 
                className="w-full bg-zinc-900 border border-zinc-800 p-2 text-[10px] text-zinc-500 font-black italic uppercase"
                onChange={(e) => {
                  const item = dbInventory.find(i => i.name === e.target.value);
                  if (item) {
                    const n = [...steps];
                    n[sIdx].ingredients.push({ id: Date.now(), name: item.name, type: item.type, qty: 0, ebc: item.metadata?.ebc, alpha: item.metadata?.alpha });
                    setSteps(n);
                  }
                }}
              >
                <option value="">+ AJOUTER ({step.label.includes("ÉBULLITION") ? "HOUBLONS" : "MALTS"})</option>
                {dbInventory
                  .filter(i => {
                    if(step.label.includes("ÉBULLITION")) return i.type === "HOUBLON";
                    if(step.label.includes("PALIER") || step.label.includes("CONCASSAGE")) return i.type === "MALT";
                    return true;
                  })
                  .map(i => <option key={i.id} value={i.name}>{i.name} ({i.type})</option>)
                }
              </select>

              {step.ingredients.map((ing, iIdx) => (
                <div key={ing.id} className="flex items-center gap-3 bg-black/40 p-2 border border-zinc-900">
                  <span className="flex-1 text-[11px] font-bold text-zinc-400">{ing.name}</span>
                  <input type="number" className="bg-transparent border-b border-zinc-800 w-16 text-right text-yellow-500 font-black outline-none" value={ing.qty} onChange={e => {const n=[...steps]; n[sIdx].ingredients[iIdx].qty=+e.target.value; setSteps(n)}} />
                  <span className="text-[8px] text-zinc-700">{ing.type === 'MALT' ? 'KG' : 'G'}</span>
                  <button onClick={() => {const n=[...steps]; n[sIdx].ingredients.splice(iIdx,1); setSteps(n)}} className="text-red-900 px-2 font-black">×</button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <footer className="fixed bottom-0 left-0 right-0 p-4 bg-black/80 backdrop-blur-md border-t border-zinc-900">
        <button onClick={async () => {
             const { error } = await supabase.from('recipes').upsert({ name: recipeName, data: { steps_json: steps, stats_json: stats, config: { volFinal, resucrageDosage } } }, { onConflict: 'name' });
             alert(error ? 'Erreur Sync' : '✅ RECETTE SYNCHRONISÉE');
        }} className="w-full bg-yellow-500 text-black font-black py-4 uppercase italic shadow-[0_0_30px_rgba(234,179,8,0.2)]">Envoyer_au_Cockpit_Potes</button>
      </footer>
    </div>
  );
}