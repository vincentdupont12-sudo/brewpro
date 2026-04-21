"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

// --- COMPOSANT TIMER INTERACTIF ---
function StepTimer({ minutes, label }: { minutes: number; label: string }) {
  const [timeLeft, setTimeLeft] = useState(minutes * 60);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    } else if (timeLeft === 0 && isActive) {
      clearInterval(interval);
      alert(`STOP : ${label}`);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, label]);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="flex items-center gap-6 bg-[#1a1a1c] p-5 border-2 border-[#d4af37] rounded-lg my-6 shadow-[0_0_15px_rgba(212,175,55,0.1)]">
      <div className="flex-1">
        <div className="text-[10px] text-[#6b6b73] uppercase font-black tracking-[0.2em] mb-1">Compte à rebours ébullition</div>
        <div className="text-4xl font-mono font-black text-white leading-none">{formatTime(timeLeft)}</div>
      </div>
      <button 
        onClick={() => setIsActive(!isActive)}
        className={`px-8 py-4 text-xs font-black uppercase tracking-widest rounded-md transition-all ${
          isActive ? 'bg-red-600 text-white animate-pulse' : 'bg-[#d4af37] text-black'
        }`}
      >
        {isActive ? "STOP" : "START"}
      </button>
    </div>
  );
}

export default function BrewControlApp() {
  const [view, setView] = useState<"home" | "recipes" | "stock" | "detail" | "history">("home");
  const [recipes, setRecipes] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);

  // États du calculateur
  const [di, setDi] = useState<number>(1050);
  const [df, setDf] = useState<number>(1010);
  const [realVol, setRealVol] = useState<number>(20);

  useEffect(() => {
    fetchData();
    const savedDi = localStorage.getItem('last_di');
    if (savedDi) setDi(Number(savedDi));
  }, []);

  const fetchData = async () => {
    const { data: r } = await supabase.from("recipes").select("*").order('created_at', { ascending: false });
    const { data: i } = await supabase.from("inventory").select("*").order('name');
    const { data: h } = await supabase.from("brews").select("*").order('brew_date', { ascending: false });
    if (r) setRecipes(r);
    if (i) setInventory(i);
    if (h) setHistory(h);
  };

  const saveToHistory = async () => {
    const abv = (di - df) / 7.5;
    const { error } = await supabase.from("brews").insert([{
      recipe_name: selected.name,
      di, df, volume_final: realVol,
      abv_calc: parseFloat(abv.toFixed(1)),
      sugar_added: Math.round(realVol * (selected.data?.config?.resucrageDosage || 7)),
    }]);
    if (!error) { setView("history"); fetchData(); localStorage.removeItem('last_di'); }
  };

  const generateFullGuide = (recipe: any) => {
    const s = recipe.data?.stats_json;
    const c = recipe.data?.config;
    const rawSteps = recipe.data?.steps_json || [];

    const malts = rawSteps.flatMap((st: any) => st.ingredients || []).filter((ing: any) => ing.type === 'MALT');
    const hops = rawSteps.flatMap((st: any) => st.ingredients || []).filter((ing: any) => (ing.type || '').match(/HOP|HOUBLON|EPICE/i));
    const yeast = rawSteps.flatMap((st: any) => st.ingredients || []).filter((ing: any) => ing.type === 'LEVURE');

    return [
      { id: 1, title: "01. PRÉPARATION", action: "Désinfection (Chemipro).", important: `CIBLE : ${c?.volFinal || 20}L` },
      { id: 2, title: "02. CONCASSAGE", action: "Moudre les grains.", items: malts },
      { 
        id: 3, title: "03. EMPÂTAGE", 
        action: `Verser ${s?.waterE || 0}L d'eau.`, 
        paliers: (rawSteps.find((st: any) => st.isMashBlock)?.paliers || []).map((p: any) => ({
          ...p, desc: p.temp <= 54 ? "MOUSSE" : p.temp <= 65 ? "ALCOOL" : "CORPS"
        })),
        timer: (rawSteps.find((st: any) => st.isMashBlock)?.paliers || []).reduce((acc: number, p: any) => acc + (p.duration || 0), 0)
      },
      { id: 4, title: "04. FILTRATION", action: `Rincer (${s?.waterR || 0}L à 78°C).`, important: `EAU RINÇAGE : ${s?.waterR || 0}L` },
      { 
        id: 5, title: "05. ÉBULLITION", 
        action: "Ajouter les houblons selon les paliers ci-dessous.", 
        timer: 60, 
        isBoil: true,
        items: hops.map((h: any) => {
            const time = h.name.match(/\d+/) ? parseInt(h.name.match(/\d+/)[0]) : 60;
            return { ...h, timeValue: time };
        }).sort((a: any, b: any) => b.timeValue - a.timeValue) 
      },
      { id: 6, title: "06. FERMENTATION", action: "Refroidir, oxygéner, ensemencer.", items: yeast }
    ];
  };

  return (
    <div className="min-h-screen bg-[#0b0b0c] text-[#e7e7e7] font-sans">
      {/* HEADER SIMPLE */}
      <div className="h-14 border-b border-[#1f1f23] flex items-center justify-between px-6 sticky top-0 bg-[#0b0b0c]/90 backdrop-blur-md z-50">
        <div className="text-[10px] tracking-[0.5em] text-[#d4af37] font-black cursor-pointer uppercase" onClick={() => setView("home")}>Brew Station</div>
        <button onClick={() => setView("history")} className="text-[9px] text-[#6b6b73] uppercase tracking-widest">Archives</button>
      </div>

      <div className="max-w-xl mx-auto px-6 py-8">
        
        {view === "home" && (
          <div className="py-12 space-y-4 animate-in fade-in">
            <MenuBtn title="BRASSAGE" sub="Suivre une recette" icon="🔥" onClick={() => setView("recipes")} active />
            <MenuBtn title="HISTORIQUE" sub="Mesures & densités" icon="📜" onClick={() => setView("history")} />
            <MenuBtn title="INVENTAIRE" sub="Grains & Houblons" icon="🌾" onClick={() => setView("stock")} />
          </div>
        )}

        {view === "recipes" && (
          <div className="space-y-4">
             <button onClick={() => setView("home")} className="text-[9px] text-[#6b6b73] mb-6 uppercase tracking-[0.2em]">← Menu</button>
             {recipes.map(r => (
               <div key={r.id} onClick={() => { setSelected(r); setView("detail"); }} className="p-6 bg-[#111113] border border-[#1f1f23] rounded hover:border-[#d4af37] cursor-pointer transition-all">
                 <h3 className="text-xl font-bold text-white uppercase italic">{r.name}</h3>
                 <p className="text-[10px] text-[#d4af37] font-black mt-1 uppercase tracking-widest">{r.data?.stats_json?.abv}% VOL — {r.data?.stats_json?.ibu} IBU</p>
               </div>
             ))}
          </div>
        )}

        {view === "detail" && selected && (
          <div className="space-y-12 pb-24">
            <header className="border-b border-[#1f1f23] pb-8">
              <button onClick={() => setView("recipes")} className="text-[9px] text-[#6b6b73] mb-4 uppercase tracking-widest">← Annuler</button>
              <h1 className="text-5xl font-black text-white italic uppercase tracking-tighter leading-none">{selected.name}</h1>
            </header>

            {generateFullGuide(selected).map((step) => (
              <div key={step.id} className="space-y-4">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-[#d4af37] border border-[#d4af37] px-2 py-0.5 rounded uppercase">{step.id}</span>
                    <h2 className="text-sm font-black text-white uppercase tracking-widest">{step.title}</h2>
                </div>
                
                <div className="bg-[#111113] border border-[#1f1f23] p-5 rounded-sm">
                  <p className="text-sm font-bold text-white uppercase mb-4 leading-tight">{step.action}</p>

                  {step.isBoil && <StepTimer minutes={step.timer || 60} label="Ébullition terminée" />}

                  {/* LOGIQUE HOUBLON VISUELLE */}
                  {step.isBoil ? (
                    <div className="space-y-3 mt-4">
                        {step.items?.map((it: any, i: number) => (
                            <div key={i} className="flex bg-black border border-[#1f1f23] overflow-hidden rounded-md group hover:border-[#d4af37]/50 transition-all">
                                <div className={`w-20 flex flex-col justify-center items-center text-black font-black ${it.timeValue >= 45 ? 'bg-orange-500' : 'bg-green-500'}`}>
                                    <span className="text-[10px] leading-none mb-1">À T-</span>
                                    <span className="text-2xl leading-none">{it.timeValue}</span>
                                    <span className="text-[9px] leading-none mt-1 uppercase">min</span>
                                </div>
                                <div className="flex-1 p-4 flex justify-between items-center">
                                    <div className="text-xs font-black text-white uppercase tracking-tight">{it.name}</div>
                                    <div className="text-sm font-mono text-[#d4af37] font-bold">{it.qty}{it.unit || 'g'}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                  ) : (
                    <div className="grid gap-2">
                        {step.paliers?.map((p: any, i: number) => (
                            <div key={i} className="p-3 bg-[#0b0b0c] border-l-2 border-[#d4af37] flex justify-between text-[11px] font-bold uppercase">
                                <span>{p.temp}°C ({p.desc})</span>
                                <span className="text-[#6b6b73]">{p.duration} MIN</span>
                            </div>
                        ))}
                        {step.items?.map((it: any, i: number) => (
                            <div key={i} className="flex justify-between p-3 bg-[#0b0b0c] border border-[#1f1f23] text-[11px]">
                                <span className="text-[#6b6b73] uppercase">{it.name}</span>
                                <span className="text-white font-mono">{it.qty}{it.unit || 'g'}</span>
                            </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* CALCULATEUR FINAL */}
            <div className="mt-20 pt-10 border-t-2 border-[#d4af37]">
              <h2 className="text-xl font-black text-white italic uppercase mb-6 tracking-tighter">Mesures de Fin de Fermentation</h2>
              <div className="bg-[#111113] border border-[#d4af37]/30 p-6 space-y-6">
                <div className="grid grid-cols-3 gap-3">
                  <InputBox label="D. Initiale" value={di} onChange={setDi} />
                  <InputBox label="D. Finale" value={df} onChange={setDf} focus />
                  <InputBox label="Vol. Réel" value={realVol} onChange={setRealVol} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <StatBox label="Alcool" value={`${((di - df) / 7.5).toFixed(1)}%`} />
                  <StatBox label="Sucre" value={`${(realVol * (selected.data?.config?.resucrageDosage || 7)).toFixed(0)}g`} gold />
                </div>
                <button onClick={saveToHistory} className="w-full bg-[#d4af37] text-black font-black py-5 uppercase tracking-widest hover:bg-white transition-all italic text-sm">
                  ARCHIVER LE BRASSIN 💾
                </button>
              </div>
            </div>
          </div>
        )}

        {/* HISTORIQUE */}
        {view === "history" && (
          <div className="space-y-6">
            <button onClick={() => setView("home")} className="text-[9px] text-[#6b6b73] mb-6 uppercase tracking-widest">← Menu</button>
            <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-8">Journal de bord</h2>
            {history.map(h => (
              <div key={h.id} className="p-5 bg-[#111113] border-l-4 border-[#d4af37] border-[#1f1f23] border">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="font-black text-white uppercase italic text-sm tracking-tight">{h.recipe_name}</h3>
                    <span className="text-[9px] text-[#6b6b73]">{new Date(h.brew_date).toLocaleDateString()}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                    <div className="bg-black p-2 text-center text-xs font-black"><div className="text-[8px] text-[#6b6b73] mb-1">ABV</div><div className="text-[#d4af37]">{h.abv_calc}%</div></div>
                    <div className="bg-black p-2 text-center text-xs font-black"><div className="text-[8px] text-[#6b6b73] mb-1">SUCRE</div>{h.sugar_added}g</div>
                    <div className="bg-black p-2 text-center text-xs font-black"><div className="text-[8px] text-[#6b6b73] mb-1">VOL</div>{h.volume_final}L</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// --- MICRO-COMPOSANTS ---
function MenuBtn({ title, sub, icon, onClick, active }: any) {
    return (
        <button onClick={onClick} className={`w-full p-8 bg-[#111113] border-2 ${active ? 'border-[#d4af37]' : 'border-[#1f1f23]'} rounded-lg text-left group hover:bg-[#d4af37]/5 transition-all relative overflow-hidden`}>
            <div className="absolute right-[-10px] bottom-[-15px] text-8xl opacity-[0.03] grayscale">{icon}</div>
            <h3 className="text-2xl font-black italic text-white uppercase tracking-tighter leading-none mb-1">{title}</h3>
            <p className="text-[9px] text-[#6b6b73] font-bold uppercase tracking-[0.3em]">{sub}</p>
        </button>
    );
}

function InputBox({ label, value, onChange, focus }: any) {
    return (
        <div className="space-y-1">
            <label className="text-[8px] text-[#6b6b73] uppercase font-black tracking-widest">{label}</label>
            <input type="number" value={value} onChange={e => onChange(Number(e.target.value))} className={`w-full bg-black ${focus ? 'border-[#d4af37]' : 'border-[#1f1f23]'} border p-3 text-white font-mono text-center outline-none`} />
        </div>
    );
}

function StatBox({ label, value, gold }: any) {
    return (
        <div className="bg-black p-4 text-center border border-[#1f1f23]">
            <div className="text-[8px] text-[#6b6b73] uppercase font-black mb-1">{label}</div>
            <div className={`text-3xl font-black italic tracking-tighter ${gold ? 'text-[#d4af37]' : 'text-white'}`}>{value}</div>
        </div>
    );
}