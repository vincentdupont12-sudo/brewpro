"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

// Composant Timer Interne
function StepTimer({ minutes }: { minutes: number }) {
  const [timeLeft, setTimeLeft] = useState(minutes * 60);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    } else if (timeLeft === 0) {
      clearInterval(interval);
      alert("TEMPS ÉCOULÉ !");
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="flex items-center gap-4 bg-[#0b0b0c] p-3 border border-[#1f1f23] rounded-sm mt-4">
      <div className="text-2xl font-mono font-bold text-[#d4af37]">{formatTime(timeLeft)}</div>
      <button 
        onClick={() => setIsActive(!isActive)}
        className={`px-4 py-1 text-[10px] font-bold uppercase tracking-widest rounded ${isActive ? 'bg-red-900/20 text-red-500' : 'bg-[#d4af37]/20 text-[#d4af37]'}`}
      >
        {isActive ? "Pause" : "Lancer le Timer"}
      </button>
    </div>
  );
}

export default function BrewControlApp() {
  const [view, setView] = useState<"home" | "recipes" | "stock" | "detail">("home");
  const [recipes, setRecipes] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const { data: r } = await supabase.from("recipes").select("*").order('created_at', { ascending: false });
    const { data: i } = await supabase.from("inventory").select("*").order('name');
    if (r) setRecipes(r);
    if (i) setInventory(i);
  };

  const generateFullGuide = (recipe: any) => {
    const s = recipe.data?.stats_json;
    const c = recipe.data?.config;
    const rawSteps = recipe.data?.steps_json || [];

    const malts = rawSteps.flatMap((st: any) => st.ingredients || []).filter((ing: any) => ing.type === 'MALT');
    const hops = rawSteps.flatMap((st: any) => st.ingredients || []).filter((ing: any) => ing.type === 'HOUBLON' || ing.type === 'EPICES');
    const yeast = rawSteps.flatMap((st: any) => st.ingredients || []).filter((ing: any) => ing.type === 'LEVURE');

    return [
      {
        title: "01. PRÉPARATION",
        action: "Tout désinfecter au Chemipro.",
        timer: 0
      },
      {
        title: "02. CONCASSAGE",
        action: "Concasser les grains.",
        items: malts
      },
      {
        title: "03. EMPÂTAGE (MASH)",
        action: `Verser ${s?.waterE || 0}L d'eau et chauffer.`,
        important: `VOLUME EAU : ${s?.waterE || 0} LITRES`,
        paliers: rawSteps.find((st: any) => st.isMashBlock)?.paliers || [],
        timer: (rawSteps.find((st: any) => st.isMashBlock)?.paliers || []).reduce((acc: number, p: any) => acc + (p.duration || 0), 0)
      },
      {
        title: "04. RINÇAGE",
        action: `Rincer avec ${s?.waterR || 0}L d'eau à 78°C.`,
        important: `EAU DE RINÇAGE : ${s?.waterR || 0}L`
      },
      {
        title: "05. ÉBULLITION (BOIL)",
        action: "Ajouter les houblons selon le timing indiqué.",
        items: hops,
        timer: 60
      },
      {
        title: "06. FERMENTATION",
        action: "Refroidir, transférer et ensemencer.",
        items: yeast,
        info: `Resucrage : ${c?.resucrageDosage || 7}g/L`
      }
    ];
  };

  return (
    <div className="min-h-screen bg-[#0b0b0c] text-[#e7e7e7] font-sans">
      {/* BARRE HAUTE */}
      <div className="h-12 border-b border-[#1f1f23] flex items-center justify-between px-6 sticky top-0 bg-[#0b0b0c]/90 backdrop-blur-md z-50">
        <div className="text-[11px] tracking-[0.4em] text-[#d4af37] font-bold cursor-pointer" onClick={() => setView("home")}>BREW CONTROL</div>
        <div className="text-[10px] text-[#6b6b73] font-mono uppercase tracking-[0.2em]">Ready_Status</div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10">
        {view === "home" && (
           <div className="grid grid-cols-1 gap-6 py-20 animate-in fade-in duration-1000">
             <MenuCard title="Mode Brasseur" subtitle="Suivre une recette" icon="REC" onClick={() => setView("recipes")} />
             <MenuCard title="Inventaire" subtitle="Vérifier le stock" icon="STK" onClick={() => setView("stock")} />
           </div>
        )}

        {view === "recipes" && (
           <div className="space-y-6">
              <button onClick={() => setView("home")} className="text-[9px] text-[#6b6b73] hover:text-[#d4af37] tracking-[0.3em] uppercase mb-10">← Retour</button>
              {recipes.map(r => (
                <div key={r.id} onClick={() => { setSelected(r); setView("detail"); }} className="p-8 bg-[#111113] border border-[#2a2a2e] rounded hover:border-[#d4af37] cursor-pointer transition-all">
                  <h3 className="text-xl font-light text-white uppercase italic">{r.name}</h3>
                  <div className="text-[10px] text-[#d4af37] mt-2 font-bold tracking-widest">{r.data?.stats_json?.abv}% VOL</div>
                </div>
              ))}
           </div>
        )}

        {view === "detail" && selected && (
          <div className="space-y-12 animate-in fade-in duration-500">
            <header className="border-b border-[#1f1f23] pb-6">
              <button onClick={() => setView("recipes")} className="text-[9px] text-[#6b6b73] hover:text-[#d4af37] uppercase tracking-widest mb-4">← Liste</button>
              <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter">{selected.name}</h1>
            </header>

            <div className="space-y-16">
              {generateFullGuide(selected).map((step, idx) => (
                <div key={idx} className="space-y-4">
                  <div className="flex items-center gap-4">
                    <span className="text-[#d4af37] font-mono font-bold text-sm">{String(idx + 1).padStart(2, '0')}.</span>
                    <h3 className="text-lg font-bold text-white uppercase italic tracking-wider">{step.title}</h3>
                  </div>

                  <div className="bg-[#111113] border border-[#1f1f23] p-6 rounded-sm">
                    <p className="text-sm text-white/90 font-medium uppercase mb-4 leading-relaxed">{step.action}</p>
                    
                    {step.important && (
                      <div className="bg-[#d4af37]/10 text-[#d4af37] p-4 text-sm font-black border-l-4 border-[#d4af37] mb-4">
                        {step.important}
                      </div>
                    )}

                    {step.paliers && step.paliers.length > 0 && (
                      <div className="space-y-2 mb-4">
                        {step.paliers.map((p: any, i: number) => (
                          <div key={i} className="flex justify-between p-3 bg-[#0b0b0c] border border-[#1f1f23] text-xs">
                            <span className="text-[#6b6b73] uppercase font-bold">{p.name}</span>
                            <span className="text-white font-bold">{p.temp}°C / {p.duration} MIN</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {step.items && step.items.length > 0 && (
                      <div className="grid gap-2 mb-4">
                        {step.items.map((it: any, i: number) => (
                          <div key={i} className="flex justify-between p-3 bg-[#0b0b0c] border border-[#1f1f23] text-xs">
                            <div>
                               <span className="text-[#6b6b73] uppercase font-bold">{it.name}</span>
                               {step.title.includes("ÉBULLITION") && <span className="ml-3 text-[#d4af37] italic uppercase text-[9px]">Ajuster au timing</span>}
                            </div>
                            <span className="text-white font-mono">{it.qty} {it.unit || (it.type === 'MALT' ? 'KG' : 'G')}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {step.timer && step.timer > 0 && <StepTimer minutes={step.timer} />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === "stock" && (
           <div className="space-y-4">
              <button onClick={() => setView("home")} className="text-[9px] text-[#6b6b73] hover:text-[#d4af37] uppercase tracking-widest mb-4">← Retour</button>
              {inventory.map(i => (
                <div key={i.id} className="flex justify-between p-4 bg-[#111113] border border-[#1f1f23] text-sm">
                  <span className="text-white font-bold uppercase">{i.name}</span>
                  <span className="text-[#d4af37] font-mono">{i.quantity} {i.unit}</span>
                </div>
              ))}
           </div>
        )}
      </div>
    </div>
  );
}

function MenuCard({ title, subtitle, icon, onClick }: { title: string; subtitle: string; icon: string; onClick: () => void }) {
  return (
    <div onClick={onClick} className="group p-10 bg-[#111113] border border-[#2a2a2e] rounded hover:border-[#d4af37] cursor-pointer transition-all relative overflow-hidden">
      <div className="absolute right-[-10px] bottom-[-20px] text-8xl font-black text-white/5 group-hover:text-[#d4af37]/10 transition-all">{icon}</div>
      <h3 className="text-2xl font-light text-white uppercase italic">{title}</h3>
      <p className="text-[10px] text-[#6b6b73] font-bold uppercase tracking-[0.3em] mt-2">{subtitle}</p>
    </div>
  );
}