"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

// --- TYPES ---
type IngType = "MALT" | "HOUBLON" | "LEVURE" | "SEL" | "SUCRE";

interface Ingredient { 
  name: string; 
  qty: string; 
  type?: IngType; 
}

interface Step { 
  id: string; 
  type: "PALIER" | "ACTION"; 
  title: string; 
  instruction: string; 
  target: string; 
  value: string; 
  ingredients: Ingredient[]; 
}

interface Recipe { 
  id: string; 
  name: string; 
  eauE: string; 
  eauR: string; 
  steps: Step[]; 
  stats?: { abv: string; ebc: string; ibu: string }; 
}

interface StockItem { 
  id: string; 
  name: string; 
  quantity: number; 
  unit: string; 
  type: IngType; 
  metadata?: { ebc?: number; alpha?: number }; 
}

// --- COMPOSANTS DE STRUCTURE ---

const StatBadge = ({ label, value, color = "text-blue-500" }: { label: string, value: string | number, color?: string }) => (
  <div className="bg-zinc-950 p-4 border border-zinc-900">
    <span className="text-[7px] block text-zinc-600 font-black uppercase tracking-tighter mb-1">{label}</span>
    <span className={`text-2xl font-black ${color} tracking-tighter tabular-nums`}>{value}</span>
  </div>
);

// --- COMPOSANT PRINCIPAL ---

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
    if (!newItem.name) return alert("NOM MANQUANT");
    const meta = newItem.type === "MALT" ? { ebc: newItem.ebc } : newItem.type === "HOUBLON" ? { alpha: newItem.alpha } : {};
    const { error } = await supabase.from('inventory').insert([{
      name: newItem.name.toUpperCase(),
      type: newItem.type,
      unit: newItem.unit,
      quantity: 0,
      metadata: meta
    }]);
    if (!error) { setShowModal(false); setNewItem({ name: "", type: "MALT", unit: "KG", ebc: 0, alpha: 0 }); fetchData(); }
  };

  const consumeStepStock = async (ings: Ingredient[]) => {
    if (!confirm("DÉDUIRE CES MP DU STOCK ?")) return;
    const updates = ings.map(ing => {
      const item = inventory.find(i => i.name.toUpperCase() === ing.name.toUpperCase());
      if (item) return supabase.from('inventory').update({ quantity: item.quantity - parseFloat(ing.qty.replace(',', '.')) }).eq('id', item.id);
      return null;
    }).filter(Boolean);
    await Promise.all(updates);
    fetchData();
    alert("STOCK ACTUALISÉ");
  };

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-300 font-mono p-4 uppercase italic">
      <div className="max-w-xl mx-auto pb-32">
        
        {/* NAV */}
        {view !== "home" && (
          <nav className="flex justify-between items-center mb-12 pt-4 border-b border-zinc-900 pb-4">
            <button onClick={() => setView(view === "detail" ? "library" : "home")} className="text-[10px] font-black hover:text-yellow-500 italic">← RETURN_{view === "detail" ? "RECETTES" : "MENU"}</button>
            <span className="text-[8px] text-zinc-800 font-black tracking-[0.5em]">SYSTEM_V3.1</span>
          </nav>
        )}

        {/* HOME */}
        {view === "home" && (
          <div className="pt-32 animate-in fade-in slide-in-from-bottom-6 duration-700">
            <h1 className="text-[80px] font-black text-white leading-[0.7] mb-20 tracking-tighter italic">BREW<br/><span className="text-yellow-500">MASTER_</span></h1>
            <div className="flex flex-col gap-6">
              <button onClick={() => setView("library")} className="group bg-white text-black p-10 font-black text-3xl hover:bg-yellow-500 flex justify-between items-center italic">
                <span>RECETTES</span><span className="group-hover:translate-x-2 transition-transform">→</span>
              </button>
              <button onClick={() => setView("lab")} className="border-2 border-zinc-900 p-10 font-black text-zinc-500 text-2xl hover:text-white text-left italic">LABO_CREATION</button>
              <button onClick={() => setView("stock")} className="border-2 border-zinc-900 p-10 font-black text-zinc-500 text-2xl hover:text-white text-left italic">GESTION_STOCKS</button>
            </div>
          </div>
        )}

        {/* STOCK */}
        {view === "stock" && (
          <div className="animate-in fade-in duration-500">
            <div className="flex justify-between items-end mb-10">
              <h2 className="text-4xl font-black text-white italic tracking-tighter">STOCK_STATUS</h2>
              <button onClick={() => setShowModal(true)} className="bg-yellow-500 text-black px-4 py-2 font-black text-[10px]">+ AJOUTER_MP</button>
            </div>
            <div className="space-y-2">
              {inventory.map(item => (
                <div key={item.id} className="grid grid-cols-12 items-center bg-zinc-950 p-4 border border-zinc-900">
                  <div className="col-span-6 flex flex-col">
                    <span className="text-lg font-black text-white">{item.name}</span>
                    <span className="text-[7px] text-zinc-600">{item.type} | {item.unit} {item.metadata?.ebc ? `| ${item.metadata.ebc} EBC` : ''}</span>
                  </div>
                  <div className="col-span-3 px-2">
                    <input type="number" placeholder="+/-" className="w-full bg-black border border-zinc-800 p-2 text-xs text-green-500 font-black outline-none focus:border-green-500"
                      onKeyDown={async (e) => { if (e.key === 'Enter') { const v = parseFloat(e.currentTarget.value); if(!isNaN(v)) { await updateStockValue(item.id, item.quantity + v); e.currentTarget.value = ""; } } }} />
                  </div>
                  <div className="col-span-3 text-right">
                    <span className={`text-xl font-black ${item.quantity <= 0 ? 'text-red-600 animate-pulse' : 'text-white'}`}>{item.quantity.toFixed(1)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RECETTES */}
        {view === "library" && (
          <div className="space-y-3">
            {recipes.map(r => (
              <button key={r.id} onClick={() => { setSelected(r); setView("detail"); }} className="w-full border border-zinc-900 bg-zinc-950/40 p-8 text-left hover:border-yellow-500 transition-all">
                <span className="text-3xl font-black text-white tracking-tighter uppercase">{r.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* LABO */}
        {view === "lab" && (
          <Lab inventory={inventory} onCancel={() => setView("home")} onSave={async (recipe: any) => {
            const { error } = await supabase.from('recipes').insert([{ data: recipe }]);
            if (!error) { fetchData(); setView("library"); }
          }} />
        )}

        {/* DETAIL */}
        {view === "detail" && selected && (
          <div className="animate-in slide-in-from-right-4 duration-500">
            <h2 className="text-6xl font-black text-white italic tracking-tighter mb-8">{selected.name}</h2>
            <div className="grid grid-cols-3 gap-px bg-zinc-900 border border-zinc-900 mb-12">
              <StatBadge label="EAU_MASH" value={`${selected.eauE}L`} />
              <StatBadge label="EAU_RINSE" value={`${selected.eauR}L`} />
              <StatBadge label="ABV_TARGET" value={`${selected.stats?.abv || '--'}%`} color="text-yellow-500" />
            </div>
            <div className="space-y-12">
              {selected.steps.map((s, idx) => (
                <div key={idx} className="pl-8 border-l border-zinc-900 relative">
                  <div className={`absolute -left-[3px] top-0 w-[5px] h-[5px] ${s.type === 'PALIER' ? 'bg-yellow-500' : 'bg-blue-600'}`} />
                  <h3 className="text-2xl font-black text-white mb-2">{s.title || 'SANS TITRE'}</h3>
                  <p className="text-[11px] text-zinc-500 mb-4 lowercase italic">{s.instruction}</p>
                  {s.ingredients?.length > 0 && (
                    <div className="bg-zinc-950 p-4 border border-zinc-900 mb-4">
                      {s.ingredients.map((ing, i) => (
                        <div key={i} className="flex justify-between text-[10px] font-black uppercase mb-1">
                          <span className="text-zinc-500">{ing.name}</span>
                          <span className="text-yellow-600">{ing.qty}</span>
                        </div>
                      ))}
                      <button onClick={() => consumeStepStock(s.ingredients)} className="w-full py-2 mt-4 bg-zinc-900 text-zinc-600 text-[8px] font-black hover:bg-white hover:text-black border border-zinc-800">DÉDUIRE_STOCK_ÉTAPE</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* MODAL AJOUT MP */}
      {showModal && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-zinc-950 border border-zinc-800 p-8 w-full max-w-md">
            <h3 className="text-2xl font-black text-white mb-8 italic uppercase border-b border-zinc-900 pb-4">Nouveau_Composant</h3>
            <div className="space-y-6">
              <input placeholder="NOM" className="w-full bg-zinc-900 border border-zinc-800 p-3 text-white font-black uppercase" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <select className="bg-zinc-900 border border-zinc-800 p-3 text-white font-black" value={newItem.type} onChange={e => setNewItem({...newItem, type: e.target.value as IngType})}>
                  <option value="MALT">MALT</option><option value="HOUBLON">HOUBLON</option><option value="LEVURE">LEVURE</option><option value="SEL">SEL</option><option value="SUCRE">SUCRE</option>
                </select>
                <select className="bg-zinc-900 border border-zinc-800 p-3 text-white font-black" value={newItem.unit} onChange={e => setNewItem({...newItem, unit: e.target.value})}>
                  <option value="KG">KG</option><option value="G">G</option><option value="L">L</option><option value="U">UNITÉ</option>
                </select>
              </div>
              {newItem.type === "MALT" && <input type="number" placeholder="EBC" className="w-full bg-zinc-900 border border-zinc-800 p-3 text-white font-black" onChange={e => setNewItem({...newItem, ebc: +e.target.value})} />}
              {newItem.type === "HOUBLON" && <input type="number" placeholder="ALPHA %" className="w-full bg-zinc-900 border border-zinc-800 p-3 text-white font-black" onChange={e => setNewItem({...newItem, alpha: +e.target.value})} />}
              <div className="flex gap-4 pt-4">
                <button onClick={() => setShowModal(false)} className="flex-1 border border-zinc-800 p-4 text-[10px] font-black">ANNULER</button>
                <button onClick={saveNewMP} className="flex-1 bg-white text-black p-4 text-[10px] font-black hover:bg-yellow-500">ENREGISTRER</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- LABO (SÉCURISÉ) ---
function Lab({ onSave, onCancel, inventory }: any) {
  const [name, setName] = useState("");
  const [eauE, setEauE] = useState("");
  const [eauR, setEauR] = useState("");
  const [steps, setSteps] = useState<Step[]>([]);

  const addStep = (type: "PALIER" | "ACTION") => {
    setSteps([...steps, { id: Date.now().toString(), type, title: "", instruction: "", target: "", value: "", ingredients: [] }]);
  };

  return (
    <div className="animate-in slide-in-from-bottom-8 duration-500 pb-40">
      <div className="flex justify-between items-center mb-10">
        <button onClick={onCancel} className="bg-red-950 text-red-500 px-4 py-2 text-[8px] font-black">ABORT_BATCH</button>
        <span className="text-[8px] text-zinc-800 font-black">LAB_V3.1_SECURE</span>
      </div>

      <input className="w-full bg-transparent text-5xl font-black outline-none border-b-2 border-zinc-900 mb-12 text-white placeholder:text-zinc-900 uppercase" placeholder="RECIPE_NAME" value={name} onChange={e => setName(e.target.value)} />
      
      <div className="grid grid-cols-2 gap-4 mb-10">
        <input className="bg-zinc-900/20 p-4 border border-zinc-900 text-2xl font-black text-blue-500 outline-none" placeholder="EAU_E (L)" value={eauE} onChange={e => setEauE(e.target.value)} />
        <input className="bg-zinc-900/20 p-4 border border-zinc-900 text-2xl font-black text-blue-500 outline-none text-right" placeholder="EAU_R (L)" value={eauR} onChange={e => setEauR(e.target.value)} />
      </div>

      <div className="space-y-8">
        {steps.map((s, i) => (
          <div key={s.id} className={`p-6 border-l-4 ${s.type === 'PALIER' ? 'border-yellow-600 bg-yellow-500/5' : 'border-blue-600 bg-blue-500/5'} relative`}>
            <input className="w-full bg-transparent font-black text-white text-xl mb-4 outline-none border-b border-zinc-800 placeholder:text-zinc-800 uppercase" 
                   placeholder={s.type === 'PALIER' ? "NOM_PALIER" : "NOM_ACTION"} value={s.title} onChange={e => {const n=[...steps]; n[i].title=e.target.value; setSteps(n);}} />
            
            {/* INGRÉDIENTS DANS LE LAB */}
            <div className="space-y-2 mb-4">
              {s.ingredients?.map((ing, ingIdx) => {
                const st = ing.name ? inventory.find((it: any) => it.name.toUpperCase() === ing.name.toUpperCase()) : null;
                return (
                  <div key={ingIdx} className="flex gap-2 items-center">
                    <input className="flex-1 bg-zinc-950 p-2 text-[10px] border border-zinc-900 text-zinc-400 outline-none" placeholder="NOM_MP" value={ing.name} onChange={e => {
                      const n = [...steps]; n[i].ingredients[ingIdx].name = e.target.value; setSteps(n);
                    }} />
                    <input className="w-20 bg-zinc-950 p-2 text-[10px] border border-zinc-900 text-yellow-600 text-right font-black" placeholder="QTÉ" value={ing.qty} onChange={e => {
                      const n = [...steps]; n[i].ingredients[ingIdx].qty = e.target.value; setSteps(n);
                    }} />
                    <span className="text-[8px] text-zinc-700 font-black w-8">{st?.unit || '--'}</span>
                  </div>
                );
              })}
              <button onClick={() => { const n = [...steps]; n[i].ingredients.push({ name: "", qty: "" }); setSteps(n); }} className="text-[8px] font-black text-zinc-600 hover:text-yellow-500">+ ADD_ING</button>
            </div>

            {s.type === "PALIER" && (
              <div className="grid grid-cols-2 gap-4">
                <input className="bg-black p-3 text-xs border border-zinc-800 text-yellow-500 font-black" placeholder="CIBLE (67°C)" value={s.target} onChange={e => {const n=[...steps]; n[i].target=e.target.value; setSteps(n);}} />
                <input className="bg-black p-3 text-xs border border-zinc-800 text-yellow-500 font-black" placeholder="DURÉE (MIN)" value={s.value} onChange={e => {const n=[...steps]; n[i].value=e.target.value; setSteps(n);}} />
              </div>
            )}
            <button onClick={() => setSteps(steps.filter((_, idx) => idx !== i))} className="absolute top-2 right-2 text-[8px] text-red-900">DEL</button>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 mt-8">
        <button onClick={() => addStep("PALIER")} className="p-4 border border-yellow-900 text-yellow-700 text-[10px] font-black">+ PALIER</button>
        <button onClick={() => addStep("ACTION")} className="p-4 border border-blue-900 text-blue-700 text-[10px] font-black">+ ACTION</button>
      </div>

      <button onClick={() => { if(!name) return alert("NOM REQUIS"); onSave({ name, eauE, eauR, steps }); }} className="fixed bottom-8 left-4 right-4 max-w-xl mx-auto py-8 font-black bg-yellow-500 text-black text-xs shadow-2xl z-50">
        COMMIT_TO_CLOUD_DATABASE
      </button>
    </div>
  );
}