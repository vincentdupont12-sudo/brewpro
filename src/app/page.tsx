"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { supabase } from "../../lib/supabaseClient";

/* ---------------- COMPOSANTS ---------------- */

function Gauge({ label, value, max, type }: { label: string, value: number, max: number, type: 'IBU' | 'EBC' }) {
  const percent = Math.min(Math.max((value / max) * 100, 2), 98); 
  const gradient = type === 'EBC' 
    ? "linear-gradient(to right, #F5F75D, #F2C70A, #BF7506, #8C4B02, #592801, #260C00)" 
    : "linear-gradient(to right, #000, #d4af37)";

  return (
    <div className="flex-1 px-2">
      <div className="flex justify-between items-end mb-1">
        <span className="text-[8px] font-black uppercase tracking-tighter text-[#6b6b73]">{label}</span>
        <span className="text-[10px] font-black text-white">{value}</span>
      </div>
      <div className="relative h-1 w-full bg-white/5 rounded-full overflow-hidden">
        <div className="absolute inset-0" style={{ background: gradient }} />
        <motion.div animate={{ left: `${percent}%` }} className="absolute top-0 bottom-0 w-0.5 bg-black z-10" />
      </div>
    </div>
  );
}

function Timer({ minutes }: { minutes: number }) {
  const [time, setTime] = useState(minutes * 60);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    let id: any;
    if (running && time > 0) id = setInterval(() => setTime((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [running, time]);

  const format = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec < 10 ? "0" : ""}${sec}`;
  };

  return (
    <div className="flex items-center justify-between bg-black p-4 border border-[#d4af37]/20 rounded-2xl mt-6 w-full max-w-xs mx-auto shadow-xl">
      <div className="text-4xl font-mono text-white font-black tracking-tighter">{format(time)}</div>
      <button 
          className={`w-12 h-12 flex items-center justify-center rounded-full font-black text-xl ${running ? 'bg-red-950 text-red-500 border border-red-500/30' : 'bg-[#d4af37] text-black'}`} 
          onClick={() => setRunning(!running)}
      >
        {running ? "■" : "▶"}
      </button>
    </div>
  );
}

/* ---------------- JOG DIAL (LA ROUE) ---------------- */

function JogDial({ steps, activeStep, onStepChange }: { steps: any[], activeStep: number, onStepChange: (step: number) => void }) {
  const stepWidth = 140; // Largeur pour éviter les chevauchements
  
  return (
    <div className="relative w-full h-32 overflow-hidden bg-[#0b0b0c] border-b border-white/5 flex items-center justify-center">
      {/* Repère central haute visibilité */}
      <div className="absolute top-0 z-30 w-10 h-1 bg-[#d4af37] rounded-b-full shadow-[0_0_15px_rgba(212,175,55,0.6)]" />

      <motion.div
        className="flex cursor-grab active:cursor-grabbing"
        drag="x"
        // On élargit la zone de drag pour ne jamais bloquer
        dragConstraints={{ left: -(steps.length - 1) * stepWidth, right: 0 }}
        dragElastic={0.05}
        animate={{ x: -activeStep * stepWidth }}
        transition={{ type: "spring", stiffness: 200, damping: 25 }}
        onDragEnd={(_, info) => {
          const swipe = info.offset.x;
          if (swipe < -40 && activeStep < steps.length - 1) onStepChange(activeStep + 1);
          else if (swipe > 40 && activeStep > 0) onStepChange(activeStep - 1);
        }}
      >
        {/* On centre le premier élément au milieu de l'écran */}
        <div style={{ width: "50vw", flexShrink: 0 }} /> 
        
        {steps.map((s, i) => {
          const isActive = i === activeStep;
          return (
            <motion.div
              key={i}
              onClick={() => onStepChange(i)}
              className="flex flex-col items-center justify-center shrink-0"
              style={{ width: stepWidth }}
              animate={{ 
                scale: isActive ? 1.4 : 0.7,
                opacity: isActive ? 1 : 0.15,
                y: isActive ? 0 : 10
              }}
            >
              <span className={`text-[8px] font-black uppercase mb-1 tracking-widest ${isActive ? 'text-[#d4af37]' : 'text-gray-600'}`}>
                {isActive ? 'STEP ' + (i+1) : i+1}
              </span>
              <span className={`text-base font-black uppercase tracking-tighter text-center px-2 ${isActive ? 'text-white' : 'text-gray-800'}`}>
                {s.name}
              </span>
              {isActive && (
                <motion.div layoutId="activeBar" className="w-6 h-1 bg-[#d4af37] mt-3 rounded-full shadow-[0_0_10px_#d4af37]" />
              )}
            </motion.div>
          );
        })}

        <div style={{ width: "50vw", flexShrink: 0 }} />
      </motion.div>

      {/* Masques de côté */}
      <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-black to-transparent z-20 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-black to-transparent z-20 pointer-events-none" />
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

  if (!selected) {
    return (
      <div className="min-h-screen bg-[#0b0b0c] text-white p-6 flex flex-col items-center justify-center">
        <h1 className="text-xl font-black italic uppercase tracking-widest mb-12 text-[#d4af37]">Brew Station</h1>
        <div className="w-full max-w-xs space-y-3">
            {recipes.map((r) => (
            <button key={r.id} onClick={() => { setStep(0); setSelected(r); }} className="w-full p-6 bg-black border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-[#d4af37] transition-all">
                {r.name}
            </button>
            ))}
        </div>
      </div>
    );
  }

  // Extraction logic (Identique)
  const stats = selected.data?.stats_json || {};
  const rawSteps = selected.data?.steps_json || [];
  const mash = rawSteps.find((s: any) => s.isMashBlock);
  const hops = rawSteps.flatMap((s: any) => s.ingredients || [])
    .filter((i: any) => (i.type || "").toUpperCase().includes("HOUBLON"))
    .map((h: any) => ({
      name: h.name, qty: h.qty || h.amount || "0", unit: h.unit || "g",
      time: parseInt(h.durationInMinutes) || 60
    })).sort((a: any, b: any) => b.time - a.time);

  const steps = [
    { name: "Grain", desc: "Concassage", content: (
        <div className="space-y-2">
          {mash?.ingredients?.map((m: any, i: number) => (
            <div key={i} className="flex justify-between bg-white/5 p-4 rounded-xl border-l-2 border-[#d4af37]">
              <span className="text-xs font-black uppercase text-gray-300">{m.name}</span>
              <span className="text-xs font-black text-[#d4af37]">{m.qty} KG</span>
            </div>
          ))}
        </div>
    )},
    { name: "Cuve", desc: `Empâtage (${stats.waterE}L)`, timer: mash?.paliers?.reduce((a: number, p: any) => a + p.duration, 0), content: (
        <div className="grid grid-cols-1 gap-2">
          {mash?.paliers?.map((p: any, i: number) => (
            <div key={i} className="flex justify-between p-4 bg-white/5 rounded-xl border border-white/5">
              <span className="font-black text-[#d4af37]">{p.temp}°C</span>
              <span className="text-xs font-bold text-gray-400">{p.duration} MIN</span>
            </div>
          ))}
        </div>
    )},
    { name: "Filtre", desc: "Clarification", content: <div className="p-8 border border-dashed border-white/10 rounded-2xl text-center text-[10px] text-gray-500 uppercase italic">Recycler le moût</div> },
    { name: "Rinçage", desc: "Extraction", content: <div className="bg-[#111113] p-8 rounded-3xl border border-white/5 text-center"><div className="text-[10px] text-[#6b6b73] font-black mb-2 uppercase">Eau (78°C)</div><div className="text-5xl font-black text-[#d4af37] italic">{stats.waterR}L</div></div> },
    { name: "Ébullition", desc: "Houblonnage", timer: 60, content: (
        <div className="space-y-2">
          {hops.map((h: any, idx: number) => (
            <div key={idx} className="flex justify-between items-center p-4 bg-white/5 rounded-xl border-b border-white/5">
              <div className="flex flex-col"><span className="text-[10px] text-[#d4af37] font-black">T-{h.time}'</span><span className="text-xs font-black uppercase text-white">{h.name}</span></div>
              <span className="text-sm font-black text-[#d4af37]">{h.qty}{h.unit}</span>
            </div>
          ))}
        </div>
    )},
    { name: "Froid", desc: "Refroidissement", content: <div className="p-10 bg-blue-900/10 border border-blue-500/20 rounded-3xl text-center"><span className="text-xs font-black text-blue-400 uppercase italic underline decoration-blue-500/50">Cible &lt; 25°C</span></div> },
    { name: "Cave", desc: "Fermentation", content: (
        <div className="space-y-4">
          <div className="p-6 bg-[#d4af37] text-black rounded-2xl text-center font-black uppercase text-sm italic shadow-lg shadow-[#d4af37]/20">~ 21 JOURS</div>
          {rawSteps.flatMap((s: any) => s.ingredients || []).filter((i: any) => (i.type || "").toUpperCase().includes("LEVURE")).map((l: any, idx: number) => (
            <div key={idx} className="p-4 bg-white/5 rounded-xl text-[10px] font-bold uppercase text-center border border-white/10">{l.name}</div>
          ))}
        </div>
    )},
  ];

  const current = steps[step];

  return (
    <div className="h-screen bg-black text-white flex flex-col overflow-hidden font-sans">
      
      <JogDial steps={steps} activeStep={step} onStepChange={setStep} />

      <div className="px-6 py-5 bg-[#0b0b0c] flex border-b border-white/5">
        <Gauge label="IBU (AMERTUME)" value={stats.ibu || 0} max={100} type="IBU" />
        <Gauge label="EBC (COULEUR)" value={stats.ebc || 0} max={80} type="EBC" />
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-10 pb-40">
          <div className="max-w-md mx-auto">
            <div className="mb-10 text-center">
                <h2 className="text-4xl font-black italic uppercase tracking-tighter">{current.name}</h2>
                <p className="text-[10px] font-black text-[#d4af37] uppercase tracking-[0.4em] mt-2">{current.desc}</p>
            </div>
            {current.content}
            {current.timer && <Timer minutes={current.timer} />}
          </div>
      </div>

      <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black via-black/95 to-transparent">
          <div className="flex gap-3 max-w-md mx-auto">
              <button className="flex-1 py-5 bg-white/5 border border-white/10 rounded-2xl font-black uppercase italic text-[10px] tracking-widest shadow-inner" onClick={() => setSelected(null)}>RECETTES</button>
              <button className="flex-[2] py-5 bg-[#d4af37] text-black rounded-2xl font-black uppercase italic text-[10px] tracking-widest shadow-[0_10px_30px_rgba(212,175,55,0.3)]" onClick={() => step < steps.length - 1 ? setStep(s => s + 1) : setSelected(null)}>
                {step === steps.length - 1 ? "FINIR 🍻" : "SUIVANT"}
              </button>
          </div>
      </div>
    </div>
  );
}