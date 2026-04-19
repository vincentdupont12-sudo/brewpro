"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

// --- TYPES ALIGNÉS SUR LE SUPERLABO ---
interface Ingredient { name: string; qty: number; type: string; }
interface Step { 
  id: string; 
  label: string; 
  temp?: number; 
  durationInMinutes: number; 
  ingredients: Ingredient[]; 
  desc?: string; 
}

export default function BrewMasterPotes() {
  const [view, setView] = useState("home");
  const [recipes, setRecipes] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [inventory, setInventory] = useState<any[]>([]);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [r, i] = await Promise.all([
      supabase.from('recipes').select('*').order('updated_at', { ascending: false }),
      supabase.from('inventory').select('*').order('name')
    ]);
    if (r.data) setRecipes(r.data);
    if (i.data) setInventory(i.data);
  };

  const updateStock = async (id: string, newQty: number) => {
    await supabase.from('inventory').update({ quantity: newQty }).eq('id', id);
    fetchData();
  };

  const consumeStepStock = async (ings: Ingredient[]) => {
    if (!ings || ings.length === 0) return;
    if (!confirm("DÉDUIRE CES INGRÉDIENTS DU STOCK RÉEL ?")) return;
    
    const updates = ings.map(ing => {
      const item = inventory.find(i => i.name.toUpperCase() === ing.name.toUpperCase());
      if (item) return supabase.from('inventory').update({ quantity: item.quantity - ing.qty }).eq('id', item.id);
      return null;
    }).filter(Boolean);

    await Promise.all(updates);
    fetchData();
    alert("STOCK ACTUALISÉ");
  };

  const progress = selected?.steps_json 
    ? Math.round((completedSteps.length / selected.steps_json.length) * 100) 
    : 0;

  return (
    <div className="min-h-screen bg-[#020202] text-zinc-300 font-mono p-4 uppercase italic selection:bg-yellow-500">
      <div className="max-w-xl mx-auto pb-32">
        
        {/* PROGRESS BAR FIXE */}
        {view === "detail" && (
          <div className="fixed top-0 left-0 right-0 h-1 bg-zinc-900 z-50">
            <div className="h-full bg-yellow-500 transition-all duration-500 shadow-[0_0_10px_#f39c12]" style={{ width: `${progress}%` }} />
          </div>
        )}

        {/* NAVIGATION */}
        {view !== "home" && (
          <button onClick={() => { setView(view === "detail" ? "library" : "home"); setCompletedSteps([]); }} className="text-[10px] font-black mb-8 border-b border-zinc-900 pb-2 flex items-center gap-2 hover:text-white transition-colors">
            ← {view === "detail" ? "RETOUR_LISTE" : "MENU_PRINCIPAL"}
          </button>
        )}

        {/* --- VUE ACCUEIL --- */}
        {view === "home" && (
          <div className="pt-20 animate-in fade-in slide-in-from-bottom-6 duration-700">
            <h1 className="text-[60px] font-black text-white leading-none mb-16 tracking-tighter">BREW<br/><span className="text-yellow-500">CONTROL_</span></h1>
            <div className="grid gap-4">
              <button onClick={() => setView("library")} className="group bg-white text-black p-8 font-black text-2xl hover:bg-yellow-500 transition-all flex justify-between items-center">
                <span>BRASSAGE</span><span className="group-hover:translate-x-2 transition-transform">→</span>
              </button>
              <button onClick={() => setView("stock")} className="border border-zinc-800 p-8 font-black text-zinc-600 text-xl hover:text-white transition-all text-left">INVENTAIRE_MP</button>
            </div>
          </div>
        )}

        {/* --- BIBLIOTHÈQUE --- */}
        {view === "library" && (
          <div className="space-y-3 animate-in fade-in duration-500">
            <h2 className="text-2xl font-black text-white mb-6 tracking-tighter italic">SÉLECTIONNER_UN_BRASSIN</h2>
            {recipes.map(r => (
              <button key={r.id} onClick={() => { setSelected(r); setView("detail"); }} className="group w-full bg-zinc-950 border border-zinc-900 p-6 text-left hover:border-yellow-500 transition-all">
                <div className="text-[8px] text-zinc-600 mb-1 font-black">{(r.stats_json?.abv || 0).toFixed(1)}% ABV | {r.stats_json?.ebc || 0} EBC | {r.stats_json?.ibu || 0} IBU</div>
                <div className="text-xl font-black text-zinc-400 group-hover:text-white">{r.name}</div>
              </button>
            ))}
          </div>
        )}

        {/* --- COCKPIT D'EXÉCUTION --- */}
        {view === "detail" && selected && (
          <div className="animate-in slide-in-from-right-4 duration-500">
            <header className="mb-10">
                <div className="flex justify-between items-end mb-6">
                    <h2 className="text-5xl font-black text-white leading-tight tracking-tighter uppercase">{selected.name}</h2>
                    <span className="text-2xl font-black text-yellow-500 tabular-nums">{progress}%</span>
                </div>
                <div className="grid grid-cols-2 gap-px bg-zinc-900 border border-zinc-900">
                    <div className="bg-zinc-950 p-4 shadow-inner">
                        <span className="text-[7px] text-zinc-600 block font-black">EAU_EMPÂTAGE</span>
                        <span className="text-xl font-black text-blue-500 tabular-nums">{selected.stats_json?.waterE}L</span>
                    </div>
                    <div className="bg-zinc-950 p-4 text-right shadow-inner">
                        <span className="text-[7px] text-zinc-600 block font-black">EAU_RINÇAGE</span>
                        <span className="text-xl font-black text-blue-500 tabular-nums">{selected.stats_json?.waterR}L</span>
                    </div>
                </div>
            </header>

            <div className="space-y-10 relative">
              {selected.steps_json?.map((step: Step, idx: number) => {
                const sId = step.id || `step-${idx}`;
                const isDone = completedSteps.includes(sId);
                
                return (
                  <div key={sId} className={`relative pl-10 border-l-2 transition-all duration-300 ${isDone ? 'border-zinc-800 opacity-30' : 'border-yellow-500'}`}>
                    
                    {/* CHECKBOX */}
                    <button 
                      onClick={() => setCompletedSteps(prev => prev.includes(sId) ? prev.filter(id => id !== sId) : [...prev, sId])}
                      className={`absolute -left-[13px] top-0 w-6 h-6 border-2 flex items-center justify-center transition-all ${isDone ? 'bg-zinc-800 border-zinc-800' : 'bg-black border-yellow-500 hover:scale-110'}`}
                    >
                      {isDone && <span className="text-black font-black text-xs">✓</span>}
                    </button>
                    
                    <div className="flex justify-between items-start mb-2">
                      <h3 className={`text-xl font-black uppercase tracking-tight ${isDone ? 'line-through text-zinc-700' : 'text-white'}`}>
                        {step.label}
                      </h3>
                      {step.temp && (
                        <span className={`text-[10px] font-black px-2 py-1 border ${isDone ? 'border-zinc-900 text-zinc-800' : 'border-zinc-800 text-yellow-500 bg-zinc-950'}`}>
                            {step.temp}°C
                        </span>
                      )}
                    </div>

                    {step.desc && <p className="text-[10px] text-zinc-600 mb-4 lowercase italic">{step.desc}</p>}

                    {/* SECTION INGRÉDIENTS */}
                    {!isDone && step.ingredients && step.ingredients.length > 0 && (
                      <div className="bg-zinc-950/50 border border-zinc-900 p-4 mb-4 shadow-xl">
                        {step.ingredients.map((ing, i) => {
                           const st = inventory.find(it => it.name.toUpperCase() === ing.name.toUpperCase());
                           return (
                            <div key={i} className="flex justify-between text-[10px] font-black border-b border-zinc-900/50 py-2 uppercase italic">
                              <span className={st && st.quantity < ing.qty ? "text-red-600 animate-pulse" : "text-zinc-500"}>
                                {ing.name}
                              </span>
                              <span className="text-yellow-600">{ing.qty} {ing.type === "MALT" || ing.type === "MALT" ? "kg" : "g"}</span>
                            </div>
                           );
                        })}
                        <button 
                          onClick={(e) => { e.stopPropagation(); consumeStepStock(step.ingredients); }}
                          className="w-full mt-4 bg-zinc-900 text-[8px] font-black py-3 hover:bg-white hover:text-black transition-all tracking-[0.2em] border border-zinc-800"
                        >
                          CONFIRMER_CONSOMMATION_STOCK
                        </button>
                      </div>
                    )}

                    {!isDone && step.durationInMinutes > 0 && (
                      <div className="bg-black border border-zinc-900 p-4 w-fit flex items-center gap-4">
                        <span className="text-3xl font-black text-white tabular-nums">{step.durationInMinutes}:00</span>
                        <span className="text-[7px] text-zinc-700 font-black tracking-widest leading-none">DURÉE<br/>STABLE</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {progress === 100 && (
                <button 
                  onClick={() => { alert("BRASSIN TERMINÉ ! SANTÉ 🍻"); setView("home"); }}
                  className="w-full mt-20 bg-yellow-500 text-black p-10 font-black text-2xl animate-bounce"
                >
                    ARCHIVER_LE_BATCH
                </button>
            )}
          </div>
        )}

        {/* --- INVENTAIRE --- */}
        {view === "stock" && (
            <div className="animate-in fade-in duration-500">
                <h2 className="text-3xl font-black text-white mb-8 tracking-tighter uppercase">État_Des_Réserves</h2>
                <div className="space-y-2">
                    {inventory.map(item => (
                        <div key={item.id} className="flex justify-between items-center bg-zinc-950 p-4 border border-zinc-900 shadow-md">
                            <div>
                                <div className="text-lg font-black text-white tracking-tight leading-none mb-1 uppercase">{item.name}</div>
                                <div className="text-[7px] text-zinc-600 font-black uppercase">{item.type} | {item.unit}</div>
                            </div>
                            <div className="flex items-center gap-4 border-l border-zinc-900 pl-4">
                                <input 
                                    type="number" 
                                    placeholder="+/-" 
                                    className="w-14 bg-black border border-zinc-800 p-2 text-xs text-green-500 font-black text-center outline-none focus:border-green-900"
                                    onKeyDown={async (e) => {
                                        if (e.key === 'Enter') {
                                            const v = parseFloat(e.currentTarget.value);
                                            if(!isNaN(v)) await updateStock(item.id, item.quantity + v);
                                            e.currentTarget.value = "";
                                        }
                                    }}
                                />
                                <span className={`text-2xl font-black tabular-nums w-16 text-right ${item.quantity <= 0 ? 'text-red-600' : 'text-white'}`}>
                                  {item.quantity.toFixed(1)}
                                </span>
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