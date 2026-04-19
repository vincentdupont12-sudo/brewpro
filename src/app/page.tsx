"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

// --- TYPES ---
type IngType = "MALT" | "HOUBLON" | "LEVURE" | "SEL" | "SUCRE";

interface Ingredient { name: string; qty: string; type?: IngType; }
interface Step { id: string; type: "PALIER" | "ACTION"; title: string; instruction: string; target: string; value: string; ingredients: Ingredient[]; }
interface Recipe { id: string; name: string; eauE: string; eauR: string; steps: Step[]; stats?: { abv: string; ebc: string; ibu: string }; }
interface StockItem { id: string; name: string; quantity: number; unit: string; type: IngType; }

// --- COMPOSANTS UNITAIRES ---

function StatBadge({ label, value, color = "text-blue-500" }: { label: string, value: string | number, color?: string }) {
  return (
    <div className="bg-zinc-950 p-4 border border-zinc-900 shadow-inner">
      <span className="text-[7px] block text-zinc-600 font-black uppercase tracking-tighter mb-1">{label}</span>
      <span className={`text-2xl font-black ${color} tracking-tighter tabular-nums`}>{value}</span>
    </div>
  );
}

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

// --- COMPOSANT PRINCIPAL ---

export default function BrewMaster() {
  const [view, setView] = useState("home");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selected, setSelected] = useState<Recipe | null>(null);
  const [inventory, setInventory] = useState<StockItem[]>([]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [r, i] = await Promise.all([
      supabase.from('recipes').select('*').order('created_at', { ascending: false }),
      supabase.from('inventory').select('*').order('name')
    ]);
    if (r.data) setRecipes(r.data.map(i => ({ id: i.id, ...i.data })));
    if (i.data) setInventory(i.data);
  };

  const updateStock = async (id: string, newQty: number) => {
    await supabase.from('inventory').update({ quantity: newQty }).eq('id', id);
    fetchData();
  };

  const consumeBatch = async (ings: Ingredient[]) => {
    if (!confirm("DÉDUIRE CES INGRÉDIENTS DU STOCK ?")) return;
    const updates = ings.map(ing => {
      const item = inventory.find(i => i.name.toUpperCase() === ing.name.toUpperCase());
      if (item) return supabase.from('inventory').update({ quantity: item.quantity - parseFloat(ing.qty.replace(',', '.')) }).eq('id', item.id);
      return null;
    }).filter(Boolean);
    await Promise.all(updates);
    fetchData();
    alert("STOCK ACTUALISÉ");
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
          <nav className="flex justify-between items-center mb-12 pt-4 border-b border-zinc-900 pb-4">
            <button onClick={() => setView(view === "detail" ? "library" : "home")} className="text-[10px] font-black hover:text-yellow-500 transition-all italic">← RETURN_{view === "detail" ? "RECETTES" : "MENU"}</button>
            <span className="text-[8px] text-zinc-800 font-black tracking-[0.5em]">BREW_LAB_V3</span>
          </nav>
        )}

        {/* --- HOME --- */}
        {view === "home" && (
          <div className="pt-32 animate-in fade-in slide-in-from-bottom-6 duration-700">
            <h1 className="text-[80px] font-black text-white leading-[0.7] mb-20 tracking-tighter italic">BREW<br/><span className="text-yellow-500">MASTER_</span></h1>
            <div className="flex flex-col gap-6">
              <button onClick={() => setView("library")} className="group bg-white text-black p-10 font-black text-3xl hover:bg-yellow-500 flex justify-between items-center transition-all italic">
                <span>RECETTES</span><span className="group-hover:translate-x-2 transition-transform">→</span>
              </button>
              <button onClick={() => setView("stock")} className="border-2 border-zinc-900 p-10 font-black text-zinc-500 text-2xl hover:text-white hover:border-zinc-700 transition-all text-left">GESTION_STOCKS</button>
            </div>
          </div>
        )}

        {/* --- GESTION DES STOCKS --- */}
        {view === "stock" && (
          <div className="animate-in fade-in duration-500">
            <h2 className="text-4xl font-black text-white mb-10 italic tracking-tighter">INVENTAIRE_MP</h2>
            <div className="space-y-2">
              {inventory.map(item => (
                <div key={item.id} className="grid grid-cols-12 items-center bg-zinc-950 p-4 border border-zinc-900">
                  <div className="col-span-5 flex flex-col">
                    <div className="flex items-center gap-2">
                      <div className={`w-1 h-1 ${getTypeColor(item.type)}`} />
                      <span className="text-lg font-black text-white leading-tight">{item.name}</span>
                    </div>
                    <span className="text-[7px] text-zinc-600 font-bold">{item.type} | {item.unit}</span>
                  </div>
                  <div className="col-span-4 px-2">
                    <input type="number" placeholder="+ REAPPRO" className="w-full bg-black border border-zinc-800 p-2 text-xs text-green-500 font-black outline-none focus:border-green-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      onKeyDown={async (e) => { if (e.key === 'Enter') { const val = parseFloat(e.currentTarget.value); if (!isNaN(val)) { await updateStock(item.id, item.quantity + val); e.currentTarget.value = ""; } } }} />
                  </div>
                  <div className="col-span-3 text-right">
                    <span className="text-[7px] text-zinc-800 block font-black">STOCK</span>
                    <span className={`text-xl font-black tabular-nums ${item.quantity <= 0 ? 'text-red-600 animate-pulse' : 'text-white'}`}>{item.quantity.toFixed(1)}</span>
                  </div>
                </div>
              ))}
              <button onClick={async () => {
                const name = prompt("NOM ?")?.toUpperCase();
                const type = prompt("TYPE (MALT, HOUBLON, LEVURE, SEL, SUCRE) ?")?.toUpperCase() as IngType;
                const unit = prompt("UNITÉ (KG, G, L) ?")?.toUpperCase();
                if(name && type) await supabase.from('inventory').insert([{ name, type, unit, quantity: 0 }]);
                fetchData();
              }} className="w-full border border-dashed border-zinc-800 p-6 text-[10px] font-black text-zinc-700 hover:text-white mt-4 tracking-widest">+ ENREGISTRER_NOUVELLE_MP</button>
            </div>
          </div>
        )}

        {/* --- BIBLIOTHÈQUE --- */}
        {view === "library" && (
          <div className="animate-in fade-in duration-500 space-y-3">
            <h2 className="text-4xl font-black text-white mb-10 italic tracking-tighter">LISTE_DES_RECETTES</h2>
            {recipes.map(r => (
              <button key={r.id} onClick={() => { setSelected(r); setView("detail"); }} className="group w-full border border-zinc-900 bg-zinc-950/40 hover:border-yellow-500 p-8 text-left transition-all italic">
                <span className="text-3xl font-black text-zinc-500 group-hover:text-white tracking-tighter uppercase">{r.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* --- DETAIL / SESSION --- */}
        {view === "detail" && selected && (
          <div className="animate-in slide-in-from-right-4 duration-500 pb-20">
            <h2 className="text-6xl font-black text-white italic tracking-tighter leading-[0.8] mb-8 uppercase">{selected.name}</h2>
            <div className="grid grid-cols-3 gap-px bg-zinc-900 border border-zinc-900 mb-12 shadow-2xl">
              <StatBadge label="EAU_MASH" value={`${selected.eauE}L`} />
              <StatBadge label="EAU_RINSE" value={`${selected.eauR}L`} />
              <StatBadge label="EST_ABV" value={`${selected.stats?.abv || '--'}%`} color="text-yellow-500" />
            </div>

            <div className="space-y-12">
              {selected.steps.map((s, idx) => (
                <div key={idx} className="relative pl-8 border-l border-zinc-900 group">
                  <div className={`absolute -left-[3px] top-0 w-[5px] h-[5px] ${s.type === 'PALIER' ? 'bg-yellow-500' : 'bg-blue-600'}`} />
                  <span className="text-[8px] font-black text-zinc-700 tracking-widest uppercase mb-1 block">{s.type}</span>
                  <h3 className="text-2xl font-black text-white italic mb-2 uppercase">{s.title}</h3>
                  <p className="text-[11px] text-zinc-500 italic lowercase mb-4 leading-relaxed">{s.instruction}</p>

                  {s.ingredients?.length > 0 && (
                    <div className="bg-zinc-950/50 p-4 border border-zinc-900 mb-4">
                      <div className="space-y-1 mb-4">
                        {s.ingredients.map((ing, i) => {
                          const st = inventory.find(it => it.name.toUpperCase() === ing.name.toUpperCase());
                          return (
                            <div key={i} className="flex justify-between text-[10px] font-black italic uppercase">
                              <span className={st && st.quantity < parseFloat(ing.qty) ? "text-red-500" : "text-zinc-500"}>{ing.name}</span>
                              <span className="text-yellow-600">{ing.qty} {st?.unit}</span>
                            </div>
                          );
                        })}
                      </div>
                      <button onClick={() => consumeBatch(s.ingredients)} className="w-full py-2 bg-zinc-900 text-zinc-500 text-[8px] font-black hover:bg-white hover:text-black transition-all tracking-widest border border-zinc-800">CONSOMMER_STOCK_ETAPE</button>
                    </div>
                  )}

                  <div className="flex gap-4 items-center">
                    {s.target && <div className="bg-black border border-zinc-800 p-3 min-w-[70px] text-center"><span className="text-[6px] text-zinc-700 block font-black uppercase">TARGET</span><span className="text-sm font-black text-white">{s.target}</span></div>}
                    {s.value && parseInt(s.value) > 0 && <BrewTimer minutes={parseInt(s.value)} />}
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