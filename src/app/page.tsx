"use client";

import { useState, useEffect, useRef } from "react";

/* ================= TYPES ================= */

interface Ingredient { name: string; weight: number; yield?: number; alpha?: number; }
interface Recipe { id: number; name: string; volume: number; malts: any[]; hops: any[]; }

/* ================= CONFIG ================= */

const STORAGE_KEY = "brewpro_v8";
const TABS = ["recettes", "process", "creation"];

const STEPS = [
  { name: "Concassage", key: "concassage", duration: 0 },
  { name: "Empâtage", key: "empatage", duration: 60 },
  { name: "Mash-out", key: "mash_out", duration: 10 },
  { name: "Filtration", key: "filtre", duration: 0 },
  { name: "Rinçage", key: "rinçage", duration: 0 },
  { name: "Ébullition", key: "ebullition", duration: 60 },
  { name: "Whirlpool", key: "whirlpool", duration: 0 },
  { name: "Refroidissement", key: "refroidissement", duration: 0 },
  { name: "Fermentation", key: "fermentation", duration: 10080 },
  { name: "Sucrage", key: "sucrage", duration: 0 }
];

/* ================= CALCULS ================= */

const calcOG = (m: any[], v: number) => 1 + m.reduce((a, x) => a + (x.weight * (x.yield || 0)), 0) / v / 1000;
const calcFG = (og: number) => 1 + (og - 1) * 0.25;
const calcABV = (og: number, fg: number) => ((og - fg) * 131).toFixed(1);
const calcIBU = (h: any[], v: number) => Math.round(h.reduce((a, x) => a + (x.weight * (x.alpha || 0)), 0) / v);

/* ================= TIMER HOOK ================= */

function useTimer(min: number) {
  const [time, setTime] = useState(min * 60);
  const [run, setRun] = useState(false);

  useEffect(() => {
    if (!run) return;
    const i = setInterval(() => setTime(t => (t > 0 ? t - 1 : 0)), 1000);
    return () => clearInterval(i);
  }, [run]);

  const reset = (m: number) => { setTime(m * 60); setRun(false); };
  return { time, run, setRun, reset };
}

const format = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

/* ================= APP PRINCIPALE ================= */

export default function Page() {
  const [tab, setTab] = useState("recettes");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selected, setSelected] = useState<Recipe | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setRecipes(JSON.parse(saved));
    else setRecipes([
      { id: 1, name: "IPA", volume: 20, malts: [{ name: "Pale", weight: 5, yield: 300 }], hops: [{ name: "Cascade", weight: 50, alpha: 8 }] },
      { id: 2, name: "Stout", volume: 20, malts: [{ name: "Roasted", weight: 5, yield: 280 }], hops: [{ name: "Fuggles", weight: 30, alpha: 4 }] }
    ]);
  }, []);

  useEffect(() => {
    if (recipes.length) localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
  }, [recipes]);

  return (
    <div className="min-h-screen bg-[#0B0B0F] text-white">
      <div className="p-4 text-xl font-semibold">🍺 BrewPro</div>

      <div className="p-4 pb-24 max-w-md mx-auto space-y-4">
        {tab === "recettes" && recipes.map(r => (
          <div key={r.id}
            onClick={() => { setSelected(r); setTab("process"); }}
            className="bg-white/5 border border-white/10 p-4 rounded-2xl active:scale-95 cursor-pointer">
            <div className="font-semibold">{r.name}</div>
            <div className="text-sm opacity-70">
              OG {calcOG(r.malts, r.volume).toFixed(3)} • IBU {calcIBU(r.hops, r.volume)}
            </div>
          </div>
        ))}

        {tab === "process" && selected && <Process recipe={selected} />}
        {tab === "creation" && <Creation recipes={recipes} setRecipes={setRecipes} />}
      </div>

      {/* NAVIGATION BASSE */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#111] border-t border-white/10 flex">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} 
            className={`flex-1 p-4 text-sm uppercase tracking-wider ${tab === t ? "text-white font-bold" : "text-white/40"}`}>
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ================= COMPOSANT PROCESS ================= */

function Process({ recipe }: { recipe: Recipe }) {
  const [step, setStep] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const timer = useTimer(STEPS[step].duration);

  useEffect(() => { timer.reset(STEPS[step].duration); }, [step]);

  useEffect(() => {
    const el = ref.current?.children[step] as HTMLElement;
    el?.scrollIntoView({ behavior: "smooth", inline: "center" });
  }, [step]);

  const hasTimer = STEPS[step].duration > 0;
  const nextStep = () => setStep(s => Math.min(s + 1, STEPS.length - 1));

  const og = calcOG(recipe.malts, recipe.volume);
  const fg = calcFG(og);

  return (
    <div className="space-y-4">
      <h2 className="font-semibold text-center text-lg">{recipe.name}</h2>

      {/* CAROUSEL ÉTAPES */}
      <div
        ref={ref}
        className="flex gap-4 overflow-x-auto px-1 py-2 scrollbar-hide"
        style={{ WebkitOverflowScrolling: "touch", scrollSnapType: "x mandatory" }}
      >
        {STEPS.map((s, i) => (
          <div
            key={i}
            onClick={() => setStep(i)}
            className={`flex-shrink-0 w-28 p-3 rounded-2xl text-center transition transform cursor-pointer
            ${i === step ? "bg-white text-black scale-105 shadow-lg" : "bg-white/5 border border-white/10"}
            `}
            style={{ scrollSnapAlign: "center" }}
          >
            <img
              src={`/brewpro/icons/${s.key}.png`}
              alt={s.name}
              className={`w-8 h-8 mx-auto mb-2 ${i === step ? "invert-0" : "invert opacity-50"}`}
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/brewpro/icons/default.png"; }}
            />
            <div className="text-[10px] font-bold uppercase">{s.name}</div>
          </div>
        ))}
      </div>

      {/* TIMER CARD */}
      {hasTimer && (
        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl text-center">
          <div className="text-6xl font-bold font-mono">{format(timer.time)}</div>
          <div className="flex gap-2 mt-4">
            <button onClick={() => timer.setRun(!timer.run)}
              className={`flex-1 py-3 rounded-xl font-bold ${timer.run ? "bg-red-500/20 text-red-500" : "bg-white text-black"}`}>
              {timer.run ? "Pause" : "Start"}
            </button>
            <button onClick={() => timer.reset(STEPS[step].duration)}
              className="flex-1 bg-white/10 py-3 rounded-xl">
              Reset
            </button>
          </div>
        </div>
      )}

      {/* BOUTON ÉTAPE SUIVANTE */}
      <button
        onClick={nextStep}
        className="w-full bg-white/10 border border-white/10 text-white py-4 rounded-2xl text-lg font-semibold active:scale-95 transition-transform"
      >
        Étape suivante →
      </button>

      {/* STATS RÉCAPITULATIVES */}
      <div className="grid grid-cols-2 gap-3 text-xs uppercase tracking-tighter">
        <StatBox label="OG" value={og.toFixed(3)} />
        <StatBox label="FG" value={fg.toFixed(3)} />
        <StatBox label="ABV" value={`${calcABV(og, fg)}%`} />
        <StatBox label="IBU" value={calcIBU(recipe.hops, recipe.volume).toString()} />
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-center">
      <div className="opacity-40 mb-1">{label}</div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  );
}

/* ================= COMPOSANT CRÉATION ================= */

function Creation({ recipes, setRecipes }: any) {
  const [name, setName] = useState("");
  const [volume, setVolume] = useState(20);

  function add() {
    if (!name) return;
    setRecipes([...recipes, {
      id: Date.now(),
      name,
      volume,
      malts: [{ name: "Pilsner", weight: 5, yield: 300 }],
      hops: [{ name: "Saaz", weight: 20, alpha: 5 }]
    }]);
    setName("");
    alert("Recette sauvegardée !");
  }

  return (
    <div className="space-y-4 bg-white/5 p-6 rounded-2xl border border-white/10">
      <h3 className="font-bold">Nouvelle Recette</h3>
      <input 
        value={name} 
        onChange={e => setName(e.target.value)}
        placeholder="Nom (ex: Smash Mosaic)"
        className="w-full p-3 bg-black/40 border border-white/10 rounded-xl focus:border-white/30 outline-none" 
      />
      <div className="flex items-center justify-between">
        <label className="text-sm opacity-60">Volume Brassin (L)</label>
        <input 
          type="number" 
          value={volume}
          onChange={e => setVolume(Number(e.target.value))}
          className="w-20 bg-black/40 p-2 rounded-lg border border-white/10 text-center" 
        />
      </div>
      <button 
        onClick={add}
        className="w-full bg-white text-black p-4 rounded-xl font-bold active:scale-95 transition-transform"
      >
        Sauvegarder la recette
      </button>
    </div>
  );
}