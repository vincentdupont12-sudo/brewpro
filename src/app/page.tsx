"use client";

import React, { useState, useEffect, useRef } from "react";
import { Droplets, Timer, ChevronRight, Plus, X, Beaker, Flame, Trash2, Gauge } from "lucide-react";

/* =======================
   CONFIG & TYPES
======================= */

const STORAGE_KEY = "brew_pro_v5_final";

const TABS = ["Recettes", "Process", "Création"];

const STEPS = [
  { name: "Concassage", icon: "https://cdn-icons-png.flaticon.com/512/1155/1155091.png", desc: "Broyage des grains pour libérer l'amidon.", duration: 15 },
  { name: "Empâtage", icon: "https://cdn-icons-png.flaticon.com/512/3211/3211244.png", desc: "Extraction des sucres par infusion.", temp: "67°C", duration: 60 },
  { name: "Rinçage", icon: "https://cdn-icons-png.flaticon.com/512/3100/3100063.png", desc: "Lavage des drêches pour récupérer le sucre restant.", temp: "78°C", duration: 15 },
  { name: "Ébullition", icon: "https://cdn-icons-png.flaticon.com/512/3062/3062426.png", desc: "Stérilisation et ajout des houblons.", temp: "100°C", duration: 60 },
  { name: "Refroidissement", icon: "https://cdn-icons-png.flaticon.com/512/1041/1041648.png", desc: "Baisse rapide de température avant levurage.", duration: 20 },
  { name: "Fermentation", icon: "https://cdn-icons-png.flaticon.com/512/4243/4243403.png", desc: "Transformation du sucre en alcool.", temp: "20°C", duration: 10080 }
];

/* =======================
   CALCULS MATHÉMATIQUES
======================= */

const calcOG = (grainKg: number, efficiency: number, volume: number) => {
  return (1 + (grainKg * efficiency * 300) / volume / 1000).toFixed(3);
};

const calcIBU = (hopG: number, alpha: number, volume: number) => {
  return Math.round((hopG * alpha * 10) / volume);
};

const calcWater = (grainKg: number, targetVolume: number) => {
  const mash = grainKg * 3;
  const loss = grainKg * 0.8;
  const preBoil = targetVolume + 5;
  const sparge = preBoil - (mash - loss);
  return { mash: Math.round(mash), sparge: Math.round(sparge) };
};

/* =======================
   COMPOSANT PRINCIPAL
======================= */

export default function BrewProApp() {
  const [tab, setTab] = useState("Recettes");
  const [recipes, setRecipes] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const defaults = [
      { id: 1, name: "Blonde Alchimie", grain: 5, volume: 20, hop: 30, alpha: 5, ebc: 8 },
      { id: 2, name: "IPA Tropicale", grain: 6, volume: 20, hop: 80, alpha: 10, ebc: 12 },
      { id: 3, name: "Stout Impérial", grain: 8, volume: 18, hop: 60, alpha: 12, ebc: 75 },
      { id: 4, name: "Amber Ale", grain: 5.5, volume: 20, hop: 40, alpha: 7, ebc: 25 },
      { id: 5, name: "Blanche Été", grain: 4.5, volume: 22, hop: 20, alpha: 4, ebc: 5 }
    ];

    if (!saved || JSON.parse(saved).length === 0) {
      setRecipes(defaults);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
    } else {
      setRecipes(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
  }, [recipes]);

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 pb-24 font-sans">
      <header className="p-6 flex justify-between items-center border-b border-slate-800 bg-slate-900/50 sticky top-0 z-50 backdrop-blur-md">
        <div>
          <h1 className="text-xl font-black text-blue-500 italic tracking-tighter">BREWPRO <span className="not-italic bg-blue-600 text-white text-[9px] px-1.5 py-0.5 rounded ml-1">LAB</span></h1>
        </div>
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest italic">V5.0 Digital</div>
      </header>

      <main className="p-6 max-w-lg mx-auto">
        {tab === "Recettes" && <ViewRecettes recipes={recipes} setRecipes={setRecipes} setSelected={setSelected} setTab={setTab} />}
        {tab === "Création" && <ViewCreation recipes={recipes} setRecipes={setRecipes} setTab={setTab} />}
        {tab === "Process" && <ViewProcess recipe={selected} setSelected={setSelected} />}
      </main>

      <nav className="fixed bottom-0 w-full flex bg-slate-900 border-t border-slate-800 shadow-2xl z-50">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${tab === t ? "text-blue-500 bg-blue-500/5" : "text-slate-500"}`}>
            {t}
          </button>
        ))}
      </nav>
    </div>
  );
}

/* =======================
   VUE : LISTE RECETTES
======================= */

function ViewRecettes({ recipes, setRecipes, setSelected, setTab }: any) {
  const deleteR = (id: number, e: any) => {
    e.stopPropagation();
    if (confirm("Supprimer cette recette ?")) setRecipes(recipes.filter((r: any) => r.id !== id));
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2 ml-2">Mes Brassins</h2>
      {recipes.map((r: any) => (
        <div key={r.id} onClick={() => { setSelected(r); setTab("Process"); }} className="bg-slate-800/40 border border-slate-700/50 p-5 rounded-[2rem] flex justify-between items-center group active:scale-95 transition-all">
          <div className="flex items-center gap-4">
            <div className="bg-slate-900 p-3 rounded-2xl text-blue-500 border border-slate-700"><Beaker size={20} /></div>
            <div>
              <h3 className="font-bold text-lg">{r.name}</h3>
              <p className="text-[10px] font-bold text-blue-400/70">OG {calcOG(r.grain, 0.75, r.volume)} • {r.volume}L</p>
            </div>
          </div>
          <button onClick={(e) => deleteR(r.id, e)} className="p-2 text-slate-600 hover:text-red-400"><Trash2 size={18}/></button>
        </div>
      ))}
    </div>
  );
}

/* =======================
   VUE : CRÉATION (AVEC JAUGES)
======================= */
function ViewCreation({ recipes, setRecipes, setTab }: any) {
  const [name, setName] = useState("");
  const [volume, setVolume] = useState(20);
  
  // Gestion multi-ingrédients
  const [malts, setMalts] = useState([{ id: 1, nom: "Base", poids: 5, ebc: 8 }]);
  const [hops, setHops] = useState([{ id: 1, nom: "Amerisant", poids: 30, alpha: 10, temps: 60 }]);

  // --- CALCULS AVANCÉS ---
  
  // Calcul EBC (Formule de Morey)
  const totalMCU = malts.reduce((acc, m) => acc + (m.poids * 2.204 * m.ebc * 0.508) / (volume * 0.264), 0);
  const finalEbc = Math.round(1.4922 * Math.pow(totalMCU, 0.6859));

  // Calcul IBU (Formule de Tinseth simplifiée)
  const finalIbu = Math.round(hops.reduce((acc, h) => {
    const utilisation = (1.65 * Math.pow(0.000125, (1.050 - 1))) * ((1 - Math.exp(-0.04 * h.temps)) / 4.15);
    return acc + (h.poids * h.alpha * utilisation * 10) / volume;
  }, 0));

  const totalGrain = malts.reduce((acc, m) => acc + m.poids, 0);
  const water = calcWater(totalGrain, volume);

  const getEbcColor = (v: number) => {
    if (v < 8) return "#F5E061"; if (v < 15) return "#E6BE4F";
    if (v < 25) return "#D48F1C"; if (v < 40) return "#945200";
    if (v < 60) return "#472400"; return "#1A0F00";
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* HEADER CRÉATION */}
      <input 
        value={name} onChange={(e) => setName(e.target.value)} 
        placeholder="Nom du brassin..." 
        className="w-full p-5 bg-slate-800/50 rounded-3xl border border-slate-700 text-xl font-black outline-none focus:border-blue-500"
      />

      <div className="flex gap-4">
        <div className="flex-1 bg-slate-900 p-4 rounded-2xl border border-slate-800">
           <span className="text-[9px] font-black text-slate-500 uppercase block mb-1">Volume Final</span>
           <div className="flex items-center gap-3">
             <input type="number" value={volume} onChange={(e)=>setVolume(+e.target.value)} className="bg-transparent text-xl font-black w-12 outline-none text-blue-500" />
             <span className="text-xs font-bold text-slate-600">LITRES</span>
           </div>
        </div>
      </div>

      {/* SECTION MALTS */}
      <div className="space-y-3">
        <div className="flex justify-between items-center px-2">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Maltage (EBC)</h3>
          <button onClick={() => setMalts([...malts, { id: Date.now(), nom: "Spécial", poids: 0.5, ebc: 50 }])} className="text-blue-500 bg-blue-500/10 px-3 py-1 rounded-full text-[10px] font-black">+ AJOUTER</button>
        </div>
        {malts.map((m, idx) => (
          <div key={m.id} className="bg-slate-800/40 p-4 rounded-2xl border border-slate-700/50 flex gap-4 items-center animate-in slide-in-from-left-4">
            <div className="flex-1">
              <input value={m.nom} onChange={(e) => {
                const newM = [...malts]; newM[idx].nom = e.target.value; setMalts(newM);
              }} className="bg-transparent font-bold text-sm w-full outline-none" />
            </div>
            <div className="w-16">
              <span className="text-[8px] block text-slate-500 font-bold uppercase">KG</span>
              <input type="number" step="0.1" value={m.poids} onChange={(e) => {
                const newM = [...malts]; newM[idx].poids = +e.target.value; setMalts(newM);
              }} className="bg-transparent font-black text-sm w-full outline-none text-blue-400" />
            </div>
            <div className="w-16">
              <span className="text-[8px] block text-slate-500 font-bold uppercase">EBC</span>
              <input type="number" value={m.ebc} onChange={(e) => {
                const newM = [...malts]; newM[idx].ebc = +e.target.value; setMalts(newM);
              }} className="bg-transparent font-black text-sm w-full outline-none text-orange-400" />
            </div>
          </div>
        ))}
      </div>

      {/* SECTION HOUBLONS */}
      <div className="space-y-3">
        <div className="flex justify-between items-center px-2">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Houblonnage (IBU)</h3>
          <button onClick={() => setHops([...hops, { id: Date.now(), nom: "Arôme", poids: 20, alpha: 5, temps: 10 }])} className="text-green-500 bg-green-500/10 px-3 py-1 rounded-full text-[10px] font-black">+ AJOUTER</button>
        </div>
        {hops.map((h, idx) => (
          <div key={h.id} className="bg-slate-800/40 p-4 rounded-2xl border border-slate-700/50 flex gap-3 items-center animate-in slide-in-from-left-4">
            <div className="flex-1">
              <input value={h.nom} onChange={(e) => {
                const newH = [...hops]; newH[idx].nom = e.target.value; setHops(newH);
              }} className="bg-transparent font-bold text-sm w-full outline-none" />
            </div>
            <div className="w-12 text-center">
              <span className="text-[8px] block text-slate-500 font-bold uppercase">G</span>
              <input type="number" value={h.poids} onChange={(e) => {
                const newH = [...hops]; newH[idx].poids = +e.target.value; setHops(newH);
              }} className="bg-transparent font-black text-xs w-full outline-none text-green-400" />
            </div>
            <div className="w-12 text-center">
              <span className="text-[8px] block text-slate-500 font-bold uppercase">A%</span>
              <input type="number" step="0.1" value={h.alpha} onChange={(e) => {
                const newH = [...hops]; newH[idx].alpha = +e.target.value; setHops(newH);
              }} className="bg-transparent font-black text-xs w-full outline-none text-green-400" />
            </div>
            <div className="w-12 text-center">
              <span className="text-[8px] block text-slate-500 font-bold uppercase">Min</span>
              <input type="number" value={h.temps} onChange={(e) => {
                const newH = [...hops]; newH[idx].temps = +e.target.value; setHops(newH);
              }} className="bg-transparent font-black text-xs w-full outline-none text-green-400" />
            </div>
          </div>
        ))}
      </div>

      {/* DASHBOARD DE PROJECTION */}
      <div className="bg-slate-900 border-2 border-slate-800 rounded-[2.5rem] p-6 space-y-8 shadow-2xl">
        
        {/* JAUGE EBC */}
        <div className="space-y-3">
          <div className="flex justify-between items-end">
             <div className="flex flex-col">
               <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Couleur Finale</span>
               <span className="text-2xl font-black tracking-tighter" style={{ color: getEbcColor(finalEbc) }}>{finalEbc} EBC</span>
             </div>
             <div className="w-12 h-12 rounded-2xl border-2 border-white/10 shadow-lg" style={{ backgroundColor: getEbcColor(finalEbc) }} />
          </div>
          <div className="h-4 w-full rounded-full bg-gradient-to-r from-[#F5E061] via-[#D48F1C] via-[#472400] to-[#1A0F00] relative overflow-hidden border border-black/50">
             <div className="absolute top-0 bottom-0 w-1.5 bg-white shadow-[0_0_15px_white] transition-all duration-500" style={{ left: `${Math.min((finalEbc / 80) * 100, 100)}%` }} />
          </div>
        </div>

        {/* JAUGE IBU (NOUVELLE COULEUR AMBRE/SÉPIA) */}
        <div className="space-y-3">
          <div className="flex flex-col">
             <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Amertume Théorique</span>
             <span className="text-2xl font-black tracking-tighter text-[#c47335]">{finalIbu} IBU</span>
          </div>
          <div className="h-4 w-full rounded-full bg-slate-950 relative overflow-hidden border border-slate-800">
             <div 
               className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#4d2a0e] via-[#c47335] to-[#f4a460] transition-all duration-700 shadow-[0_0_20px_rgba(196,115,53,0.4)]" 
               style={{ width: `${Math.min((finalIbu / 100) * 100, 100)}%` }} 
             />
             <div className="absolute inset-0 flex justify-between px-3 items-center text-[7px] font-black text-white/30 uppercase tracking-tighter italic">
               <span>Smooth</span><span>Balanced</span><span>Aggressive</span>
             </div>
          </div>
        </div>

        {/* EAU */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-600/5 p-4 rounded-3xl border border-blue-500/10">
            <span className="text-[8px] font-black text-blue-500 uppercase block mb-1">Eau Empâtage</span>
            <span className="text-xl font-black text-blue-400">{water.mash} L</span>
          </div>
          <div className="bg-blue-600/5 p-4 rounded-3xl border border-blue-500/10">
            <span className="text-[8px] font-black text-blue-500 uppercase block mb-1">Eau Rinçage</span>
            <span className="text-xl font-black text-blue-400">{water.sparge} L</span>
          </div>
        </div>
      </div>

      <button onClick={() => {
        if(!name) return;
        setRecipes([...recipes, {
          id: Date.now(), name, volume, grain: totalGrain, ebc: finalEbc, 
          hopsCount: hops.length, ibu: finalIbu
        }]);
        setTab("Recettes");
      }} className="w-full bg-blue-600 py-6 rounded-[2.5rem] font-black text-sm uppercase tracking-[0.3em] shadow-xl shadow-blue-900/40 active:scale-95 transition-all">
        ENREGISTRER LA FORMULE
      </button>

    </div>
  );
}

function Slider({ label, value, setValue, min, max, step, color }: any) {
  const c = color === "green" ? "accent-green-500" : color === "orange" ? "accent-orange-500" : "accent-blue-500";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[9px] font-bold uppercase text-slate-500"><span>{label}</span><span className="text-white">{value}</span></div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => setValue(+e.target.value)} className={`w-full h-1.5 bg-slate-900 rounded-lg appearance-none ${c}`} />
    </div>
  );
}

/* =======================
   VUE : PROCESS (CARROUSEL & DASHBOARD)
======================= */

function ViewProcess({ recipe, setSelected }: any) {
  const [active, setActive] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [running, setRunning] = useState(false);
  const ref = useRef<any>(null);

  useEffect(() => {
    const el = ref.current?.children[active];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    setTimeLeft((STEPS[active].duration || 0) * 60);
    setRunning(false);
  }, [active]);

  useEffect(() => {
    let t: any;
    if (running && timeLeft > 0) t = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(t);
  }, [running, timeLeft]);

  if (!recipe) return <div className="text-center mt-20 opacity-30 text-[10px] font-black uppercase tracking-[0.5em]">Aucune Recette Sélectionnée</div>;

  const water = calcWater(recipe.grain, recipe.volume);

  return (
    <div className="space-y-4 animate-in slide-in-from-right-10 duration-500">
      <div className="flex items-start px-2">
        <div className="bg-slate-800/40 border-l-2 border-blue-500 py-1.5 px-3 rounded-r-lg">
          <h2 className="text-xs font-black uppercase text-white tracking-tighter leading-none">{recipe.name}</h2>
          <p className="text-[8px] font-bold text-blue-400 mt-1 uppercase">OG {calcOG(recipe.grain, 0.75, recipe.volume)} • {recipe.volume}L</p>
        </div>
      </div>

      <div className="sticky top-16 z-20 bg-[#0f172a]/90 backdrop-blur-md pt-2 pb-6 -mx-6">
        <div ref={ref} className="flex gap-4 overflow-x-auto snap-x no-scrollbar px-16 items-center h-20">
          {STEPS.map((s, i) => (
            <div key={i} onClick={() => setActive(i)} className={`flex-shrink-0 flex flex-col items-center transition-all duration-300 snap-center cursor-pointer ${i === active ? "scale-110 opacity-100" : "scale-75 opacity-20"}`}>
              <div className={`w-14 h-14 rounded-full flex items-center justify-center border ${i === active ? "border-blue-500 bg-slate-800 shadow-[0_0_20px_rgba(59,130,246,0.3)]" : "border-slate-700 bg-black"}`}>
                <img src={s.icon} className="w-8 h-8 object-contain p-1" onError={(e: any) => e.target.style.display = "none"} />
              </div>
              <span className={`text-[8px] font-black mt-2 uppercase tracking-tighter ${i === active ? "text-blue-400" : "text-white"}`}>{s.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-8 rounded-[2.5rem] border border-slate-700 text-center shadow-2xl">
        <div className="text-6xl font-mono font-black mb-6 tracking-tighter text-white">
          {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
        </div>
        <div className="flex gap-4 justify-center">
          <button onClick={() => setRunning(!running)} className={`px-10 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 ${running ? "bg-slate-700 text-slate-300" : "bg-blue-600 text-white shadow-lg shadow-blue-900/40"}`}>
            {running ? "Pause" : "Start"}
          </button>
          <button onClick={() => { setRunning(false); setTimeLeft(STEPS[active].duration * 60); }} className="bg-slate-950 border border-slate-700 px-5 py-3 rounded-2xl font-black text-[10px] text-slate-500 uppercase tracking-widest active:scale-95">R.A.Z</button>
        </div>
      </div>

      <div className="bg-slate-800/60 p-7 rounded-[2.5rem] border border-slate-700 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-black text-xl text-blue-500 uppercase italic leading-none">{STEPS[active].name}</h3>
          {STEPS[active].temp && <span className="text-[10px] font-black bg-orange-500/20 text-orange-400 px-3 py-1 rounded-full border border-orange-500/20">🌡️ {STEPS[active].temp}</span>}
        </div>
        <p className="text-slate-400 text-sm leading-relaxed mb-8 italic opacity-80">"{STEPS[active].desc}"</p>
        
        <div className="grid grid-cols-2 gap-3 mb-8">
           <div className="bg-slate-900/50 p-3 rounded-2xl border border-slate-700/30 text-center">
              <span className="text-[8px] block text-slate-500 font-bold uppercase mb-1">Malt (KG)</span>
              <span className="text-sm font-black">{recipe.grain}</span>
           </div>
           <div className="bg-slate-900/50 p-3 rounded-2xl border border-slate-700/30 text-center">
              <span className="text-[8px] block text-slate-500 font-bold uppercase mb-1">Houblon (G)</span>
              <span className="text-sm font-black">{recipe.hop}</span>
           </div>
           {STEPS[active].name === "Empâtage" && (
             <div className="col-span-2 bg-blue-600/5 p-4 rounded-2xl border border-blue-500/20 flex justify-between items-center">
               <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Eau Empâtage</span>
               <span className="text-lg font-black text-blue-400">{water.mash} L</span>
             </div>
           )}
           {STEPS[active].name === "Rinçage" && (
             <div className="col-span-2 bg-blue-600/5 p-4 rounded-2xl border border-blue-500/20 flex justify-between items-center">
               <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Eau Rinçage</span>
               <span className="text-lg font-black text-blue-400">{water.sparge} L</span>
             </div>
           )}
        </div>

        <button onClick={() => setActive((p) => p < STEPS.length - 1 ? p + 1 : p)} className="w-full bg-slate-700 py-4 rounded-2xl font-black text-[11px] tracking-[0.2em] uppercase flex items-center justify-center gap-3 active:scale-95 transition-all">
          Étape Suivante <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}