"use client";


import { useState, useEffect, useRef } from "react";
import { calcABV, calcEBC, calcIBU, getEbcColor } from "../../lib/calculations";
import { useRecipes } from "../../hooks/useRecipes";

/* =======================
   CONFIG & PRÉFIXE GITHUB
   ======================= */
const prefix = process.env.NODE_ENV === 'production' ? '/brewpro' : '';

const TABS = ["Recettes", "Création", "Process"];

// Structure de données avec malts dès le départ
const STEPS_DATA = [
  { 
    id: "concassage", 
    name: "Concassage", 
    icon: `${prefix}/icons/concassage.png`,
    ingredients: [{ name: "Malt Pilsner", qty: "5.5kg" }, { name: "Malt Cara", qty: "0.5kg" }],
    instruction: "Réglez le moulin sur 1.1mm. Visez une mouture grossière sans trop de farine."
  },
  { 
    id: "empatage", 
    name: "Empâtage", 
    icon: `${prefix}/icons/empatage.png`,
    temp: 65, 
    duration: 60,
    instruction: "Maintenez la température stable. Remuez doucement toutes les 15 min."
  },
  { 
    id: "filtration", 
    name: "Filtration", 
    icon: `${prefix}/icons/filtre.png`,
    instruction: "Recirculez jusqu'à ce que le moût soit limpide, puis rincez à 78°C."
  },
  { 
    id: "ebullition", 
    name: "Ébullition", 
    icon: `${prefix}/icons/ebullition.png`,
    duration: 60,
    ingredients: [{ name: "Hops Magnum", qty: "30g" }, { name: "Citra", qty: "20g" }],
    instruction: "Maintenez une ébullition franche (rolling boil)."
  },
  { 
    id: "fermentation", 
    name: "Fermentation", 
    icon: `${prefix}/icons/fermentation.png`,
    temp: 19,
    instruction: "Laissez fermenter 2 semaines à température stable (18-20°C)."
  }
];

const PRELOADED = [
  { name: "IPA", abv: 6.2, ebc: 12, ibu: 55, vol: 20, og: 1.060, fg: 1.012 },
  { name: "Stout", abv: 8.5, ebc: 75, ibu: 60, vol: 20, og: 1.080, fg: 1.018 }
];

/* =======================
   APPLICATION PRINCIPALE
   ======================= */
export default function BrewApp() {
  const [tab, setTab] = useState("Recettes");
  const { recipes, addRecipe, deleteRecipe } = useRecipes(PRELOADED);
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    if (recipes.length && !selected) setSelected(recipes[0]);
  }, [recipes]);

  return (
    <div className="min-h-screen bg-black text-white pb-32 font-sans selection:bg-amber-500/30">
      
      {/* HEADER FIXE */}
      <header className="h-[70px] flex items-center justify-center border-b border-white/5 bg-black/80 backdrop-blur-md sticky top-0 z-50">
        <h1 className="text-xl font-black tracking-tighter italic">
          BREWPRO <span className="text-amber-500 underline decoration-2 underline-offset-4">LAB</span>
        </h1>
      </header>

      <main className="px-5 max-w-md mx-auto pt-4">
        {tab === "Recettes" && (
          <RecettesList 
            recipes={recipes} 
            setSelected={(r: any) => { setSelected(r); setTab("Process"); }} 
            deleteRecipe={deleteRecipe} 
          />
        )}
        {tab === "Création" && <Builder addRecipe={addRecipe} />}
        {tab === "Process" && <ProcessStepper recipe={selected} />}
      </main>

      {/* NAV MOBILE */}
      <nav className="fixed bottom-0 left-0 w-full bg-black/90 backdrop-blur-xl border-t border-white/10 flex p-3 pb-8 z-50">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 rounded-2xl transition-all flex flex-col items-center gap-1 ${
              tab === t ? "text-amber-500 bg-amber-500/10 font-black" : "text-gray-500 font-bold"
            }`}
          >
            <span className="text-[10px] uppercase tracking-widest">{t}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

/* =======================
   COMPOSANT PROCESS (TIMER + CARROUSEL)
   ======================= */
function ProcessStepper({ recipe }: any) {
  const [active, setActive] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isActive, setIsActive] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentStep = STEPS_DATA[active];

  // Scroll auto du carrousel
  useEffect(() => {
    const el = containerRef.current?.children[active] as HTMLElement;
    el?.scrollIntoView({ behavior: "smooth", inline: "center" });
  }, [active]);

  // Reset Timer lors du changement d'étape
  useEffect(() => {
    if (currentStep.duration) {
      setTimeLeft(currentStep.duration * 60);
      setIsActive(false);
    } else {
      setTimeLeft(null);
    }
  }, [active]);

  // Logique du décompte
  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft((t) => (t ? t - 1 : 0)), 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      if (navigator.vibrate) navigator.vibrate([500, 200, 500]);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  if (!recipe) return <div className="py-20 text-center opacity-30 italic">Aucune recette sélectionnée</div>;

  return (
    <div className="space-y-2">
      
      {/* CARROUSEL STICKY (CERCLES ENTIERS) */}
      <div className="sticky top-[70px] z-40 bg-black/95 backdrop-blur-md -mx-5 border-b border-white/5 overflow-visible">
        <div 
          ref={containerRef} 
          className="flex gap-10 overflow-x-auto snap-x snap-mandatory no-scrollbar px-12 py-10"
          style={{ scrollPadding: '0 50px' }}
        >
          {STEPS_DATA.map((step, i) => (
            <div 
              key={i} 
              onClick={() => setActive(i)} 
              className={`snap-center flex-shrink-0 flex flex-col items-center transition-all duration-500 overflow-visible ${
                i === active ? "scale-125 opacity-100" : "scale-90 opacity-30"
              }`}
            >
              <div className={`w-14 h-14 rounded-full bg-[#111] flex items-center justify-center border-2 transition-all ${
                i === active ? "border-amber-500 shadow-[0_0_20px_#f59e0b88]" : "border-white/10"
              }`}>
                <img 
                  src={step.icon} 
                  alt="" 
                  className="w-8 h-8 object-contain pointer-events-none" 
                  onError={(e) => (e.currentTarget.style.opacity = '0')} 
                />
              </div>
              <span className={`text-[8px] mt-3 font-black uppercase tracking-widest ${i === active ? "text-amber-500" : "text-gray-600"}`}>
                {step.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* CARTE D'ÉTAPE */}
      <div className="bg-[#0a0a0a] rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl mt-4">
        <div className="p-6 border-b border-white/5 bg-gradient-to-r from-amber-500/10 to-transparent flex justify-between items-center">
          <h3 className="text-2xl font-black tracking-tighter text-amber-500 uppercase">{currentStep.name}</h3>
          <span className="text-[10px] font-black opacity-30 tracking-widest">STEP {active + 1}</span>
        </div>

        <div className="p-8 space-y-8">
          
          {/* TIMER PRIORITAIRE EN HAUT DE CARTE */}
          {(currentStep.temp || currentStep.duration) && (
            <div className="flex gap-4">
              {currentStep.duration && timeLeft !== null && (
                <div className="flex-[1.5] bg-amber-500/5 p-5 rounded-3xl text-center border border-amber-500/20">
                  <span className="block text-[10px] font-black text-amber-500 uppercase mb-1 tracking-widest">Chrono</span>
                  <span className={`text-4xl font-black block mb-4 ${isActive ? "text-amber-500 animate-pulse" : "text-white"}`}>
                    {formatTime(timeLeft)}
                  </span>
                  <div className="flex gap-3 justify-center">
                    <button 
                      onClick={() => setIsActive(!isActive)} 
                      className="flex-1 py-3 rounded-2xl bg-amber-500 text-black font-black text-xs uppercase shadow-lg shadow-amber-500/20"
                    >
                      {isActive ? "Pause" : "Démarrer"}
                    </button>
                    <button 
                      onClick={() => { setIsActive(false); setTimeLeft(currentStep.duration! * 60); }} 
                      className="px-4 py-3 rounded-2xl bg-white/5 text-white font-black text-[10px] uppercase border border-white/5"
                    >
                      RAZ
                    </button>
                  </div>
                </div>
              )}
              {currentStep.temp && (
                <div className="flex-1 bg-white/5 p-5 rounded-3xl text-center border border-white/5 flex flex-col justify-center">
                  <span className="block text-[10px] font-black text-gray-500 uppercase mb-1">Temp</span>
                  <span className="text-3xl font-black text-white">{currentStep.temp}°C</span>
                </div>
              )}
            </div>
          )}

          {/* INGRÉDIENTS & INSTRUCTIONS */}
          <div className="space-y-6">
            {currentStep.ingredients && (
              <div className="space-y-3">
                <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">À préparer / Ajouter :</span>
                {currentStep.ingredients.map((ing, idx) => (
                  <div key={idx} className="flex justify-between bg-white/5 p-4 rounded-2xl border border-white/5">
                    <span className="font-bold text-gray-300">{ing.name}</span>
                    <span className="text-amber-500 font-black">{ing.qty}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="bg-[#111] p-5 rounded-2xl border-l-4 border-amber-500/50">
              <p className="text-gray-400 text-sm leading-relaxed italic">
                {currentStep.instruction}
              </p>
            </div>
          </div>

          <button 
            onClick={() => active < STEPS_DATA.length - 1 && setActive(active + 1)}
            className="w-full bg-white text-black py-5 rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] shadow-xl active:scale-95 transition-all"
          >
            {active === STEPS_DATA.length - 1 ? "Brassin terminé ! 🍻" : "Étape Suivante →"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* =======================
   LISTE DES RECETTES
   ======================= */
function RecettesList({ recipes, setSelected, deleteRecipe }: any) {
  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <h2 className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em] px-2">Bibliothèque</h2>
      {recipes.map((r: any, i: number) => (
        <div key={i} onClick={() => setSelected(r)} className="group relative rounded-[2rem] overflow-hidden border border-white/10 active:scale-95 transition-all">
          <div className="absolute inset-0 blur-3xl opacity-10" style={{ backgroundColor: getEbcColor(r.ebc) }} />
          <div className="relative bg-[#0a0a0a] p-6 flex justify-between items-center">
            <div>
              <div className="font-black text-xl tracking-tight uppercase">{r.name}</div>
              <div className="text-[10px] font-bold text-gray-500 mt-1 tracking-widest">
                {r.abv.toFixed(1)}% ABV • {r.ibu} IBU • <span style={{ color: getEbcColor(r.ebc) }}>{r.ebc} EBC</span>
              </div>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); deleteRecipe(r.name); }}
              className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-600 hover:text-red-500 transition-colors"
            >✕</button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* =======================
   INTERFACE CRÉATION
   ======================= */
function Builder({ addRecipe }: any) {
  return (
    <div className="py-20 text-center">
      <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="text-amber-500 text-2xl">+</span>
      </div>
      <p className="text-gray-500 font-bold italic underline">Module de création de recette actif</p>
    </div>
  );
}