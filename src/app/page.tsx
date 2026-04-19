"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

// --- TYPES ---
type IngType = "MALT" | "HOUBLON" | "LEVURE" | "SEL" | "SUCRE";

interface Ingredient { name: string; qty: string; type?: IngType; }
interface Step { id: string; type: "PALIER" | "ACTION"; title: string; instruction: string; target: string; value: string; ingredients: Ingredient[]; }
interface Recipe { id: string; name: string; eauE: string; eauR: string; steps: Step[]; stats?: { abv: string; ebc: string; ibu: string }; }
interface StockItem { id: string; name: string; quantity: number; unit: string; type: IngType; metadata?: { ebc?: number; alpha?: number }; }

// --- UI COMPONENTS ---

const StatBadge = ({ label, value, color = "text-blue-500" }: { label: string, value: string | number, color?: string }) => (
  <div className="bg-zinc-950 p-4 border border-zinc-900 shadow-inner">
    <span className="text-[7px] block text-zinc-600 font-black uppercase tracking-tighter mb-1">{label}</span>
    <span className={`text-2xl font-black ${color} tracking-tighter tabular-nums`}>{value}</span>
  </div>
);

function BrewTimer({ minutes }: { minutes: number }) {
  const [sec, setSec] = useState(minutes * 60);
  const [on, setOn] = useState(false);
  useEffect(() => { setSec(minutes * 60); setOn(false); }, [minutes]);
  useEffect(() => {
    let t: any;
    if (on && sec > 0) t = setInterval(() => setSec(s => s - 1), 1000);
    return () => clearInterval(t);
  }, [on, sec]);
  const fmt = (s: number) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;
  return (
    <div className="flex gap-4 items-center bg-black p-3 border border-zinc-800">
      <span className={`text-xl font-black tabular-nums ${sec === 0 ? 'text-red-600 animate-pulse' : 'text-yellow-500'}`}>{fmt(sec)}</span>
      <button onClick={() => setOn(!on)} className={`px-4 py-1 text-[8px] font-black ${on ? 'bg-zinc-800 text-white' : 'bg-yellow-500 text-black'}`}>{on ? "STOP" : "START"}</button>
    </div>
  );
}

// --- MAIN COMPONENT ---

export default function BrewMaster() {
  const [view, setView] = useState("home");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selected, setSelected] = useState<Recipe | null>(null);
  const [inventory, setInventory] = useState<StockItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", type: "MALT" as IngType, unit: "KG", ebc: 0, alpha: 0 });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [r, i] = await Promise.all([
      supabase.from('recipes').select('*').order('created_at', { ascending: false }),
      supabase.from('inventory').select('*').order('name')
    ]);
    if (r.data) setRecipes(r.data.map(item => ({ id: item.id, ...item.data })));
    if (i.data) setInventory(i.data);
  };

  const updateStockValue = async (id: string, newQty: number) => {
    await supabase.from('inventory').update({ quantity: newQty }).eq('id', id);
    fetchData();
  };

  const saveNewMP = async () => {
    if (!newItem.name) return;
    const meta = newItem.type === "MALT" ? { ebc: newItem.ebc } : newItem.type === "HOUBLON" ? { alpha: newItem.alpha } : {};
    const { error } = await supabase.from('inventory').insert([{
      name: newItem.name.toUpperCase(), type: newItem.type, unit: newItem.unit, quantity: 0, metadata: meta
    }]);
    if (!error) { setShowModal(false); setNewItem({ name: "", type: "MALT", unit: "KG", ebc: 0, alpha: 0 }); fetchData(); }
  };

  const consumeStepStock = async (ings: Ingredient[]) => {
    if (!confirm("VALIDER LA CONSOMMATION ?")) return;
    const updates = ings.map(ing => {
      const item = inventory.find(i => i.name.toUpperCase() === ing.name.toUpperCase());
      if (item) return supabase.from('inventory').update({ quantity: item.quantity - parseFloat(ing.qty.replace(',', '.')) }).eq('id', item.id);
      return null;
    }).filter(Boolean);
    await Promise.all(updates);
    fetchData();
  };

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-300 font-mono p-4 uppercase italic selection:bg-yellow-500">
      <div className="max-w-xl mx-auto pb-32">
        
        {/* TOP NAV */}
        {view !== "home" && (
          <nav className="flex justify-between items-center mb-12 pt-4 border-b border-zinc-900 pb-4">
            <button onClick={() => setView(view === "detail" ? "library" : "home")} className="text-[10px] font-black hover:text-yellow-500">← RETURN_{view === "detail" ? "RECETTES" : "MENU"}</button>
            <span className="text-[8px] text-zinc-800 font-black tracking-[0.5em]">OPERATOR_UNIT_V3</span>
          </nav>
        )}

        {/* HOME VIEW */}
        {view === "home" && (
          <div className="pt-32 animate-in fade-in slide-in-from-bottom-6 duration-700">
            <h1 className="text-[80px] font-black text-white leading-[0.7] mb-20 tracking-tighter italic">BREW<br/><span className="text-yellow-500">MASTER_</span></h1>
            <div className="flex flex-col gap-6">
              <button onClick={() => setView("library")} className="group bg-white text-black p-10 font-black text-3xl hover:bg-yellow-500 flex justify-between items-center">
                <span>RECETTES</span><span className="group-hover:translate-x-2 transition-transform">→</span>
              </button>
              <button onClick={() => setView("stock")} className="border-2 border-zinc-900 p-10 font-black text-zinc-500 text-2xl hover:text-white hover:border-zinc-700 transition-all text-left uppercase">Gestion_Stocks</button>
            </div>
          </div>
        )}

        {/* STOCK VIEW */}
        {view === "stock" && (
          <div className="animate-in fade-in duration-500">
            <div className="flex justify-between items-end mb-10">
              <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase">Stock_Status</h2>
              <button onClick={() => setShowModal(true)} className="bg-yellow-500 text-black px-4 py-2 font-black text-[10px] italic">+ AJOUTER_MP</button>
            </div>
            <div className="space-y-2">
              {inventory.map(item => (
                <div key={item.id} className="grid grid-cols-12 items-center bg-zinc-950 p-4 border border-zinc-900">
                  <div className="col-span-6 flex flex-col">
                    <span className="text-lg font-black text-white truncate">{item.name}</span>
                    <span className="text-[7px] text-zinc-600 font-bold uppercase">{item.type} | {item.unit} {item.metadata?.ebc ? `| ${item.metadata.ebc} EBC` : ''}</span>
                  </div>
                  <div className="col-span-3 px-2">
                    <input type="number" placeholder="+/-" className="w-full bg-black border border-zinc-800 p-2 text-xs text-green-500 font-black outline-none focus:border-green-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      onKeyDown={async (e) => { if (e.key === 'Enter') { const v = parseFloat(e.currentTarget.value); if(!isNaN(v)) { await updateStockValue(item.id, item.quantity + v); e.currentTarget.value = ""; } } }} />
                  </div>
                  <div className="col-span-3 text-right">
                    <span className={`text-xl font-black tabular-nums ${item.quantity <= 0 ? 'text-red-600 animate-pulse' : 'text-white'}`}>{item.quantity.toFixed(1)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RECIPES LIST */}
        {view === "library" && (
          <div className="space-y-3 animate-in fade-in duration-500">
            <h2 className="text-4xl font-black text-white mb-10 italic tracking-tighter uppercase">Bibliothèque</h2>
            {recipes.map(r => (
              <button key={r.id} onClick={() => { setSelected(r); setView("detail"); }} className="group w-full border border-zinc-900 bg-zinc-950/40 p-8 text-left hover:border-yellow-500 transition-all">
                <span className="text-3xl font-black text-zinc-400 group-hover:text-white tracking-tighter uppercase">{r.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* COCKPIT / DETAIL */}
        {view === "detail" && selected && (
          <div className="animate-in slide-in-from-right-4 duration-500">
            <h2 className="text-6xl font-black text-white italic tracking-tighter leading-[0.8] mb-8 uppercase">{selected.name}</h2>
            <div className="grid grid-cols-3 gap-px bg-zinc-900 border border-zinc-900 mb-12 shadow-2xl">
              <StatBadge label="EAU_MASH" value={`${selected.eauE}L`} />
              <StatBadge label="EAU_RINSE" value={`${selected.eauR}L`} />
              <StatBadge label="ABV_TARGET" value={`${selected.stats?.abv || '--'}%`} color="text-yellow-500" />
            </div>
            <div className="space-y-12">
              {selected.steps?.map((s, idx) => (
                <div key={idx} className="pl-8 border-l border-zinc-900 relative">
                  <div className={`absolute -left-[3px] top-0 w-[5px] h-[5px] ${s.type === 'PALIER' ? 'bg-yellow-500' : 'bg-blue-600'}`} />
                  <span className="text-[8px] font-black text-zinc-700 tracking-widest uppercase mb-1 block">{s.type}</span>
                  <h3 className="text-2xl font-black text-white italic mb-2 uppercase">{s.title || 'SANS TITRE'}</h3>
                  <p className="text-[11px] text-zinc-500 lowercase italic mb-4 leading-relaxed">{s.instruction}</p>
                  
                  {s.ingredients?.length > 0 && (
                    <div className="bg-zinc-950 p-4 border border-zinc-900 mb-4">
                      {s.ingredients.map((ing, i) => {
                         const st = inventory.find(it => it.name.toUpperCase() === ing.name.toUpperCase());
                         return (
                          <div key={i} className="flex justify-between text-[10px] font-black uppercase mb-1">
                            <span className={st && st.quantity < parseFloat(ing.qty) ? "text-red-500" : "text-zinc-500"}>{ing.name}</span>
                            <span className="text-yellow-600">{ing.qty} {st?.unit || ''}</span>
                          </div>
                         );
                      })}
                      <button onClick={() => consumeStepStock(s.ingredients)} className="w-full py-2 mt-4 bg-zinc-900 text-zinc-600 text-[8px] font-black hover:bg-white hover:text-black border border-zinc-800 uppercase tracking-widest">DÉDUIRE_STOCK_ÉTAPE</button>
                    </div>
                  )}

                  <div className="flex gap-4 items-center">
                    {s.target && <div className="bg-black border border-zinc-800 p-3 min-w-[70px] text-center"><span className="text-[6px] text-zinc-700 block font-black uppercase tracking-tighter">TARGET</span><span className="text-sm font-black text-white">{s.target}</span></div>}
                    {s.value && parseInt(s.value) > 0 && <BrewTimer minutes={parseInt(s.value)} />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* MODAL AJOUT MP */}
      {showModal && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-zinc-950 border border-zinc-800 p-8 w-full max-w-md shadow-2xl">
            <h3 className="text-2xl font-black text-white mb-8 italic uppercase border-b border-zinc-900 pb-4 tracking-tighter">Nouveau_Composant</h3>
            <div className="space-y-6">
              <input autoFocus placeholder="DÉSIGNATION" className="w-full bg-zinc-900 border border-zinc-800 p-3 text-white font-black uppercase italic outline-none focus:border-yellow-500" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <select className="bg-zinc-900 border border-zinc-800 p-3 text-white font-black italic outline-none" value={newItem.type} onChange={e => setNewItem({...newItem, type: e.target.value as IngType})}>
                  <option value="MALT">MALT</option><option value="HOUBLON">HOUBLON</option><option value="LEVURE">LEVURE</option><option value="SEL">SEL</option><option value="SUCRE">SUCRE</option>
                </select>
                <select className="bg-zinc-900 border border-zinc-800 p-3 text-white font-black italic outline-none" value={newItem.unit} onChange={e => setNewItem({...newItem, unit: e.target.value})}>
                  <option value="KG">KG</option><option value="G">G</option><option value="L">L</option><option value="U">UNITÉ</option>
                </select>
              </div>
              {newItem.type === "MALT" && <input type="number" placeholder="EBC" className="w-full bg-zinc-900 border border-zinc-800 p-3 text-white font-black italic outline-none" onChange={e => setNewItem({...newItem, ebc: +e.target.value})} />}
              {newItem.type === "HOUBLON" && <input type="number" placeholder="ALPHA %" className="w-full bg-zinc-900 border border-zinc-800 p-3 text-white font-black italic outline-none" onChange={e => setNewItem({...newItem, alpha: +e.target.value})} />}
              <div className="flex gap-4 pt-4">
                <button onClick={() => setShowModal(false)} className="flex-1 border border-zinc-800 p-4 text-[10px] font-black uppercase italic">ANNULER</button>
                <button onClick={saveNewMP} className="flex-1 bg-white text-black p-4 text-[10px] font-black hover:bg-yellow-500 uppercase italic tracking-widest">ENREGISTRER</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}