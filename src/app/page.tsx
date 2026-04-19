"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

// --- TYPES ---
type IngType = "MALT" | "HOUBLON" | "LEVURE" | "SEL" | "SUCRE";

interface StockItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  type: IngType;
  metadata?: { ebc?: number; alpha?: number; note?: string };
}

export default function BrewMaster() {
  const [view, setView] = useState("home");
  const [inventory, setInventory] = useState<StockItem[]>([]);
  
  // États pour la nouvelle Modal
  const [showModal, setShowModal] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", type: "MALT" as IngType, unit: "KG", ebc: 0, alpha: 0 });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const { data } = await supabase.from('inventory').select('*').order('name');
    if (data) setInventory(data);
  };

  const saveNewItem = async () => {
    if (!newItem.name) return alert("NOM REQUIS");
    
    const meta: any = {};
    if (newItem.type === "MALT") meta.ebc = newItem.ebc;
    if (newItem.type === "HOUBLON") meta.alpha = newItem.alpha;

    const { error } = await supabase.from('inventory').insert([{
      name: newItem.name.toUpperCase(),
      type: newItem.type,
      unit: newItem.unit,
      quantity: 0,
      metadata: meta
    }]);

    if (!error) {
      setShowModal(false);
      setNewItem({ name: "", type: "MALT", unit: "KG", ebc: 0, alpha: 0 });
      fetchData();
    }
  };

  const getTypeColor = (type: string) => {
    const colors: any = { MALT: 'bg-orange-500', HOUBLON: 'bg-green-500', LEVURE: 'bg-yellow-500', SEL: 'bg-blue-400', SUCRE: 'bg-white' };
    return colors[type] || 'bg-zinc-600';
  };

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-300 font-mono p-4 uppercase italic">
      <div className="max-w-xl mx-auto pb-32">
        
        {/* --- NAVIGATION --- */}
        {view !== "home" && (
            <button onClick={() => setView("home")} className="text-[10px] font-black mb-12 border-b border-zinc-900 pb-2 flex items-center gap-2 italic">
                ← MENU_PRINCIPAL
            </button>
        )}

        {/* --- VUE STOCK --- */}
        {view === "stock" && (
          <div className="animate-in fade-in duration-500">
            <div className="flex justify-between items-end mb-10">
                <h2 className="text-4xl font-black text-white italic tracking-tighter">INVENTAIRE_MP</h2>
                <button onClick={() => setShowModal(true)} className="bg-yellow-500 text-black px-4 py-2 font-black text-[10px] italic">
                    + AJOUTER_MP
                </button>
            </div>

            <div className="space-y-2">
              {inventory.map(item => (
                <div key={item.id} className="grid grid-cols-12 items-center bg-zinc-950 p-4 border border-zinc-900 shadow-xl">
                  <div className="col-span-6">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-1 h-1 ${getTypeColor(item.type)}`} />
                      <span className="text-lg font-black text-white leading-tight tracking-tight">{item.name}</span>
                    </div>
                    <div className="flex gap-3 text-[7px] text-zinc-600 font-black italic">
                        <span>{item.type}</span>
                        {item.metadata?.ebc && <span>EBC: {item.metadata.ebc}</span>}
                        {item.metadata?.alpha && <span>ALPHA: {item.metadata.alpha}%</span>}
                    </div>
                  </div>
                  <div className="col-span-3 text-right border-l border-zinc-900 px-4">
                     <span className="text-[6px] text-zinc-800 block font-black">UNITÉ</span>
                     <span className="text-xs font-black text-zinc-400 uppercase tracking-widest">{item.unit}</span>
                  </div>
                  <div className="col-span-3 text-right">
                    <span className="text-[6px] text-zinc-800 block font-black">DISPO</span>
                    <span className={`text-xl font-black tabular-nums ${item.quantity <= 0 ? 'text-red-600 animate-pulse' : 'text-white'}`}>
                        {item.quantity.toFixed(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- MODAL D'AJOUT (Le coup de propre) --- */}
        {showModal && (
          <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-zinc-950 border border-zinc-800 p-8 w-full max-w-md shadow-2xl">
              <h3 className="text-2xl font-black text-white mb-8 italic tracking-tighter uppercase border-b border-zinc-900 pb-4">Nouveau_Composant</h3>
              
              <div className="space-y-6">
                {/* NOM */}
                <div>
                  <label className="text-[8px] font-black text-zinc-600 block mb-2">DÉSIGNATION</label>
                  <input autoFocus className="w-full bg-zinc-900 border border-zinc-800 p-3 text-white outline-none focus:border-yellow-500 font-black italic uppercase" 
                         value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* TYPE */}
                  <div>
                    <label className="text-[8px] font-black text-zinc-600 block mb-2">CATÉGORIE</label>
                    <select className="w-full bg-zinc-900 border border-zinc-800 p-3 text-white outline-none focus:border-yellow-500 font-black italic"
                            value={newItem.type} onChange={e => setNewItem({...newItem, type: e.target.value as IngType})}>
                      <option value="MALT">MALT</option>
                      <option value="HOUBLON">HOUBLON</option>
                      <option value="LEVURE">LEVURE</option>
                      <option value="SEL">SEL</option>
                      <option value="SUCRE">SUCRE</option>
                    </select>
                  </div>
                  {/* UNITÉ */}
                  <div>
                    <label className="text-[8px] font-black text-zinc-600 block mb-2">UNITÉ_STOCK</label>
                    <select className="w-full bg-zinc-900 border border-zinc-800 p-3 text-white outline-none focus:border-yellow-500 font-black italic"
                            value={newItem.unit} onChange={e => setNewItem({...newItem, unit: e.target.value})}>
                      <option value="KG">KILOGRAMMES (KG)</option>
                      <option value="G">GRAMMES (G)</option>
                      <option value="L">LITRES (L)</option>
                      <option value="UNIT">UNITÉS (U)</option>
                    </select>
                  </div>
                </div>

                {/* CHAMPS TECHNIQUES CONDITIONNELS */}
                {newItem.type === "MALT" && (
                  <div className="animate-in slide-in-from-top-2 duration-300">
                    <label className="text-[8px] font-black text-orange-500 block mb-2">COULEUR (EBC)</label>
                    <input type="number" className="w-full bg-zinc-900 border border-orange-900/30 p-3 text-white outline-none focus:border-orange-500 font-black italic" 
                           value={newItem.ebc} onChange={e => setNewItem({...newItem, ebc: +e.target.value})} />
                  </div>
                )}

                {newItem.type === "HOUBLON" && (
                  <div className="animate-in slide-in-from-top-2 duration-300">
                    <label className="text-[8px] font-black text-green-500 block mb-2">ACIDES ALPHA (%)</label>
                    <input type="number" className="w-full bg-zinc-900 border border-green-900/30 p-3 text-white outline-none focus:border-green-500 font-black italic" 
                           value={newItem.alpha} onChange={e => setNewItem({...newItem, alpha: +e.target.value})} />
                  </div>
                )}

                <div className="flex gap-4 pt-4">
                   <button onClick={() => setShowModal(false)} className="flex-1 border border-zinc-800 p-4 text-[10px] font-black text-zinc-600 hover:bg-zinc-900 transition-all uppercase italic">ANNULER</button>
                   <button onClick={saveNewItem} className="flex-1 bg-white text-black p-4 text-[10px] font-black hover:bg-yellow-500 transition-all uppercase italic tracking-widest">ENREGISTRER_MP</button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}