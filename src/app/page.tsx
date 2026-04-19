"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

// --- 1. SOUS-COMPOSANTS ---

const StatBadge = ({ label, value, color = "text-blue-500" }: { label: string, value: string | number, color?: string }) => (
  <div className="bg-zinc-950 p-4 border border-zinc-900 shadow-inner">
    <span className="text-[7px] block text-zinc-600 font-black uppercase tracking-tighter mb-1">{label}</span>
    <span className={`text-2xl font-black ${color} tracking-tighter`}>{value}</span>
  </div>
);

// --- 2. COMPOSANT PRINCIPAL ---

export default function BrewMaster() {
  const [view, setView] = useState("home"); 
  const [recipes, setRecipes] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [inventory, setInventory] = useState<any[]>([]);

  useEffect(() => { 
    const loadData = async () => {
      const [resRec, resInv] = await Promise.all([
        supabase.from('recipes').select('*').order('created_at', { ascending: false }),
        supabase.from('inventory').select('*').order('name')
      ]);
      if (resRec.data) setRecipes(resRec.data);
      if (resInv.data) setInventory(resInv.data);
    };
    loadData();
  }, []);

  const updateStock = async (id: string, newQty: number) => {
    await supabase.from('inventory').update({ quantity: newQty }).eq('id', id);
    const { data } = await supabase.from('inventory').select('*').order('name');
    if (data) setInventory(data);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-300 font-mono p-4 uppercase italic selection:bg-yellow-500 selection:text-black">
      <div className="max-w-xl mx-auto pb-32">

        {/* --- HEADER NAVIGATION --- */}
        {view !== "home" && (
          <nav className="flex justify-between items-center mb-12 pt-4 border-b border-zinc-900 pb-4">
            <button onClick={() => setView(view === "detail" ? "library" : "home")} className="text-[10px] font-black hover:text-yellow-500 transition-all flex items-center gap-2">
              <span className="text-lg">←</span> RETURN_{view === "detail" ? "RECETTES" : "MENU"}
            </button>
            <div className="flex flex-col items-end">
                <span className="text-[8px] text-zinc-700 font-black tracking-widest leading-none">BREW_CONTROL</span>
                <span className="text-[6px] text-zinc-800 font-black">V3.0_STABLE</span>
            </div>
          </nav>
        )}

        {/* --- HOME VIEW --- */}
        {view === "home" && (
          <div className="pt-32 animate-in fade-in slide-in-from-bottom-6 duration-700">
            <h1 className="text-[80px] font-black text-white leading-[0.7] mb-20 tracking-tighter italic">
              BREW<br/><span className="text-yellow-500">MASTER_</span>
            </h1>
            <div className="grid grid-cols-1 gap-6">
              <button onClick={() => setView("library")} className="group bg-white text-black p-10 font-black text-3xl hover:bg-yellow-500 flex justify-between items-center transition-all italic">
                <span>RECETTES</span>
                <span className="transform group-hover:translate-x-2 transition-transform">→</span>
              </button>
              <button onClick={() => setView("stock")} className="border-2 border-zinc-900 p-10 font-black text-zinc-500 text-2xl hover:text-white hover:border-zinc-700 transition-all text-left">
                GESTION_DES_STOCKS
              </button>
            </div>
          </div>
        )}

        {/* --- GESTION DES STOCKS (Nettoyée) --- */}
        {view === "stock" && (
          <div className="animate-in fade-in duration-500">
            <h2 className="text-4xl font-black text-white mb-10 italic tracking-tighter">STOCK_STATUS</h2>
            <div className="space-y-2">
              {inventory.map(item => (
                <div key={item.id} className="grid grid-cols-12 items-center bg-zinc-950 p-4 border border-zinc-900 hover:border-zinc-700 transition-colors">
                  <div className="col-span-6 flex flex-col">
                    <span className="text-lg font-black text-white leading-tight">{item.name}</span>
                    <span className="text-[8px] text-yellow-600 font-bold tracking-widest">{item.unit}</span>
                  </div>
                  <div className="col-span-3">
                    {/* INPUT SIMPLE SANS SPINNERS */}
                    <input 
                      type="number" 
                      placeholder="+/-" 
                      className="w-full bg-black border border-zinc-800 p-2 text-xs text-center text-green-500 font-black outline-none focus:border-green-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter') {
                          const val = parseFloat(e.currentTarget.value);
                          if (!isNaN(val)) {
                            await updateStock(item.id, item.quantity + val);
                            e.currentTarget.value = "";
                          }
                        }
                      }}
                    />
                  </div>
                  <div className="col-span-3 text-right">
                    <span className="text-[7px] text-zinc-700 block font-black uppercase mb-1">TOTAL</span>
                    <span className="text-xl font-black text-white tabular-nums tracking-tighter">{item.quantity}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- RECETTES (Library) --- */}
        {view === "library" && (
          <div className="animate-in fade-in duration-500">
            <h2 className="text-4xl font-black text-white mb-10 italic tracking-tighter">BIBLIOTHÈQUE_RECETTES</h2>
            <div className="grid grid-cols-1 gap-3">
              {recipes.map(r => (
                <button 
                  key={r.id} 
                  onClick={() => { setSelected(r); setView("detail"); }} 
                  className="group w-full border border-zinc-900 bg-zinc-950/40 hover:border-yellow-500 p-8 text-left transition-all relative overflow-hidden"
                >
                  <div className="absolute right-0 top-0 p-2 opacity-10 group-hover:opacity-100 transition-opacity">
                      <span className="text-3xl font-black italic">OPEN_</span>
                  </div>
                  <span className="text-[8px] text-zinc-700 block mb-2 font-black tracking-[0.4em]">RECIPE_ID_{r.id.slice(0,4)}</span>
                  <span className="text-3xl font-black text-zinc-400 group-hover:text-white tracking-tighter italic uppercase">{r.data.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* --- DÉTAIL / COCKPIT --- */}
        {view === "detail" && selected && (
          <div className="animate-in slide-in-from-right-4 duration-500">
             <div className="flex flex-col mb-12">
                <span className="text-yellow-500 font-black text-[10px] tracking-widest mb-2">READY_TO_BREW</span>
                <h2 className="text-6xl font-black text-white italic tracking-tighter leading-[0.8] mb-6">{selected.data.name}</h2>
                <button onClick={() => alert("Lancement de la session...")} className="bg-white text-black py-6 font-black text-lg hover:bg-yellow-500 transition-all italic">
                   LANCER_LA_SESSION_DE_BRASSAGE
                </button>
             </div>

             <div className="grid grid-cols-3 gap-px bg-zinc-900 border border-zinc-900 mb-16 shadow-2xl">
                <StatBadge label="EAU_EMPÂTAGE" value={`${selected.data.eauE}L`} />
                <StatBadge label="EAU_RINÇAGE" value={`${selected.data.eauR}L`} />
                <StatBadge label="OBJECTIF_ABV" value={`${selected.data.stats?.abv || '--'}%`} color="text-yellow-500" />
             </div>

             {/* Steps... (On garde la logique des steps mais avec ce nouveau style propre) */}
          </div>
        )}

      </div>
    </div>
  );
}