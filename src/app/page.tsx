"use client";

import { useState, useEffect } from "react";

/* ================= TYPES & CONSTANTES ================= */

const THEME = {
  gold: "#D4AF37",
  bg: "#050505",
  card: "#121212",
  border: "rgba(255,255,255,0.08)"
};

const PRELOADED_RECIPES = [
  { 
    id: 1, name: "NEIPA CLOUDY TROPICS", volume: 20, yeast: "Verdant IPA", 
    malts: [{ name: "Pale Ale", weight: 5, ebc: 6 }, { name: "Flocons d'Avoine", weight: 1, ebc: 2 }], 
    hops: [{ name: "Citra", weight: 100, alpha: 12, time: 0 }, { name: "Mosaic", weight: 100, alpha: 12, time: 0 }] 
  },
  { 
    id: 2, name: "STOUT CAFÉ", volume: 20, yeast: "S-04", 
    malts: [{ name: "Maris Otter", weight: 5, ebc: 7 }, { name: "Roasted Barley", weight: 0.5, ebc: 1200 }], 
    hops: [{ name: "Fuggles", weight: 40, alpha: 4.5, time: 60 }] 
  }
];

/* ================= MOTEUR DE CALCUL (BREW ENGINE) ================= */

const BrewEngine = {
  // Calcul de la densité initiale (Estimation basée sur une efficacité de 75%)
  getOG: (malts: any[], vol: number) => {
    const points = malts.reduce((acc, m) => acc + (Number(m.weight) * 290), 0);
    const og = 1 + points / (vol || 1) / 1000;
    return og.toFixed(3);
  },
  
  // Calcul de l'eau (Empâtage @ 3L/kg + Rinçage)
  getWater: (malts: any[], vol: number) => {
    const totalMalt = malts.reduce((acc, m) => acc + Number(m.weight), 0);
    const mash = totalMalt * 3;
    const sparge = (vol * 1.25) - (mash - totalMalt);
    return {
      mash: mash.toFixed(1),
      sparge: Math.max(0, sparge).toFixed(1),
      total: (mash + Math.max(0, sparge)).toFixed(1)
    };
  }
};

/* ================= COMPOSANTS DE L'INTERFACE ================= */

export default function BrewApp() {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [view, setView] = useState<"home" | "list" | "create">("home");
  const [active, setActive] = useState<any>(null);

  useEffect(() => {
    const saved = localStorage.getItem("brew_pro_v7");
    setRecipes(saved ? JSON.parse(saved) : PRELOADED_RECIPES);
  }, []);

  const save = (recipe: any) => {
    const updated = [...recipes, { ...recipe, id: Date.now() }];
    setRecipes(updated);
    localStorage.setItem("brew_pro_v7", JSON.stringify(updated));
    setView("home");
  };

  const remove = (id: number) => {
    const updated = recipes.filter(r => r.id !== id);
    setRecipes(updated);
    localStorage.setItem("brew_pro_v7", JSON.stringify(updated));
  };

  if (active) return <BrewingSession recipe={active} onExit={() => setActive(null)} />;

  return (
    <div className="min-h-screen bg-black text-white p-6 font-sans antialiased">
      <header className="py-8 text-center">
        <h1 className="text-3xl font-black italic tracking-tighter" style={{ color: THEME.gold }}>BREWPRO.</h1>
        <p className="text-[10px] opacity-30 uppercase tracking-[0.3em] mt-1">Advanced Brewing System</p>
      </header>

      {view === "home" && (
        <main className="max-w-md mx-auto space-y-6 animate-in fade-in duration-500">
          <button onClick={() => setView("list")} className="group w-full p-12 rounded-[3rem] bg-[#0A0A0A] border border-white/5 text-left transition-all hover:border-white/20 active:scale-95">
            <h2 className="text-4xl font-black italic">RECETTES</h2>
            <div className="flex items-center gap-2 mt-2 opacity-40">
              <span className="text-[10px] font-bold uppercase tracking-widest">Accéder aux archives</span>
              <span className="h-px w-8 bg-white/20"></span>
              <span className="text-[10px] font-bold">{recipes.length}</span>
            </div>
          </button>

          <button onClick={() => setView("create")} className="w-full p-12 rounded-[3rem] text-left transition-all active:scale-95 shadow-2xl" style={{ background: THEME.gold, color: "black" }}>
            <h2 className="text-4xl font-black italic">CRÉER +</h2>
            <p className="text-[10px] font-bold uppercase tracking-widest mt-2 opacity-70">Nouveau brassin</p>
          </button>
        </main>
      )}

      {view === "list" && (
        <div className="max-w-md mx-auto space-y-4 animate-in slide-in-from-bottom-4">
          <div className="flex justify-between items-center px-4 mb-6">
            <h3 className="text-[10px] font-black opacity-30 uppercase tracking-widest">Bibliothèque</h3>
            <button onClick={() => setView("home")} className="text-[10px] font-black text-gold underline underline-offset-4">RETOUR</button>
          </div>
          {recipes.map(r => (
            <div key={r.id} className="relative group">
              <div onClick={() => setActive(r)} className="p-6 rounded-3xl bg-[#111] border border-white/5 flex justify-between items-center hover:bg-[#151515] transition-colors cursor-pointer">
                <div>
                  <div className="text-xl font-black italic uppercase tracking-tight">{r.name}</div>
                  <div className="text-[10px] font-mono opacity-40 mt-1 uppercase">{r.volume}L • OG {BrewEngine.getOG(r.malts, r.volume)}</div>
                </div>
                <div className="text-gold opacity-50 group-hover:opacity-100 transition-opacity">→</div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); remove(r.id); }} className="absolute -top-1 -right-1 w-6 h-6 bg-[#222] rounded-full text-[10px] flex items-center justify-center border border-white/10 hover:bg-red-900 transition-colors">✕</button>
            </div>
          ))}
        </div>
      )}

      {view === "create" && <RecipeCreator onSave={save} onCancel={() => setView("home")} />}
    </div>
  );
}

/* ================= VUE : CRÉATION DE RECETTE ================= */

function RecipeCreator({ onSave, onCancel }: any) {
  const [form, setForm] = useState({
    name: "", volume: 20, yeast: "US-05",
    malts: [{ name: "Pilsner", weight: 5 }],
    hops: [{ name: "SaaZ", weight: 30, time: 60 }]
  });

  const water = BrewEngine.getWater(form.malts, form.volume);

  return (
    <div className="max-w-md mx-auto space-y-8 pb-32 animate-in slide-in-from-right-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-black italic uppercase text-gold">Labo Design</h2>
        <button onClick={onCancel} className="text-[10px] font-black opacity-40">ANNULER</button>
      </div>

      {/* Quick Dashboard */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#111] p-6 rounded-[2rem] border border-white/5">
          <span className="text-[9px] font-black opacity-30 uppercase block mb-1">D. Initiale (OG)</span>
          <span className="text-3xl font-mono font-black">{BrewEngine.getOG(form.malts, form.volume)}</span>
        </div>
        <div className="bg-[#111] p-6 rounded-[2rem] border border-white/5">
          <span className="text-[9px] font-black opacity-30 uppercase block mb-1">Eau Totale (L)</span>
          <span className="text-3xl font-mono font-black">{water.total}</span>
        </div>
      </div>

      <input 
        placeholder="NOM DE LA BIÈRE" 
        className="w-full bg-transparent border-b-2 border-white/10 py-4 text-3xl font-black italic uppercase focus:border-gold outline-none transition-all"
        onChange={e => setForm({...form, name: e.target.value})}
      />

      {/* Section Malts */}
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="text-[10px] font-black opacity-30 uppercase tracking-widest">Ingrédients : Malts (kg)</h4>
          <button onClick={() => setForm({...form, malts: [...form.malts, { name: "", weight: 0 }]})} className="text-gold text-[10px] font-bold">+ AJOUTER</button>
        </div>
        {form.malts.map((m, i) => (
          <div key={i} className="flex gap-3 animate-in fade-in">
            <input placeholder="Ex: Pale Ale" className="flex-1 bg-[#111] p-4 rounded-2xl text-sm font-bold outline-none focus:ring-1 ring-gold/50" value={m.name} onChange={e => {
              let n = [...form.malts]; n[i].name = e.target.value; setForm({...form, malts: n});
            }} />
            <input type="number" step="0.1" className="w-20 bg-[#111] p-4 rounded-2xl text-center font-black text-gold outline-none" value={m.weight} onChange={e => {
              let n = [...form.malts]; n[i].weight = Number(e.target.value); setForm({...form, malts: n});
            }} />
          </div>
        ))}
      </section>

      {/* Section Houblons */}
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="text-[10px] font-black opacity-30 uppercase tracking-widest">Houblonnage (g / min)</h4>
          <button onClick={() => setForm({...form, hops: [...form.hops, { name: "", weight: 0, time: 0 }]})} className="text-gold text-[10px] font-bold">+ AJOUTER</button>
        </div>
        {form.hops.map((h, i) => (
          <div key={i} className="flex gap-2">
            <input placeholder="Hop" className="flex-1 bg-[#111] p-4 rounded-2xl text-sm font-bold outline-none" value={h.name} onChange={e => {
              let n = [...form.hops]; n[i].name = e.target.value; setForm({...form, hops: n});
            }} />
            <input placeholder="Gr" type="number" className="w-16 bg-[#111] p-4 rounded-2xl text-center text-xs font-black" value={h.weight} onChange={e => {
              let n = [...form.hops]; n[i].weight = Number(e.target.value); setForm({...form, hops: n});
            }} />
            <input placeholder="Min" type="number" className="w-16 bg-[#D4AF37]/10 p-4 rounded-2xl text-center text-xs font-black text-gold" value={h.time} onChange={e => {
              let n = [...form.hops]; n[i].time = Number(e.target.value); setForm({...form, hops: n});
            }} />
          </div>
        ))}
      </section>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#111] p-5 rounded-3xl border border-white/5">
          <label className="text-[9px] font-black opacity-30 uppercase block mb-2">Volume Final (L)</label>
          <input type="number" value={form.volume} className="bg-transparent w-full text-center text-2xl font-black outline-none" onChange={e => setForm({...form, volume: Number(e.target.value)})} />
        </div>
        <div className="bg-[#111] p-5 rounded-3xl border border-white/5">
          <label className="text-[9px] font-black opacity-30 uppercase block mb-2">Levure</label>
          <input value={form.yeast} className="bg-transparent w-full text-center text-sm font-bold uppercase outline-none" onChange={e => setForm({...form, yeast: e.target.value})} />
        </div>
      </div>

      <button onClick={() => onSave(form)} className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-md py-6 rounded-[2rem] bg-gold text-black font-black text-xl uppercase shadow-2xl active:scale-95 transition-all">Lancer le brassage</button>
    </div>
  );
}

/* ================= VUE : SESSION DE BRASSAGE ================= */

function BrewingSession({ recipe, onExit }: any) {
  const [step, setStep] = useState(0);
  const [timer, setTimer] = useState(0);
  const [isActive, setIsActive] = useState(false);

  const water = BrewEngine.getWater(recipe.malts, recipe.volume);
  
  const STEPS = [
    { n: "Empâtage", d: 60, detail: `Eau : ${water.mash}L @ 67°C` },
    { n: "Rinçage", d: 0, detail: `Eau : ${water.sparge}L @ 78°C` },
    { n: "Ébullition", d: 60, detail: `${recipe.hops.length} houblon(s) à ajouter` },
    { n: "Sucrage", d: 0, detail: `Sucre : ${(recipe.volume * 7).toFixed(0)}g` }
  ];

  useEffect(() => {
    setTimer(STEPS[step].d * 60);
    setIsActive(false);
  }, [step]);

  useEffect(() => {
    let interval: any = null;
    if (isActive && timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive, timer]);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="min-h-screen bg-black flex flex-col p-6 animate-in fade-in">
      <header className="flex justify-between items-center mb-8">
        <button onClick={onExit} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center font-black">✕</button>
        <div className="text-right">
          <h2 className="text-lg font-black italic uppercase text-gold">{recipe.name}</h2>
          <span className="text-[10px] opacity-40 uppercase font-bold tracking-widest italic">Phase de Production</span>
        </div>
      </header>

      <div className="flex-1 bg-[#0A0A0A] border border-white/10 rounded-[3rem] p-8 flex flex-col justify-between relative overflow-hidden">
        {/* Progress bar */}
        <div className="absolute top-0 left-0 h-1 bg-gold transition-all duration-700" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />

        <div className="text-center space-y-2">
          <h3 className="text-4xl font-black italic uppercase">{STEPS[step].n}</h3>
          <p className="text-gold font-bold tracking-tighter opacity-80">{STEPS[step].detail}</p>
        </div>

        {STEPS[step].d > 0 ? (
          <div className="text-center">
            <div className="text-[8rem] font-mono font-black leading-none tracking-tighter mb-8">
              {fmt(timer)}
            </div>
            <div className="flex gap-4">
              <button onClick={() => setIsActive(!isActive)} className={`flex-1 py-6 rounded-3xl font-black text-xl uppercase transition-all ${isActive ? "bg-red-900/20 text-red-500 border border-red-500/50" : "bg-white text-black"}`}>
                {isActive ? "Pause" : "Lancer"}
              </button>
              <button onClick={() => setTimer(STEPS[step].d * 60)} className="w-20 bg-white/5 rounded-3xl flex items-center justify-center font-black text-xs">RAZ</button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 opacity-20 italic">
            <p>Action manuelle requise</p>
          </div>
        )}

        <div className="flex gap-4">
          <button onClick={() => setStep(s => Math.max(0, s - 1))} className="flex-1 py-5 rounded-2xl bg-white/5 font-black text-[10px] opacity-40 uppercase">Précédent</button>
          <button onClick={() => setStep(s => Math.min(STEPS.length - 1, s + 1))} className="flex-1 py-5 rounded-2xl bg-gold text-black font-black text-[10px] uppercase shadow-lg">Étape Suivante</button>
        </div>
      </div>
    </div>
  );
}