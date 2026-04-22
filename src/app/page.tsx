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
      <div className="relative h-4 w-full bg-[#111113] border border-white/5 rounded-sm overflow-hidden">
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
    <div className="flex items-center gap-6 mt-8 bg-black p-4 border border-white/10 inline-flex rounded-sm">
      <div className="text-4xl font-mono text-white font-black tracking-tighter">{format(time)}</div>
      <div className="flex gap-2 border-l border-white/10 pl-4">
        <button className={`text-[10px] font-black uppercase ${running ? 'text-red-500' : 'text-[#d4af37]'}`} onClick={() => setRunning(!running)}>
          {running ? "STOP" : "START"}
        </button>
        <button className="text-[#6b6b73] text-[10px] uppercase font-black" onClick={() => { setTime(minutes * 60); setRunning(false); }}>RESET</button>
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
  
  // Extraction précise des houblons
  const allHops = steps.flatMap((s: any) => s.ingredients || [])
    .filter((i: any) => (i.type || "").toUpperCase().includes("HOUBLON"))
    .map((h: any) => ({
      name: h.name, 
      qty: h.qty || h.amount || "0", 
      unit: h.unit || "g",
      time: parseInt(h.durationInMinutes) || 60
    })).sort((a: any, b: any) => b.time - a.time);

  return [
    {
      name: "Concassage",
      desc: "Préparation des malts.",
      content: (
        <div className="space-y-2 max-w-md">
          {mash?.ingredients?.map((m: any, i: number) => (
            <div key={i} className="flex justify-between border-b border-white/5 pb-2 text-xs">
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
          <div className="text-[10px] font-black text-[#6b6b73] uppercase tracking-widest mb-2">Eau d'empâtage : <span className="text-white">{stats.waterE} L</span></div>
          {mash?.paliers?.map((p: any, i: number) => (
            <div key={i} className="flex justify-between p-3 bg-white/5 border-l-2 border-[#d4af37] font-bold text-xs">
              <span>{p.temp}°C</span> <span>{p.duration} MIN</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      name: "Filtration",
      desc: "Clarification du moût.",
      content: <p className="text-xs text-gray-500 leading-relaxed max-w-md italic">Faire circuler le moût jusqu'à obtenir une limpidité satisfaisante avant le transfert.</p>
    },
    {
      name: "Rinçage",
      desc: "Lavage des drêches.",
      content: (
        <div className="p-6 border border-white/10 bg-black inline-block">
            <div className="text-[10px] font-black text-[#6b6b73] uppercase mb-1">Volume à 78°C</div>
            <div className="text-4xl font-black text-white italic">{stats.waterR} LITRES</div>
        </div>
      ),
    },
    {
      name: "Ébullition",
      desc: "Houblonnage et stérilisation.",
      timer: 60,
      content: (
        <div className="space-y-2 max-w-md">
          <div className="text-[10px] font-black text-[#d4af37] uppercase tracking-widest mb-4 italic">Planning des ajouts :</div>
          {allHops.map((h: any, idx: number) => (
            <div key={idx} className="flex justify-between items-center p-4 bg-white/5 border border-white/10">
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-[#6b6b73] uppercase">T - {h.time} MIN</span>
                <span className="font-black uppercase italic text-sm text-white tracking-tight">{h.name}</span>
              </div>
              <div className="text-lg font-black text-[#d4af37]">{h.qty}<span className="text-[10px] ml-0.5">{h.unit}</span></div>
            </div>
          ))}
        </div>
      ),
    },
    {
        name: "Refroidissement",
        desc: "Choc thermique.",
        content: <p className="text-xs text-gray-500 leading-relaxed max-w-md italic">Descendre la température sous les 25°C pour l'ensemencement.</p>
    },
    {
        name: "Fermentation",
        desc: "Travail des levures.",
        content: (
          <div className="space-y-4 max-w-md">
              <div className="p-4 bg-white/5 border border-white/10">
                <div className="text-[#6b6b73] font-black uppercase text-[9px] mb-1">Durée en cave</div>
                <div className="text-[#d4af37] font-black italic uppercase text-xl">~ 21 JOURS</div>
              </div>
              {steps.flatMap((s: any) => s.ingredients || [])
                  .filter((i: any) => (i.type || "").toUpperCase().includes("LEVURE"))
                  .map((l: any, idx: number) => (
                      <div key={idx} className="p-3 border-l-2 border-white/20 text-[11px] font-bold uppercase text-gray-300">{l.name}</div>
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
        <h1 className="text-3xl font-black italic uppercase tracking-tighter mb-10 text-[#d4af37]">Brew Station</h1>
        <div className="w-full max-w-xs space-y-2">
            {recipes.map((r) => (
            <div key={r.id} onClick={() => setSelected(r)} className="p-4 bg-[#111113] border border-white/5 cursor-pointer hover:border-[#d4af37] flex justify-between items-center group">
                <h3 className="text-xs font-black uppercase italic group-hover:text-[#d4af37] transition-colors">{r.name}</h3>
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
      <div className="w-full md:w-80 border-r border-white/5 p-8 flex flex-col bg-black md:h-screen sticky top-0">
        <div className="mb-10">
            <h2 className="text-2xl font-black uppercase italic leading-none text-white tracking-tighter">{selected.name}</h2>
            <div className="h-0.5 w-8 bg-[#d4af37] mt-3"></div>
        </div>
        <div className="space-y-2">
            <Gauge label="IBU (Amertume)" value={ibu} max={100} type="IBU" />
            <Gauge label="EBC (Couleur)" value={ebc} max={80} type="EBC" />
        </div>
        <div className="flex-1 mt-8 space-y-1 overflow-y-auto pr-2 custom-scrollbar">
          {steps.map((s, i) => (
              <div key={i} className={`p-3 text-[9px] font-black uppercase tracking-[0.15em] border-l-2 transition-all ${
              i === step ? "border-[#d4af37] text-[#d4af37] bg-white/5 italic" : "border-transparent text-gray-700"
              }`}>
              {i + 1}. {s.name}
              </div>
          ))}
        </div>
        <button className="mt-6 text-[9px] font-black uppercase text-[#6b6b73] hover:text-white" onClick={() => {setSelected(null); setStep(0);}}>✕ Retour</button>
      </div>

      {/* MAIN */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <div className="flex-1 p-8 md:p-16 overflow-y-auto pb-40">
            <div className="max-w-xl animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="text-[10px] font-black text-[#d4af37] uppercase tracking-[0.4em] mb-2 italic opacity-50">Phase {step + 1} / {steps.length}</div>
                <h1 className="text-5xl font-black italic uppercase tracking-tighter leading-none mb-2">{current.name}</h1>
                <p className="text-[#6b6b73] font-bold uppercase text-[9px] tracking-widest mb-10">{current.desc}</p>
                
                <div className="mt-8">{current.content}</div>
                
                {current.timer && <Timer minutes={current.timer} />}
            </div>
        </div>

        {/* NAVIGATION */}
        <div className="p-6 md:p-8 border-t border-white/5 bg-black/90 backdrop-blur sticky bottom-0">
            <div className="flex gap-4 max-w-xl mx-auto">
                <button disabled={step === 0} className={`flex-1 p-4 font-black uppercase italic text-[10px] tracking-widest border border-white/10 ${step === 0 ? 'opacity-0 cursor-default' : 'bg-white/5 text-white hover:bg-white/10'}`} onClick={() => setStep((s) => s - 1)}>Précédent</button>
                <button className="flex-[2] p-4 font-black uppercase italic text-[10px] tracking-widest bg-[#d4af37] text-black border border-[#d4af37] hover:bg-white hover:border-white transition-colors" onClick={() => step === steps.length - 1 ? setSelected(null) : setStep((s) => s + 1)}>
                  {step === steps.length - 1 ? "Finir le brassage 🍻" : "Étape Suivante"}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
}