"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export default function BrewMasterPotes() {
  // On force l'état initial à "home"
  const [view, setView] = useState("home");
  const [recipes, setRecipes] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [inventory, setInventory] = useState<any[]>([]);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  // --- FORCE LE RETOUR À L'ACCUEIL AU REFRESH ---
  useEffect(() => {
    const init = async () => {
      setView("home"); // On s'assure d'être sur l'accueil
      setSelected(null);
      await fetchData();
    };
    init();
  }, []);

  const fetchData = async () => {
    const { data: r } = await supabase.from('recipes').select('*').order('updated_at', { ascending: false });
    const { data: i } = await supabase.from('inventory').select('*').order('name');
    if (r) setRecipes(r);
    if (i) setInventory(i);
  };

  return (
    <div className="min-h-screen bg-black text-zinc-300 font-mono p-4 uppercase italic">
      <div className="max-w-xl mx-auto">
        
        {/* --- VUE ACCUEIL --- */}
        {view === "home" && (
          <div className="pt-20">
            <h1 className="text-[60px] font-black text-white leading-[0.85] mb-16 tracking-tighter italic">
              BREW<br/><span className="text-yellow-500">CONTROL_</span>
            </h1>
            <div className="grid gap-4">
              <button onClick={() => setView("library")} className="bg-white text-black p-8 font-black text-2xl hover:bg-yellow-500 text-left flex justify-between group">
                <span>LANCER_BRASSIN</span><span>→</span>
              </button>
              <button onClick={() => setView("stock")} className="border border-zinc-800 p-8 font-black text-zinc-600 text-xl text-left hover:text-white">
                INVENTAIRE_MP
              </button>
            </div>
          </div>
        )}

        {/* --- VUE BIBLIOTHÈQUE --- */}
        {view === "library" && (
          <div className="space-y-4">
            {/* BOUTON RETOUR MANQUANT AJOUTÉ ICI */}
            <button onClick={() => setView("home")} className="bg-zinc-900 text-white px-4 py-2 text-[10px] font-black mb-6 hover:bg-zinc-800 border border-zinc-800">
              ← RETOUR_MENU_PRINCIPAL
            </button>
            
            <h2 className="text-xl font-black text-zinc-500 mb-6 italic">SÉLECTIONNER_UNE_RECETTE :</h2>
            {recipes.map(r => (
              <button key={r.id} onClick={() => { setSelected(r); setView("detail"); }} className="w-full bg-zinc-950 border border-zinc-900 p-6 text-left hover:border-yellow-500 transition-colors">
                <div className="text-[8px] text-zinc-600 mb-1">{r.data?.stats_json?.abv}% ABV | {r.data?.stats_json?.ebc} EBC</div>
                <div className="text-xl font-black text-white uppercase">{r.name}</div>
              </button>
            ))}
          </div>
        )}

        {/* --- VUE DÉTAIL BRASSAGE --- */}
        {view === "detail" && selected && (
          <div>
            {/* BOUTON RETOUR BRASSAGE */}
            <button onClick={() => { setView("library"); setCompletedSteps([]); }} className="bg-zinc-900 text-white px-4 py-2 text-[10px] font-black mb-8 border border-zinc-800">
              ← QUITTER_LE_BRASSIN
            </button>
            
            <h2 className="text-4xl font-black text-white mb-10 tracking-tighter italic border-b border-zinc-900 pb-4">{selected.name}</h2>
            
            <div className="space-y-12">
              {selected.data?.steps_json?.map((step: any) => (
                <div key={step.id} className={`pl-6 border-l-2 ${completedSteps.includes(step.id) ? 'border-zinc-800 opacity-20' : 'border-yellow-500'}`}>
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-xl font-black text-white uppercase">{step.label}</h3>
                            {step.temp && <p className="text-blue-400 text-sm font-black italic">{step.temp}°C | {step.durationInMinutes} MIN</p>}
                        </div>
                        <input 
                          type="checkbox" 
                          className="w-8 h-8 accent-yellow-500 cursor-pointer" 
                          onChange={() => setCompletedSteps(p => p.includes(step.id) ? p.filter(x => x!==step.id) : [...p, step.id])} 
                        />
                    </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- VUE STOCK --- */}
        {view === "stock" && (
            <div>
                <button onClick={() => setView("home")} className="bg-zinc-900 text-white px-4 py-2 text-[10px] font-black mb-8 border border-zinc-800">
                  ← RETOUR_ACCUEIL
                </button>
                <h2 className="text-2xl font-black text-white italic mb-10">RÉSERVES_MATIÈRES_PREMIÈRES</h2>
                <div className="grid gap-3">
                    {inventory.map(item => (
                        <div key={item.id} className="bg-zinc-950 p-6 border border-zinc-900 flex justify-between items-center">
                            <div>
                                <div className="font-black text-white text-lg">{item.name}</div>
                                <div className="text-[8px] text-zinc-600 italic uppercase">{item.type}</div>
                            </div>
                            <div className="text-2xl font-black text-white tabular-nums">
                                {item.quantity.toFixed(1)} <span className="text-[10px] text-zinc-700">{item.unit || 'KG'}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}
      </div>
    </div>
  );
}