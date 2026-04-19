"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../lib/supabaseClient";

// --- TYPES ---
interface Ingredient {
  id: number;
  type: "MALT" | "HOUBLON" | "LEVURE" | "SEL" | "SUCRE";
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
  desc?: string;
  target?: string; // Objectif du palier (ex: Alpha-amylase)
}

export default function SuperLaboPage() {
  const [dbInventory, setDbInventory] = useState<any[]>([]);
  const [recipeName, setRecipeName] = useState("NOUVELLE_RECETTE_V2");
  const [volFinal, setVolFinal] = useState(20);
  const [resucrageDosage, setResucrageDosage] = useState(7); // g/L
  
  const [steps, setSteps] = useState<Step[]>([
    { id: "s1", label: "CONCASSAGE", durationInMinutes: 0, remainingSeconds: 0, isRunning: false, ingredients: [] },
    { id: "p1", label: "PALIER_PROTEINIQUE", temp: 50, durationInMinutes: 10, remainingSeconds: 600, isRunning: false, ingredients: [], target: "Rupture des protéines" },
    { id: "p2", label: "BÊTA-AMYLASE", temp: 63, durationInMinutes: 40, remainingSeconds: 2400, isRunning: false, ingredients: [], target: "Sucres fermentescibles" },
    { id: "p3", label: "ALPHA-AMYLASE", temp: 68, durationInMinutes: 20, remainingSeconds: 1200, isRunning: false, ingredients: [], target: "Corps et texture" },
    { id: "s4", label: "ÉBULLITION", durationInMinutes: 60, remainingSeconds: 3600, isRunning: false, ingredients: [] },
  ]);

  const [stats, setStats] = useState({ abv: 0, ebc: 0, ibu: 0, maltTotal: 0, hopTotal: 0, waterE: 0, waterR: 0, sucreBouteille: 0 });

  // --- RÉCUPÉRATION STOCK ---
  useEffect(() => {
    const getInv = async () => {
      const { data } = await supabase.from('inventory').select('*').order('name');
      if (data) setDbInventory(data);
    };
    getInv();
  }, []);

  // --- CALCULS PHYSIQUES ---
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
          // Formule simplifiée IBU (Tinseth)
          ibuTotal += (ing.qty * (ing.alpha || 0) * 0.25) / (volFinal / 10);
        }
      });
    });

    setStats({
      maltTotal: mTotal,
      hopTotal: hTotal,
      ebc: Math.round(1.49 * Math.pow(mcu, 0.68) * 1.97),
      ibu: Math.round(ibuTotal),
      abv: parseFloat(((mTotal * 0.15) / (volFinal/20)).toFixed(1)),
      waterE: parseFloat((mTotal * 3).toFixed(1)), // Ratio 3:1
      waterR: parseFloat((volFinal * 1.25).toFixed(1)),
      sucreBouteille: parseFloat((volFinal * resucrageDosage).toFixed(1))
    });
  }, [steps, volFinal, resucrageDosage]);

  useEffect(() => { runCalculations(); }, [runCalculations]);

  // --- GESTION TIMERS ---
  const toggleTimer = (id: string) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, isRunning: !s.isRunning } : s));
  };

  const resetTimer = (id: string) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, remainingSeconds: s.durationInMinutes * 60, isRunning: false } : s));
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setSteps(prev => prev.map(s => (s.isRunning && s.remainingSeconds > 0) ? { ...s, remainingSeconds: s.remainingSeconds - 1 } : s));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="min-h-screen bg-black text-white font-mono p-6">
      
      {/* HEADER DYNAMIQUE */}
      <header className="border-b border-zinc-800 pb-6 mb-8 flex justify-between items-end">
        <div>
          <input className="bg-transparent text-4xl font-black outline-none border-b border-transparent focus:border-yellow-500 transition-all" value={recipeName} onChange={e => setRecipeName(e.target.value)} />
          <div className="text-zinc-500 text-xs mt-2 uppercase tracking-widest">Calcul_Volume_Eau: <span className="text-blue-500">{stats.waterE}L (Empâtage)</span> + <span className="text-cyan-500">{stats.waterR}L (Rinçage)</span></div>
        </div>
        
        <div className="text-right">
          <label className="text-[10px] text-zinc-600 block mb-1">VOLUME_FINAL_CIBLE</label>
          <div className="flex items-center gap-2">
            <input type="number" className="bg-zinc-900 border border-zinc-800 text-2xl font-black text-yellow-500 w-24 p-2 text-right outline-none" value={volFinal} onChange={e => setVolFinal(+e.target.value)} />
            <span className="text-xl font-black text-zinc-700">L</span>
          </div>
        </div>
      </header>

      {/* DASHBOARD & JAUGES BESOIN */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-zinc-950 border border-zinc-900 p-4">
          <span className="text-[8px] text-zinc-500 block mb-2 uppercase">Malt_Besoin</span>
          <div className="text-2xl font-black">{stats.maltTotal.toFixed(1)} <span className="text-xs text-zinc-600">KG</span></div>
          <div className="w-full h-1 bg-zinc-900 mt-2"><div className="h-full bg-orange-600 transition-all" style={{width: `${(stats.maltTotal/10)*100}%`}} /></div>
        </div>
        <div className="bg-zinc-950 border border-zinc-900 p-4">
          <span className="text-[8px] text-zinc-500 block mb-2 uppercase">Houblon_Besoin</span>
          <div className="text-2xl font-black">{stats.hopTotal} <span className="text-xs text-zinc-600">G</span></div>
          <div className="w-full h-1 bg-zinc-900 mt-2"><div className="h-full bg-green-600 transition-all" style={{width: `${(stats.hopTotal/200)*100}%`}} /></div>
        </div>
        <div className="bg-zinc-950 border border-zinc-900 p-4">
          <span className="text-[8px] text-zinc-500 block mb-2 uppercase">Couleur_Est.</span>
          <div className="text-2xl font-black text-yellow-600">{stats.ebc} <span className="text-xs text-zinc-600">EBC</span></div>
        </div>
        <div className="bg-zinc-950 border border-zinc-900 p-4">
          <span className="text-[8px] text-zinc-500 block mb-2 uppercase">Amertume_Est.</span>
          <div className="text-2xl font-black text-red-600">{stats.ibu} <span className="text-xs text-zinc-600">IBU</span></div>
        </div>
      </div>

      {/* LISTE DES ÉTAPES */}
      <div className="space-y-6">
        {steps.map((step, sIdx) => (
          <div key={step.id} className="bg-zinc-950 border border-zinc-900 p-6 relative group">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-4">
                <span className="text-zinc-800 font-black text-2xl italic">0{sIdx+1}</span>
                <div>
                  <input className="bg-transparent font-black text-xl uppercase outline-none" value={step.label} onChange={e => {const n=[...steps]; n[sIdx].label=e.target.value; setSteps(n)}} />
                  {step.target && <div className="text-[9px] text-zinc-500 italic mt-1">Objectif: {step.target}</div>}
                </div>
              </div>

              {/* SECTION TIMER */}
              {step.durationInMinutes > 0 && (
                <div className="flex items-center gap-4 bg-black p-2 border border-zinc-800">
                  <div className="text-2xl font-black tabular-nums">{formatTime(step.remainingSeconds)}</div>
                  <div className="flex gap-1">
                    <button onClick={() => toggleTimer(step.id)} className={`px-3 py-1 text-[10px] font-black ${step.isRunning ? 'bg-red-900 text-red-200' : 'bg-green-900 text-green-200'}`}>
                      {step.isRunning ? 'PAUSE' : 'START'}
                    </button>
                    <button onClick={() => resetTimer(step.id)} className="bg-zinc-800 px-3 py-1 text-[10px] font-black">RAZ</button>
                  </div>
                </div>
              )}
            </div>

            {/* PALIERS GESTION */}
            {step.id.startsWith('p') && (
              <div className="grid grid-cols-3 gap-4 mb-4 border-y border-zinc-900 py-4">
                <div>
                   <label className="text-[8px] text-zinc-600 block mb-1">TEMPÉRATURE_CIBLE</label>
                   <input type="number" className="bg-zinc-900 w-full p-2 text-blue-400 font-black" value={step.temp} onChange={e => {const n=[...steps]; n[sIdx].temp=+e.target.value; setSteps(n)}} />
                </div>
                <div>
                   <label className="text-[8px] text-zinc-600 block mb-1">DURÉE (MIN)</label>
                   <input type="number" className="bg-zinc-900 w-full p-2 text-white font-black" value={step.durationInMinutes} onChange={e => {const n=[...steps]; n[sIdx].durationInMinutes=+e.target.value; n[sIdx].remainingSeconds=(+e.target.value*60); setSteps(n)}} />
                </div>
                <div>
                   <label className="text-[8px] text-zinc-600 block mb-1">CIBLE_ENZYMATIQUE</label>
                   <input className="bg-zinc-900 w-full p-2 text-zinc-500 text-[10px]" value={step.target} onChange={e => {const n=[...steps]; n[sIdx].target=e.target.value; setSteps(n)}} />
                </div>
              </div>
            )}

            {/* INGRÉDIENTS DANS L'ÉTAPE */}
            <div className="space-y-2">
              <select 
                className="w-full bg-zinc-900 border border-zinc-800 p-2 text-[10px] text-zinc-400 font-black"
                onChange={(e) => {
                  const item = dbInventory.find(i => i.name === e.target.value);
                  if (item) {
                    const n = [...steps];
                    n[sIdx].ingredients.push({ id: Date.now(), name: item.name, type: item.type === "HOUBLON" ? "HOUBLON" : item.type as any, qty: 0, ebc: item.metadata?.ebc, alpha: item.metadata?.alpha });
                    setSteps(n);
                  }
                }}
              >
                <option value="">+ AJOUTER_INGRÉDIENT</option>
                {dbInventory.map(i => <option key={i.id} value={i.name}>{i.name} ({i.type})</option>)}
              </select>

              {step.ingredients.map((ing, iIdx) => (
                <div key={ing.id} className="flex items-center gap-4 bg-black/50 p-2 border border-zinc-900">
                  <span className="flex-1 text-[11px] font-bold text-zinc-300 italic">{ing.name}</span>
                  <input type="number" className="bg-transparent border-b border-zinc-800 w-16 text-right text-yellow-500 font-black outline-none" value={ing.qty} onChange={e => {const n=[...steps]; n[sIdx].ingredients[iIdx].qty=+e.target.value; setSteps(n)}} />
                  <span className="text-[10px] text-zinc-700">{ing.type === 'MALT' ? 'KG' : 'G'}</span>
                  <button onClick={() => {const n=[...steps]; n[sIdx].ingredients.splice(iIdx,1); setSteps(n)}} className="text-red-900 hover:text-red-500">×</button>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* SECTION RE-SUCRAGE */}
        <div className="bg-zinc-950 border border-yellow-900/30 p-6">
            <h3 className="text-xl font-black text-yellow-500 mb-4 tracking-tighter uppercase italic">Phase_Mise_En_Bouteilles</h3>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <label className="text-[10px] text-zinc-500 block mb-2 font-black uppercase tracking-widest">Dosage_Sucre (g/L)</label>
                <input type="number" className="bg-zinc-900 p-3 w-full text-white font-black" value={resucrageDosage} onChange={e => setResucrageDosage(+e.target.value)} />
              </div>
              <div className="flex flex-col justify-center">
                <span className="text-[8px] text-zinc-600 uppercase font-black">Total_Sucre_À_Préparer</span>
                <div className="text-4xl font-black text-white">{stats.sucreBouteille} <span className="text-sm text-zinc-700">G</span></div>
              </div>
            </div>
        </div>
      </div>

      {/* FOOTER ACTIONS */}
      <footer className="mt-12 pt-8 border-t border-zinc-900 flex justify-between items-center pb-20">
        <div className="text-[10px] text-zinc-700 italic">SYSTEM_BREW_V4.0 // READY_FOR_SYNC</div>
        <button 
          onClick={async () => {
             const { error } = await supabase.from('recipes').upsert({ name: recipeName, data: { steps_json: steps, stats_json: stats, config: { volFinal, resucrageDosage } } }, { onConflict: 'name' });
             error ? alert('Erreur') : alert('✅ SYNCHRONISÉ AVEC LE COCKPIT POTES');
          }}
          className="bg-yellow-500 text-black px-10 py-4 font-black text-sm hover:bg-white transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)]"
        >
          GÉNÉRER_LE_COCKPIT_POTE
        </button>
      </footer>
    </div>
  );
}