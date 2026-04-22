"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "../../lib/supabaseClient";

/* ---------------- TYPES ---------------- */
// On définit strictement ce qu'on attend pour éviter les erreurs de build
interface StepIngredient {
  name?: string;
  qty?: string | number;
  amount?: string | number;
  unit?: string;
  type?: string;
  durationInMinutes?: string | number;
}

interface BeerStep {
  name: string;
  isMashBlock?: boolean;
  ingredients?: StepIngredient[];
  paliers?: Array<{ temp: number; duration: number }>;
}

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
      <div className="relative h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
        <div className="absolute inset-0" style={{ background: gradient }} />
        <motion.div 
          animate={{ left: `${percent}%` }}
          className="absolute top-0 bottom-0 w-0.5 bg-black z-10" 
        />
      </div>
    </div>
  );
}

function Timer({ minutes }: { minutes: number }) {
  const [time, setTime] = useState(minutes * 60);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    let intervalId: any;
    if (running && time > 0) {
      intervalId = setInterval(() => setTime((t) => t - 1), 1000);
    }
    return () => clearInterval(intervalId);
  }, [running, time]);

  const format = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec < 10 ? "0" : ""}${sec}`;
  };

  return (
    <div className="flex items-center justify-between bg-black p-4 border border-[#d4af37]/30 rounded-xl mt-6 w-full max-w-xs mx-auto">
      <div className="text-4xl font-mono text-white font-black">{format(time)}</div>
      <button 
          className={`w-12 h-12 flex items-center justify-center rounded-full font-black text-[10px] ${running ? 'bg-red-950 text-red-500' : 'bg-[#d4af37] text-black'}`} 
          onClick={() => setRunning(!running)}
      >
        {running ? "■" : "▶"}
      </button>
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
        <h1 className="text-xl font-black italic uppercase tracking-[0.3em] mb-12 text-[#d4af37]">Brew Station</h1>
        <div className="w-full max-w-xs space-y-3">
            {recipes?.map((r) => (
            <button key={r.id} onClick={() => { setStep(0); setSelected(r); }} className="w-full p-5 bg-black border border-white/5 rounded-xl text-left text-[10px] font-black uppercase tracking-widest">
                {r.name}
            </button>
            ))}
        </div>
      </div>
    );
  }

  // Extraction sécurisée
  const stats = selected?.data?.stats_json || {};
  const rawSteps: BeerStep[] = selected?.data?.steps_json || [];
  const mash = rawSteps.find(s => s.isMashBlock);
  const hops = rawSteps.flatMap(s => s.ingredients || [])
    .filter(i => i?.type?.toUpperCase().includes("HOUBLON"))
    .map(h => ({
      name: h.name || "Inconnu",
      qty: h.qty || h.amount || "0",
      unit: h.unit || "g",
      time: parseInt(String(h.durationInMinutes)) || 60
    })).sort((a, b) => b.time - a.time);

  const steps = [
    { name: "Grain", desc: "Concassage", content: (
        <div className="space-y-2">
          {mash?.ingredients?.map((m, i) => (
            <div key={i} className="flex justify-between bg-white/5 p-3 rounded-lg border-l-2 border-[#d4af37]">
              <span className="text-xs font-black uppercase text-gray-300">{m.name}</span>
              <span className="text-xs font-black text-[#d4af37]">{m.qty} KG</span>
            </div>
          ))}
        </div>
    )},
    { name: "Cuve", desc: `Empâtage (${stats.waterE || 0}L)`, timer: mash?.paliers?.reduce((a, p) => a + p.duration, 0), content: (
        <div className="grid grid-cols-1 gap-2">
          {mash?.paliers?.map((p, i) => (
            <div key={i} className="flex justify-between p-3 bg-white/5 rounded-lg">
              <span className="font-black text-[#d4af37]">{p.temp}°C</span>
              <span className="text-xs font-bold text-gray-400">{p.duration} MIN</span>
            </div>
          ))}
        </div>
    )},
    { name: "Filtre", desc: "Clarification", content: <div className="p-8 border border-dashed border-white/10 rounded-2xl text-center text-[10px] text-gray-500 uppercase">Recycler le moût</div> },
    { name: "Rinçage", desc: "Extraction Finale", content: <div className="bg-[#111113] p-6 rounded-2xl text-center"><div className="text-[10px] text-[#6b6b73] font-black mb-2 uppercase tracking-widest">Eau (78°C)</div><div className="text-4xl font-black text-[#d4af37] italic">{stats.waterR || 0}L</div></div> },
    { name: "Hops", desc: "Ébullition", timer: 60, content: (
        <div className="space-y-2">
          {hops.map((h, idx) => (
            <div key={idx} className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
              <div className="flex flex-col"><span className="text-[9px] text-[#d4af37] font-black">T-{h.time}'</span><span className="text-xs font-black uppercase text-white">{h.name}</span></div>
              <span className="text-sm font-black text-[#d4af37]">{h.qty}{h.unit}</span>
            </div>
          ))}
        </div>
    )},
    { name: "Froid", desc: "Refroidissement", content: <div className="p-8 bg-blue-900/10 border border-blue-500/20 rounded-2xl text-center text-xs font-black text-blue-400 uppercase italic">Cible &lt; 25°C</div> },
    { name: "Cave", desc: "Fermentation", content: (
        <div className="space-y-4">
          <div className="p-4 bg-[#d4af37] text-black rounded-xl text-center font-black uppercase text-sm italic">~ 21 Jours en cave</div>
          {rawSteps.flatMap(s => s.ingredients || []).filter(i => i?.type?.toUpperCase().includes("LEVURE")).map((l, idx) => (
            <div key={idx} className="p-3 bg-white/5 rounded-lg text-[10px] font-bold uppercase text-center border border-white/10">{l.name}</div>
          ))}
        </div>
    )},
  ];

  const current = steps[step] || steps[0];

  return (
    <div className="h-screen bg-black text-white flex flex-col overflow-hidden">
      
      {/* JOG DIAL */}
      <div className="relative w-full h-24 overflow-hidden bg-black border-b border-white/5 flex items-center justify-center">
        <motion.div
          className="flex px-[50%]"
          drag="x"
          dragConstraints={{ left: -(steps.length - 1) * 120, right: 0 }}
          animate={{ x: -step * 120 }}
          onDragEnd={(_, info) => {
            if (info.offset.x < -50 && step < steps.length - 1) setStep(step + 1);
            if (info.offset.x > 50 && step > 0) setStep(step - 1);
          }}
        >
          {steps.map((s, i) => (
            <motion.div
              key={i}
              className="flex flex-col items-center justify-center shrink-0 w-[120px]"
              animate={{ scale: i === step ? 1.2 : 0.7, opacity: i === step ? 1 : 0.25 }}
            >
              <span className="text-[8px] font-black text-[#d4af37] uppercase mb-1">Etape {i+1}</span>
              <span className="text-xs font-black uppercase text-white tracking-widest">{s.name}</span>
            </motion.div>
          ))}
        </motion.div>
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-black via-transparent to-black" />
      </div>

      {/* DASHBOARD */}
      <div className="px-6 py-4 bg-[#0b0b0c] flex border-b border-white/5">
        <Gauge label="IBU" value={stats.ibu || 0} max={100} type="IBU" />
        <Gauge label="EBC" value={stats.ebc || 0} max={80} type="EBC" />
      </div>

      {/* CONTENU */}
      <div className="flex-1 overflow-y-auto px-6 py-8 pb-36">
          <div className="max-w-md mx-auto">
            <div className="mb-8 text-center">
                <h2 className="text-3xl font-black italic uppercase tracking-tighter">{current.name}</h2>
                <p className="text-[9px] font-black text-[#6b6b73] uppercase tracking-[0.4em] mt-1">{current.desc}</p>
            </div>
            {current.content}
            {current.timer && <Timer minutes={current.timer} />}
          </div>
      </div>

      {/* NAV */}
      <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black via-black/90 to-transparent">
          <div className="flex gap-3 max-w-md mx-auto">
              <button className="flex-1 py-4 bg-white/5 border border-white/10 rounded-xl font-black uppercase italic text-[9px]" onClick={() => setSelected(null)}>RECETTES</button>
              <button className="flex-[2] py-4 bg-[#d4af37] text-black rounded-xl font-black uppercase italic text-[10px]" onClick={() => step < steps.length - 1 ? setStep(step + 1) : setSelected(null)}>
                {step === steps.length - 1 ? "TERMINER" : "SUIVANT"}
              </button>
          </div>
      </div>
    </div>
  );
}