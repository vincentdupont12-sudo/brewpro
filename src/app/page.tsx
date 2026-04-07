"use client";

import { useState, useEffect, useRef } from "react";

export default function BrewMasterPush() {
  const [isMounted, setIsMounted] = useState(false);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [view, setView] = useState<"home" | "create" | "library" | "detail">("home");
  const [selectedRecipe, setSelectedRecipe] = useState<any | null>(null);

  // Initialisation et chargement des données
  useEffect(() => {
    setIsMounted(true);
    const saved = localStorage.getItem("recipes_final_v12");
    if (saved) {
      setRecipes(JSON.parse(saved));
    } else {
      const presets = [
        {
          id: 1, name: "IPA CITRA GALACTIQUE", volume: 20, targetABV: 6.5,
          steps: [
            { id: '1a', type: "ACTION", title: "CONCASSAGE DES GRAINS", target: "Finesse 1.2mm", value: "", ingredient: "5kg Pale Ale / 500g Cara" },
            { id: '1b', type: "CHRONO", title: "EMPÂTAGE (MASH)", target: "66°C", value: "60", ingredient: "Ratio 3:1" },
            { id: '1c', type: "CHRONO", title: "MASH OUT", target: "78°C", value: "10", ingredient: "Arrêt enzymatique" },
            { id: '1d', type: "ACTION", title: "RINCAGE / SPARGING", target: "78°C", value: "", ingredient: "12L eau chaude" },
            { id: '1e', type: "CHRONO", title: "ÉBULLITION (AMER)", target: "100°C", value: "60", ingredient: "20g Magnum" },
            { id: '1f', type: "CHRONO", title: "WHIRLPOOL", target: "80°C", value: "15", ingredient: "100g Citra" },
            { id: '1g', type: "ACTION", title: "REFROIDISSEMENT", target: "20°C", value: "", ingredient: "Levure US-05" }
          ]
        },
        {
          id: 2, name: "BELGIAN WITBIER", volume: 20, targetABV: 4.8,
          steps: [
            { id: '2a', type: "CHRONO", title: "PALIER PROTÉIQUE", target: "50°C", value: "15", ingredient: "Froment + Pils" },
            { id: '2b', type: "CHRONO", title: "PALIER MALTOSE", target: "63°C", value: "45", ingredient: "" },
            { id: '2c', type: "CHRONO", title: "SACCHARIFICATION", target: "72°C", value: "20", ingredient: "" },
            { id: '2d', type: "CHRONO", title: "ÉBULLITION", target: "100°C", value: "60", ingredient: "15g Saaz" },
            { id: '2e', type: "AJOUT", title: "BOTANIQUES", target: "100°C", value: "10", ingredient: "Coriandre / Orange" }
          ]
        },
        {
          id: 3, name: "STOUT AU CAFÉ", volume: 18, targetABV: 5.5,
          steps: [
            { id: '3a', type: "CHRONO", title: "EMPÂTAGE CORPS", target: "68°C", value: "60", ingredient: "Grains torréfiés" },
            { id: '3b', type: "CHRONO", title: "ÉBULLITION", target: "100°C", value: "60", ingredient: "Fuggles" },
            { id: '3c', type: "AJOUT", title: "COLD BREW", target: "20°C", value: "", ingredient: "250ml Café concentré" }
          ]
        }
      ];
      setRecipes(presets);
      localStorage.setItem("recipes_final_v12", JSON.stringify(presets));
    }
  }, []);

  if (!isMounted) return <div className="min-h-screen bg-black" />;

  const handleSave = (r: any) => {
    const updated = [r, ...recipes.filter(x => x.id !== r.id)];
    setRecipes(updated);
    localStorage.setItem("recipes_final_v12", JSON.stringify(updated));
    setView("library");
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-yellow-500">
      {view === "home" && <HomeView onNav={setView} />}
      {view === "library" && <LibraryView recipes={recipes} onBack={() => setView("home")} onSelect={(r) => { setSelectedRecipe(r); setView("detail"); }} />}
      {view === "detail" && selectedRecipe && <DetailView recipe={selectedRecipe} onBack={() => setView("library")} onEdit={() => setView("create")} />}
      {view === "create" && <LabView onSave={handleSave} onCancel={() => setView("library")} initialData={selectedRecipe} />}
    </div>
  );
}

/* --- VUES --- */

function HomeView({ onNav }: any) {
  return (
    <div className="max-w-md mx-auto p-12 pt-32 space-y-8 animate-in fade-in duration-700">
      <h1 className="text-7xl font-black italic text-yellow-500 uppercase leading-[0.8] tracking-tighter">BREW<br/>MASTER</h1>
      <div className="grid gap-4 pt-10">
        <button onClick={() => onNav("library")} className="bg-white text-black p-8 rounded-[2.5rem] font-black italic text-3xl flex justify-between items-center active:scale-95 transition-all">ARCHIVES <span>→</span></button>
        <button onClick={() => { setSelectedRecipe(null); onNav("create"); }} className="bg-[#111] p-8 rounded-[2.5rem] font-black italic text-2xl border border-white/5 active:scale-95 transition-all uppercase">Nouveau Lab</button>
      </div>
    </div>
  );
}

function LibraryView({ recipes, onBack, onSelect }: any) {
  return (
    <div className="max-w-md mx-auto p-6 pt-12 text-left animate-in slide-in-from-right-8 pb-32">
      <button onClick={onBack} className="text-[10px] font-black opacity-30 mb-8 uppercase tracking-widest">← MENU</button>
      <h2 className="text-4xl font-black italic uppercase text-yellow-500 mb-10 tracking-tighter">Mes Recettes</h2>
      <div className="space-y-4">
        {recipes.map((r: any) => (
          <div key={r.id} onClick={() => onSelect(r)} className="bg-[#111] p-8 rounded-[3rem] border border-white/5 active:scale-95 cursor-pointer flex justify-between items-center group shadow-xl transition-all">
            <div>
              <h4 className="font-black italic uppercase text-2xl group-hover:text-yellow-500">{r.name}</h4>
              <p className="text-[9px] font-black text-white/30 uppercase mt-1">{r.targetABV}% ABV • {r.volume}L • {r.steps?.length || 0} ÉTAPES</p>
            </div>
            <div className="text-yellow-500 font-black italic opacity-20">→</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DetailView({ recipe, onBack, onEdit }: any) {
  const [activeTimerId, setActiveTimerId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const timerRef = useRef<any>(null);

  const startTimer = (id: string, minutes: string) => {
    if (activeTimerId === id) { clearInterval(timerRef.current); setActiveTimerId(null); return; }
    const totalSeconds = parseInt(minutes) * 60;
    if (isNaN(totalSeconds) || totalSeconds <= 0) return;
    setActiveTimerId(id); setTimeLeft(totalSeconds);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
            if (prev <= 1) { 
                clearInterval(timerRef.current); setActiveTimerId(null);
                try { new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg").play(); } catch(e){}
                return 0; 
            }
            return prev - 1;
        });
    }, 1000);
  };

  return (
    <div className="max-w-md mx-auto p-6 pt-12 text-left pb-40">
      <div className="flex justify-between items-center mb-8">
        <button onClick={onBack} className="text-[10px] font-black opacity-30 uppercase tracking-widest">← RETOUR</button>
        <button onClick={onEdit} className="text-[10px] font-black text-yellow-500 uppercase">Éditer</button>
      </div>
      <h1 className="text-5xl font-black italic uppercase text-yellow-500 leading-none mb-10 tracking-tighter">{recipe.name}</h1>
      <div className="space-y-4">
          {recipe.steps?.map((step: any) => {
              const isActive = activeTimerId === step.id;
              return (
                <div key={step.id} className={`p-8 rounded-[2.5rem] border transition-all ${isActive ? 'bg-yellow-500 border-yellow-400 scale-[1.02] shadow-2xl' : 'bg-[#111] border-white/5'}`}>
                    <div className="flex justify-between items-center mb-6">
                        <span className={`text-[9px] font-black px-3 py-1 rounded-full ${isActive ? 'bg-black text-yellow-500' : 'bg-white/10 text-white'}`}>{step.type}</span>
                        {step.type === "CHRONO" && (
                            <button onClick={() => startTimer(step.id, step.value)} className={`p-4 px-6 rounded-2xl font-black italic text-xs ${isActive ? 'bg-black text-white' : 'bg-yellow-500 text-black'}`}>
                                {isActive ? 'STOP' : 'START'}
                            </button>
                        )}
                    </div>
                    <h4 className={`text-2xl font-black italic uppercase mb-2 ${isActive ? 'text-black' : 'text-white'}`}>{step.title}</h4>
                    {isActive ? (
                        <div className="text-5xl font-black text-black italic mb-2 tracking-tighter animate-pulse">{Math.floor(timeLeft/60)}:{(timeLeft%60).toString().padStart(2, '0')}</div>
                    ) : (
                        <p className="text-lg font-black opacity-40 italic mb-4 text-white uppercase">{step.value} {step.type === 'CHRONO' ? 'MIN' : ''} {step.target !== '-' ? `• ${step.target}` : ''}</p>
                    )}
                    {step.ingredient && <div className={`p-3 rounded-2xl text-[10px] font-black uppercase italic ${isActive ? 'bg-black/10 text-black' : 'bg-black/40 text-green-500'}`}>{step.ingredient}</div>}
                </div>
              );
          })}
      </div>
    </div>
  );
}

/* --- LAB VIEW (Simplifiée pour éviter les erreurs) --- */
function LabView({ onSave, onCancel, initialData }: any) {
  const [form, setForm] = useState<any>(initialData || { id: Date.now(), name: "SANS NOM", volume: 20, targetABV: 5, steps: [] });

  return (
    <div className="max-w-md mx-auto p-6 pb-40">
      <h2 className="text-2xl font-black italic text-yellow-500 mb-8 uppercase">Configuration</h2>
      <div className="space-y-4 mb-8">
        <input className="w-full bg-[#111] p-6 rounded-3xl font-black uppercase text-yellow-500 border border-white/5" value={form.name} onChange={e => setForm({...form, name: e.target.value.toUpperCase()})} placeholder="NOM DE LA RECETTE" />
        <div className="grid grid-cols-2 gap-4">
          <input type="number" className="bg-[#111] p-6 rounded-3xl font-black" value={form.volume} onChange={e => setForm({...form, volume: e.target.value})} placeholder="VOL (L)" />
          <input type="number" className="bg-[#111] p-6 rounded-3xl font-black text-orange-500" value={form.targetABV} onChange={e => setForm({...form, targetABV: e.target.value})} placeholder="ABV %" />
        </div>
      </div>
      <button onClick={() => onSave(form)} className="w-full bg-yellow-500 p-8 rounded-[2.5rem] text-black font-black italic text-xl uppercase shadow-2xl">SAUVEGARDER</button>
      <button onClick={onCancel} className="w-full p-6 mt-4 text-[10px] font-black opacity-30 uppercase">Annuler</button>
    </div>
  );
}