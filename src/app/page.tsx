"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

// --- TYPES ---
interface Ingredient { name: string; qty: string; }
interface Step { id: string; type: "PALIER" | "ACTION"; title: string; instruction: string; target: string; value: string; ingredients: Ingredient[]; }
interface Recipe { id: string; name: string; eauE: string; eauR: string; steps: Step[]; }
interface StockItem { id: string; name: string; quantity: number; unit: string; }

// --- COMPOSANT TIMER ---
function Timer({ minutes, stepId }: { minutes: number; stepId: string }) {
  const [sec, setSec] = useState(minutes * 60);
  const [on, setOn] = useState(false);
  useEffect(() => { setSec(minutes * 60); setOn(false); }, [stepId, minutes]);
  useEffect(() => {
    let t: any;
    if (on && sec > 0) t = setInterval(() => setSec((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [on, sec]);
  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const rs = s % 60;
    return `${m.toString().padStart(2, '0')}:${rs.toString().padStart(2, '0')}`;
  };
  return (
    <div className="mt-4 flex gap-4 items-center bg-zinc-950/80 p-4 border border-zinc-800 shadow-xl">
      <div className="flex flex-col">
        <span className="text-[7px] text-zinc-600 font-black uppercase tracking-widest">Countdown</span>
        <span className={`text-2xl font-black tabular-nums ${sec === 0 ? 'text-red-600 animate-pulse' : 'text-yellow-500'}`}>{fmt(sec)}</span>
      </div>
      <button onClick={() => setOn(!on)} className={`px-6 py-2 text-[10px] font-black transition-all ${on ? 'bg-zinc-800 text-white' : 'bg-yellow-500 text-black'}`}>{on ? "STOP" : "START"}</button>
    </div>
  );
}

// --- COMPOSANT PRINCIPAL ---
export default function BrewMaster() {
  const [view, setView] = useState("home");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selected, setSelected] = useState<Recipe | null>(null);
  const [inventory, setInventory] = useState<StockItem[]>([]);

  useEffect(() => { fetchRecipes(); fetchInventory(); }, []);

  const fetchRecipes = async () => {
    const { data } = await supabase.from('recipes').select('*').order('created_at', { ascending: false });
    if (data) setRecipes(data.map(r => ({ id: r.id, ...r.data })));
  };

  const fetchInventory = async () => {
    const { data } = await supabase.from('inventory').select('*').order('name');
    if (data) setInventory(data);
  };

  const updateStock = async (id: string, newQty: number) => {
    await supabase.from('inventory').update({ quantity: newQty }).eq('id', id);
    fetchInventory();
  };

  const handleLaunchBrew = async (recipe: Recipe) => {
    const confirmBrew = confirm(`LANCER LE BRASSAGE : "${recipe.name}" ?\nLES QUANTITÉS SERONT DÉDUITES DU STOCK.`);
    if (!confirmBrew) return;

    for (const step of recipe.steps) {
      if (!Array.isArray(step.ingredients)) continue;
      for (const ing of step.ingredients) {
        const stockItem = inventory.find(i => i.name.toUpperCase() === ing.name.toUpperCase());
        if (stockItem) {
          const consumed = parseFloat(ing.qty.replace(',', '.'));
          if (!isNaN(consumed)) {
            await supabase.from('inventory').update({ quantity: stockItem.quantity - consumed }).eq('id', stockItem.id);
          }
        }
      }
    }
    alert("STOCK MIS À JOUR. BON BRASSAGE !");
    fetchInventory();
    setView("home");
  };

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-300 font-mono p-4 uppercase italic">
      <div className="max-w-xl mx-auto pb-32">
        
        {/* --- HOME --- */}
        {view === "home" && (
          <div className="pt-20">
            <h1 className="text-[60px] font-black text-white leading-[0.8] mb-12 tracking-tighter italic">BREW<br/><span className="text-yellow-500">MASTER</span></h1>
            <div className="grid grid-cols-1 gap-4">
              <button onClick={() => setView("create")} className="bg-white text-black p-8 font-black text-2xl hover:bg-yellow-500 flex justify-between items-center transition-all group italic">
                <span>NEW_BATCH</span><span className="text-zinc-300 group-hover:text-black">→</span>
              </button>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setView("library")} className="border border-zinc-900 p-8 font-black text-zinc-500 hover:text-white hover:bg-zinc-900/30 transition-all italic">RESOURCES</button>
                <button onClick={() => setView("stock")} className="border border-zinc-900 p-8 font-black text-zinc-500 hover:text-white hover:bg-zinc-900/30 transition-all italic">INVENTORY</button>
              </div>
            </div>
          </div>
        )}

        {/* --- INVENTORY --- */}
        {view === "stock" && (
          <div className="animate-in fade-in duration-500">
            <button onClick={() => setView("home")} className="bg-zinc-900 text-white px-4 py-2 text-[10px] font-black mb-10 tracking-widest italic">/ RETURN_HOME</button>
            <h2 className="text-3xl font-black text-white mb-8 italic">STOCK_CONTROL</h2>
            <div className="space-y-4">
              {inventory.map(item => (
                <div key={item.id} className="flex items-center justify-between bg-zinc-950 p-4 border border-zinc-900">
                  <div className="flex flex-col">
                    <span className="text-lg font-black text-white">{item.name}</span>
                    <span className="text-[9px] text-yellow-600 font-bold tracking-widest">{item.unit}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <input 
                      type="number" 
                      placeholder="+ AJOUT" 
                      className="w-20 bg-black border border-zinc-800 p-2 text-xs text-center text-green-500 font-black outline-none focus:border-green-500"
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter') {
                          const input = e.currentTarget;
                          const val = parseFloat(input.value);
                          if (!isNaN(val)) {
                            await updateStock(item.id, item.quantity + val);
                            input.value = "";
                          }
                        }
                      }}
                    />
                    <div className="text-right min-w-[70px]">
                      <span className="text-[7px] text-zinc-600 block font-black uppercase">Actuel</span>
                      <span className="text-xl font-black text-white tabular-nums">{item.quantity}</span>
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={async () => {
                const name = prompt("NOM DE L'ARTICLE ?");
                const unit = prompt("UNITÉ (KG, G, L) ?", "KG");
                if(name) await supabase.from('inventory').insert([{ name: name.toUpperCase(), quantity: 0, unit: unit?.toUpperCase() || 'KG' }]);
                fetchInventory();
              }} className="w-full border border-dashed border-zinc-800 p-6 text-[10px] font-black text-zinc-700 hover:text-white transition-all">+ REGISTER_NEW_ITEM</button>
            </div>
          </div>
        )}

        {/* --- CREATE --- */}
        {view === "create" && <Lab onSave={async (recipe:any) => {
          const { error } = await supabase.from('recipes').insert([{ data: recipe }]);
          if (!error) { fetchRecipes(); setView("library"); }
        }} inventory={inventory} onCancel={() => setView("home")} />}

        {/* --- LIBRARY --- */}
        {view === "library" && (
          <div className="animate-in fade-in duration-500">
             <button onClick={() => setView("home")} className="bg-zinc-900 text-white px-4 py-2 text-[10px] font-black mb-10 tracking-widest italic">/ RETURN</button>
             <div className="space-y-4">
               {recipes.map(r => (
                 <button key={r.id} onClick={() => { setSelected(r); setView("detail"); }} className="w-full border border-zinc-900 bg-zinc-950/40 hover:border-yellow-500/50 p-6 text-left group transition-all italic">
                   <span className="text-2xl font-black text-zinc-500 group-hover:text-white tracking-tighter">{r.name}</span>
                 </button>
               ))}
             </div>
          </div>
        )}

        {/* --- DETAIL --- */}
        {view === "detail" && selected && (
          <div className="animate-in slide-in-from-right duration-500">
            <div className="flex justify-between items-start mb-10">
              <button onClick={() => setView("library")} className="bg-zinc-900 text-white px-4 py-2 text-[10px] font-black tracking-widest italic">/ BACK</button>
              <button onClick={() => handleLaunchBrew(selected)} className="bg-yellow-500 text-black px-6 py-4 font-black text-xs hover:bg-white transition-all italic">START_BREW_SESSION</button>
            </div>
            <h2 className="text-5xl font-black text-white mb-8 italic tracking-tighter">{selected.name}</h2>
            <div className="grid grid-cols-2 gap-px bg-zinc-800 border border-zinc-800 mb-10">
                <div className="bg-zinc-950 p-4"><span className="text-[7px] block text-zinc-600 font-black">MASH_VOL</span><span className="text-2xl text-blue-500 font-black">{selected.eauE}L</span></div>
                <div className="bg-zinc-950 p-4 text-right"><span className="text-[7px] block text-zinc-600 font-black">RINSE_VOL</span><span className="text-2xl text-blue-500 font-black">{selected.eauR}L</span></div>
            </div>
            <div className="space-y-12 pb-20">
              {selected.steps.map((s) => (
                <div key={s.id} className="border-l-2 border-zinc-800 pl-8 relative">
                  <div className={`absolute -left-[7px] top-0 w-3 h-3 rounded-full ${s.type === 'PALIER' ? 'bg-yellow-500' : 'bg-blue-600'}`} />
                  <span className="text-[8px] font-black text-zinc-700 tracking-[0.3em] mb-1 block uppercase">{s.type}</span>
                  <h3 className="text-2xl font-black text-white italic tracking-tight uppercase">{s.title}</h3>
                  <p className="text-[11px] text-zinc-500 my-4 lowercase leading-relaxed italic">{s.instruction}</p>
                  {Array.isArray(s.ingredients) && s.ingredients.length > 0 && (
                    <div className="bg-zinc-900/30 p-4 my-4 border-l-2 border-yellow-600 space-y-1">
                      {s.ingredients.map((ing, idx) => {
                        const stock = inventory.find(i => i.name.toUpperCase() === ing.name.toUpperCase());
                        return (
                          <div key={idx} className="flex justify-between text-[10px] font-black uppercase italic">
                            <span className="text-zinc-400">{ing.name}</span>
                            <span className="text-yellow-500">{ing.qty} {stock?.unit || ''}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {s.type === "PALIER" && (
                    <div className="flex gap-4 items-end">
                      <div className="bg-black p-3 border border-zinc-800 min-w-[80px]">
                        <span className="text-[7px] text-zinc-700 block font-black uppercase tracking-widest">Target</span><span className="text-lg font-black text-white">{s.target}</span>
                      </div>
                      {parseInt(s.value) > 0 && <Timer minutes={parseInt(s.value)} stepId={s.id} />}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- LAB ---
function Lab({ onSave, onCancel, inventory }: any) {
  const [name, setName] = useState("");
  const [eauE, setEauE] = useState("");
  const [eauR, setEauR] = useState("");
  const [steps, setSteps] = useState<Step[]>([]);

  return (
    <div className="animate-in slide-in-from-bottom-8 duration-500 pb-40">
      <div className="flex justify-between items-center mb-10">
        <button onClick={onCancel} className="bg-red-950 text-red-500 px-4 py-2 text-[8px] font-black tracking-widest hover:bg-red-900 transition-all italic uppercase">ABORT_BATCH</button>
        <span className="text-[8px] text-zinc-800 font-black tracking-widest italic uppercase tracking-tighter">LAB_V2.5</span>
      </div>

      <input className="w-full bg-transparent text-5xl font-black outline-none border-b-2 border-zinc-900 mb-12 text-white placeholder:text-zinc-900 uppercase italic tracking-tighter" placeholder="RECIPE_NAME" value={name} onChange={e => setName(e.target.value)} />
      
      <div className="grid grid-cols-2 gap-4 mb-10">
        <div className="flex flex-col"><span className="text-[7px] text-zinc-700 font-black mb-1 uppercase italic">Eau Empâtage (L)</span><input className="bg-zinc-900/20 p-4 border border-zinc-900 text-2xl font-black text-blue-500 outline-none italic" placeholder="00" value={eauE} onChange={e => setEauE(e.target.value)} /></div>
        <div className="flex flex-col text-right"><span className="text-[7px] text-zinc-700 font-black mb-1 uppercase italic">Eau Rinçage (L)</span><input className="bg-zinc-900/20 p-4 border border-zinc-900 text-2xl font-black text-blue-500 outline-none text-right italic" placeholder="00" value={eauR} onChange={e => setEauR(e.target.value)} /></div>
      </div>

      <div className="space-y-8">
        {steps.map((s, i) => (
          <div key={s.id} className={`p-6 border-l-4 ${s.type === 'PALIER' ? 'border-yellow-600 bg-yellow-500/5' : 'border-blue-600 bg-blue-500/5'} relative`}>
            <div className="absolute right-2 top-2 flex gap-3">
               <button onClick={() => {const n=[...steps]; const item=n.splice(i,1)[0]; n.splice(i-1,0,item); setSteps(n);}} disabled={i===0} className="text-[8px] font-black text-zinc-700 disabled:opacity-0 hover:text-white uppercase italic">UP</button>
               <button onClick={() => {const n=[...steps]; const item=n.splice(i,1)[0]; n.splice(i+1,0,item); setSteps(n);}} disabled={i===steps.length-1} className="text-[8px] font-black text-zinc-700 disabled:opacity-0 hover:text-white uppercase italic">DOWN</button>
               <button onClick={() => setSteps(steps.filter((_, idx) => idx !== i))} className="text-[8px] font-black text-red-900 hover:text-red-500 uppercase italic">DEL</button>
            </div>
            <input className="w-full bg-transparent font-black text-white text-xl mb-4 outline-none border-b border-zinc-800 placeholder:text-zinc-800 uppercase italic tracking-tight" 
                   placeholder={s.type === 'PALIER' ? "TITRE DU PALIER" : "NOM DE L'ACTION"} value={s.title} onChange={e => {const n=[...steps]; n[i].title=e.target.value; setSteps(n);}} />
            <textarea className="w-full bg-transparent text-[11px] text-zinc-500 h-10 outline-none italic placeholder:text-zinc-800 mb-4" placeholder="Détails techniques..." value={s.instruction} onChange={e => {const n=[...steps]; n[i].instruction=e.target.value; setSteps(n);}} />
            
            {s.type === "PALIER" && (
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="flex flex-col"><span className="text-[7px] text-zinc-700 font-black mb-1 uppercase tracking-widest italic">Cible</span><input className="bg-black p-3 text-xs border border-zinc-800 text-yellow-500 font-black outline-none italic" placeholder="67°C" value={s.target} onChange={e => {const n=[...steps]; n[i].target=e.target.value; setSteps(n);}} /></div>
                <div className="flex flex-col"><span className="text-[7px] text-zinc-700 font-black mb-1 uppercase tracking-widest italic">Durée (Min)</span><input className="bg-black p-3 text-xs border border-zinc-800 text-yellow-500 font-black outline-none italic" placeholder="60" value={s.value} onChange={e => {const n=[...steps]; n[i].value=e.target.value; setSteps(n);}} /></div>
              </div>
            )}

            <div className="space-y-2 border-t border-zinc-900/50 pt-4">
              {s.ingredients.map((ing, ingIdx) => {
                const st = inventory.find((it:any) => it.name.toUpperCase() === ing.name.toUpperCase());
                return (
                  <div key={ingIdx} className="flex gap-2 items-center">
                    <input className="flex-1 bg-zinc-950 p-2 text-[10px] border border-zinc-900 text-zinc-400 outline-none uppercase italic" placeholder="NOM" value={ing.name} onChange={e => {
                      const n = [...steps]; n[i].ingredients[ingIdx].name = e.target.value; setSteps(n);
                    }} />
                    <div className="flex items-center gap-1">
                      <input className="w-20 bg-zinc-950 p-2 text-[10px] border border-zinc-900 text-yellow-600 text-right outline-none font-black italic" placeholder="QTÉ" value={ing.qty} onChange={e => {
                        const n = [...steps]; n[i].ingredients[ingIdx].qty = e.target.value; setSteps(n);
                      }} />
                      <span className="text-[9px] text-zinc-700 font-black min-w-[20px] uppercase">{st?.unit || '??'}</span>
                    </div>
                  </div>
                );
              })}
              <button onClick={() => { const n = [...steps]; n[i].ingredients.push({ name: "", qty: "" }); setSteps(n); }} className="text-[8px] font-black text-zinc-600 hover:text-yellow-500 transition-colors uppercase italic">+ ADD_INGREDIENT</button>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 mt-12 mb-20">
        <button onClick={() => setSteps([...steps, { id: Date.now().toString(), type: "PALIER", title: "", instruction: "", target: "", value: "", ingredients: [] }])} className="p-6 border border-yellow-900 text-yellow-700 text-[10px] font-black hover:bg-yellow-900/10 transition-all uppercase italic">+ NEW_PALIER</button>
        <button onClick={() => setSteps([...steps, { id: Date.now().toString(), type: "ACTION", title: "", instruction: "", target: "", value: "", ingredients: [] }])} className="p-6 border border-blue-900 text-blue-700 text-[10px] font-black hover:bg-blue-900/10 transition-all uppercase italic">+ NEW_ACTION</button>
      </div>

      <button onClick={() => {
        if(!name) return alert("ERREUR : DONNE UN NOM À TA RECETTE.");
        onSave({ name, eauE, eauR, steps });
      }} className="fixed bottom-8 left-4 right-4 max-w-xl mx-auto py-8 font-black tracking-[0.5em] transition-all shadow-2xl z-50 text-xs italic bg-yellow-500 text-black hover:bg-white uppercase">
        COMMIT_TO_CLOUD_DATABASE
      </button>
    </div>
  );
}