"use client";

import { useState, useEffect, useRef } from "react";

/* ================= 1. MOTEUR BREWMATH ================= */
const BrewMath = {
  DI: (malts: any[], volume: number, rendement = 0.72) => {
    if (!malts?.length || !volume) return 1.000;
    const pts = malts.reduce((a, m) => {
      const lb = (m.weight || 0) * 2.20462;
      return a + lb * (m.ppg || 36) * rendement;
    }, 0);
    return +(1 + (pts / (volume * 0.264)) / 1000).toFixed(3);
  },
  DF: (di: number, att = 75) => +(di - ((di - 1) * (att / 100))).toFixed(3),
  ABV: (di: number, df: number) => +((di - df) * 131.25).toFixed(2),
  EBC: (malts: any[], volume: number) => {
    if (!malts?.length || !volume) return 0;
    const mcu = malts.reduce((a, m) => {
      const lb = (m.weight || 0) * 2.20462;
      return a + (lb * (m.ebc || 0)) / (volume * 0.264);
    }, 0);
    return +(1.4922 * Math.pow(mcu, 0.6859) * 1.97).toFixed(1);
  }
};

/* ================= 2. COMPOSANT PRINCIPAL ================= */
export default function BrewMasterV12() {
  const [isMounted, setIsMounted] = useState(false);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [view, setView] = useState<"home" | "create" | "library" | "detail">("home");
  const [selectedRecipe, setSelectedRecipe] = useState<any | null>(null);

  useEffect(() => {
    setIsMounted(true);
    const saved = localStorage.getItem("recipes_v12");
    if (saved) {
      setRecipes(JSON.parse(saved));
    } else {
      const presets = [
        {
          id: 1, name: "CITRA PUNCH IPA", volume: 20, targetABV: 6.2, abv: 6.2, di: 1.060, ebc: 12,
          steps: [
            { id: '1-1', type: "CHRONO", title: "EMPÂTAGE MONOPALIER", target: "66°C", value: "60", ingredient: "Ratio 3L/kg" },
            { id: '1-2', type: "CHRONO", title: "MASH OUT", target: "78°C", value: "10", ingredient: "" },
            { id: '1-3', type: "ACTION", title: "RINCAGE DES DRÊCHES", target: "78°C", value: "", ingredient: "Eau de rinçage" },
            { id: '1-4', type: "CHRONO", title: "ÉBULLITION (AMÉRISANT)", target: "100°C", value: "60", ingredient: "20g Magnum" },
            { id: '1-5', type: "AJOUT", title: "HOUBLONNAGE AROMATIQUE", target: "100°C", value: "10", ingredient: "30g Citra" },
            { id: '1-6', type: "CHRONO", title: "WHIRLPOOL / FLAME OUT", target: "80°C", value: "20", ingredient: "70g Citra" },
            { id: '1-7', type: "ACTION", title: "REFROIDISSEMENT", target: "20°C", value: "", ingredient: "Vers fermenteur" }
          ]
        },
        {
          id: 2, name: "SMASH MOSAIC", volume: 20, targetABV: 5.5, abv: 5.5, di: 1.052, ebc: 8,
          steps: [
            { id: '2-1', type: "CHRONO", title: "EMPÂTAGE", target: "67°C", value: "60", ingredient: "Pale Ale" },
            { id: '2-2', type: "CHRONO", title: "ÉBULLITION", target: "100°C", value: "60", ingredient: "15g Mosaic" },
            { id: '2-3', type: "AJOUT", title: "HOUBLON FIN D'EBU", target: "100°C", value: "5", ingredient: "35g Mosaic" },
            { id: '2-4', type: "ACTION", title: "TRANSFERT", target: "20°C", value: "", ingredient: "Levure US-05" }
          ]
        },
        {
          id: 3, name: "BELGIAN WITBIER", volume: 20, targetABV: 4.8, abv: 4.8, di: 1.046, ebc: 6,
          steps: [
            { id: '3-1', type: "CHRONO", title: "PALIER PROTÉIQUE", target: "50°C", value: "15", ingredient: "Froment cru" },
            { id: '3-2', type: "CHRONO", title: "SACCHARIFICATION", target: "66°C", value: "60", ingredient: "" },
            { id: '3-3', type: "CHRONO", title: "ÉBULLITION", target: "100°C", value: "60", ingredient: "Saaz" },
            { id: '3-4', type: "AJOUT", title: "ÉPICES", target: "100°C", value: "10", ingredient: "Coriandre/Orange" },
            { id: '3-5', type: "ACTION", title: "REFROIDISSEMENT", target: "22°C", value: "", ingredient: "Levure Wit" }
          ]
        },
        {
          id: 4, name: "STOUT IMPÉRIAL", volume: 15, targetABV: 9.0, abv: 9.0, di: 1.090, ebc: 85,
          steps: [
            { id: '4-1', type: "CHRONO", title: "EMPÂTAGE LONG", target: "68°C", value: "90", ingredient: "Grains torréfiés" },
            { id: '4-2', type: "ACTION", title: "FILTRATION LENTE", target: "78°C", value: "", ingredient: "" },
            { id: '4-3', type: "CHRONO", title: "ÉBULLITION", target: "100°C", value: "90", ingredient: "Fuggles" },
            { id: '4-4', type: "AJOUT", title: "SUCRE CANDI", target: "100°C", value: "15", ingredient: "500g Dark Candi" },
            { id: '4-5', type: "ACTION", title: "MISE EN FERMENTEUR", target: "18°C", value: "", ingredient: "Pitching Levure" }
          ]
        }
      ];
      setRecipes(presets);
      localStorage.setItem("recipes_v12", JSON.stringify(presets));
    }
  }, []);

  if (!isMounted) return <div className="min-h-screen bg-black" />;

  const saveToStorage = (updated: any[]) => {
    setRecipes(updated);
    localStorage.setItem("recipes_v12", JSON.stringify(updated));
  };

  const handleSave = (r: any) => {
    const existingIdx = recipes.findIndex(x => x.id === r.id);
    const updated = existingIdx >= 0 ? recipes.map(x => x.id === r.id ? r : x) : [r, ...recipes];
    saveToStorage(updated);
    setView("library");
  };

  const handleDelete = (id: any) => {
    saveToStorage(recipes.filter(r => r.id !== id));
    setView("library");
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-yellow-500">
      {view === "home" && <HomeView onNav={setView} />}
      {view === "create" && <LabView onSave={handleSave} onCancel={() => setView("home")} initialData={selectedRecipe} />}
      {view === "library" && <LibraryView recipes={recipes} onBack={() => setView("home")} onSelect={(r) => { setSelectedRecipe(r); setView("detail"); }} />}
      {view === "detail" && selectedRecipe && <DetailView recipe={selectedRecipe} onBack={() => setView("library")} onEdit={() => setView("create")} onDelete={handleDelete} />}
    </div>
  );
}

/* ================= 3. LAB VIEW (DRAG & DROP) ================= */
function LabView({ onSave, onCancel, initialData }: any) {
  const [form, setForm] = useState<any>(initialData || {
    id: Date.now(), name: "NOUVEAU BRASSIN", volume: 20, targetABV: 5.5,
    steps: [
        { id: Date.now().toString(), type: "CHRONO", title: "EMPÂTAGE", target: "67°C", value: "60", ingredient: "" }
    ]
  });

  const dragItem = useRef<any>(null);
  const dragOverItem = useRef<any>(null);

  const handleDragSort = () => {
    const _steps = [...form.steps];
    const draggedItemContent = _steps.splice(dragItem.current, 1)[0];
    _steps.splice(dragOverItem.current, 0, draggedItemContent);
    setForm({...form, steps: _steps});
  };

  return (
    <div className="max-w-md mx-auto p-6 pb-40 animate-in slide-in-from-bottom-10">
      <header className="flex justify-between items-center mb-10">
        <button onClick={onCancel} className="text-[10px] font-black opacity-30 uppercase tracking-[0.3em]">← ANNULER</button>
        <span className="text-yellow-500 font-black italic">RECETTE LAB</span>
      </header>

      <div className="bg-[#111] p-8 rounded-[3rem] border border-white/5 mb-8">
        <input className="w-full bg-transparent text-3xl font-black italic uppercase text-yellow-500 outline-none mb-6 border-b border-white/5 pb-2" value={form.name} onChange={e => setForm({...form, name: e.target.value.toUpperCase()})} />
        <div className="grid grid-cols-2 gap-4">
            <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                <p className="text-[7px] font-black opacity-20 uppercase mb-1">Litres</p>
                <input type="number" className="bg-transparent font-black text-2xl outline-none w-full" value={form.volume} onChange={e => setForm({...form, volume: parseFloat(e.target.value) || 1})} />
            </div>
            <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                <p className="text-[7px] font-black opacity-20 uppercase mb-1">ABV %</p>
                <input type="number" step="0.1" className="bg-transparent font-black text-2xl outline-none w-full text-orange-500" value={form.targetABV} onChange={e => setForm({...form, targetABV: parseFloat(e.target.value) || 0})} />
            </div>
        </div>
      </div>

      <div className="space-y-4">
        {form.steps.map((step: any, index: number) => (
          <div key={step.id} draggable onDragStart={() => (dragItem.current = index)} onDragEnter={() => (dragOverItem.current = index)} onDragEnd={handleDragSort} onDragOver={(e) => e.preventDefault()}
            className="bg-[#111] p-6 rounded-[2.5rem] border border-white/5 cursor-grab active:cursor-grabbing">
            <div className="flex justify-between items-center mb-4">
                <div className="text-white/10 font-black text-xs uppercase italic">⠿ DRAG CARD</div>
                <button onClick={() => setForm({...form, steps: form.steps.filter((_:any,i:number)=>i!==index)})} className="text-[9px] font-black text-red-500/30">SUPPRIMER</button>
            </div>
            <input className="bg-transparent font-black italic uppercase text-sm outline-none w-full border-b border-white/5 pb-2 mb-4" value={step.title} onChange={e => { const ns = [...form.steps]; ns[index].title = e.target.value.toUpperCase(); setForm({...form, steps: ns}); }} />
            <div className="grid grid-cols-3 gap-2">
                <select className="bg-black/40 p-2 rounded-xl text-[9px] font-black uppercase text-yellow-500 outline-none" value={step.type} onChange={e => { const ns = [...form.steps]; ns[index].type = e.target.value; setForm({...form, steps: ns}); }}>
                    <option value="CHRONO">TIMER</option>
                    <option value="ACTION">ACTION</option>
                    <option value="AJOUT">AJOUT</option>
                </select>
                <input className="bg-black/40 p-2 rounded-xl text-[10px] font-black text-blue-400 text-center outline-none" placeholder="Cible" value={step.target} onChange={e => { const ns = [...form.steps]; ns[index].target = e.target.value; setForm({...form, steps: ns}); }} />
                <input className="bg-black/40 p-2 rounded-xl text-[10px] font-black text-white text-center outline-none" placeholder="Valeur" value={step.value} onChange={e => { const ns = [...form.steps]; ns[index].value = e.target.value; setForm({...form, steps: ns}); }} />
            </div>
            <input className="w-full bg-black/20 p-2 rounded-xl text-[9px] font-black text-green-500 mt-2 outline-none" placeholder="Note ou Ingrédient..." value={step.ingredient} onChange={e => { const ns = [...form.steps]; ns[index].ingredient = e.target.value; setForm({...form, steps: ns}); }} />
          </div>
        ))}
        <button onClick={() => setForm({...form, steps: [...form.steps, {id: Date.now().toString(), type: "ACTION", title: "NOUVELLE ÉTAPE", target: "-", value: "-", ingredient: ""}]})} className="w-full p-6 border border-dashed border-white/10 rounded-[2.5rem] opacity-20 text-[9px] font-black uppercase tracking-widest mt-4">+ AJOUTER ÉTAPE</button>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black to-transparent">
        <button onClick={() => onSave({...form, abv: form.targetABV, di: 1.050, id: form.id})} className="w-full bg-yellow-500 p-7 rounded-[2.5rem] text-black font-black italic text-xl uppercase shadow-2xl active:scale-95 transition-all">ENREGISTRER</button>
      </div>
    </div>
  );
}

/* ================= 4. COCKPIT & BADGES ================= */
function DetailView({ recipe, onBack, onEdit, onDelete }: any) {
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
    <div className="max-w-md mx-auto p-6 pt-12 text-left animate-in fade-in pb-40">
      <div className="flex justify-between items-center mb-8">
        <button onClick={onBack} className="text-[10px] font-black opacity-30 uppercase tracking-widest">← BIBLIO</button>
        <button onClick={onEdit} className="text-[10px] font-black text-yellow-500 uppercase italic">Éditer la timeline</button>
      </div>
      
      <h1 className="text-5xl font-black italic uppercase text-yellow-500 leading-none mb-10 tracking-tighter">{recipe.name}</h1>
      
      <div className="grid grid-cols-3 gap-2 mb-10">
          <Badge label="CIBLE" value={`${recipe.abv}%`} color="text-orange-500" />
          <Badge label="VOLUME" value={`${recipe.volume}L`} color="text-white" />
          <Badge label="ÉTAPES" value={recipe.steps?.length || 0} color="text-blue-400" />
      </div>

      <div className="space-y-4">
          {recipe.steps?.map((step: any, i: number) => {
              const isActive = activeTimerId === step.id;
              return (
                <div key={step.id} className={`p-8 rounded-[2.5rem] border transition-all duration-500 ${isActive ? 'bg-yellow-500 border-yellow-400 scale-[1.02] shadow-2xl' : 'bg-[#111] border-white/5'}`}>
                    <div className="flex justify-between items-center mb-6">
                        <span className={`text-[9px] font-black px-3 py-1 rounded-full italic ${isActive ? 'bg-black text-yellow-500' : 'bg-white/10 text-white'}`}>{step.type}</span>
                        {step.type === "CHRONO" && (
                            <button onClick={() => startTimer(step.id, step.value)} className={`p-4 px-6 rounded-2xl font-black italic text-xs ${isActive ? 'bg-black text-white' : 'bg-yellow-500 text-black shadow-lg'}`}>
                                {isActive ? 'STOP' : 'DÉMARRER'}
                            </button>
                        )}
                    </div>
                    <h4 className={`text-2xl font-black italic uppercase mb-2 tracking-tighter ${isActive ? 'text-black' : 'text-white'}`}>{step.title}</h4>
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

/* ================= 5. UI COMPONENTS ================= */
function HomeView({ onNav }: any) {
  return (
    <div className="max-w-md mx-auto p-12 pt-32 space-y-8 text-left">
      <h1 className="text-7xl font-black italic text-yellow-500 uppercase leading-[0.8] tracking-tighter">BREW<br/>MASTER</h1>
      <div className="grid gap-4 pt-10">
        <button onClick={() => onNav("create")} className="bg-white text-black p-8 rounded-[2.5rem] font-black italic text-3xl flex justify-between items-center active:scale-95 transition-all shadow-2xl">LABO <span>＋</span></button>
        <button onClick={() => onNav("library")} className="bg-[#111] p-8 rounded-[2.5rem] font-black italic text-2xl border border-white/5 active:scale-95 transition-all">BIBLIO</button>
      </div>
    </div>
  );
}

function LibraryView({ recipes, onBack, onSelect }: any) {
  return (
    <div className="max-w-md mx-auto p-6 pt-12 text-left animate-in slide-in-from-right-8 pb-32">
      <button onClick={onBack} className="text-[10px] font-black opacity-30 mb-8 uppercase tracking-widest">← MENU</button>
      <h2 className="text-4xl font-black italic uppercase text-yellow-500 mb-10 tracking-tighter">Mes Brassins</h2>
      <div className="space-y-4">
        {recipes.map((r: any) => (
          <div key={r.id} onClick={() => onSelect(r)} className="bg-[#111] p-8 rounded-[3rem] border border-white/5 active:scale-95 cursor-pointer flex justify-between items-center group shadow-xl transition-all">
            <div><h4 className="font-black italic uppercase text-2xl group-hover:text-yellow-500 transition-colors">{r.name}</h4><p className="text-[9px] font-black text-white/30 uppercase mt-1 tracking-widest">{r.abv}% ABV • {r.volume}L • {r.steps?.length || 0} ÉTAPES</p></div>
            <div className="text-yellow-500 font-black italic opacity-20">→</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Badge({ label, value, color }: any) {
    return (
        <div className="bg-[#111] p-5 rounded-[2rem] border border-white/5 text-center">
            <p className="text-[7px] font-black opacity-20 uppercase mb-1">{label}</p>
            <p className={`text-xl font-black italic ${color}`}>{value}</p>
        </div>
    );
}