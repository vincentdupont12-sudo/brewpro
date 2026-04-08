"use client";

import { useState, useEffect, useRef } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

// --- TYPES ---
interface Step {
  id: string;
  type: "PALIER" | "ACTION";
  title: string;
  target: string;
  value: string; 
}

interface Recipe {
  id: number;
  name: string;
  steps: Step[];
}

const STORAGE_KEY = "BREW_MASTER_PRO_DATA";

// --- STARTER PACK : RECETTES PRÉCHARGÉES ---
const PRELOADED_RECIPES: Recipe[] = [
  {
    id: 101,
    name: "SMASH CITRA (BASE)",
    steps: [
      { id: "s1", type: "PALIER", title: "EMPÂTAGE", target: "67°C", value: "60" },
      { id: "s2", type: "PALIER", title: "MASH OUT", target: "78°C", value: "10" },
      { id: "s3", type: "ACTION", title: "HOUBLONNAGE AMÉRISANT", target: "60 MIN", value: "0" },
      { id: "s4", type: "ACTION", title: "HOUBLONNAGE AROMATIQUE", target: "10 MIN", value: "0" }
    ]
  },
  {
    id: 102,
    name: "WEST COAST IPA",
    steps: [
      { id: "i1", type: "PALIER", title: "EMPÂTAGE SEC", target: "65°C", value: "60" },
      { id: "i2", type: "ACTION", title: "FLAME OUT (WHIRLPOOL)", target: "80°C", value: "20" },
      { id: "i3", type: "ACTION", title: "DRY HOP #1", target: "FERMENTEUR", value: "0" }
    ]
  },
  {
    id: 103,
    name: "OATMEAL STOUT",
    steps: [
      { id: "st1", type: "PALIER", title: "EMPÂTAGE CORPS", target: "68°C", value: "60" },
      { id: "st2", type: "ACTION", title: "AJOUT GRAINS TORRÉFIÉS", target: "FIN D'EMPÂTAGE", value: "15" },
      { id: "st3", type: "PALIER", title: "MASH OUT", target: "78°C", value: "10" }
    ]
  },
  {
    id: 104,
    name: "BELGIAN TRIPEL",
    steps: [
      { id: "bt1", type: "PALIER", title: "PALIER PROTÉINIQUE", target: "50°C", value: "15" },
      { id: "bt2", type: "PALIER", title: "SACCHARIFICATION", target: "64°C", value: "75" },
      { id: "bt3", type: "ACTION", title: "AJOUT SUCRE CANDI", target: "ÉBULLITION", value: "15" }
    ]
  },
  {
    id: 105,
    name: "NEIPA JUS D'ORANGE",
    steps: [
      { id: "n1", type: "PALIER", title: "MASH TRÈS CHAUD", target: "69°C", value: "60" },
      { id: "n2", type: "ACTION", title: "WHIRLPOOL MASSIF", target: "75°C", value: "30" },
      { id: "n3", type: "ACTION", title: "BIO-TRANSFORMATION DRY HOP", target: "J3 FERM.", value: "0" }
    ]
  },
  {
    id: 106,
    name: "WEISSBIER (BLANCHE)",
    steps: [
      { id: "w1", type: "PALIER", title: "ACIDE FÉRULIQUE", target: "45°C", value: "15" },
      { id: "w2", type: "PALIER", title: "PALIER MALTOSE", target: "63°C", value: "45" },
      { id: "w3", type: "PALIER", title: "DEXTRINES", target: "72°C", value: "20" }
    ]
  }
];

export default function BrewMasterV3() {
  const [view, setView] = useState<"home" | "create" | "library" | "detail">("home");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  // INITIALISATION AVEC PRÉCHARGEMENT
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setRecipes(JSON.parse(saved));
    } else {
      // Premier lancement : on met les recettes par défaut et on les sauve
      setRecipes(PRELOADED_RECIPES);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(PRELOADED_RECIPES));
    }
  }, []);

  const saveRecipe = (newRecipe: Recipe) => {
    const updatedRecipes = [newRecipe, ...recipes.filter(r => r.id !== newRecipe.id)];
    setRecipes(updatedRecipes);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedRecipes));
    setView("library");
  };

  const deleteRecipe = (id: number) => {
    const updated = recipes.filter(r => r.id !== id);
    setRecipes(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    if (selectedRecipe?.id === id) setView("library");
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans uppercase p-4 selection:bg-yellow-500 selection:text-black">
      {view === "home" && <Home onNav={setView} />}
      {view === "library" && (
        <Library 
          recipes={recipes} 
          onBack={() => setView("home")} 
          onSelect={(r: Recipe) => { setSelectedRecipe(r); setView("detail"); }} 
          onDelete={deleteRecipe}
        />
      )}
      {view === "detail" && <Detail recipe={selectedRecipe} onBack={() => setView("library")} />}
      {view === "create" && <Lab onSave={saveRecipe} onCancel={() => setView("home")} />}
    </div>
  );
}

// --- LES COMPOSANTS RESTENT LES MÊMES (Timer, Lab, etc.) ---
// [Copie ici les composants StepTimer, Lab, Home, Library, Detail de la version précédente]
// Ils sont inchangés, la logique de persistance est maintenant gérée par le starter pack.

function StepTimer({ step }: { step: Step }) {
  const getInitialSeconds = () => {
    const mins = parseInt(step.value);
    return isNaN(mins) ? 0 : mins * 60;
  };
  const [timeLeft, setTimeLeft] = useState(getInitialSeconds());
  const [isActive, setIsActive] = useState(false);
  const timerRef = useRef<any>(null);

  useEffect(() => { setTimeLeft(getInitialSeconds()); setIsActive(false); }, [step.value, step.id]);
  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else {
      clearInterval(timerRef.current);
      if (timeLeft === 0) setIsActive(false);
    }
    return () => clearInterval(timerRef.current);
  }, [isActive, timeLeft]);

  const format = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec < 10 ? "0" : ""}${sec}`;
  };

  if (step.type === "ACTION") {
    return (
      <div className="p-4 rounded-3xl bg-zinc-900 border border-white/5 mb-2">
        <div className="text-[8px] opacity-30 font-black mb-1 text-blue-400">ACTION</div>
        <div className="text-base font-black italic uppercase tracking-tighter">{step.title}</div>
        <div className="text-white/40 text-[9px] mt-1">{step.target}</div>
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-[1.8rem] border transition-all ${isActive ? 'bg-yellow-500 text-black border-yellow-500 shadow-lg scale-[1.02]' : 'bg-zinc-900 border-white/5'} mb-2`}>
      <div className="flex justify-between items-center mb-3">
        <div className="overflow-hidden">
          <h3 className="text-base font-black italic truncate tracking-tighter">{step.title}</h3>
          <div className={`text-[9px] font-black ${isActive ? 'text-black/50' : 'text-blue-400'}`}>{step.target} • {step.value} MIN</div>
        </div>
        <div className="text-3xl font-black italic tabular-nums tracking-tighter">{format(timeLeft)}</div>
      </div>
      <div className="flex gap-2">
        <button onClick={() => setIsActive(!isActive)} className={`flex-[2] py-2 rounded-xl font-black text-[9px] ${isActive ? 'bg-black text-white' : 'bg-yellow-500 text-black'}`}>
          {isActive ? "PAUSE" : "DÉMARRER"}
        </button>
        <button onClick={() => { setIsActive(false); setTimeLeft(getInitialSeconds()); }} className={`flex-1 py-2 border rounded-xl font-black text-[9px] ${isActive ? 'border-black/20 text-black' : 'border-white/10 text-white/40'}`}>RAZ</button>
      </div>
    </div>
  );
}

function Lab({ onSave, onCancel }: any) {
  const [name, setName] = useState("");
  const [steps, setSteps] = useState<Step[]>([{ id: "step-" + Date.now(), type: "PALIER", title: "", target: "", value: "60" }]);
  const [enabled, setEnabled] = useState(false);
  useEffect(() => { setEnabled(true); }, []);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(steps);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setSteps(items);
  };

  if (!enabled) return null;

  return (
    <div className="max-w-md mx-auto pb-44">
      <button onClick={onCancel} className="text-yellow-500 font-black mb-8 block text-[10px] tracking-widest uppercase opacity-70">← ANNULER</button>
      <input className="w-full bg-transparent text-5xl font-black italic text-yellow-500 border-b-2 border-white/10 mb-12 outline-none uppercase tracking-tighter" placeholder="NOM DU BRASSIN" value={name} onChange={e => setName(e.target.value)} />
      
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="steps-droppable">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-8">
              {steps.map((s, i) => (
                <Draggable key={s.id} draggableId={s.id} index={i}>
                  {(provided, snapshot) => (
                    <div ref={provided.innerRef} {...provided.draggableProps} className={snapshot.isDragging ? "z-50" : ""}>
                      <div className={`bg-zinc-900 p-6 rounded-[2rem] border transition-all ${snapshot.isDragging ? 'border-yellow-500 shadow-2xl scale-105' : 'border-white/10'}`}>
                        <div {...provided.dragHandleProps} className="bg-yellow-500 text-black p-2 w-8 h-8 flex items-center justify-center rounded-full mb-4 cursor-grab">:::</div>
                        <div className="flex justify-between mb-4">
                          <select className="bg-black text-yellow-500 font-black p-1 rounded text-[9px]" value={s.type} onChange={e => {
                            const n = [...steps]; n[i].type = e.target.value as any; setSteps(n);
                          }}>
                            <option value="PALIER">PALIER</option>
                            <option value="ACTION">ACTION</option>
                          </select>
                          <button onClick={() => setSteps(steps.filter((_, idx) => idx !== i))} className="text-red-900 text-[9px] font-black uppercase">Suppr.</button>
                        </div>
                        <input className="w-full bg-transparent border-b border-white/5 mb-4 font-black outline-none italic text-xl uppercase tracking-tight" placeholder="NOM ÉTAPE" value={s.title} onChange={e => {
                          const n = [...steps]; n[i].title = e.target.value.toUpperCase(); setSteps(n);
                        }} />
                        <div className="grid grid-cols-2 gap-4">
                          <input className="bg-black p-4 rounded-xl text-xs text-blue-400 font-black" placeholder="CIBLE" value={s.target} onChange={e => {
                             const n = [...steps]; n[i].target = e.target.value; setSteps(n);
                          }} />
                          <input className="bg-black p-4 rounded-xl text-xs font-black" placeholder="MIN" type="number" value={s.value} onChange={e => {
                             const n = [...steps]; n[i].value = e.target.value; setSteps(n);
                          }} />
                        </div>
                      </div>
                      <div className="mt-2 px-6 opacity-30"><StepTimer step={s} /></div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <button onClick={() => setSteps([...steps, { id: "step-" + Date.now(), type: "PALIER", title: "", target: "", value: "10" }])} className="w-full mt-12 p-6 border-2 border-dashed border-zinc-900 rounded-3xl opacity-30 font-black text-[10px] uppercase hover:opacity-100 transition-all">+ ÉTAPE</button>
      
      <div className="fixed bottom-8 left-4 right-4 max-w-md mx-auto z-[100]">
        <button onClick={() => onSave({ id: Date.now(), name: name || "NOUVELLE RECETTE", steps })} className="w-full bg-yellow-500 text-black p-8 rounded-full font-black italic text-2xl shadow-2xl active:scale-95 transition-all uppercase">ENREGISTRER</button>
      </div>
    </div>
  );
}

function Home({ onNav }: any) {
  return (
    <div className="max-w-md mx-auto pt-24">
      <h1 className="text-8xl font-black italic text-yellow-500 leading-[0.75] mb-16 tracking-tighter">BREW<br/>MASTER</h1>
      <button onClick={() => onNav("create")} className="w-full bg-yellow-500 text-black p-8 rounded-[2rem] font-black italic text-2xl mb-4 text-left shadow-xl active:scale-95 transition-all">NOUVEAU LAB +</button>
      <button onClick={() => onNav("library")} className="w-full bg-zinc-900 p-8 rounded-[2rem] font-black italic text-2xl text-left border border-white/5 active:scale-95 transition-all">ARCHIVES →</button>
    </div>
  );
}

function Library({ recipes, onBack, onSelect, onDelete }: any) {
  return (
    <div className="max-w-md mx-auto">
      <button onClick={onBack} className="text-yellow-500 font-black text-[10px] mb-8 tracking-widest uppercase opacity-70">← RETOUR</button>
      <h2 className="text-5xl font-black italic text-yellow-500 mb-8 tracking-tighter uppercase leading-none">BIBLIOTHÈQUE</h2>
      <div className="space-y-3">
        {recipes.map((r: Recipe) => (
          <div key={r.id} className="group relative">
            <div onClick={() => onSelect(r)} className="bg-zinc-900 p-6 rounded-3xl flex justify-between items-center cursor-pointer border border-transparent active:border-yellow-500 transition-all">
              <span className="font-black italic text-xl uppercase tracking-tighter">{r.name}</span>
              <span className="text-yellow-500 text-[9px] font-black tracking-widest">OUVRIR</span>
            </div>
            <button onClick={(e) => { e.stopPropagation(); onDelete(r.id); }} className="absolute -right-2 -top-2 bg-red-600 text-white w-6 h-6 rounded-full text-[10px] font-black opacity-0 group-hover:opacity-100 transition-opacity">×</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Detail({ recipe, onBack }: { recipe: Recipe | null, onBack: () => void }) {
  if (!recipe) return null;
  return (
    <div className="max-w-md mx-auto pb-10">
      <button onClick={onBack} className="text-yellow-500 font-black mb-8 block text-[10px] tracking-widest uppercase opacity-70">← RETOUR</button>
      <h2 className="text-6xl font-black italic text-yellow-500 mb-10 leading-[0.85] uppercase tracking-tighter">{recipe.name}</h2>
      <div className="space-y-1">
        {recipe.steps.map((s) => (
          <StepTimer key={s.id} step={s} />
        ))}
      </div>
    </div>
  );
}