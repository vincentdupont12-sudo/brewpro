"use client";

import { useState, useEffect, useRef } from "react";

// --- CONFIGURATION ---
const STORAGE_KEY = "BREW_MASTER_V15_DATA";
const GITHUB_SOURCE = "vincentdupont12-sudo.github.io/brewpro/recipes.json"; // Chemin relatif vers ton fichier sur GitHub

// --- COMPOSANT TIMER ---
function Timer({ minutes }: { minutes: number }) {
  const [secondsLeft, setSecondsLeft] = useState(minutes * 60);
  const [isActive, setIsActive] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isActive && secondsLeft > 0) {
      timerRef.current = setInterval(() => setSecondsLeft(s => s - 1), 1000);
    } else { if (timerRef.current) clearInterval(timerRef.current); }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isActive, secondsLeft]);

  const format = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="mt-4 bg-black border border-zinc-800 p-4 flex items-center justify-between shadow-2xl">
      <div className="flex flex-col">
        <span className="text-[8px] text-zinc-600 font-black uppercase tracking-widest">Sequence_Chrono</span>
        <span className={`text-4xl font-black tabular-nums ${secondsLeft === 0 ? 'text-red-600 animate-pulse' : 'text-yellow-500'}`}>
          {format(secondsLeft)}
        </span>
      </div>
      <div className="flex gap-2">
        <button onClick={() => setIsActive(!isActive)} className={`px-5 py-3 font-black text-[10px] ${isActive ? 'bg-zinc-800 text-white' : 'bg-yellow-500 text-black active:scale-95 transition-all'}`}>
          {isActive ? "PAUSE" : "START"}
        </button>
        <button onClick={() => { setIsActive(false); setSecondsLeft(minutes * 60); }} className="px-4 py-3 bg-zinc-900 text-zinc-600 font-black text-[10px] border border-zinc-800 hover:text-white">
          RAZ
        </button>
      </div>
    </div>
  );
}

// --- COMPOSANT PRINCIPAL ---
export default function BrewMasterV15() {
  const [view, setView] = useState<"home" | "create" | "library" | "detail">("home");
  const [recipes, setRecipes] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- LOGIQUE DE CHARGEMENT & SYNC ---
  useEffect(() => {
    const initApp = async () => {
      const localData = localStorage.getItem(STORAGE_KEY);
      if (!localData) {
        await refreshFromServer();
      } else {
        setRecipes(JSON.parse(localData));
      }
    };
    initApp();
  }, []);

  const saveToLocal = (newList: any[]) => {
    setRecipes(newList);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
  };

  const refreshFromServer = async () => {
    try {
      const response = await fetch(GITHUB_SOURCE, { cache: "no-store" });
      if (response.ok) {
        const remoteData = await response.json();
        saveToLocal(remoteData);
        alert("SYNCHRONISATION TERMINÉE : LES RECETTES DU CHEF SONT À JOUR.");
      } else {
        throw new Error();
      }
    } catch (err) {
      alert("ERREUR DE SYNC : VÉRIFIEZ VOTRE CONNEXION OU LE DÉPÔT GITHUB.");
    }
  };

  const exportData = () => {
    const dataStr = JSON.stringify(recipes, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const link = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', `brewmaster_backup_${new Date().toISOString().slice(0,10)}.json`);
    link.click();
  };

  const importData = (event: any) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const imported = JSON.parse(e.target.result);
        if (Array.isArray(imported)) {
          saveToLocal(imported);
          alert("IMPORT RÉUSSI");
        }
      } catch (err) { alert("FICHIER INVALIDE"); }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-300 font-mono p-4 uppercase selection:bg-yellow-500 selection:text-black">
      <div className="max-w-xl mx-auto pb-12">
        
        {/* VIEW: HOME */}
        {view === "home" && (
          <div className="pt-32 text-center animate-in fade-in duration-700">
            <h1 className="text-[85px] font-black text-white leading-[0.75] mb-4 tracking-tighter italic">BREW<br/><span className="text-yellow-500">MASTER</span></h1>
            <p className="text-[10px] text-zinc-800 tracking-[0.6em] mb-20 font-black">MASTER_SYSTEM_V.15</p>
            <div className="flex flex-col gap-4 max-w-xs mx-auto">
              <button onClick={() => setView("create")} className="bg-white text-black p-6 font-black text-xl hover:bg-yellow-500 transition-all flex justify-between items-center shadow-2xl">
                <span>NEW BATCH</span>
                <span>[+]</span>
              </button>
              <button onClick={() => setView("library")} className="border border-zinc-900 p-6 font-black text-zinc-700 hover:text-white flex justify-between items-center transition-colors">
                <span>RESOURCES</span>
                <span>{">>"}</span>
              </button>
            </div>
          </div>
        )}

        {/* VIEW: CREATE */}
        {view === "create" && (
          <Lab onSave={(r: any) => { saveToLocal([r, ...recipes]); setView("library"); }} onCancel={() => setView("home")} />
        )}

        {/* VIEW: LIBRARY / RESOURCES */}
        {view === "library" && (
          <div className="animate-in slide-in-from-left duration-500">
            <div className="flex justify-between items-center mb-12">
              <button onClick={() => setView("home")} className="text-zinc-700 text-[10px] font-black hover:text-white tracking-widest">/ BACK</button>
              <div className="flex gap-2">
                <input type="file" ref={fileInputRef} onChange={importData} className="hidden" accept=".json" />
                <button onClick={() => fileInputRef.current?.click()} className="text-[8px] font-black border border-zinc-800 px-3 py-1 hover:text-white">IMPORT</button>
                <button onClick={exportData} className="text-[8px] font-black border border-zinc-800 px-3 py-1 hover:text-white">EXPORT</button>
                <button onClick={refreshFromServer} className="text-[8px] font-black bg-yellow-600 text-black px-3 py-1 hover:bg-yellow-500">SYNC_CHEF</button>
              </div>
            </div>

            <div className="space-y-4">
              {recipes.map(r => (
                <div key={r.id} className="flex border border-zinc-900 bg-zinc-950/30 hover:border-yellow-500/50 transition-all group">
                  <button onClick={() => { setSelected(r); setView("detail"); }} className="flex-1 p-8 text-left">
                    <span className="text-4xl font-black block leading-none group-hover:text-white tracking-tighter italic uppercase">{r.name}</span>
                  </button>
                  <button onClick={() => confirm("DELETE RECIPE?") && saveToLocal(recipes.filter(x => x.id !== r.id))} className="px-6 bg-black text-zinc-900 hover:text-red-700 transition-colors">X</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW: DETAIL / MONITORING */}
        {view === "detail" && selected && (
          <div className="animate-in slide-in-from-right duration-500">
            <button onClick={() => setView("library")} className="text-zinc-700 text-[10px] font-black mb-10 hover:text-white tracking-widest">/ EXIT_FILE</button>
            <h2 className="text-6xl font-black text-white leading-tight mb-8 tracking-tighter italic uppercase">{selected.name}</h2>
            
            <div className="grid grid-cols-2 gap-px bg-zinc-800 border border-zinc-800 mb-10 shadow-2xl">
              <div className="bg-zinc-950 p-6">
                <span className="text-[8px] text-zinc-600 block mb-1 font-black italic">WATER_MASH</span>
                <span className="text-3xl font-black text-blue-600">{selected.eauE}</span>
              </div>
              <div className="bg-zinc-950 p-6 text-right">
                <span className="text-[8px] text-zinc-600 block mb-1 font-black italic">WATER_RINSE</span>
                <span className="text-3xl font-black text-blue-600">{selected.eauR}</span>
              </div>
            </div>

            <div className="space-y-12">
              {selected.steps.map((s: any, i: number) => (
                <div key={s.id} className="relative pl-8 border-l-2 border-zinc-800 pb-6">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 bg-yellow-500 rounded-full border-4 border-[#050505]" />
                  <span className="text-zinc-900 font-black text-5xl absolute top-0 right-0 italic opacity-20 select-none">0{i+1}</span>
                  <h3 className="text-2xl font-black text-yellow-500 mb-2 tracking-tight uppercase">{s.title}</h3>
                  <p className="text-[11px] text-zinc-500 mb-6 italic leading-relaxed pr-12">{s.instruction}</p>
                  
                  {s.ingredients && (
                    <div className="bg-zinc-950 border border-zinc-800 p-4 mb-4 border-r-4 border-r-yellow-600 shadow-lg">
                      <span className="text-[8px] text-yellow-600 font-black block mb-2 tracking-[0.2em] italic uppercase">BILL_OF_MATERIALS</span>
                      <pre className="text-xs font-black text-zinc-100 whitespace-pre-wrap font-mono uppercase leading-tight tracking-tight">{s.ingredients}</pre>
                    </div>
                  )}
                  
                  <div className="bg-black p-4 border border-zinc-800 inline-block mb-4">
                    <span className="text-[8px] text-zinc-600 block mb-1 font-black uppercase tracking-widest">TARGET_CONSIGNE</span>
                    <span className="text-xl font-black text-white tracking-widest italic">{s.target}</span>
                  </div>

                  {parseInt(s.value) > 0 && <Timer minutes={parseInt(s.value)} />}
                </div>
              ))}
            </div>

            <div className="mt-16 p-6 bg-blue-900/5 border border-blue-900/20">
              <span className="text-[9px] text-blue-600 font-black tracking-[0.3em] block mb-4 italic uppercase">Chemical_Lab_Notes</span>
              <div className="grid grid-cols-2 gap-8 text-[11px] font-black">
                <div><span className="text-zinc-600 block mb-1 tracking-widest">pH_CIBLE</span><span className="text-white text-lg">5.2 - 5.4</span></div>
                <div className="text-right"><span className="text-zinc-600 block mb-1 tracking-widest">TEMP_MESURE</span><span className="text-white text-lg">20°C</span></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- LAB COMPONENT ---
function Lab({ onSave, onCancel }: any) {
  const [name, setName] = useState("");
  const [eauE, setEauE] = useState("");
  const [eauR, setEauR] = useState("");
  const [steps, setSteps] = useState<any[]>([]);

  const add = () => setSteps([...steps, { id: Date.now().toString(), title: "", instruction: "", target: "", value: "", ingredients: "" }]);

  return (
    <div className="animate-in slide-in-from-bottom-8 duration-500 pb-40">
      <button onClick={onCancel} className="text-red-900 text-[10px] font-black mb-10 hover:text-red-600 tracking-widest">/ ABORT_SEQUENCE</button>
      
      <div className="bg-zinc-900/40 p-6 border-l-4 border-yellow-500 mb-8">
        <label className="text-[9px] text-zinc-600 block mb-2 font-black tracking-widest uppercase">Batch_Designation</label>
        <input className="w-full bg-transparent text-4xl font-black outline-none border-b border-zinc-800 focus:border-yellow-500 transition-all uppercase italic" placeholder="EX: IMPERIAL STOUT" value={name} onChange={e => setName(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-10">
        <input className="bg-zinc-900/20 p-4 border border-zinc-800 text-xl font-black outline-none text-blue-500" placeholder="EAU EMPÂT." value={eauE} onChange={e => setEauE(e.target.value)} />
        <input className="bg-zinc-900/20 p-4 border border-zinc-800 text-xl font-black outline-none text-blue-500" placeholder="EAU RINÇAGE" value={eauR} onChange={e => setEauR(e.target.value)} />
      </div>

      <div className="space-y-6">
        {steps.map((s, i) => (
          <div key={s.id} className="bg-zinc-900/10 border border-zinc-900 p-6 relative">
            <button onClick={() => setSteps(steps.filter((_, idx) => idx !== i))} className="absolute top-2 right-4 text-zinc-800 text-[9px] font-black hover:text-red-500 transition-colors">SUPPRIMER</button>
            <input className="w-full bg-transparent font-black text-yellow-500 text-xl mb-4 outline-none border-b border-zinc-800/50 pb-2 uppercase italic" placeholder="TITRE_ÉTAPE" value={s.title} onChange={e => {
              const n = [...steps]; n[i].title = e.target.value; setSteps(n);
            }} />
            <textarea className="w-full bg-transparent text-[10px] text-zinc-500 h-10 outline-none mb-4 italic" placeholder="Instructions pour l'opérateur..." value={s.instruction} onChange={e => {
              const n = [...steps]; n[i].instruction = e.target.value; setSteps(n);
            }} />
            <div className="grid grid-cols-2 gap-4 mb-4">
              <input className="bg-black p-3 text-xs border border-zinc-800 outline-none font-black" placeholder="CIBLE" value={s.target} onChange={e => {
                const n = [...steps]; n[i].target = e.target.value; setSteps(n);
              }} />
              <input className="bg-black p-3 text-xs border border-zinc-800 outline-none font-black" placeholder="TEMPS (MIN)" value={s.value} onChange={e => {
                const n = [...steps]; n[i].value = e.target.value; setSteps(n);
              }} />
            </div>
            <textarea className="w-full bg-zinc-950 p-4 text-[10px] h-24 outline-none border border-zinc-800 font-bold text-zinc-500 uppercase tracking-tighter" placeholder="PESÉE_DÉTAILLÉE :&#10;PALE ALE : 7KG&#10;CHOCO : 1KG" value={s.ingredients} onChange={e => {
              const n = [...steps]; n[i].ingredients = e.target.value; setSteps(n);
            }} />
          </div>
        ))}
        <button onClick={add} className="w-full py-8 border-2 border-dashed border-zinc-900 text-zinc-800 font-black hover:text-white transition-all">+ AJOUTER_ÉTAPE_SÉQUENCE</button>
      </div>

      <button onClick={() => name && onSave({ id: Date.now(), name, eauE, eauR, steps })} className={`fixed bottom-8 left-4 right-4 max-w-xl mx-auto py-6 font-black tracking-[0.5em] z-50 transition-all ${name ? 'bg-yellow-500 text-black shadow-2xl' : 'bg-zinc-900 text-zinc-700 cursor-not-allowed'}`}>
        VALIDER_RECETTE
      </button>
    </div>
  );
}