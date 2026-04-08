"use client";

import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult, DroppableProps } from "@hello-pangea/dnd";

// --- COMPOSANT DE SÉCURITÉ POUR REACT 18+ ---
// Ce composant remplace le Droppable classique pour éviter le bug du "marche pô"
export const StrictModeDroppable = ({ children, ...props }: DroppableProps) => {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const animation = requestAnimationFrame(() => setEnabled(true));
    return () => {
      cancelAnimationFrame(animation);
      setEnabled(false);
    };
  }, []);
  if (!enabled) return null;
  return <Droppable {...props}>{children}</Droppable>;
};

// --- TYPES ---
interface Step {
  id: string;
  type: "PALIER" | "ACTION";
  actionType?: "FILTRATION" | "WHIRLPOOL" | "INGRÉDIENT" | "AUTRE";
  title: string;
  target: string;
  value: string; 
  ingredientName?: string;
  ingredientQty?: string;
}

interface Recipe {
  id: number;
  name: string;
  steps: Step[];
}

const STORAGE_KEY = "BREW_MASTER_FR_V4_STRICT";

export default function BrewMasterV4() {
  const [view, setView] = useState<"home" | "create" | "library" | "detail">("home");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setRecipes(JSON.parse(saved));
  }, []);

  const saveRecipe = (newRecipe: Recipe) => {
    const updated = [newRecipe, ...recipes.filter(r => r.id !== newRecipe.id)];
    setRecipes(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setView("library");
  };

  const deleteRecipe = (id: number) => {
    const updated = recipes.filter(r => r.id !== id);
    setRecipes(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-zinc-100 font-sans uppercase selection:bg-[#ff5f1f] selection:text-white relative overflow-x-hidden">
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: `radial-gradient(#ffffff 1px, transparent 1px)`, backgroundSize: '24px 24px' }} />
      
      <div className="relative z-10 p-6">
        {view === "home" && <Home onNav={setView} />}
        {view === "library" && (
          <Library recipes={recipes} onBack={() => setView("home")} onSelect={(r: Recipe) => { setSelectedRecipe(r); setView("detail"); }} onDelete={deleteRecipe} />
        )}
        {view === "detail" && <Detail recipe={selectedRecipe} onBack={() => setView("library")} />}
        {view === "create" && <Lab onSave={saveRecipe} onCancel={() => setView("home")} />}
      </div>
    </div>
  );
}

// --- BOUTON INDUSTRIEL ---
function IndustrialBtn({ onClick, label, icon, sub }: any) {
  return (
    <button 
      onClick={onClick}
      className="w-full group relative mb-4 overflow-hidden border border-zinc-800 bg-zinc-900/40 backdrop-blur-sm p-8 text-left transition-all hover:border-[#ff5f1f]/50 hover:bg-[#ff5f1f]/5"
    >
      <div className="absolute top-0 left-0 w-[2px] h-full bg-[#ff5f1f] scale-y-0 group-hover:scale-y-100 transition-transform origin-top" />
      <div className="flex justify-between items-center">
        <div>
          <span className="block text-[10px] text-zinc-500 font-bold tracking-[0.3em] mb-1">{sub}</span>
          <span className="text-3xl font-black italic tracking-tighter group-hover:text-[#ff5f1f] transition-colors">{label}</span>
        </div>
        <span className="text-4xl font-light text-zinc-800 group-hover:text-[#ff5f1f] group-hover:translate-x-2 transition-all">{icon}</span>
      </div>
    </button>
  );
}

// --- CONFIGURATION DU BRASSIN ---
function Lab({ onSave, onCancel }: any) {
  const [name, setName] = useState("");
  const [steps, setSteps] = useState<Step[]>([{ id: "step-" + Date.now(), type: "PALIER", title: "", target: "", value: "60" }]);

  const updateStep = (index: number, field: keyof Step, val: any) => {
    const updated = [...steps];
    updated[index] = { ...updated[index], [field]: val };
    setSteps(updated);
  };

  const addStep = () => {
    // Utilisation d'un ID unique plus robuste pour éviter les doublons lors du drag
    const newId = `step-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setSteps([...steps, { id: newId, type: "PALIER", title: "", target: "", value: "10" }]);
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(steps);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setSteps(items);
  };

  return (
    <div className="max-w-md mx-auto pb-44 animate-in fade-in duration-500">
      <header className="flex justify-between items-center mb-12 border-b border-zinc-900 pb-4">
        <button onClick={onCancel} className="text-[9px] font-bold text-zinc-500 hover:text-[#ff5f1f] tracking-widest transition-colors cursor-pointer">ANNULER</button>
        <span className="text-[9px] font-bold text-[#ff5f1f] tracking-[0.3em]">ÉDITEUR_DE_RECETTE</span>
      </header>

      <div className="mb-16">
        <label className="text-[9px] text-zinc-600 font-bold block mb-2 tracking-widest">NOM_DE_LA_CUVÉE</label>
        <input 
          className="w-full bg-transparent text-5xl font-black italic text-white outline-none border-none placeholder:text-zinc-900" 
          placeholder="EX: BLONDE_01" 
          value={name} 
          onChange={e => setName(e.target.value)} 
        />
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <StrictModeDroppable droppableId="steps-list">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-12">
              {steps.map((s, i) => (
                <Draggable key={s.id} draggableId={s.id} index={i}>
                  {(provided, snapshot) => (
                    <div 
                      ref={provided.innerRef} 
                      {...provided.draggableProps}
                      className={`relative pl-8 border-l-2 transition-all duration-200 ${snapshot.isDragging ? 'border-[#ff5f1f] bg-zinc-900/90 scale-[1.02] z-50 shadow-2xl' : 'border-zinc-800 focus-within:border-[#ff5f1f]'}`}
                    >
                      {/* POIGNÉE DE DRAG */}
                      <div {...provided.dragHandleProps} className="absolute -left-3 top-0 text-zinc-700 hover:text-[#ff5f1f] p-2 cursor-grab active:cursor-grabbing">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="9" r="1.5"/><circle cx="9" cy="15" r="1.5"/><circle cx="15" cy="9" r="1.5"/><circle cx="15" cy="15" r="1.5"/></svg>
                      </div>

                      <div className="flex gap-3 mb-8">
                        {["PALIER", "ACTION"].map((type) => (
                          <button
                            key={type}
                            onClick={() => updateStep(i, "type", type as any)}
                            className={`text-[9px] font-bold tracking-widest px-4 py-1 skew-x-[-15deg] transition-all ${s.type === type ? 'bg-[#ff5f1f] text-white' : 'bg-zinc-900 text-zinc-600'}`}
                          >
                            <span className="skew-x-[15deg] block">{type}</span>
                          </button>
                        ))}
                        <button onClick={() => setSteps(steps.filter((_, idx) => idx !== i))} className="ml-auto text-zinc-800 hover:text-red-600 transition-colors">✕</button>
                      </div>

                      <div className="space-y-8 pb-4">
                        <input 
                          className="w-full bg-transparent border-b border-zinc-900 focus:border-[#ff5f1f] pb-2 text-xl font-bold outline-none transition-all placeholder:text-zinc-800" 
                          placeholder="LIBELLÉ_DE_L'ÉTAPE"
                          value={s.title} 
                          onChange={e => updateStep(i, "title", e.target.value.toUpperCase())} 
                        />

                        {s.type === "ACTION" ? (
                          <div className="space-y-6">
                            <div className="flex flex-wrap gap-2">
                              {["FILTRATION", "WHIRLPOOL", "INGRÉDIENT", "AUTRE"].map((act) => (
                                <button
                                  key={act}
                                  onClick={() => updateStep(i, "actionType", act as any)}
                                  className={`text-[8px] font-bold p-2 border transition-all ${s.actionType === act ? 'border-[#3b82f6] text-[#3b82f6] bg-[#3b82f6]/5' : 'border-zinc-900 text-zinc-600'}`}
                                >
                                  {act}
                                </button>
                              ))}
                            </div>

                            {s.actionType === "INGRÉDIENT" && (
                              <div className="grid grid-cols-2 gap-4 bg-zinc-900/30 p-4 border border-zinc-900 animate-in zoom-in-95">
                                <input className="bg-transparent border-b border-zinc-800 p-2 text-xs font-mono outline-none focus:border-[#ff5f1f]" placeholder="QUOI ?" value={s.ingredientName || ""} onChange={e => updateStep(i, "ingredientName", e.target.value.toUpperCase())} />
                                <input className="bg-transparent border-b border-zinc-800 p-2 text-xs font-mono outline-none focus:border-[#ff5f1f]" placeholder="COMBIEN ?" value={s.ingredientQty || ""} onChange={e => updateStep(i, "ingredientQty", e.target.value.toUpperCase())} />
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-12">
                            <div className="relative">
                              <span className="absolute -top-4 left-0 text-[8px] font-bold text-zinc-600 tracking-tighter">TEMPÉRATURE_CIBLE</span>
                              <input className="w-full bg-transparent border-b border-zinc-800 py-2 text-2xl font-mono text-[#3b82f6] outline-none focus:border-[#3b82f6]" placeholder="00°C" value={s.target} onChange={e => updateStep(i, "target", e.target.value)} />
                            </div>
                            <div className="relative">
                              <span className="absolute -top-4 left-0 text-[8px] font-bold text-zinc-600 tracking-tighter">DURÉE_MINUTES</span>
                              <input className="w-full bg-transparent border-b border-zinc-800 py-2 text-2xl font-mono text-[#ff5f1f] outline-none focus:border-[#ff5f1f]" placeholder="00" type="number" value={s.value} onChange={e => updateStep(i, "value", e.target.value)} />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </StrictModeDroppable>
      </DragDropContext>
      
      <button onClick={addStep} className="w-full py-10 mt-12 border-2 border-dashed border-zinc-900 text-zinc-700 hover:text-zinc-400 hover:border-zinc-700 transition-all font-bold text-[10px] tracking-[0.5em]">
        + AJOUTER_UNE_ÉTAPE
      </button>

      <div className="fixed bottom-0 left-0 right-0 p-8 bg-[#0a0a0b]/90 backdrop-blur-md border-t border-zinc-900 z-50">
        <button 
          onClick={() => name && onSave({ id: Date.now(), name, steps })} 
          className={`w-full max-w-md mx-auto block py-5 bg-[#ff5f1f] text-white font-black italic text-xl transition-all shadow-[4px_4px_0px_#8b3211] active:translate-x-1 active:translate-y-1 active:shadow-none ${!name && 'opacity-20 grayscale'}`}
        >
          ENREGISTRER_LA_RECETTE
        </button>
      </div>
    </div>
  );
}

// --- ACCUEIL ---
function Home({ onNav }: any) {
  return (
    <div className="max-w-md mx-auto pt-24">
      <div className="mb-24 relative">
        <div className="absolute -top-10 -left-4 text-[120px] font-black text-zinc-900/20 italic select-none">B_MASTER</div>
        <h1 className="text-7xl font-black italic leading-[0.8] tracking-tighter text-white relative z-10">
          BREW<br/><span className="text-[#ff5f1f]">MASTER</span>
        </h1>
        <div className="mt-4 flex gap-2">
          <div className="h-1 w-12 bg-[#ff5f1f]"></div>
          <div className="h-1 w-2 bg-zinc-800"></div>
          <div className="h-1 w-2 bg-zinc-800"></div>
        </div>
      </div>

      <div className="space-y-2">
        <IndustrialBtn sub="CRÉER_UNE_RECETTE" label="NOUVEAU" icon="+" onClick={() => onNav("create")} />
        <IndustrialBtn sub="CONSULTER_LES_LOGS" label="ARCHIVES" icon="→" onClick={() => onNav("library")} />
      </div>
    </div>
  );
}

// --- SESSION LIVE ---
function StepTimer({ step }: { step: Step }) {
  const getInitial = () => (parseInt(step.value) || 0) * 60;
  const [timeLeft, setTimeLeft] = useState(getInitial());
  const [active, setActive] = useState(false);
  
  useEffect(() => { setTimeLeft(getInitial()); }, [step.value]);
  useEffect(() => {
    let t: any;
    if (active && timeLeft > 0) t = setInterval(() => setTimeLeft(p => p - 1), 1000);
    return () => clearInterval(t);
  }, [active, timeLeft]);

  const format = (s: number) => {
    const m = Math.floor(s / 60);
    const sc = s % 60;
    return `${m}:${sc < 10 ? '0' : ''}${sc}`;
  };

  return (
    <div className={`p-8 border ${active ? 'border-[#ff5f1f] bg-[#ff5f1f]/5 shadow-[0_0_20px_rgba(255,95,31,0.1)]' : 'border-zinc-900 bg-zinc-900/20'} transition-all`}>
      <div className="flex justify-between items-start mb-8">
        <div>
          <span className="text-[9px] font-mono text-[#3b82f6] block mb-1">{step.target}</span>
          <h3 className="text-2xl font-black italic">{step.title}</h3>
        </div>
        <div className={`text-5xl font-mono font-bold tracking-tighter ${active ? 'text-[#ff5f1f]' : 'text-zinc-700'}`}>
          {format(timeLeft)}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <button onClick={() => setActive(!active)} className={`py-4 font-bold text-[10px] tracking-widest transition-all ${active ? 'bg-zinc-100 text-black' : 'bg-[#ff5f1f] text-white'}`}>
          {active ? "PAUSE" : "LANCER"}
        </button>
        <button onClick={() => setTimeLeft(getInitial())} className="py-4 border border-zinc-800 text-zinc-500 font-bold text-[10px] tracking-widest hover:border-zinc-400">RAZ</button>
      </div>
    </div>
  );
}

function Detail({ recipe, onBack }: any) {
  if (!recipe) return null;
  return (
    <div className="max-w-md mx-auto pb-20 animate-in fade-in duration-500">
      <header className="flex justify-between items-center mb-16 border-b border-zinc-900 pb-4">
        <button onClick={onBack} className="text-[9px] font-bold text-zinc-600 tracking-widest cursor-pointer hover:text-white">FERMER_LA_SESSION</button>
        <span className="flex items-center gap-2 text-[#ff5f1f] font-bold text-[9px] tracking-widest">
           BRASSAGE_EN_COURS <span className="w-1.5 h-1.5 bg-[#ff5f1f] rounded-full animate-pulse" />
        </span>
      </header>
      
      <h2 className="text-5xl font-black italic mb-16 tracking-tighter text-white leading-none">{recipe.name}</h2>
      
      <div className="space-y-4">
        {recipe.steps.map((s: Step) => (
          <div key={s.id}>
            {s.type === "PALIER" ? (
              <StepTimer step={s} />
            ) : (
              <div className="p-8 border border-zinc-900 flex justify-between items-center group bg-zinc-900/10 hover:border-zinc-700 transition-colors">
                <div>
                  <span className="text-[8px] font-bold text-[#3b82f6] tracking-widest block mb-1">{s.actionType}</span>
                  <div className="text-xl font-black italic">{s.title}</div>
                  {s.actionType === "INGRÉDIENT" && (
                    <div className="text-[10px] font-mono text-zinc-500 mt-2">
                      {s.ingredientName} : <span className="text-[#ff5f1f]">{s.ingredientQty}</span>
                    </div>
                  )}
                </div>
                <button className="w-12 h-12 border border-zinc-800 flex items-center justify-center hover:border-[#ff5f1f] hover:text-[#ff5f1f] transition-all">✓</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Library({ recipes, onBack, onSelect, onDelete }: any) {
  return (
    <div className="max-w-md mx-auto animate-in fade-in duration-500">
      <header className="flex justify-between items-center mb-16 border-b border-zinc-900 pb-4">
        <button onClick={onBack} className="text-[9px] font-bold text-zinc-500 tracking-widest uppercase cursor-pointer hover:text-white">← RETOUR</button>
        <span className="text-[9px] font-bold text-zinc-800 tracking-widest">ARCHIVES_RECETTES</span>
      </header>
      
      <div className="space-y-4">
        {recipes.length === 0 ? (
          <div className="py-20 text-center text-zinc-800 font-bold text-[10px] tracking-widest italic uppercase border-2 border-dashed border-zinc-900">AUCUNE RECETTE ENREGISTRÉE</div>
        ) : (
          recipes.map((r: Recipe) => (
            <div key={r.id} className="group relative bg-zinc-900/20 border border-zinc-900 p-8 hover:border-[#ff5f1f]/30 transition-all cursor-pointer overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-zinc-800/20 rotate-45 translate-x-8 -translate-y-8" />
              <button onClick={() => onSelect(r)} className="w-full text-left">
                <span className="block text-[8px] text-zinc-600 font-bold mb-1 tracking-widest">{r.steps.length} ÉTAPES DANS LA SEQUENCE</span>
                <span className="text-3xl font-black italic tracking-tighter text-white group-hover:text-[#ff5f1f] transition-colors">{r.name}</span>
              </button>
              <button 
                onClick={() => confirm("Supprimer définitivement cette recette ?") && onDelete(r.id)} 
                className="absolute bottom-4 right-8 text-[8px] font-bold text-red-900 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
              >
                SUPPRIMER
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}