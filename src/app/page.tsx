"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion"; // Pour les gestes et animations fluides
import { supabase } from "../../lib/supabaseClient";

/* ---------------- COMPOSANTS ---------------- */

function Gauge({ label, value, max, type }: { label: string, value: number, max: number, type: 'IBU' | 'EBC' }) {
  const percent = Math.min(Math.max((value / max) * 100, 2), 98); 
  const gradient = type === 'EBC' 
    ? "linear-gradient(to right, #F5F75D, #F2C70A, #BF7506, #8C4B02, #592801, #260C00)" 
    : "linear-gradient(to right, #000, #d4af37)";

  return (
    <div className="mb-3">
      <div className="flex justify-between items-end mb-0.5">
        <span className="text-[8px] font-black uppercase tracking-widest text-[#6b6b73]">{label}</span>
        <span className="text-xs font-black italic text-white">{value}</span>
      </div>
      <div className="relative h-1.5 w-full bg-[#111113] rounded-full overflow-hidden">
        <div className="absolute inset-0" style={{ background: gradient }} />
        <div className="absolute top-0 bottom-0 w-1 bg-black z-10" style={{ left: `${percent}%` }} />
      </div>
    </div>
  );
}

function Timer({ minutes }: { minutes: number }) {
  const [time, setTime] = useState(minutes * 60);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    let i: any;
    if (running && time > 0) i = setInterval(() => setTime((t) => t - 1), 1000);
    return () => clearInterval(i);
  }, [running, time]);

  const format = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec < 10 ? "0" : ""}${sec}`;
  };

  return (
    <div className="flex items-center justify-between bg-black p-3 border border-[#d4af37]/50 rounded mt-4 w-full max-w-xs mx-auto">
      <div className="text-3xl font-mono text-white font-black">{format(time)}</div>
      <div className="flex gap-3">
        <button className={`px-4 py-2 font-black text-[10px] rounded ${running ? 'bg-red-900 text-white' : 'bg-[#d4af37] text-black'}`} onClick={() => setRunning(!running)}>
          {running ? "STOP" : "START"}
        </button>
        <button className="text-[#6b6b73] text-[10px] font-black" onClick={() => { setTime(minutes * 60); setRunning(false); }}>RESET</button>
      </div>
    </div>
  );
}

/* ---------------- LOGIQUE ÉTAPES ---------------- */

function buildSteps(recipe: any) {
  const d = recipe.data || {};
  const stats = d.stats_json || {};
  const steps = d.steps_json || [];
  const mash = steps.find((s: any) => s.isMashBlock);
  
  const allHops = steps.flatMap((s: any) => s.ingredients || [])
    .filter((i: any) => (i.type || "").toUpperCase().includes("HOUBLON"))
    .map((h: any) => ({
      name: h.name, 
      qty: h.qty || h.amount || "0", 
      unit: h.unit || "g",
      time: parseInt(h.durationInMinutes) || 60
    })).sort((a: any, b: any) => b.time - a.time);

  return [
    { name: "Concassage", desc: "Malt à préparer", content: (
        <div className="grid grid-cols-1 gap-2">
          {mash?.ingredients?.map((m: any, i: number) => (
            <div key={i} className="flex justify-between bg-white/5 p-2 rounded text-[11px] uppercase font-bold border-l border-[#d4af37]">
              <span>{m.name}</span> <span className="text-[#d4af37]">{m.qty} KG</span>
            </div>
          ))}
        </div>
    )},
    { name: "Empâtage", desc: `${stats.waterE}L d'eau`, timer: mash?.paliers?.reduce((a: number, p: any) => a + p.duration, 0), content: (
        <div className="space-y-2">
          {mash?.paliers?.map((p: any, i: number) => (
            <div key={i} className="flex justify-between p-2 bg-white/5 text-xs font-bold border-r border-[#d4af37]">
              <span>{p.temp}°C</span> <span>{p.duration} MIN</span>
            </div>
          ))}
        </div>
    )},
    { name: "Filtration", desc: "Clarification", content: <p className="text-[10px] italic text-gray-500 uppercase tracking-tighter">Recycler jusqu'à limpidité.</p> },
    { name: "Rinçage", desc: "Lavage des sucres", content: <div className="text-2xl font-black text-[#d4af37] text-center border-2 border-dashed border-white/10 p-4">{stats.waterR}L @ 78°C</div> },
    { name: "Ébullition", desc: "Timeline Houblons", timer: 60, content: (
        <div className="space-y-1">
          {allHops.map((h: any, idx: number) => (
            <div key={idx} className="flex justify-between items-center p-2 bg-white/5 rounded">
              <span className="text-[10px] font-black italic uppercase text-white">T-{h.time}' {h.name}</span>
              <span className="text-xs font-black text-[#d4af37]">{h.qty}{h.unit}</span>
            </div>
          ))}
        </div>
    )},
    { name: "Refroidissement", desc: "Cible < 25°C", content: <p className="text-[10px] text-center text-gray-500 uppercase">Attention au choc thermique.</p> },
    { name: "Fermentation", desc: "Mise en cuve", content: (
        <div className="space-y-2">
          <div className="bg-[#d4af37]/10 p-3 text-center border border-[#d4af37]/30 text-[#d4af37] font-black text-sm uppercase italic">~ 21 Jours en cave</div>
          {steps.flatMap((s: any) => s.ingredients || []).filter((i: any) => (i.type || "").toUpperCase().includes("LEVURE")).map((l: any, idx: number) => (
            <div key={idx} className="p-2 bg-white/5 text-[10px] font-bold uppercase text-center border border-white/10">{l.name}</div>
          ))}
        </div>
    )},
  ];
}

/* ---------------- JOG DIAL ---------------- */

// Composant pour l'étape dans la roue
function JogStep({ step, index, isActive, totalSteps }: { step: any, index: number, isActive: boolean, totalSteps: number }) {
  // Calcul de l'angle pour la rotation (pour donner la courbure)
  // L'étape active est à 0°, les autres tournent autour.
  const angle = (index - totalSteps / 2) * (180 / totalSteps); 
  // L'étape active est au centre (index - indexActuel = 0), pas de rotation.
  // Les autres sont inclinées.
  
  return (
    <motion.div
      className="absolute flex flex-col items-center justify-center p-3 text-center cursor-pointer transition-all duration-300"
      style={{
        width: '120px', 
        height: '100px',
        // Transformation de base pour les gestes et le positionnement
        translateX: `${(index - (totalSteps / 2)) * 140}px`,
        transformOrigin: '50% 120%', // Point de pivot sous le texte pour l'arc
      }}
      animate={{
        scale: isActive ? 1.3 : 0.8, // Agrandissement Focus
        rotate: isActive ? 0 : angle / 2, // Rotation légère pour l'arc
        opacity: isActive ? 1 : 0.3, // Effacement des inactifs
        y: isActive ? -10 : 0, // Léger soulèvement
      }}
    >
      <div className={`text-[11px] font-black uppercase italic ${isActive ? 'text-[#d4af37]' : 'text-[#6b6b73]'}`}>
        Step {index + 1}
      </div>
      <div className={`text-sm font-black uppercase italic leading-tight ${isActive ? 'text-white' : 'text-gray-700'}`}>
        {step.name}
      </div>
    </motion.div>
  );
}

// Le conteneur Jog Dial principal
function JogDial({ steps, activeStep, onStepChange }: { steps: any[], activeStep: number, onStepChange: (step: number) => void }) {
  const totalSteps = steps.length;
  // Offset pour centrer le conteneur
  const xOffset = - (activeStep - totalSteps / 2) * 140;

  return (
    <div className="relative w-full h-[120px] overflow-hidden flex items-center justify-center border-b border-white/5 bg-black">
      {/* Container mobile pour le swipe */}
      <motion.div
        className="flex h-full"
        animate={{ x: xOffset }}
        // Interaction par gestes Framer Motion
        drag="x"
        dragConstraints={{ left: - (totalSteps - 1) * 140, right: 0 }}
        onDragEnd={(_, info) => {
          // Calculer le changement d'étape selon la force du swipe
          const threshold = 70; // Sensibilité
          if (info.offset.x < -threshold && activeStep < totalSteps - 1) {
            onStepChange(activeStep + 1);
          } else if (info.offset.x > threshold && activeStep > 0) {
            onStepChange(activeStep - 1);
          }
        }}
      >
        {steps.map((s, i) => (
          <JogStep key={i} step={s} index={i} isActive={i === activeStep} totalSteps={totalSteps} />
        ))}
      </motion.div>
    </div>
  );
}

/* ---------------- APP MAIN ---------------- */

export default function BrewApp() {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [step, setStep] = useState(0);

  useEffect(() => { 
    const load = async () => {
      const { data } = await supabase.from("recipes").select("*").order("created_at", { ascending: false });
      if (data) setRecipes(data);
    };
    load(); 
  }, []);

  // Correctif Reset Step : Réinitialiser l'étape quand on change de recette
  const handleRecipeSelect = (recipe: any) => {
    setStep(0); 
    setSelected(recipe);
  };

  if (!selected) {
    return (
      <div className="min-h-screen bg-[#0b0b0c] text-white p-6 flex flex-col items-center justify-center font-sans">
        <h1 className="text-2xl font-black italic uppercase tracking-widest mb-8 border-b-2 border-[#d4af37]">Brew Station</h1>
        <div className="w-full max-w-xs space-y-2">
            {recipes.map((r) => (
            <button key={r.id} onClick={() => handleRecipeSelect(r)} className="w-full p-4 bg-[#111113] border border-white/5 text-left text-xs font-black uppercase italic hover:border-[#d4af37] transition-all">
                {r.name}
            </button>
            ))}
        </div>
      </div>
    );
  }

  const steps = buildSteps(selected);
  const current = steps[step];
  const ibu = selected.data?.stats_json?.ibu || 0;
  const ebc = selected.data?.stats_json?.ebc || 0;

  return (
    <div className="h-screen bg-[#0b0b0c] text-white flex flex-col md:flex-row overflow-hidden font-sans italic-none">
      
      {/* SIDEBAR (Drawer sur mobile) */}
      <div className="hidden md:flex md:flex-col fixed md:relative z-50 w-64 md:w-80 h-full bg-black border-r border-white/5 p-6 transition-transform duration-300 translate-x-0">
        <div className="mb-6 flex justify-between items-center">
            <h2 className="text-xl font-black uppercase italic text-white tracking-tighter">{selected.name}</h2>
            <div className="h-0.5 w-6 bg-[#d4af37]"></div>
        </div>
        <Gauge label="IBU" value={ibu} max={100} type="IBU" />
        <Gauge label="EBC" value={ebc} max={80} type="EBC" />
        <div className="flex-1 mt-6 space-y-1 overflow-y-auto">
          {steps.map((s, i) => (
              <div key={i} className={`p-2 text-[9px] font-black uppercase border-l-2 transition-all ${i === step ? "border-[#d4af37] text-[#d4af37] bg-white/5 italic" : "border-transparent text-gray-700"}`}>
              {i + 1}. {s.name}
              </div>
          ))}
        </div>
        <button className="mt-4 text-[9px] font-black uppercase text-red-500 hover:text-white" onClick={() => setSelected(null)}>✕ Quitter</button>
      </div>

      {/* MAIN */}
      <div className="flex-1 flex flex-col h-full relative">
        
        {/* JOG DIAL HEADER (Le génie est là !) */}
        <JogDial steps={steps} activeStep={step} onStepChange={setStep} />

        {/* CONTENU (Scrollable) */}
        <div className="flex-1 p-4 md:p-12 overflow-y-auto pb-32">
            <div className="max-w-xl mx-auto">
                <p className="text-[#6b6b73] font-bold uppercase text-[8px] tracking-widest text-center mb-6">{current.desc}</p>
                {current.content}
                {current.timer && <Timer minutes={current.timer} />}
            </div>
        </div>

        {/* NAVIGATION BASSE (Fixe) */}
        <div className="absolute bottom-0 inset-x-0 p-4 md:p-8 bg-gradient-to-t from-black via-black to-transparent pointer-events-none">
            <div className="flex gap-2 max-w-xl mx-auto pointer-events-auto">
                {step > 0 && (
                    <button className="flex-1 py-4 bg-white/5 border border-white/10 font-black uppercase italic text-[10px]" onClick={() => setStep((s) => s - 1)}>RETOUR</button>
                )}
                <button className="flex-[2] py-4 bg-[#d4af37] text-black font-black uppercase italic text-[10px]" onClick={() => step === steps.length - 1 ? setSelected(null) : setStep((s) => s + 1)}>
                  {step === steps.length - 1 ? "FINIR BRASSIN 🍻" : "ÉTAPE SUIVANTE"}
                </button>
            </div>
        </div>

      </div>
    </div>
  );
}