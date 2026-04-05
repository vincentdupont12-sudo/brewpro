"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";

/* ================= TYPES STRICTS ================= */

interface Malt {
  name: string;
  weight: number;
  color: number;
  yield: number;
}

interface Hop {
  name: string;
  weight: number;
  alpha: number;
}

interface Recipe {
  id: number;
  name: string;
  volume: number;
  malts: Malt[];
  hops: Hop[];
}

interface Step {
  name: string;
  key: string;
  duration: number;
  description: string;
  details?: (recipe: Recipe) => string[];
  additions?: (recipe: Recipe) => { name: string; amount: string; time?: number }[];
}

/* ================= UTILS ================= */

const STORAGE_KEY = "brewpro_prod_v16";

const calcOG = (malts: Malt[], vol: number): string => {
  const points = malts.reduce((a, m) => a + m.weight * m.yield, 0);
  return (1 + points / vol / 1000).toFixed(3);
};

const calcIBU = (hops: Hop[], vol: number): number =>
  Math.round(hops.reduce((a, h) => a + h.weight * h.alpha, 0) / vol);

/* ================= MODULE ANALYSE ================= */

const ResultatsModule = ({ recette }: { recette: Recipe }) => {
  if (!recette) return null;
  return (
    <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-2xl mb-2">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-black uppercase text-orange-500 tracking-widest">Analyse</span>
        <span className="font-mono font-bold text-orange-400">Densité : {calcOG(recette.malts, recette.volume)}</span>
      </div>
    </div>
  );
};

/* ================= CONFIGURATION ================= */

const PRESET_STOCK: Omit<Recipe, "id">[] = [
  {
    name: "IPA Citra S.M.A.S.H",
    volume: 20,
    malts: [{ name: "Pale Ale", weight: 5.5, color: 7, yield: 300 }],
    hops: [{ name: "Citra", weight: 60, alpha: 12.5 }]
  },
  {
    name: "Stout Impérial",
    volume: 20,
    malts: [
      { name: "Maris Otter", weight: 6.0, color: 5, yield: 300 },
      { name: "Roasted Barley", weight: 0.6, color: 1200, yield: 240 }
    ],
    hops: [{ name: "Fuggles", weight: 50, alpha: 4.5 }]
  }
];

const STEPS: Step[] = [
  { name: "Concassage", key: "concassage", duration: 0, description: "Broyer les grains" },
  {
    name: "Empâtage",
    key: "empatage",
    duration: 60,
    description: "Extraction à 67°C",
    details: (r) => [`Eau : ${(r.malts.reduce((a, m) => a + m.weight, 0) * 2.7).toFixed(1)} L`]
  },
  { name: "Mash-out", key: "mashout", duration: 10, description: "Arrêt enzymatique à 78°C" },
  { 
    name: "Rinçage", 
    key: "rincage", 
    duration: 0, 
    description: "Lavage des grains",
    details: (r) => {
      const g = r.malts.reduce((a, m) => a + m.weight, 0);
      const e = Math.max(0, (r.volume * 1.15) - ((g * 2.7) - (g * 0.9))).toFixed(1);
      return [`Eau : ${e} L`, `Temp : 78°C` ];
    }
  },
  {
    name: "Ébullition",
    key: "ebullition",
    duration: 60,
    description: "Houblonnage",
    additions: (r) => r.hops.map((h) => ({ name: h.name, amount: `${h.weight}g`, time: 60 }))
  },
  { name: "Fermentation", key: "fermentation", duration: 10080, description: "Repos" }
];

/* ================= PAGE PRINCIPALE ================= */

export default function Page() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selected, setSelected] = useState<Recipe | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setRecipes(JSON.parse(saved));
    else {
      const initial = PRESET_STOCK.map((r, idx) => ({ ...r, id: Date.now() + idx }));
      setRecipes(initial);
    }
  }, []);

  const reloadStock = () => {
    const news = PRESET_STOCK.map((r, idx) => ({ ...r, id: Date.now() + Math.random() + idx }));
    setRecipes([...recipes, ...news]);
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-white font-sans">
      <header className="p-6 border-b border-white/5 flex justify-between items-center sticky top-0 bg-black/80 backdrop-blur-md z-50">
        <h1 className="text-xl font-black text-orange-500 italic">BREWPRO.</h1>
        {!selected && (
           <button onClick={reloadStock} className="text-[10px] bg-white/5 border border-white/10 px-4 py-2 rounded-full font-black">+ STOCK</button>
        )}
      </header>

      {selected ? (
        <Process recipe={selected} onBack={() => setSelected(null)} />
      ) : (
        <div className="p-6 space-y-4 max-w-md mx-auto">
          <h2 className="text-xs font-black opacity-30 uppercase tracking-[0.3em]">Stock</h2>
          {recipes.map((r) => (
            <div key={r.id} onClick={() => setSelected(r)} className="p-5 bg-white/[0.03] rounded-[2rem] border border-white/10 active:scale-95 transition-all cursor-pointer">
              <div className="text-lg font-bold">{r.name}</div>
              <div className="text-[10px] opacity-40 flex gap-4 mt-2 font-mono uppercase">
                <span>{r.volume}L</span>
                <span className="text-orange-400 font-bold">OG: {calcOG(r.malts, r.volume)}</span>
                <span>IBU: {calcIBU(r.hops, r.volume)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ================= PROCESS ================= */

function Process({ recipe, onBack }: { recipe: Recipe; onBack: () => void }) {
  const [step, setStep] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [time, setTime] = useState(STEPS[step].duration * 60);
  const [run, setRun] = useState(false);

  useEffect(() => {
    setTime(STEPS[step].duration * 60);
    setRun(false);
  }, [step]);

  useEffect(() => {
    if (!run) return;
    const i = setInterval(() => setTime(t => (t > 0 ? t - 1 : 0)), 1000);
    return () => clearInterval(i);
  }, [run]);

  useEffect(() => {
    const el = scrollRef.current?.children[step] as HTMLElement;
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [step]);

  return (
    <div className="p-4 space-y-6 max-w-md mx-auto pb-12">
      <button onClick={onBack} className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em]">← Retour</button>

      <div ref={scrollRef} className="flex gap-4 overflow-x-auto pb-2 no-scrollbar snap-x">
        {STEPS.map((s, i) => (
          <div key={i} onClick={() => setStep(i)} className="snap-center flex-shrink-0 w-16 text-center cursor-pointer">
            <div className={`w-10 h-10 mx-auto rounded-xl flex items-center justify-center border transition-all ${i === step ? "bg-orange-500 border-orange-400 scale-110 shadow-lg" : "bg-white/5 border-white/5 opacity-20"}`}>
              <Image src={`/brewpro/icons/${s.key}.png`} alt={s.name} width={20} height={20} className={i === step ? "" : "grayscale"} />
            </div>
            <div className={`text-[8px] mt-2 font-black uppercase ${i === step ? "text-orange-400" : "opacity-20"}`}>{s.name}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 px-1">
        <button onClick={() => setStep(s => Math.max(0, s - 1))} className="flex-1 bg-white/5 border border-white/10 py-3 rounded-xl text-[9px] font-black uppercase">Précédent</button>
        <button onClick={() => setStep(s => Math.min(STEPS.length - 1, s + 1))} className="flex-[2] bg-orange-600 py-3 rounded-xl text-[9px] font-black tracking-widest uppercase shadow-lg shadow-orange-900/20">Suivant</button>
      </div>

      <ResultatsModule recette={recipe} />

      <div className="bg-white/[0.03] border border-white/10 p-6 rounded-[2.5rem] space-y-6 shadow-2xl text-center">
        <h2 className="text-2xl font-black italic uppercase tracking-tight">{STEPS[step].name}</h2>
        <p className="text-xs opacity-40 px-4">{STEPS[step].description}</p>

        {STEPS[step].details && (
          <div className="space-y-2 bg-black/40 p-4 rounded-3xl border border-white/5">
            {STEPS[step].details!(recipe).map((d, i) => (
              <div key={i} className="flex justify-between text-[11px] items-center">
                <span className="opacity-40 font-bold uppercase text-[8px]">{d.split(":")[0]}</span>
                <span className="font-mono font-bold text-orange-400">{d.split(":")[1]}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {STEPS[step].duration > 0 && (
        <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] text-center shadow-inner">
          <div className="text-6xl font-mono font-black mb-6">{Math.floor(time / 60)}:{(time % 60).toString().padStart(2, "0")}</div>
          <div className="flex gap-3">
            <button onClick={() => setRun(!run)} className={`flex-[2] py-4 rounded-2xl font-black text-[10px] tracking-widest ${run ? "bg-red-500/20 text-red-500 border border-red-500/20" : "bg-white text-black active:scale-95"}`}>
              {run ? "STOP" : "LANCER"}
            </button>
            <button onClick={() => setTime(STEPS[step].duration * 60)} className="flex-1 bg-white/5 border border-white/10 py-4 rounded-2xl font-black text-[10px]">RESET</button>
          </div>
        </div>
      )}
    </div>
  );
}