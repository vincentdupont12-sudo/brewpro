"use client";

import { useState, useEffect } from "react";

/* ================= TYPES & ENGINE ================= */

interface Malt { name: string; weight: number; ebc: number; }
interface Hop { name: string; weight: number; alpha: number; time: number; }

interface Recipe {
  id: number;
  name: string;
  volume: number;
  baseVolume: number;
  boilTime: number;
  mashTemp: number;
  yeast: string;
  malts: Malt[];
  hops: Hop[];
  spargeVol: number;
  whirlpoolTime: number;
  primingSugar: number;
}

const BrewEngine = {
  getOG: (malts: Malt[], vol: number, ratio: number) => {
    const pts = malts.reduce((a, m) => a + ((m.weight * ratio) * 300 * 0.72), 0);
    return vol > 0 ? 1 + (pts / vol / 1000) : 1.000;
  },
  getABV: (og: number, mashTemp: number) => {
    const attenuation = 0.78 - ((mashTemp - 62) * 0.015);
    const fg = 1 + (og - 1) * (1 - attenuation);
    return ((og - fg) * 131.25).toFixed(1);
  }
};

/* ================= APPLICATION PRINCIPALE ================= */

export default function BrewMasterApp() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [view, setView] = useState<"home" | "create" | "detail" | "session">("home");
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("brewpro_v17_storage");
    const PRELOADED: Recipe[] = [
      { 
        id: 1, name: "SmasH Citra IPA", volume: 20, baseVolume: 20, boilTime: 60, mashTemp: 65, yeast: "US-05", 
        malts: [{ name: "Pale Ale", weight: 5.5, ebc: 7 }], 
        hops: [{ name: "Citra Amérisant", weight: 30, alpha: 12.5, time: 60 }, { name: "Citra Aromatique", weight: 40, alpha: 12.5, time: 10 }],
        spargeVol: 12, whirlpoolTime: 15, primingSugar: 6.5
      },
      { 
        id: 2, name: "Witbier Avalanche", volume: 20, baseVolume: 20, boilTime: 60, mashTemp: 64, yeast: "WB-06", 
        malts: [{ name: "Pilsner", weight: 2.5, ebc: 3 }, { name: "Froment Blanc", weight: 2.2, ebc: 4 }], 
        hops: [{ name: "Saaz", weight: 25, alpha: 3.5, time: 60 }, { name: "Écorce Orange", weight: 15, alpha: 0, time: 10 }],
        spargeVol: 14, whirlpoolTime: 5, primingSugar: 7.5
      },
      { 
        id: 3, name: "Midnight Stout", volume: 20, baseVolume: 20, boilTime: 75, mashTemp: 68, yeast: "S-04", 
        malts: [{ name: "Maris Otter", weight: 4.8, ebc: 6 }, { name: "Roasted Barley", weight: 0.5, ebc: 1200 }, { name: "Chocolat", weight: 0.3, ebc: 800 }], 
        hops: [{ name: "East Kent Goldings", weight: 40, alpha: 5.0, time: 60 }],
        spargeVol: 11, whirlpoolTime: 0, primingSugar: 5.5
      }
    ];
    setRecipes(saved ? [...PRELOADED, ...JSON.parse(saved)] : PRELOADED);
  }, []);

  const handleSave = (newRecipe: Recipe) => {
    const updated = [newRecipe, ...recipes.filter(r => r.id > 10)];
    localStorage.setItem("brewpro_v17_storage", JSON.stringify(updated));
    setRecipes([...recipes.filter(r => r.id <= 10), ...updated]);
    setView("home");
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-yellow-500 selection:text-black overflow-x-hidden">
      {view === "home" && <HomePage recipes={recipes} onSelect={(r: Recipe) => { setSelectedRecipe(r); setView("detail"); }} onCreate={() => setView("create")} />}
      {view === "create" && <RecipeLab onSave={handleSave} onCancel={() => setView("home")} />}
      {view === "detail" && selectedRecipe && <RecipeDetail recipe={selectedRecipe} onBack={() => setView("home")} onStart={() => setView("session")} />}
      {view === "session" && selectedRecipe && <BrewSession recipe={selectedRecipe} onExit={() => setView("home")} />}
    </div>
  );
}

/* ================= 1. ACCUEIL ================= */

function HomePage({ recipes, onSelect, onCreate }: any) {
  return (
    <div className="max-w-md mx-auto p-6 pt-12 space-y-8 animate-in fade-in duration-500 text-left">
      <header>
        <h1 className="text-3xl font-black italic text-yellow-500 tracking-tighter leading-none uppercase">BrewMaster Pro</h1>
        <p className="text-[10px] text-white/30 uppercase tracking-[0.3em] mt-1 font-bold">Système de Brassage v1.0</p>
      </header>
      
      <button onClick={onCreate} className="w-full bg-yellow-500 p-8 rounded-[2.5rem] flex justify-between items-center hover:scale-[1.02] transition-all shadow-2xl group">
        <div className="text-left">
            <h4 className="font-black italic uppercase text-xl tracking-tight text-black">Nouveau Lab</h4>
            <p className="text-[10px] text-black/60 font-black uppercase mt-1 tracking-wider">Créer une recette</p>
        </div>
        <div className="text-black font-black italic text-3xl group-hover:rotate-90 transition-transform">+</div>
      </button>

      <div className="grid gap-4 pb-12">
        <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] ml-4">Recettes Enregistrées</p>
        {recipes.map((r: Recipe) => (
          <div key={r.id} onClick={() => onSelect(r)} className="bg-[#111] p-8 rounded-[2.5rem] border border-white/5 flex justify-between items-center cursor-pointer hover:border-yellow-500/40 transition-all active:scale-[0.98]">
            <div className="text-left">
                <h4 className="font-black italic uppercase text-xl tracking-tight">{r.name}</h4>
                <p className="text-[10px] text-white/30 font-bold uppercase mt-1">{r.volume}L • {r.yeast}</p>
            </div>
            <div className="text-yellow-500 font-black italic text-xl">→</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================= 2. LAB DE CRÉATION ================= */

function RecipeLab({ onSave, onCancel }: any) {
  const [form, setForm] = useState<Recipe>({ 
    id: Date.now(), name: "Ma Cuvée", volume: 20, baseVolume: 20, boilTime: 60, mashTemp: 66, yeast: "US-05", 
    malts: [{ name: "Pilsner", weight: 5, ebc: 4 }], hops: [{ name: "Cascade", weight: 30, alpha: 7, time: 60 }],
    spargeVol: 10, whirlpoolTime: 10, primingSugar: 7
  });

  const ratio = form.volume / form.baseVolume;
  
  return (
    <div className="max-w-md mx-auto p-6 pb-40 animate-in slide-in-from-bottom-8 duration-500 text-left">
      <button onClick={onCancel} className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-6">← Retour</button>
      <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-8 text-yellow-500 leading-none">Édition Lab</h2>
      
      <div className="space-y-6">
        {/* CONFIG */}
        <div className="bg-[#111] p-6 rounded-[2rem] border border-white/5 space-y-4 shadow-xl">
            <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-white/40 tracking-widest ml-1">Nom de la bière</label>
                <input className="w-full bg-black/40 p-4 rounded-xl outline-none border border-white/5 focus:border-yellow-500 transition-all font-bold italic uppercase" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-[10px] font-black uppercase text-white/30 ml-1">Cible (L)</label>
                    <input type="number" className="w-full bg-black/40 p-4 rounded-xl mt-1 outline-none text-yellow-500 font-black" value={form.volume} onChange={e => setForm({...form, volume: parseFloat(e.target.value) || 0})} />
                </div>
                <div>
                    <label className="text-[10px] font-black uppercase text-white/30 ml-1 font-mono">Base (L)</label>
                    <input type="number" className="w-full bg-black/40 p-4 rounded-xl mt-1 outline-none font-black text-white/20" value={form.baseVolume} onChange={e => setForm({...form, baseVolume: parseFloat(e.target.value) || 20})} />
                </div>
            </div>
        </div>

        {/* MALTS */}
        <div className="bg-[#111] rounded-[2rem] border-l-4 border-orange-500 overflow-hidden shadow-xl">
            <div className="p-5 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-3"><span className="text-xl">🌡️</span><h3 className="font-black uppercase text-xs italic tracking-widest">Empâtage (°C)</h3></div>
                <input type="number" className="w-16 bg-black/40 p-2 rounded-lg text-xs font-black text-center text-orange-500" value={form.mashTemp} onChange={e => setForm({...form, mashTemp: parseInt(e.target.value) || 0})} />
            </div>
            <div className="p-5 space-y-4 bg-black/20">
                {form.malts.map((m, i) => (
                    <div key={i} className="flex justify-between items-center gap-2">
                        <input className="flex-1 bg-transparent border-b border-white/10 text-xs font-bold py-1 outline-none" value={m.name} onChange={e => {
                            const newMalts = [...form.malts]; newMalts[i].name = e.target.value; setForm({...form, malts: newMalts});
                        }} />
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-yellow-500">{(m.weight * ratio).toFixed(2)}kg</span>
                            <input type="number" step="0.1" className="w-12 bg-black/40 p-1 rounded text-[10px] font-mono" value={m.weight} onChange={e => {
                                const newMalts = [...form.malts]; newMalts[i].weight = parseFloat(e.target.value) || 0; setForm({...form, malts: newMalts});
                            }} />
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* RINÇAGE (NO TIMER LATER) */}
        <div className="bg-[#111] rounded-[2rem] border-l-4 border-blue-500 overflow-hidden p-5 flex items-center justify-between shadow-xl">
            <div className="flex items-center gap-3"><span className="text-xl">💧</span><h3 className="font-black uppercase text-xs italic tracking-widest">Rinçage (L)</h3></div>
            <input type="number" className="w-20 bg-black/40 p-2 rounded-lg text-xs font-black text-center text-blue-400" value={form.spargeVol} onChange={e => setForm({...form, spargeVol: parseFloat(e.target.value) || 0})} />
        </div>

        {/* HOPS */}
        <div className="bg-[#111] rounded-[2rem] border-l-4 border-red-500 overflow-hidden shadow-xl">
            <div className="p-5 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-3"><span className="text-xl">🔥</span><h3 className="font-black uppercase text-xs italic tracking-widest">Ébullition (Min)</h3></div>
                <input type="number" className="w-16 bg-black/40 p-2 rounded-lg text-xs font-black text-center text-red-500" value={form.boilTime} onChange={e => setForm({...form, boilTime: parseInt(e.target.value) || 0})} />
            </div>
            <div className="p-5 space-y-4 bg-black/20">
                {form.hops.map((h, i) => (
                    <div key={i} className="flex justify-between items-center gap-2">
                        <input className="flex-1 bg-transparent border-b border-white/10 text-xs font-bold py-1 outline-none" value={h.name} onChange={e => {
                            const newHops = [...form.hops]; newHops[i].name = e.target.value; setForm({...form, hops: newHops});
                        }} />
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-green-500">{Math.round(h.weight * ratio)}g</span>
                            <input type="number" className="w-12 bg-black/40 p-1 rounded text-[10px] font-mono" value={h.weight} onChange={e => {
                                const newHops = [...form.hops]; newHops[i].weight = parseFloat(e.target.value) || 0; setForm({...form, hops: newHops});
                            }} />
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* SUCRE */}
        <div className="bg-[#111] rounded-[2rem] border-l-4 border-amber-500 overflow-hidden p-5 space-y-4 shadow-xl">
            <div className="flex items-center gap-3"><span className="text-xl">🍾</span><h3 className="font-black uppercase text-xs italic">Embouteillage</h3></div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-[9px] font-black text-white/30 uppercase tracking-tighter">Ratio g/L</label>
                    <input type="number" step="0.1" className="w-full bg-black/40 p-3 rounded-xl text-xs font-black text-amber-500" value={form.primingSugar} onChange={e => setForm({...form, primingSugar: parseFloat(e.target.value) || 0})} />
                </div>
                <div className="flex flex-col justify-end p-3 bg-black/10 rounded-xl">
                    <label className="text-[8px] font-black text-white/20 uppercase">Sucre Total</label>
                    <div className="text-xs font-black text-white/40">{Math.round(form.primingSugar * form.volume)}g</div>
                </div>
            </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#050505] to-transparent">
        <button onClick={() => onSave(form)} className="w-full bg-yellow-500 p-6 rounded-2xl text-black font-black italic text-xl shadow-2xl active:scale-95 transition-all uppercase">Sauvegarder</button>
      </div>
    </div>
  );
}

/* ================= 3. DETAIL ================= */

function RecipeDetail({ recipe, onBack, onStart }: any) {
  const scalingRatio = recipe.volume / recipe.baseVolume;
  const og = BrewEngine.getOG(recipe.malts, recipe.volume, scalingRatio);

  const STEPS_DATA = [
    { id: 'MASH', n: "Empâtage", d: `60 min @ ${recipe.mashTemp}°C`, i: "🌡️", c: "border-orange-500/40" },
    { id: 'SPARGE', n: "Rinçage", d: `${recipe.spargeVol}L`, i: "💧", c: "border-blue-500/40" },
    { id: 'BOIL', n: "Ébullition", d: `${recipe.boilTime} min`, i: "🔥", c: "border-red-500/40" },
    { id: 'WHIRL', n: "Whirlpool", d: "Repos / Vortex", i: "🌀", c: "border-green-500/40" },
    { id: 'BOTTL', n: "Embouteillage", d: `${recipe.primingSugar}g/L`, i: "🍾", c: "border-amber-500/40" }
  ];

  return (
    <div className="max-w-md mx-auto p-6 pb-32 animate-in fade-in duration-500 text-left">
      <button onClick={onBack} className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] mb-4">← Retour</button>
      <h1 className="text-4xl font-black italic tracking-tighter uppercase mb-6 leading-none">{recipe.name}</h1>
      
      <div className="grid grid-cols-3 gap-2 mb-10 text-center">
          <div className="bg-[#111] p-4 rounded-2xl border border-white/5"><p className="text-[8px] font-black text-white/30 uppercase mb-1">D.I Est.</p><p className="text-xs font-black italic text-yellow-500">{og.toFixed(3)}</p></div>
          <div className="bg-[#111] p-4 rounded-2xl border border-white/5"><p className="text-[8px] font-black text-white/30 uppercase mb-1">ABV</p><p className="text-xs font-black italic text-yellow-500">{BrewEngine.getABV(og, recipe.mashTemp)}%</p></div>
          <div className="bg-[#111] p-4 rounded-2xl border border-white/5"><p className="text-[8px] font-black text-white/30 uppercase mb-1">Prévu</p><p className="text-xs font-black italic text-white/50">{recipe.volume}L</p></div>
      </div>

      <div className="space-y-6">
        {STEPS_DATA.map((s, i) => (
          <div key={i} className={`bg-[#111] rounded-[2rem] border-l-4 ${s.c} overflow-hidden shadow-xl`}>
            <div className="p-5 flex items-center gap-4 bg-white/5">
                <span className="text-2xl">{s.i}</span>
                <div className="flex-1">
                    <h3 className="font-black uppercase text-xs italic">{s.n}</h3>
                    <p className="text-[10px] font-bold text-white/40">{s.d}</p>
                </div>
            </div>
            
            <div className="p-5 space-y-3 bg-black/20">
                {s.id === 'MASH' && recipe.malts.map((m: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center text-xs font-bold">
                        <span>{m.name}</span><span className="text-yellow-500">{(m.weight * scalingRatio).toFixed(2)}kg</span>
                    </div>
                ))}
                {s.id === 'BOIL' && recipe.hops.map((h: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center text-xs font-bold">
                        <span>{h.name} ({h.time}')</span><span className="text-green-500">{Math.round(h.weight * scalingRatio)}g</span>
                    </div>
                ))}
                {s.id === 'BOTTL' && (
                    <div className="flex justify-between items-center text-xs font-bold">
                        <span>Poids Sucre</span><span className="text-amber-500">{Math.round(recipe.primingSugar * recipe.volume)}g</span>
                    </div>
                )}
            </div>
          </div>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#050505] to-transparent">
        <button onClick={onStart} className="w-full bg-yellow-500 p-6 rounded-2xl text-black font-black italic text-xl shadow-2xl uppercase">Démarrer le brassin</button>
      </div>
    </div>
  );
}

/* ================= 4. SESSION (NO FILTRATION/WHIRLPOOL TIMER) ================= */

function BrewSession({ recipe, onExit }: { recipe: Recipe, onExit: () => void }) {
  const [step, setStep] = useState(0);
  const [timer, setTimer] = useState(0);
  const [isActive, setIsActive] = useState(false);

  // d: 0 masque le timer pour cette étape
  const STEPS = [
    { n: "Concassage", d: 0, m: "Moudre les grains à la finesse souhaitée.", icon: "🌾" },
    { n: "Empâtage", d: 60, m: `Maintenir à ${recipe.mashTemp}°C pour l'extraction.`, icon: "🌡️" },
    { n: "Filtration", d: 0, m: `Rincer avec ${recipe.spargeVol}L d'eau claire.`, icon: "💧" },
    { n: "Ébullition", d: recipe.boilTime, m: "Suivre les ajouts de houblons.", icon: "🔥" },
    { n: "Whirlpool", d: 0, m: "Clarification. Laisser décanter avant transfert.", icon: "🌀" },
    { n: "Embouteillage", d: 0, m: `Ajouter ${Math.round(recipe.primingSugar * recipe.volume)}g de sucre.`, icon: "🍾" }
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
      <div className="p-6 border-b border-white/5">
        <div className="flex justify-between items-center mb-6 text-[10px] font-black uppercase text-white/30 tracking-widest">
          <span>{recipe.name}</span>
          <button onClick={onExit} className="text-yellow-500">ARRÊTER ✕</button>
        </div>
        <div className="relative flex justify-between items-center px-2">
           <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/10 -translate-y-1/2" />
           <div className="absolute top-1/2 left-0 h-[1.5px] bg-yellow-500 -translate-y-1/2 transition-all" style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }} />
           {STEPS.map((s, i) => (
             <button key={i} onClick={() => setStep(i)} className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-[10px] transition-all ${i === step ? 'bg-yellow-500 text-black scale-125' : i < step ? 'bg-yellow-900/40 text-yellow-500 border border-yellow-500/20' : 'bg-[#111] text-white/20'}`}>{i < step ? "✓" : s.icon}</button>
           ))}
        </div>
      </div>
      
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <h2 className="text-4xl font-black italic mb-2 tracking-tighter uppercase leading-none">{STEPS[step].n}</h2>
        {STEPS[step].d > 0 ? (
          <div className="text-[7rem] font-mono font-black mb-10 text-yellow-500 leading-none tracking-tighter tabular-nums">{formatTime(timer)}</div>
        ) : (
          <div className="h-12" /> 
        )}
        <div className="bg-[#111] p-8 rounded-[2.5rem] w-full max-w-xs border border-white/5 shadow-2xl">
            <p className="text-sm font-bold italic text-white/70">"{STEPS[step].m}"</p>
        </div>
      </div>

      <div className="p-8 pb-12">
        <div className="max-w-sm mx-auto grid grid-cols-4 gap-3">
          <button onClick={() => setStep(Math.max(0, step - 1))} className="p-5 bg-[#111] rounded-2xl border border-white/10 text-white/50">←</button>
          {STEPS[step].d > 0 ? (
            <button onClick={() => setIsActive(!isActive)} className={`col-span-2 p-5 rounded-2xl font-black transition-transform active:scale-95 ${isActive ? 'bg-white text-black' : 'bg-yellow-500 text-black'}`}>{isActive ? "PAUSE" : "DÉMARRER"}</button>
          ) : (
            <button onClick={() => setStep(Math.min(STEPS.length - 1, step + 1))} className="col-span-2 p-5 rounded-2xl font-black bg-white text-black uppercase tracking-tighter text-sm">Étape Suivante</button>
          )}
          <button onClick={() => setStep(Math.min(STEPS.length - 1, step + 1))} className="p-5 bg-[#111] rounded-2xl border border-white/10 text-white/50">→</button>
        </div>
      </div>
    </div>
  );
}