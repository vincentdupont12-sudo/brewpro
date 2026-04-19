"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export default function BrewMasterPotes() {
  const [view, setView] = useState("home");
  const [recipes, setRecipes] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [inventory, setInventory] = useState<any[]>([]);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", type: "MALT", unit: "KG", quantity: 0 });

  // FORCE RESET AU CHARGEMENT / REFRESH
  useEffect(() => {
    setView("home");
    setSelected(null);
    fetchData();
  }, []);

  const fetchData = async () => {
    const [r, i] = await Promise.all([
      supabase.from('recipes').select('*').order('updated_at', { ascending: false }),
      supabase.from('inventory').select('*').order('name')
    ]);
    if (r.data) setRecipes(r.data);
    if (i.data) setInventory(i.data);
  };

  const consumeStock = async (ings: any[]) => {
    if (!confirm("VALIDER LA CONSOMMATION DU STOCK ?")) return;
    const updates = ings.map(ing => {
      const item = inventory.find(i => i.name.toUpperCase() === ing.name.toUpperCase());
      return item ? supabase.from('inventory').update({ quantity: item.quantity - ing.qty }).eq('id', item.id) : null;
    }).filter(Boolean);
    await Promise.all(updates);
    fetchData();
    alert("STOCK MIS À JOUR");
  };

  return (
    <div className="min-h-screen bg-black text-zinc-300 font-mono p-4 uppercase italic">
      <div className="max-w-xl mx-auto">
        
        {view === "home" && (
          <div className="pt-20">
            <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
                <span className="text-[10px] font-black text-zinc-600 tracking-widest">SYSTEM_ACTIVE</span>
            </div>
            <h1 className="text-[60px] font-black text-white leading-[0.85] mb-16 tracking-tighter">BREW<br/><span className="text-yellow-500">CONTROL_</span></h1>
            <div className="grid gap-4">
              <button onClick={() => setView("library")} className="bg-white text-black p-8 font-black text-2xl hover:bg-yellow-500 text-left flex justify-between group transition-all">
                <span>LANCER_BRASSIN</span><span className="group-hover:translate-x-2 transition-transform">→</span>
              </button>
              <button onClick={() => setView("stock")} className="border border-zinc-800 p-8 font-black text-zinc-600 text-xl text-left hover:text-white hover:border-zinc-500 transition-all">INVENTAIRE_STOCKS</button>
            </div>
          </div>
        )}

        {view === "library" && (
          <div className="space-y-4">
            <button onClick={() => setView("home")} className="text-[10px] text-zinc-500 mb-8 block hover:text-white">← MENU_PRINCIPAL</button>
            {recipes.map(r => (
              <button key={r.id} onClick={() => { setSelected(r); setView("detail"); }} className="w-full bg-zinc-950 border border-zinc-900 p-6 text-left hover:border-yellow-500 transition-colors">
                <div className="text-[8px] text-zinc-600 mb-1">{r.data?.stats_json?.abv}% ABV | {r.data?.stats_json?.ibu} IBU</div>
                <div className="text-xl font-black text-white uppercase">{r.name}</div>
              </button>
            ))}
          </div>
        )}

        {view === "detail" && selected && (
          <div>
            <button onClick={() => { setView("library"); setCompletedSteps([]); }} className="text-[10px] text-zinc-500 mb-8 block pt-4 hover:text-white">← ANNULER_SESSION</button>
            <h2 className="text-4xl font-black text-white mb-10 tracking-tighter">{selected.name}</h2>
            
            <div className="space-y-12">
              {selected.data?.steps_json?.map((step: any) => (
                <div key={step.id} className={`pl-6 border-l-2 ${completedSteps.includes(step.id) ? 'border-zinc-800 opacity-30' : 'border-yellow-500'}`}>
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-xl font-black text-white">{step.label}</h3>
                            {step.temp && <p className="text-blue-400 text-sm font-black mt-1">{step.temp}°C | {step.durationInMinutes} MIN</p>}
                        </div>
                        <input type="checkbox" className="w-8 h-8 accent-yellow-500" onChange={() => setCompletedSteps(p => p.includes(step.id) ? p.filter(x => x!==step.id) : [...p, step.id])} />
                    </div>
                    
                    {!completedSteps.includes(step.id) && step.ingredients?.length > 0 && (
                        <div className="mt-6 bg-zinc-900/50 p-4 border border-zinc-800">
                            {step.ingredients.map((ing:any, i:number) => (
                                <div key={i} className="flex justify-between text-[11px] py-2 border-b border-zinc-800 last:border-0">
                                    <span className="text-zinc-400 font-bold">{ing.name}</span>
                                    <span className="text-white font-black">{ing.qty}{ing.type === 'MALT' ? 'KG' : 'G'}</span>
                                </div>
                            ))}
                            <button onClick={() => consumeStock(step.ingredients)} className="w-full mt-4 bg-white text-black text-[9px] font-black py-2 hover:bg-yellow-500">DÉDUIRE_DU_STOCK_MAINTENANT</button>
                        </div>
                    )}
                </div>
              ))}
            </div>
          </div>
        )}

        {view === "stock" && (
            <div className="pb-20">
                <button onClick={() => setView("home")} className="text-[10px] text-zinc-500 mb-8 block">← RETOUR</button>
                <div className="flex justify-between items-end mb-10">
                    <h2 className="text-3xl font-black text-white italic tracking-tighter">STOCK_RÉEL</h2>
                    <button onClick={() => setShowModal(true)} className="bg-yellow-500 text-black px-4 py-2 text-[10px] font-black italic">ADD_ITEM</button>
                </div>
                <div className="grid gap-3">
                    {inventory.map(item => (
                        <div key={item.id} className="bg-zinc-950 p-6 border border-zinc-900 flex justify-between items-center">
                            <div>
                                <div className="font-black text-white text-lg leading-none">{item.name}</div>
                                <div className="text-[8px] text-zinc-600 mt-1 uppercase">{item.type}</div>
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

      {/* MODAL AJOUT RAPIDE (STOCK) */}
      {showModal && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-6">
          <div className="bg-zinc-950 border border-zinc-800 p-8 w-full max-w-sm shadow-2xl">
            <h3 className="text-xl font-black text-white mb-6 italic tracking-widest">NOUVELLE_ENTRÉE</h3>
            <div className="space-y-4">
              <input placeholder="NOM_DU_PRODUIT" className="w-full bg-zinc-900 p-4 text-white font-black italic border border-zinc-800 outline-none" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
              <div className="grid grid-cols-2 gap-2">
                <select className="bg-zinc-900 p-4 text-white font-black italic border border-zinc-800" value={newItem.type} onChange={e => setNewItem({...newItem, type: e.target.value})}>
                  <option value="MALT">MALT</option><option value="HOUBLON">HOUBLON</option><option value="LEVURE">LEVURE</option>
                </select>
                <input type="number" placeholder="QUANTITÉ" className="bg-zinc-900 p-4 text-yellow-500 font-black border border-zinc-800" onChange={e => setNewItem({...newItem, quantity: +e.target.value})} />
              </div>
              <div className="flex gap-4 pt-6">
                <button onClick={() => setShowModal(false)} className="flex-1 text-[10px] font-black uppercase text-zinc-500">ANNULER</button>
                <button onClick={async () => {
                    await supabase.from('inventory').insert([{ name: newItem.name.toUpperCase(), type: newItem.type, quantity: newItem.quantity, unit: newItem.type === "MALT" ? "KG" : "G" }]);
                    setShowModal(false); fetchData();
                }} className="flex-1 bg-white text-black p-4 text-[10px] font-black uppercase">VALIDER_ENTRÉE</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}