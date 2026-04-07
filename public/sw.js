"use client";

import { useState, useEffect } from "react";

/* ================= TYPES & CONSTANTES ================= */

interface Malt { name: string; weight: number; ebc: number; }
interface Hop { name: string; weight: number; alpha: number; time: number; }
interface Recipe {
  id: number;
  name: string;
  volume: number;
  boilTime: number;
  mashTemp: number;
  yeast: string;
  malts: Malt[];
  hops: Hop[];
}

const BREW_SETTINGS = {
  GRAIN_ABSORPTION: 0.9,
  EVAP_RATE: 3.0,
  SHRINKAGE: 1.04,
  EFFICIENCY: 0.72
};

const PRELOADED_RECIPES: Recipe[] = [
  {
    id: 1,
    name: "SmasH Citra (IPA)",
    volume: 20,
    boilTime: 60,
    mashTemp: 65,
    yeast: "US-05",
    malts: [{ name: "Pale Ale (Malt Base)", weight: 5.5, ebc: 7 }],
    hops: [
      { name: "Citra (Amérisant)", weight: 20, alpha: 12, time: 60 },
      { name: "Citra (Aromatique)", weight: 30, alpha: 12, time: 10 },
      { name: "Citra (Whirlpool)", weight: 50, alpha: 12, time: 0 }
    ]
  },
  {
    id: 2,
    name: "Midnight Stout",
    volume: 18,
    boilTime: 60,
    mashTemp: 68,
    yeast: "S-04",
    malts: [
      { name: "Maris Otter", weight: 4.5, ebc: 6 },
      { name: "Flocons d'Avoine", weight: 0.5, ebc: 2 },
      { name: "Roasted Barley", weight: 0.4, ebc: 1200 }
    ],
    hops: [{ name: "Fuggles", weight: 40, alpha: 4.5, time: 60 }]
  }
];

/* ================= MOTEUR DE CALCUL ================= */

const BrewEngine = {
  getOG: (malts: Malt[], vol: number) => {
    const pts = malts.reduce((a, m) => a + (m.weight * 300 * BREW_SETTINGS.EFFICIENCY), 0);
    return vol > 0 ? 1 + (pts / vol / 1000) : 1.000;
  },
  getFG: (og: number, mashTemp: number) => {
    const attenuation = 0.78 - ((mashTemp - 62) * 0.015); 
    return 1 + (og - 1) * (1 - attenuation);
  },
  getABV: (og: number, fg: number) => ((og - fg) * 131.25).toFixed(1),
  getWater: (grainWeight: number, targetVol: number, boilTime: number) => {
    const mashWater = grainWeight * 3;
    const boilOff = (boilTime / 60) * BREW_SETTINGS.EVAP_RATE;
    const grainLoss = grainWeight * BREW_SETTINGS.GRAIN_ABSORPTION;
    const totalWater = (targetVol * BREW_SETTINGS.SHRINKAGE) + boilOff + grainLoss;
    return { mash: mashWater.toFixed(1), sparge: (totalWater - mashWater).toFixed(1) };
  }
};

/* ================= APPLICATION ================= */

export default function BrewMasterApp() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [view, setView] = useState<"home" | "create">("home");
  const [activeRecipe, setActiveRecipe] = useState<Recipe | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("brew_pro_final_v9");
    if (saved) {
      const parsed = JSON.parse(saved);
      setRecipes([...PRELOADED_RECIPES, ...parsed.filter((r: Recipe) => r.id > 10)]);
    } else {
      setRecipes(PRELOADED_RECIPES);
    }
  }, []);

  const handleSave = (recipe: Recipe) => {
    const userOnly = recipes.filter(r => r.id > 10);
    const updatedUser = [recipe, ...userOnly];
    setRecipes([...PRELOADED_RECIPES, ...updatedUser]);
    localStorage.setItem("brew_pro_final_v9", JSON.stringify(updatedUser));
    setView("home");
  };

  if (activeRecipe) return <BrewSession recipe={activeRecipe} onExit={() => setActiveRecipe(null)} />;

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans p-6">
      {view === "home" ? (
        <HomePage recipes={recipes} onSelect={setActiveRecipe} onCreate={() => setView("create")} />
      ) : (
        <RecipeLab onSave={handleSave} onCancel={() => setView("home")} />
      )}
    </div>
  );
}

/* ================= UI COMPONENTS ================= */

function HomePage({ recipes, onSelect, onCreate }: any) {
  return (
    <div className="max-w-md mx-auto space-y-10 animate-in fade-in duration-500">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black italic text-yellow-500 tracking-tighter">BREWPRO+</h1>
          <p className="text-[10px] text-white/30 uppercase tracking-[0.2em]">Lab Edition 2026</p>
        </div>
      </header>
      <button onClick={onCreate} className="w-full bg-yellow-500 p-8 rounded-[2.5rem] text-black font-black italic text-2xl shadow-xl active:scale-95 transition-all">
        + NOUVELLE RECETTE
      </button>
      <div className="grid gap-4">
        {recipes.map((r: Recipe) => (
          <div key={r.id} onClick={() => onSelect(r)} className="bg-[#111] p-6 rounded-3xl border border-white/5 flex justify-between items-center cursor-pointer hover:border-yellow-500/40 transition-all">
            <div>
              <h4 className="font-bold text-lg">{r.name}</h4>
              <p className="text-[10px] text-white/30 uppercase tracking-widest">{r.volume}L • {r.yeast}</p>
            </div>
            <div className="text-yellow-500 font-black font-mono">
              {BrewEngine.getABV(BrewEngine.getOG(r.malts, r.volume), BrewEngine.getFG(BrewEngine.getOG(r.malts, r.volume), r.mashTemp))}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecipeLab({ onSave, onCancel }: any) {
  const [form, setForm] = useState<Recipe>({ id: Date.now(), name: "Ma Bière", volume: 20, boilTime: 60, mashTemp: 66, yeast: "US-05", malts: [{ name: "Pilsner", weight: 5, ebc: 4 }], hops: [{ name: "Cascade", weight: 30, alpha: 7, time: 60 }] });
  return (
    <div className="max-w-md mx-auto space-y-8 pb-32">
      <button onClick={onCancel} className="text-[10px] font-bold text-white/40 uppercase tracking-widest">← Retour</button>
      <input className="w-full bg-transparent text-4xl font-black outline-none border-b-2 border-white/5 focus:border-yellow-500 pb-2 italic tracking-tighter" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
      <div className="bg-[#111] p-8 rounded-[2.5rem] space-y-4">
         <p className="text-[10px] font-bold text-yellow-500 uppercase tracking-widest">Volume & Temp</p>
         <div className="grid grid-cols-2 gap-4">
            <input type="number" className="w-full bg-black/50 p-4 rounded-xl outline-none" value={form.volume} onChange={e => setForm({...form, volume: parseFloat(e.target.value)})} placeholder="Litres" />
            <input type="number" className="w-full bg-black/50 p-4 rounded-xl outline-none" value={form.mashTemp} onChange={e => setForm({...form, mashTemp: parseInt(e.target.value)})} placeholder="°C" />
         </div>
      </div>
      <button onClick={() => onSave(form)} className="fixed bottom-6 left-6 right-6 py-5 bg-yellow-500 text-black font-black rounded-2xl uppercase text-xs tracking-widest shadow-2xl">Enregistrer</button>
    </div>
  );
}

/* ================= SESSION DE BRASSAGE ================= */

function BrewSession({ recipe, onExit }: { recipe: Recipe, onExit: () => void }) {
  const [step, setStep] = useState(0);
  const [timer, setTimer] = useState(0);
  const [isActive, setIsActive] = useState(false);

  const grainWeight = recipe.malts.reduce((a,m)=>a+m.weight,0);
  const water = BrewEngine.getWater(grainWeight, recipe.volume, recipe.boilTime);

  const STEPS = [
    { n: "Concassage", d: 0, m: "Moudre les grains.", type: "MALT", icon: "🌾" },
    { n: "Empâtage", d: 60, m: `Infusion à ${recipe.mashTemp}°C.`, type: "MALT", icon: "🌡️" },
    { n: "Filtration", d: 15, m: "Clarification du moût.", type: "INFO", icon: "☕" },
    { n: "Rinçage", d: 0, m: `Rincer avec ${water.sparge}L d'eau à 78°C.`, type: "INFO", icon: "💧" },
    { n: "Ébullition", d: recipe.boilTime, m: "Stérilisation et amertume.", type: "HOP_60", icon: "🔥" },
    { n: "Whirlpool", d: 10, m: "Arômes et sédimentation.", type: "HOP_0", icon: "🌀" },
    { n: "Froid", d: 0, m: "Descendre sous 20°C.", type: "INFO", icon: "❄️" },
    { n: "Fermentation", d: 0, m: "Ensemencement levure.", type: "YEAST", icon: "🍺" }
  ];

  useEffect(() => { setTimer(STEPS[step].d * 60); setIsActive(false); }, [step]);
  useEffect(() => {
    let interval: any;
    if (isActive && timer > 0) interval = setInterval(() => setTimer(t => t - 1), 1000);
    return () => clearInterval(interval);
  }, [isActive, timer]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 bg-[#050505] z-50 flex flex-col animate-in fade-in duration-300">
      
      {/* SYNOPTIQUE FIXE */}
      <div className="p-6 bg-[#050505] border-b border-white/5 shrink-0 z-20">
        <div className="flex justify-between items-center mb-6 text-[10px] font-black uppercase tracking-widest text-white/30">
          <span>{recipe.name}</span>
          <button onClick={onExit} className="hover:text-white transition-colors">Quitter ✕</button>
        </div>
        <div className="relative flex justify-between items-center px-2">
           <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/10 -translate-y-1/2" />
           <div className="absolute top-1/2 left-0 h-[1.5px] bg-yellow-500 -translate-y-1/2 transition-all duration-500" style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }} />
           {STEPS.map((s, i) => (
             <button key={i} onClick={() => setStep(i)} className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-[10px] transition-all duration-300 ${i === step ? 'bg-yellow-500 text-black scale-125 shadow-lg shadow-yellow-500/20' : i < step ? 'bg-yellow-900/40 text-yellow-500 border border-yellow-500/20' : 'bg-[#111] text-white/20 border border-white/5'}`}>{i < step ? "✓" : s.icon}</button>
           ))}
        </div>
      </div>
      
      {/* ZONE CENTRALE SCROLLABLE */}
      <div className="flex-1 overflow-y-auto px-6 pb-44 flex flex-col items-center">
        <h2 className="text-4xl font-black italic mb-2 tracking-tighter uppercase text-center mt-8 leading-none">{STEPS[step].n}</h2>
        
        {/* NAVIGATION TEXTUELLE CONTEXTUELLE */}
        <div className="flex justify-between w-full max-w-sm mb-10 px-2 min-h-[1.5rem]">
          {step > 0 ? (
            <button onClick={() => setStep(step - 1)} className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] hover:text-yellow-500 transition-colors">
              ← {STEPS[step-1].n}
            </button>
          ) : <div />}
          
          {step < STEPS.length - 1 ? (
            <button onClick={() => setStep(step + 1)} className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] hover:text-yellow-500 transition-colors text-right">
              {STEPS[step+1].n} →
            </button>
          ) : <div />}
        </div>
        
        {STEPS[step].d > 0 && (
          <div className="text-[6rem] font-mono font-black mb-8 tabular-nums tracking-tighter leading-none shadow-yellow-500/5">{formatTime(timer)}</div>
        )}

        <div className="bg-[#111] p-6 rounded-[2rem] mb-8 w-full max-w-sm border border-white/5 shadow-2xl">
          <p className="text-white/70 text-sm font-semibold italic text-center leading-relaxed">"{STEPS[step].m}"</p>
        </div>

        <div className="w-full max-w-sm space-y-3">
           {STEPS[step].type === "MALT" && recipe.malts.map((m, i) => <IngredientCard key={i} name={m.name} qty={`${m.weight} kg`} color="border-orange-500/30" label="Malt" />)}
           {STEPS[step].type === "HOP_60" && recipe.hops.filter(h => h.time >= 30).map((h, i) => <IngredientCard key={i} name={h.name} qty={`${h.weight} g`} color="border-green-500/30" label="Amérisant" />)}
           {STEPS[step].type === "HOP_0" && recipe.hops.filter(h => h.time < 30).map((h, i) => <IngredientCard key={i} name={h.name} qty={`${h.weight} g`} color="border-yellow-500/30" label="Aromatique" />)}
           {STEPS[step].type === "YEAST" && <IngredientCard name={recipe.yeast} qty="1 sachet" color="border-blue-500/30" label="Levure" />}
        </div>
      </div>

      {/* COCKPIT DE CONTRÔLE FIXE */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#050505] via-[#050505] to-transparent pt-12 z-30">
        <div className="max-w-sm mx-auto flex flex-col gap-4">
          <div className="grid grid-cols-4 gap-3">
            <button onClick={() => setStep(Math.max(0, step - 1))} className="p-5 bg-[#111] rounded-2xl border border-white/10 active:scale-90 text-xl flex items-center justify-center transition-all">←</button>
            <button onClick={() => setIsActive(!isActive)} className={`col-span-2 p-5 rounded-2xl font-black transition-all shadow-xl active:scale-95 ${isActive ? 'bg-white text-black' : 'bg-yellow-500 text-black shadow-yellow-500/20'}`}>
              {isActive ? "PAUSE" : "DÉMARRER"}
            </button>
            <button onClick={() => setStep(Math.min(STEPS.length - 1, step + 1))} className="p-5 bg-[#111] rounded-2xl border border-white/10 active:scale-90 text-xl flex items-center justify-center transition-all">→</button>
          </div>
          {STEPS[step].d > 0 && (
            <button onClick={() => { setIsActive(false); setTimer(STEPS[step].d * 60); }} className="py-2 text-[10px] font-black uppercase text-white/20 tracking-[0.3em] hover:text-red-500 transition-colors">Réinitialiser chrono</button>
          )}
        </div>
      </div>
    </div>
  );
}

function IngredientCard({ name, qty, color, label }: any) {
  return (
    <div className={`bg-[#181818] p-4 rounded-2xl border-l-4 ${color} flex justify-between items-center animate-in slide-in-from-right duration-300`}>
      <div className="text-left">
        <p className="text-[8px] font-black uppercase text-white/30 tracking-widest">{label}</p>
        <p className="font-bold text-sm text-white/90">{name}</p>
      </div>
      <div className="bg-black/40 px-3 py-1 rounded-lg text-yellow-500 font-mono font-bold text-sm">{qty}</div>
    </div>
  );
}