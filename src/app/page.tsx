"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

/* ---------------- COMPOSANTS VISUELS ---------------- */

function Gauge({ label, value, max, type }: { label: string, value: number, max: number, type: 'IBU' | 'EBC' }) {
  const percent = Math.min(Math.max((value / max) * 100, 2), 98); 
  const gradient = type === 'EBC' 
    ? "linear-gradient(to right, #F5F75D, #F2C70A, #BF7506, #8C4B02, #592801, #260C00)" 
    : "linear-gradient(to right, #000, #d4af37)";

  return (
    <div className="mb-8">
      <div className="flex justify-between items-end mb-2">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#6b6b73]">{label}</span>
        <span className="text-xl font-black italic text-white leading-none">{value}</span>
      </div>
      <div className="relative h-4 w-full bg-[#111113] border border-white/5 rounded-sm overflow-hidden shadow-inner">
        <div className="absolute inset-0" style={{ background: gradient }} />
        <div 
          className="absolute top-0 bottom-0 w-1.5 bg-black z-10 shadow-[0_0_10px_rgba(0,0,0,0.8)]"
          style={{ left: `${percent}%`, transform: 'translateX(-50%)' }}
        />
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
    <div className="flex items-center gap-6 mt-8 bg-black p-6 border border-[#d4af37]/30 inline-flex">
      <div className="text-5xl font-mono text-white font-black tracking-tighter">{format(time)}</div>
      <div className="flex gap-2">
        <button className={`w-12 h-12 font-black border ${running ? 'border-red-600 text-red-600' : 'bg-[#d4af37] text-black border-[#d4af37]'}`} onClick={() => setRunning(!running)}>
          {running ? "❚❚" : "▶"}
        </button>
        <button className="text-[#6b6b73] text-[10px] uppercase font-black px-2" onClick={() => { setTime(minutes * 60); setRunning(false); }}>↺</button>
      </div>
    </div>
  );
}

/* ---------------- BUILD STEPS ---------------- */
function buildSteps(recipe: any) {
  const d = recipe.data || {};
  const stats = d.stats_json || {};
  const steps = d.steps_json || [];
  const mash = steps.find((s: any) => s.isMashBlock);
  
  const allHops = steps.flatMap((s: any) => s.ingredients || [])
    .filter((i: any) => (i.type || "").toUpperCase().includes("HOUBLON"))
    .map((h: any) => ({
      name: h.name, qty: h.qty || h.amount || "?", unit: h.unit || "g",
      time: parseInt(h.durationInMinutes) || 60
    })).sort((a: any, b: any) => b.time - a.time);

  return [
    {
      name: "Concassage",
      desc: "Préparation des malts.",
      content: (
        <div className="space-y-2 max-w-md">
          {mash?.ingredients?.map((m: any, i: number) => (
            <div key={i} className="flex justify-between border-b border-white/5 pb-2 text-sm">
              <span className="font-bold uppercase text-gray-400">{m.name}</span>
              <span className="font-black text-[#d4af37]">{m.qty} KG</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      name: "Empâtage",
      desc: "Extraction des sucres.",
      timer: mash?.paliers?.reduce((a: number, p: any) => a + p.duration, 0),
      content: (
        <div className="space-y-3 max-w-md">
          <div className="text-[10px] font-black text-[#d4af37] uppercase tracking-widest">Volume : {stats.waterE} L</div>
          {mash?.paliers?.map((p: any, i: number) => (
            <div key={i} className="flex justify-between p-3 bg-[#111113] border-l-2 border-[#d4af37] font-bold text-sm">
              <span>{p.temp}°C</span> <span>{p.duration} MIN</span>
            </div>
          ))}
        </div>
      ),
    },
    {
        name: "Filtration",
        desc: "Clarification du moût.",
        content: <p className="text-sm text-gray-400 leading-relaxed max-w-md italic">Recycler le moût jusqu'à ce qu'il soit limpide avant de lancer le rinçage.</p>
    },
    {
      name: "Rinçage",
      desc: "Lavage des drêches.",
      content: (
        <div className="p-6 border border-[#d4af37] bg-black inline-block">
            <div className="text-4xl font-black text-white">{stats.waterR}L @ 78°C</div>
        </div>
      ),
    },
    {
      name: "Ébullition",
      desc: "Houblonnage.",
      timer: 60,
      content: (
        <div className="space-y-3 max-w-md">
          {allHops.map((i: any, idx: number) => (
            <div key={idx} className="flex justify-between items-center p-4 bg-[#111113] border border-white/5">
              <div className="text-xs font-black uppercase italic">{i.name} <span className="text-[#d4af37] ml-2">T-{i.time}'</span></div>
              <div className="font-mono font-black text-[#d4af37]">{i.qty}{i.unit}</div>
            </div>
          ))}
        </div>
      ),
    },
    {
        name: "Refroidissement",
        desc: "Choc thermique.",
        content: <p className="text-sm text-gray-400 leading-relaxed max-w-md italic">Refroidir le moût le plus rapidement possible vers 20°C via serpentin ou échangeur.</p>
    },
    {
        name: "Fermentation",
        desc: "Travail des levures.",
        content: (
          <div className="space-y-4 max-w-md">
              <div className="p-4 bg-[#111113] border border-white/5 text-sm">
                <div className="text-[#d4af37] font-black uppercase text-[10px] mb-1">Durée estimée</div>
                <div className="text-white font-black italic uppercase text-lg">21 JOURS (Minimum)</div>
              </div>
              {steps.flatMap((s: any) => s.ingredients || [])
                  .filter((i: any) => (i.type || "").toUpperCase().includes("LEVURE"))
                  .map((l: any, idx: number) => (
                      <div key={idx} className="p-3 border-l-2 border-[#d4af37] text-sm font-bold uppercase">{l.name}</div>
                  ))
              }
          </div>
        )
      },
  ];
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
      <div className="min-h-screen bg-[#0b0b0c] text-white p-10 flex flex-col items-center justify-center">
        <h1 className="text-4xl font-black italic uppercase tracking-tighter mb-10 border-b-2 border-[#d4af37] pb-2">Brew Station</h1>
        <div className="w-full max-w-sm space-y-2">
            {recipes.map((r) => (
            <div key={r.id} onClick={() => setSelected(r)} className="p-4 bg-black border border-white/5 cursor-pointer hover:border-[#d4af37] flex justify-between items-center transition-all">
                <h3 className="text-sm font-black uppercase italic">{r.name}</h3>
                <span className="text-[#d4af37]">→</span>
            </div>
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
    <div className="min-h-screen bg-[#0b0b0c] text-white flex flex-col md:flex-row font-sans overflow-hidden">
      
      {/* SIDEBAR (Géniale) */}
      <div className="w-full md:w-80 border-r border-white/5 p-8 flex flex-col bg-black md:h-screen sticky top-0">
        <div className="mb-10">
            <h2 className="text-2xl font-black uppercase italic leading-none text-white tracking-tighter">{selected.name}</h2>
            <div className="h-0.5 w-8 bg-[#d4af37] mt-3"></div>
        </div>
        <div className="space-y-2">
            <Gauge label="IBU (Amertume)" value={ibu} max={100} type="IBU" />
            <Gauge label="EBC (Couleur)" value={ebc} max={80} type="EBC" />
        </div>
        <div className="flex-1 mt-8 space-y-1 overflow-y-auto pr-2">
          {steps.map((s, i) => (
              <div key={i} className={`p-3 text-[10px] font-black uppercase tracking-widest border-l-2 transition-all ${
              i === step ? "border-[#d4af37] text-[#d4af37] bg-white/5 italic" : "border-transparent text-gray-700"
              }`}>
              {i + 1}. {s.name}
              </div>
          ))}
        </div>
        <button className="mt-6 text-[9px] font-black uppercase text-[#6b6b73] hover:text-white" onClick={() => {setSelected(null); setStep(0);}}>✕ Quitter</button>
      </div>

      {/* MAIN (Réajusté) */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <div className="flex-1 p-8 md:p-16 overflow-y-auto pb-40">
            <div className="max-w-xl">
                <div className="text-[10px] font-black text-[#d4af37] uppercase tracking-[0.4em] mb-2 italic">Phase {step + 1} / {steps.length}</div>
                <h1 className="text-5xl font-black italic uppercase tracking-tighter leading-none mb-2">{current.name}</h1>
                <p className="text-[#6b6b73] font-bold uppercase text-[10px] tracking-widest mb-10">{current.desc}</p>
                <div className="mt-8">{current.content}</div>
                {current.timer && <Timer minutes={current.timer} />}
            </div>
        </div>

        {/* NAVIGATION BASSE */}
        <div className="p-6 md:p-8 border-t border-white/5 bg-black/90 backdrop-blur sticky bottom-0">
            <div className="flex gap-4 max-w-xl mx-auto">
                <button disabled={step === 0} className={`flex-1 p-5 font-black uppercase italic text-[10px] tracking-widest border border-white/10 ${step === 0 ? 'opacity-0' : 'bg-white/5 text-white'}`} onClick={() => setStep((s) => s - 1)}>Précédent</button>
                <button className="flex-[2] p-5 font-black uppercase italic text-[10px] tracking-widest bg-[#d4af37] text-black border border-[#d4af37]" onClick={() => step === steps.length - 1 ? setSelected(null) : setStep((s) => s + 1)}>
                  {step === steps.length - 1 ? "Terminer 🍻" : "Suivant"}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
}