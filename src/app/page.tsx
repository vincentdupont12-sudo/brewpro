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

export default function BrewMasterV3() {
  const [view, setView] = useState<"home" | "create" | "library" | "detail">("home");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("BREW_EXCELLENT_SAVE");
    if (saved) setRecipes(JSON.parse(saved));
  }, []);

  const saveRecipe = (r: Recipe) => {
    const newRecipes = [r, ...recipes.filter(x => x.id !== r.id)];
    setRecipes(newRecipes);
    localStorage.setItem("BREW_EXCELLENT_SAVE", JSON.stringify(newRecipes));
    setView("library");
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans uppercase p-4">
      {view === "home" && <Home onNav={setView} />}
      {view === "library" && (
        <Library 
          recipes={recipes} 
          onBack={() => setView("home")} 
          onSelect={(r: Recipe) => { setSelectedRecipe(r); setView("detail"); }} 
        />
      )}
      {view === "detail" && <Detail recipe={selectedRecipe} onBack={() => setView("library")} />}
      {view === "create" && <Lab onSave={saveRecipe} onCancel={() => setView("home")} />}
    </div>
  );
}

// --- LE COMPOSANT TIMER (RÉPARÉ & COMPLET) ---
function StepTimer({ step }: { step: Step }) {
  const getInitialSeconds = () => {
    const mins = parseInt(step.value);
    return isNaN(mins) ? 0 : mins * 60;
  };

  const [timeLeft, setTimeLeft] = useState(getInitialSeconds());
  const [isActive, setIsActive] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync avec les changements d'inputs
  useEffect(() => {
    setTimeLeft(getInitialSeconds());
    setIsActive(false);
  }, [step.value, step.id]);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (timeLeft === 0) setIsActive(false);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
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
        <div className="text-base font-black italic tracking-tighter uppercase">{step.title || "SANS NOM"}</div>
        <div className="text-white/40 text-[9px] mt-1 italic">{step.target}</div>
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-[1.8rem] border transition-all duration-300 mb-2 ${isActive ? 'bg-yellow-500 text-black border-yellow-500 shadow-lg' : 'bg-zinc-900 border-white/5'}`}>
      <div className="flex justify-between items-center mb-3">
        <div className="overflow-hidden">
          <h3 className="text-base font-black italic leading-none uppercase tracking-tighter truncate">{step.title || "PALIER"}</h3>
          <div className={`flex gap-2 mt-1 font-black text-[9px] ${isActive ? 'text-black/50' : 'text-white/30'}`}>
            <span className={isActive ? 'text-black font-black' : 'text-blue-400'}>{step.target || "--"}</span>
            <span>•</span>
            <span>{step.value || "0"} MIN</span>
          </div>
        </div>
        <div className={`text-3xl font-black italic tabular-nums tracking-tighter ${isActive ? 'animate-pulse' : ''}`}>
          {format(timeLeft)}
        </div>
      </div>
      <div className="flex gap-2">
        {!isActive && timeLeft === getInitialSeconds() ? (
          <button onClick={() => setIsActive(true)} className="w-full py-2 bg-yellow-500 text-black rounded-xl font-black text-[10px] border border-black/10">DÉMARRER</button>
        ) : (
          <>
            <button onClick={() => setIsActive(!isActive)} className={`flex-[2] py-2 rounded-xl font-black text-[9px] ${isActive ? 'bg-black text-white' : 'bg-black text-yellow-500'}`}>
              {isActive ? "PAUSE" : "REPRENDRE"}
            </button>
            <button onClick={() => { setIsActive(false); setTimeLeft(getInitialSeconds()); }} className={`flex-1 py-2 rounded-xl font-black text-[9px] border ${isActive ? 'border-black/20 text-black' : 'border-white/10 text-white/40'}`}>
              RAZ
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// --- VUE LAB (DRAG & DROP + INPUTS + TIMER) ---
function Lab({ onSave, onCancel }: any) {
  const [name, setName] = useState("");
  const [steps, setSteps] = useState<Step[]>([{ id: "step-" + Date.now(), type: "PALIER", title: "", target: "", value: "60" }]);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const animation = requestAnimationFrame(() => setEnabled(true));
    return () => cancelAnimationFrame(animation);
  }, []);

  const updateStep = (index: number, field: keyof Step, val: string) => {
    const newSteps = [...steps];
    (newSteps[index] as any)[field] = val;
    setSteps(newSteps);
  };

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
      <button onClick={onCancel} className="text-yellow-500 font-black mb-8 block text-[10px] tracking-widest uppercase">← ANNULER</button>
      <input className="w-full bg-transparent text-5xl font-black italic text-yellow-500 border-b-2 border-white/10 mb-12 outline-none uppercase tracking-tighter" placeholder="NOM BRASSIN" value={name} onChange={e => setName(e.target.value)} />
      
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="steps-droppable">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-8">
              {steps.map((s, i) => (
                <Draggable key={s.id} draggableId={s.id} index={i}>
                  {(provided, snapshot) => (
                    <div ref={provided.innerRef} {...provided.draggableProps} className={`relative group ${snapshot.isDragging ? "z-50" : ""}`}>
                      {/* CARTE D'ÉDITION */}
                      <div className={`bg-zinc-900 p-6 rounded-[2rem] border transition-all ${snapshot.isDragging ? 'border-yellow-500 shadow-2xl scale-105' : 'border-white/10'}`}>
                        {/* HANDLE */}
                        <div {...provided.dragHandleProps} className="absolute -left-2 top-10 bg-yellow-500 text-black p-2 rounded-full shadow-lg cursor-grab active:cursor-grabbing">
                          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
                        </div>

                        <div className="flex justify-between items-center mb-4 pl-4">
                          <select className="bg-black text-yellow-500 font-black p-2 rounded-lg text-[10px] outline-none border border-white/5" value={s.type} onChange={e => updateStep(i, "type", e.target.value as any)}>
                            <option value="PALIER">PALIER</option>
                            <option value="ACTION">ACTION</option>
                          </select>
                          <button onClick={() => setSteps(steps.filter((_, idx) => idx !== i))} className="text-red-500 text-[10px] font-black uppercase">Suppr.</button>
                        </div>

                        <div className="pl-4 space-y-4">
                          <input className="w-full bg-transparent border-b border-white/5 font-black outline-none italic text-xl uppercase tracking-tight placeholder:text-zinc-800" placeholder="NOM ÉTAPE" value={s.title} onChange={e => updateStep(i, "title", e.target.value.toUpperCase())} />
                          <div className="grid grid-cols-2 gap-4">
                            <input className="bg-black p-4 rounded-xl text-xs text-blue-400 font-black outline-none" placeholder="Cible" value={s.target} onChange={e => updateStep(i, "target", e.target.value)} />
                            <input className="bg-black p-4 rounded-xl text-xs font-black outline-none" placeholder="Min" type="number" value={s.value} onChange={e => updateStep(i, "value", e.target.value)} />
                          </div>
                        </div>
                      </div>

                      {/* APERÇU DU TIMER EN DIRECT SOUS CHAQUE CARTE */}
                      <div className="mt-2 px-6 opacity-60 hover:opacity-100 transition-opacity">
                        <StepTimer step={s} />
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <button onClick={() => setSteps([...steps, { id: "step-" + Date.now(), type: "PALIER", title: "", target: "", value: "10" }])} className="w-full mt-10 p-6 border-2 border-dashed border-white/10 rounded-3xl opacity-30 font-black text-xs uppercase hover:opacity-100 transition-all">+ AJOUTER ÉTAPE</button>
      
      <div className="fixed bottom-8 left-4 right-4 max-w-md mx-auto">
        <button onClick={() => onSave({ id: Date.now(), name: name || "NOM GÉNÉRIQUE", steps })} className="w-full bg-yellow-500 text-black p-8 rounded-full font-black italic text-2xl shadow-2xl active:scale-95 transition-transform uppercase">ENREGISTRER</button>
      </div>
    </div>
  );
}

// --- VUES HOME, LIBRARY, DETAIL ---
function Home({ onNav }: any) {
  return (
    <div className="max-w-md mx-auto pt-24">
      <h1 className="text-8xl font-black italic text-yellow-500 leading-[0.75] mb-16 tracking-tighter">BREW<br/>MASTER</h1>
      <button onClick={() => onNav("create")} className="w-full bg-yellow-500 text-black p-8 rounded-[2rem] font-black italic text-2xl mb-4 text-left shadow-xl active:scale-95 transition-all">NOUVEAU LAB +</button>
      <button onClick={() => onNav("library")} className="w-full bg-zinc-900 p-8 rounded-[2rem] font-black italic text-2xl text-left border border-white/5 active:scale-95 transition-all">ARCHIVES →</button>
    </div>
  );
}

function Library({ recipes, onBack, onSelect }: any) {
  return (
    <div className="max-w-md mx-auto">
      <button onClick={onBack} className="text-yellow-500 font-black text-[10px] mb-8 tracking-widest uppercase">← ACCUEIL</button>
      <h2 className="text-5xl font-black italic text-yellow-500 mb-8 tracking-tighter uppercase font-black">RECETTES</h2>
      {recipes.length === 0 && <div className="text-zinc-800 font-black italic py-20 text-center border-2 border-dashed border-zinc-900 rounded-3xl tracking-widest">VIDE</div>}
      {recipes.map((r: Recipe) => (
        <div key={r.id} onClick={() => onSelect(r)} className="bg-zinc-900 p-6 rounded-3xl mb-3 flex justify-between items-center cursor-pointer border border-transparent active:border-yellow-500/30 transition-all">
          <span className="font-black italic text-xl uppercase tracking-tighter">{r.name}</span>
          <span className="text-yellow-500 text-[10px] font-black tracking-widest">VOIR</span>
        </div>
      ))}
    </div>
  );
}

function Detail({ recipe, onBack }: { recipe: Recipe | null, onBack: () => void }) {
  if (!recipe) return null;
  return (
    <div className="max-w-md mx-auto pb-10">
      <button onClick={onBack} className="text-yellow-500 font-black mb-8 block text-[10px] tracking-widest uppercase opacity-70">← RETOUR</button>
      <h2 className="text-6xl font-black italic text-yellow-500 mb-10 leading-none uppercase tracking-tighter">{recipe.name}</h2>
      <div className="space-y-1">
        {recipe.steps.map((s) => (
          <StepTimer key={s.id} step={s} />
        ))}
      </div>
    </div>
  );
}