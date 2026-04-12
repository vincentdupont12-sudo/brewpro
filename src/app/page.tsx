"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabaseClient";

const STORAGE_KEY = "BREW_MASTER_V15_LOCAL";

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
    <div className="mt-4 flex gap-4 items-center bg-zinc-950/50 p-4 border border-zinc-900 shadow-inner">
      <div className="flex flex-col">
        <span className="text-[7px] text-zinc-600 font-black tracking-widest uppercase">Sequence_Chrono</span>
        <span className={`text-3xl font-black tabular-nums ${sec === 0 ? 'text-red-600 animate-pulse' : 'text-yellow-500'}`}>
          {fmt(sec)}
        </span>
      </div>
      <button onClick={() => setOn(!on)} className={`px-6 py-2 font-black text-[10px] tracking-widest transition-all ${on ? 'bg-zinc-800 text-white' : 'bg-yellow-500 text-black'}`}>
        {on ? "STOP" : "RUN_TIMER"}
      </button>
      <button onClick={() => { setOn(false); setSec(minutes * 60); }} className="text-[8px] text-zinc-700 font-black hover:text-white underline underline-offset-4">RESET</button>
    </div>
  );
}

// --- COMPOSANT PRINCIPAL ---
export default function BrewMaster() {
  const [view, setView] = useState<"home" | "create" | "library" | "detail">("home");
  const [recipes, setRecipes] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // CHARGEMENT
  useEffect(() => { fetchRecipes(); }, []);

  const fetchRecipes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // MAPPING CRUCIAL : On extrait le contenu de 'data' pour le mettre à la racine de l'objet
      const formatted = (data || []).map(row => ({
        id: row.id,
        created_at: row.created_at,
        ...row.data // Ceci permet d'avoir r.name, r.eauE, r.steps directement
      }));

      setRecipes(formatted);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(formatted));
    } catch (err: any) {
      console.error("Fetch error:", err.message);
      const local = localStorage.getItem(STORAGE_KEY);
      if (local) setRecipes(JSON.parse(local));
    } finally { setLoading(false); }
  };

  const handleSave = async (newRecipe: any) => {
    try {
      const { error } = await supabase
        .from('recipes')
        .insert([{ 
          data: {
            name: newRecipe.name,
            eauE: newRecipe.eauE,
            eauR: newRecipe.eauR,
            steps: newRecipe.steps
          }
        }]);

      if (error) throw error;
      alert("ARCHIVE_SUCCESS: TRANSMISSION_OK");
      await fetchRecipes();
      setView("library");
    } catch (err: any) {
      alert("SYNC_ERROR: " + err.message);
    }
  };

  const deleteRecipe = async (id: string) => {
    if (!confirm("CONFIRMER_SUPPRESSION_CLOUD?")) return;
    const { error } = await supabase.from('recipes').delete().eq('id', id);
    if (!error) fetchRecipes();
  };

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-300 font-mono p-4 uppercase selection:bg-yellow-500 selection:text-black italic">
      <div className="max-w-xl mx-auto pb-20">
        
        {/* VIEW: HOME */}
        {view === "home" && (
          <div className="pt-32 text-center animate-in fade-in duration-1000">
            <h1 className="text-[80px] font-black text-white leading-[0.8] mb-4 tracking-tighter">BREW<br/><span className="text-yellow-500">MASTER</span></h1>
            <p className="text-[9px] text-zinc-800 tracking-[0.5em] mb-20 font-black">CORE_SYSTEM_V.1.5_ONLINE</p>
            <div className="flex flex-col gap-4 max-w-xs mx-auto">
              <button onClick={() => setView("create")} className="bg-white text-black p-6 font-black text-xl hover:bg-yellow-500 transition-all flex justify-between items-center">
                <span>NEW_BATCH</span><span>[+]</span>
              </button>
              <button onClick={() => setView("library")} className="border border-zinc-900 p-6 font-black text-zinc-700 hover:text-white flex justify-between items-center transition-all">
                <span>RESOURCES</span><span>{">>"}</span>
              </button>
            </div>
          </div>
        )}

        {/* VIEW: CREATE */}
        {view === "create" && <Lab onSave={handleSave} onCancel={() => setView("home")} />}

        {/* VIEW: LIBRARY */}
        {view === "library" && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center mb-12 border-b border-zinc-900 pb-4">
              <button onClick={() => setView("home")} className="text-zinc-700 text-[10px] font-black hover:text-white tracking-widest">/ RETURN_HOME</button>
              <span className="text-[8px] text-zinc-800 font-black tracking-widest">{loading ? "SYNCING..." : "DATABASE_LINK_OK"}</span>
            </div>
            <div className="space-y-4">
              {recipes.map(r => (
                <div key={r.id} className="flex border border-zinc-900 bg-zinc-950/40 hover:border-yellow-500/50 transition-all group">
                  <button onClick={() => { setSelected(r); setView("detail"); }} className="flex-1 p-8 text-left">
                    <span className="text-3xl font-black block leading-none group-hover:text-white uppercase tracking-tighter italic">{r.name || "UNNAMED_BATCH"}</span>
                    <span className="text-[8px] text-zinc-700 mt-2 block font-black uppercase">Ref_ID: {String(r.id).slice(0,8)}...</span>
                  </button>
                  <button onClick={() => deleteRecipe(r.id)} className="px-6 text-zinc-900 hover:text-red-700 font-black transition-colors border-l border-zinc-900">X</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW: DETAIL */}
        {view === "detail" && selected && (
          <div className="animate-in slide-in-from-right duration-500">
            <button onClick={() => setView("library")} className="text-zinc-700 text-[10px] font-black mb-10 hover:text-white tracking-widest">/ CLOSE_RESOURCE</button>
            
            <h2 className="text-5xl font-black text-white leading-tight mb-8 italic uppercase">{selected.name}</h2>
            
            <div className="grid grid-cols-2 gap-px bg-zinc-800 border border-zinc-800 mb-10 shadow-2xl">
              <div className="bg-zinc-950 p-6">
                <span className="text-[8px] text-zinc-600 block mb-1 font-black uppercase tracking-widest">Water_Mash</span>
                <span className="text-4xl font-black text-blue-600">{selected.eauE}L</span>
              </div>
              <div className="bg-zinc-950 p-6 text-right">
                <span className="text-[8px] text-zinc-600 block mb-1 font-black uppercase tracking-widest">Water_Rinse</span>
                <span className="text-4xl font-black text-blue-600">{selected.eauR}L</span>
              </div>
            </div>

            <div className="space-y-12">
              {selected.steps?.map((s: any, i: number) => (
                <div key={s.id} className="relative pl-8 border-l-2 border-zinc-800 pb-8">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 bg-yellow-500 rounded-full border-4 border-[#050505]" />
                  <h3 className="text-2xl font-black text-yellow-500 mb-2 italic tracking-tight">{s.title || "UNTITLED_STEP"}</h3>
                  <p className="text-[11px] text-zinc-500 mb-6 italic leading-relaxed lowercase">{s.instruction}</p>
                  
                  {s.ingredients && (
                    <div className="bg-zinc-900/30 border border-zinc-900 p-4 mb-4 border-r-4 border-r-yellow-600">
                      <pre className="text-[10px] font-black text-zinc-400 whitespace-pre-wrap uppercase tracking-tight">{s.ingredients}</pre>
                    </div>
                  )}
                  
                  <div className="bg-black p-4 border border-zinc-800 inline-block">
                    <span className="text-[7px] text-zinc-700 block mb-1 font-black tracking-widest uppercase italic">Target_Value</span>
                    <span className="text-xl font-black text-white italic">{s.target || "--"}</span>
                  </div>

                  {parseInt(s.value) > 0 && <Timer minutes={parseInt(s.value)} stepId={s.id} />}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- COMPOSANT LAB (CREATION) ---
function Lab({ onSave, onCancel }: any) {
  const [name, setName] = useState("");
  const [eauE, setEauE] = useState("");
  const [eauR, setEauR] = useState("");
  const [steps, setSteps] = useState<any[]>([]);

  const addStep = () => setSteps([...steps, { id: Date.now().toString(), title: "", instruction: "", target: "", value: "", ingredients: "" }]);

  return (
    <div className="pb-40 animate-in slide-in-from-bottom-12">
      <button onClick={onCancel} className="text-red-900 text-[10px] font-black mb-10 tracking-widest hover:text-red-500 transition-colors">/ ABORT_MISSION</button>
      
      <input 
        className="w-full bg-transparent text-5xl font-black outline-none border-b border-zinc-900 mb-10 uppercase italic text-white placeholder:text-zinc-900" 
        placeholder="BATCH_NAME" 
        value={name} 
        onChange={e => setName(e.target.value)} 
      />

      <div className="grid grid-cols-2 gap-6 mb-12">
        <div className="flex flex-col">
          <label className="text-[8px] font-black mb-2 text-zinc-700 tracking-widest">EAU_EMPATHAGE (L)</label>
          <input className="bg-zinc-900/20 p-5 border border-zinc-900 text-2xl font-black outline-none text-blue-500 font-mono" placeholder="00.0" value={eauE} onChange={e => setEauE(e.target.value)} />
        </div>
        <div className="flex flex-col text-right">
          <label className="text-[8px] font-black mb-2 text-zinc-700 tracking-widest">EAU_RINCAGE (L)</label>
          <input className="bg-zinc-900/20 p-5 border border-zinc-900 text-2xl font-black outline-none text-blue-500 font-mono text-right" placeholder="00.0" value={eauR} onChange={e => setEauR(e.target.value)} />
        </div>
      </div>

      <div className="space-y-8">
        {steps.map((s, i) => (
          <div key={s.id} className="bg-zinc-900/10 border border-zinc-900 p-6 relative group">
            <button onClick={() => setSteps(steps.filter((_, idx) => idx !== i))} className="absolute top-2 right-4 text-zinc-800 text-[9px] font-black hover:text-red-500 transition-colors">DELETE_SEQ</button>
            <input className="w-full bg-transparent font-black text-yellow-500 text-2xl mb-4 outline-none border-b border-zinc-800/50 pb-2 italic uppercase" placeholder="SEQUENCE_TITLE" value={s.title} onChange={e => {
              const n = [...steps]; n[i].title = e.target.value; setSteps(n);
            }} />
            <textarea className="w-full bg-transparent text-[11px] text-zinc-500 h-12 outline-none mb-4 italic" placeholder="Instructions_techniques..." value={s.instruction} onChange={e => {
              const n = [...steps]; n[i].instruction = e.target.value; setSteps(n);
            }} />
            <div className="grid grid-cols-2 gap-4 mb-4">
              <input className="bg-black p-4 text-xs border border-zinc-800 outline-none font-black text-white" placeholder="CIBLE (ex: 67°C)" value={s.target} onChange={e => {
                const n = [...steps]; n[i].target = e.target.value; setSteps(n);
              }} />
              <input className="bg-black p-4 text-xs border border-zinc-800 outline-none font-black text-white" placeholder="TEMPS (MIN)" value={s.value} onChange={e => {
                const n = [...steps]; n[i].value = e.target.value; setSteps(n);
              }} />
            </div>
            <textarea className="w-full bg-zinc-950 p-4 text-[10px] h-20 outline-none border border-zinc-800 font-bold text-zinc-500 uppercase" placeholder="MALTS_HOUBLONS_ADDITIFS" value={s.ingredients} onChange={e => {
              const n = [...steps]; n[i].ingredients = e.target.value; setSteps(n);
            }} />
          </div>
        ))}
        <button onClick={addStep} className="w-full py-10 border-2 border-dashed border-zinc-900 text-zinc-800 font-black hover:text-zinc-500 hover:border-zinc-700 transition-all uppercase tracking-widest text-xs">
          + APPEND_NEW_SEQUENCE
        </button>
      </div>

      <button 
        onClick={() => name && onSave({ name, eauE, eauR, steps })} 
        className={`fixed bottom-8 left-4 right-4 max-w-xl mx-auto py-8 font-black tracking-[0.6em] z-50 transition-all text-xs ${name ? 'bg-yellow-500 text-black shadow-[0_20px_50px_rgba(234,179,8,0.3)]' : 'bg-zinc-900 text-zinc-700 cursor-not-allowed'}`}
      >
        PUSH_TO_CLOUD_DATABASE
      </button>
    </div>
  );
}