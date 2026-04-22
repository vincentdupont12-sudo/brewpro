"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

/* ---------------- COMPOSANTS VISUELS ---------------- */

function Gauge({ label, value, max, type }: { label: string, value: number, max: number, type: 'IBU' | 'EBC' }) {
  const percent = Math.min(Math.max((value / max) * 100, 2), 98); 
  
  // EBC: Dégradé réaliste bière / IBU: Dégradé Gold technique
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
        <div 
          className="absolute inset-0 transition-all duration-1000"
          style={{ background: gradient }}
        />
        <div 
          className="absolute top-0 bottom-0 w-1.5 bg-black z-10 transition-all duration-1000 shadow-[0_0_10px_rgba(0,0,0,0.8)]"
          style={{ left: `${percent}%`, transform: 'translateX(-50%)' }}
        />
      </div>
    </div>
  );
}

/* ---------------- TIMER ---------------- */
function Timer({ minutes }: { minutes: number }) {
  const [time, setTime] = useState(minutes * 60);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    let i: any;
    if (running && time > 0) {
      i = setInterval(() => setTime((t) => t - 1), 1000);
    }
    return () => clearInterval(i);
  }, [running, time]);

  const format = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec < 10 ? "0" : ""}${sec}`;
  };

  return (
    <div className="flex items-center gap-6 mt-10 bg-black p-8 border-2 border-[#d4af37] shadow-[0_0_30px_rgba(212,175,55,0.1)]">
      <div className="text-7xl font-mono text-white font-black tracking-tighter">{format(time)}</div>
      <div className="flex flex-col gap-2">
        <button 
          className={`w-14 h-14 font-black transition-all border-2 ${running ? 'bg-transparent border-red-600 text-red-600' : 'bg-[#d4af37] border-[#d4af37] text-black'}`} 
          onClick={() => setRunning(!running)}
        >
          {running ? "❚❚" : "▶"}
        </button>
        <button className="bg-white/5 text-[#6b6b73] w-14 h-10 font-black text-[10px] uppercase hover:text-white" onClick={() => { setTime(minutes * 60); setRunning(false); }}>↺</button>
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
      name: h.name,
      qty: h.qty || h.amount || "?",
      unit: h.unit || "g",
      time: parseInt(h.durationInMinutes) || 60
    }))
    .sort((a: any, b: any) => b.time - a.time);

  return [
    {
      name: "Concassage",
      desc: "Préparation des grains.",
      content: (
        <div className="space-y-3">
          {mash?.ingredients?.map((m: any, i: number) => (
            <div key={i} className="flex justify-between border-b border-white/5 pb-4">
              <span className="font-black uppercase italic text-lg tracking-tighter text-gray-400">{m.name}</span>
              <span className="font-black text-xl text-[#d4af37]">{m.qty} KG</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      name: "Empâtage",
      desc: "Extraction par paliers.",
      timer: mash?.paliers?.reduce((a: number, p: any) => a + p.duration, 0),
      content: (
        <div className="space-y-4">
          <div className="text-[10px] font-black uppercase text-[#6b6b73] tracking-[0.3em] mb-4">Volume eau : {stats.waterE} L</div>
          {mash?.paliers?.map((p: any, i: number) => (
            <div key={i} className="flex justify-between p-5 bg-[#111113] border-r-4 border-[#d4af37] font-black italic text-xl uppercase">
              <span className="text-gray-500">{p.temp}°C</span> <span>{p.duration} MIN</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      name: "Rinçage",
      desc: "Lavage des drêches.",
      content: (
        <div className="p-12 border-4 border-[#d4af37] text-center bg-black">
            <div className="text-6xl font-black italic text-white">{stats.waterR}L</div>
            <div className="text-xs font-black text-[#d4af37] mt-2 uppercase tracking-[0.5em]">Eau de rinçage @ 78°C</div>
        </div>
      ),
    },
    {
      name: "Ébullition",
      desc: "Timeline des ajouts.",
      timer: 60,
      content: (
        <div className="space-y-4">
          {allHops.map((i: any, idx: number) => (
            <div key={idx} className="flex justify-between items-center p-6 bg-[#111113] border border-white/5">
              <div>
                <div className="text-[10px] text-[#d4af37] font-black uppercase mb-1">T - {i.time} MIN</div>
                <div className="font-black uppercase italic text-2xl tracking-tighter leading-tight">{i.name}</div>
              </div>
              <div className="text-3xl font-mono font-black text-[#d4af37]">{i.qty}<span className="text-xs text-white ml-1">{i.unit}</span></div>
            </div>
          ))}
        </div>
      ),
    },
    {
        name: "Fermentation",
        desc: "Mise en cuve.",
        content: (
          <div className="space-y-4">
              {steps.flatMap((s: any) => s.ingredients || [])
                  .filter((i: any) => (i.type || "").toUpperCase().includes("LEVURE"))
                  .map((l: any, idx: number) => (
                      <div key={idx} className="p-6 bg-[#111113] border border-white/5 flex justify-between items-center">
                        <span className="font-black uppercase italic text-xl tracking-tighter">{l.name}</span>
                        <span className="text-[#d4af37] font-black">LEVURE</span>
                      </div>
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
        <div className="text-[10px] font-black tracking-[1em] text-[#d4af37] mb-4 uppercase">System v2.0</div>
        <h1 className="text-6xl font-black italic uppercase tracking-tighter mb-16">Brew Station</h1>
        <div className="w-full max-w-md space-y-2">
            {recipes.map((r) => (
            <div key={r.id} onClick={() => setSelected(r)} className="p-6 bg-black border border-white/5 cursor-pointer hover:border-[#d4af37] transition-all group flex justify-between items-center">
                <h3 className="text-lg font-black uppercase italic group-hover:tracking-widest transition-all">{r.name}</h3>
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

      {/* SIDEBAR */}
      <div className="w-full md:w-80 border-r border-white/5 p-8 flex flex-col bg-black md:h-screen">
        <div className="mb-12">
            <h2 className="text-3xl font-black uppercase italic leading-none text-white tracking-tighter mb-1">{selected.name}</h2>
            <div className="h-1 w-12 bg-[#d4af37] mt-4"></div>
        </div>

        <div className="space-y-2">
            <Gauge label="IBU (Amertume)" value={ibu} max={100} type="IBU" />
            <Gauge label="EBC (Couleur)" value={ebc} max={80} type="EBC" />
        </div>

        <div className="flex-1 mt-10 space-y-1">
          {steps.map((s, i) => (
              <div key={i} className={`p-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-l-2 ${
              i === step ? "border-[#d4af37] text-[#d4af37] bg-white/5 italic" : "border-transparent text-gray-700"
              }`}>
              {i + 1}. {s.name}
              </div>
          ))}
        </div>

        <button className="mt-8 text-[9px] font-black uppercase text-[#6b6b73] hover:text-white" onClick={() => {setSelected(null); setStep(0);}}>
          ✕ Terminer session
        </button>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        <div className="flex-1 p-8 md:p-20 overflow-y-auto pb-40">
            <div className="max-w-2xl animate-in fade-in duration-500">
                <div className="text-[10px] font-black text-[#d4af37] uppercase tracking-[0.5em] mb-4">Phase {step + 1} / {steps.length}</div>
                <h1 className="text-8xl font-black italic uppercase tracking-tighter leading-none mb-6">{current.name}</h1>
                <p className="text-[#6b6b73] font-black uppercase text-xs tracking-[0.3em] mb-12 italic opacity-60">{current.desc}</p>
                
                <div className="mt-10">{current.content}</div>
                
                {current.timer && <Timer minutes={current.timer} />}
            </div>
        </div>

        {/* NAVIGATION BASSE FIXE */}
        <div className="p-8 md:p-12 border-t border-white/5 bg-black sticky bottom-0">
            <div className="flex gap-4 max-w-2xl mx-auto">
                <button 
                  disabled={step === 0}
                  className={`flex-1 p-6 font-black uppercase italic text-xs tracking-widest transition-all ${step === 0 ? 'opacity-0' : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'}`}
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                >
                  Précédent
                </button>
                
                <button 
                  className={`flex-[2] p-6 font-black uppercase italic text-xs tracking-widest transition-all border-2 ${
                    step === steps.length - 1 
                    ? "bg-white border-white text-black" 
                    : "bg-[#d4af37] border-[#d4af37] text-black hover:bg-white hover:border-white shadow-[0_0_20px_rgba(212,175,55,0.2)]"
                  }`}
                  onClick={() => step === steps.length - 1 ? setSelected(null) : setStep((s) => s + 1)}
                >
                  {step === steps.length - 1 ? "Fin de brassage 🍻" : "Étape Suivante"}
                </button>
            </div>
        </div>

      </div>
    </div>
  );
}