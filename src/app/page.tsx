"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

// --- COMPOSANT TIMER ---
function StepTimer({ minutes, label }: { minutes: number; label: string }) {
  const [timeLeft, setTimeLeft] = useState(minutes * 60);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    } else if (timeLeft === 0 && isActive) {
      clearInterval(interval);
      alert(`🔔 ACTION : ${label}`);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, label]);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="flex items-center gap-6 bg-[#0b0b0c] p-6 border-2 border-[#d4af37] rounded-lg my-6 shadow-lg">
      <div className="flex-1">
        <div className="text-[10px] text-[#6b6b73] uppercase font-black tracking-widest mb-1">CHRONO</div>
        <div className="text-5xl font-mono font-black text-white leading-none">{formatTime(timeLeft)}</div>
      </div>
      <button 
        onClick={() => setIsActive(!isActive)}
        className={`px-8 py-4 text-xs font-black uppercase tracking-widest rounded-md transition-all ${
          isActive ? 'bg-red-600 text-white animate-pulse' : 'bg-[#d4af37] text-black'
        }`}
      >
        {isActive ? "STOP" : "LANCER"}
      </button>
    </div>
  );
}

export default function BrewControlApp() {
  const [view, setView] = useState<"home" | "recipes" | "detail" | "history">("home");
  const [recipes, setRecipes] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);

  // États pour le calculateur de fin
  const [di, setDi] = useState<number>(1050);
  const [df, setDf] = useState<number>(1010);
  const [realVol, setRealVol] = useState<number>(20);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: r } = await supabase.from("recipes").select("*").order('created_at', { ascending: false });
    const { data: h } = await supabase.from("brews").select("*").order('brew_date', { ascending: false });
    if (r) setRecipes(r);
    if (h) setHistory(h);
  };

  const saveToHistory = async () => {
    const abv = (di - df) / 7.5;
    await supabase.from("brews").insert([{
      recipe_name: selected.name,
      di, df, volume_final: realVol,
      abv_calc: parseFloat(abv.toFixed(1)),
      sugar_added: Math.round(realVol * (selected.data?.config?.resucrageDosage || 7)),
    }]);
    setView("history"); 
    fetchData();
  };

  const generateFullGuide = (recipe: any) => {
    const d = recipe.data || {};
    const stats = d.stats_json || {};
    const steps = d.steps_json || [];

    const getIngByTerm = (term: string) => {
        return steps.flatMap((s: any) => s.ingredients || []).filter((i: any) => 
            (i.type || "").toUpperCase().includes(term.toUpperCase()) ||
            (i.name || "").toUpperCase().includes(term.toUpperCase())
        );
    };

    const hops = getIngByTerm("HOUBLON").map((h: any) => ({
        name: h.name,
        qty: h.qty || h.amount || "?",
        unit: h.unit || "g",
        time: parseInt(h.durationInMinutes) || (h.name.match(/\d+/) ? parseInt(h.name.match(/\d+/)[0]) : 60)
    })).sort((a: any, b: any) => b.time - a.time);

    return [
      { id: 1, title: "01. PRÉPARATION", action: "Désinfection totale au Chemipro.", important: `CIBLE : ${d.config?.volFinal || 20}L` },
      { id: 2, title: "02. CONCASSAGE", action: "Moudre les malts.", items: getIngByTerm("MALT") },
      { 
        id: 3, title: "03. EMPÂTAGE", 
        action: `Chauffer ${stats.waterE || '?'}L d'eau.`, 
        paliers: (steps.find((s: any) => s.isMashBlock)?.paliers || []),
        timer: (steps.find((s: any) => s.isMashBlock)?.paliers || []).reduce((acc: number, p: any) => acc + (p.duration || 0), 0)
      },
      { id: 4, title: "04. FILTRATION", action: "Rincer avec l'eau à 78°C.", important: `EAU RINÇAGE : ${stats.waterR || '?'}L` },
      { 
        id: 5, title: "05. ÉBULLITION", 
        action: "Suivez la timeline des ajouts.", 
        isBoil: true,
        items: hops 
      },
      { id: 6, title: "06. FERMENTATION", action: "Refroidir, transvaser, ensemencer.", items: getIngByTerm("LEVURE") }
    ];
  };

  return (
    <div className="min-h-screen bg-[#0b0b0c] text-[#e7e7e7] font-sans italic-none">
      {/* Header */}
      <div className="h-14 border-b border-[#1f1f23] flex items-center justify-between px-6 sticky top-0 bg-[#0b0b0c]/90 backdrop-blur-md z-50">
        <div className="text-[10px] tracking-[0.5em] text-[#d4af37] font-black cursor-pointer uppercase" onClick={() => setView("home")}>Brew Station</div>
        <button onClick={() => setView("history")} className="text-[9px] text-[#6b6b73] uppercase tracking-widest">Archives</button>
      </div>

      <div className="max-w-xl mx-auto px-6 py-8">
        
        {view === "home" && (
          <div className="py-12 space-y-4 animate-in fade-in">
            <button onClick={() => setView("recipes")} className="w-full p-8 bg-[#111113] border-2 border-[#d4af37] rounded-lg text-left group">
                <h3 className="text-2xl font-black italic text-white uppercase mb-1 tracking-tighter">LANCER BRASSAGE 🔥</h3>
                <p className="text-[9px] text-[#6b6b73] font-bold uppercase tracking-[0.2em]">Suivre une recette étape par étape</p>
            </button>
            <button onClick={() => setView("history")} className="w-full p-8 bg-[#111113] border border-[#1f1f23] rounded-lg text-left group">
                <h3 className="text-2xl font-black italic text-white uppercase mb-1 tracking-tighter">HISTORIQUE 📜</h3>
                <p className="text-[9px] text-[#6b6b73] font-bold uppercase tracking-[0.2em]">Mesures & archives</p>
            </button>
          </div>
        )}

        {view === "recipes" && (
          <div className="space-y-4">
             <button onClick={() => setView("home")} className="text-[9px] text-[#6b6b73] mb-6 uppercase tracking-[0.2em]">← Retour</button>
             {recipes.map(r => (
               <div key={r.id} onClick={() => { setSelected(r); setView("detail"); }} className="p-6 bg-[#111113] border border-[#1f1f23] rounded hover:border-[#d4af37] cursor-pointer">
                 <h3 className="text-xl font-bold text-white uppercase italic">{r.name}</h3>
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
                <h2 className="text-xs font-black text-[#d4af37] uppercase tracking-[0.3em]">{step.title}</h2>
                <div className="bg-[#111113] border border-[#1f1f23] p-5 rounded-sm">
                  <p className="text-sm font-bold text-white uppercase mb-4 leading-tight">{step.action}</p>
                  {step.important && <div className="text-[10px] text-[#d4af37] font-black mb-4 border border-[#d4af37]/20 p-2 inline-block uppercase">{step.important}</div>}

                  {step.isBoil ? (
                    <div className="space-y-8">
                        <StepTimer minutes={60} label="Ébullition terminée !" />
                        <div className="relative space-y-4 pl-4 border-l-2 border-[#1f1f23]">
                            {step.items?.map((it: any, i: number) => (
                                <div key={i} className="bg-black border border-[#1f1f23] p-4 rounded-sm flex justify-between items-center">
                                    <div>
                                        <div className="text-[9px] font-black text-[#d4af37] uppercase mb-1">T-{it.time}:00</div>
                                        <div className="text-lg font-black uppercase italic">{it.name}</div>
                                    </div>
                                    <div className="text-xl font-mono font-black text-white">{it.qty}{it.unit}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                        {step.paliers?.map((p: any, i: number) => (
                            <div key={i} className="flex justify-between p-3 bg-black border border-[#1f1f23] text-xs font-bold uppercase">
                                <span>{p.temp}°C</span><span className="text-[#d4af37]">{p.duration} MIN</span>
                            </div>
                        ))}
                        {step.items?.map((it: any, i: number) => (
                            <div key={i} className="flex justify-between p-3 bg-black border border-[#1f1f23] text-[11px] font-bold uppercase">
                                <span className="text-[#6b6b73]">{it.name}</span><span className="text-white">{it.qty}{it.unit}</span>
                            </div>
                        ))}
                        {step.timer && step.timer > 0 && <StepTimer minutes={step.timer} label="Étape terminée" />}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* CALCULATEUR D'EMBOUTEILLAGE */}
            <div className="mt-20 pt-10 border-t-2 border-[#d4af37]">
              <h2 className="text-xl font-black text-white italic uppercase mb-6 tracking-tighter">EMBOUTEILLAGE</h2>
              <div className="bg-[#111113] border border-[#1f1f23] p-6 space-y-6">
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1"><label className="text-[8px] text-[#6b6b73] uppercase font-black">DI</label><input type="number" value={di} onChange={e => setDi(Number(e.target.value))} className="w-full bg-black border border-[#1f1f23] p-3 text-white text-center" /></div>
                  <div className="space-y-1"><label className="text-[8px] text-[#6b6b73] uppercase font-black">DF</label><input type="number" value={df} onChange={e => setDf(Number(e.target.value))} className="w-full bg-black border border-[#d4af37] p-3 text-white text-center" /></div>
                  <div className="space-y-1"><label className="text-[8px] text-[#6b6b73] uppercase font-black">VOL FINAL</label><input type="number" value={realVol} onChange={e => setRealVol(Number(e.target.value))} className="w-full bg-black border border-[#1f1f23] p-3 text-white text-center" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-black p-4 text-center border border-[#1f1f23]"><div className="text-[8px] text-[#6b6b73] mb-1 uppercase">Alcool Calculé</div><div className="text-3xl font-black text-[#d4af37] italic uppercase tracking-tighter">{((di - df) / 7.5).toFixed(1)}%</div></div>
                  <div className="bg-black p-4 text-center border border-[#1f1f23]"><div className="text-[8px] text-[#6b6b73] mb-1 uppercase">Sucre à ajouter</div><div className="text-3xl font-black text-white italic uppercase tracking-tighter">{Math.round(realVol * (selected.data?.config?.resucrageDosage || 7))}g</div></div>
                </div>
                <button onClick={saveToHistory} className="w-full bg-[#d4af37] text-black font-black py-5 uppercase tracking-widest hover:bg-white transition-all text-sm italic">ARCHIVER LE BRASSIN 💾</button>
              </div>
            </div>
          </div>
        )}

        {view === "history" && (
          <div className="space-y-6 animate-in slide-in-from-bottom">
            <button onClick={() => setView("home")} className="text-[9px] text-[#6b6b73] uppercase tracking-widest">← Menu</button>
            <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter">Historique</h1>
            {history.map((h, i) => (
              <div key={i} className="p-5 bg-[#111113] border border-[#1f1f23] rounded-sm">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-lg font-black uppercase italic text-white leading-tight">{h.recipe_name}</h3>
                        <p className="text-[9px] text-[#6b6b73] font-bold">{new Date(h.brew_date).toLocaleDateString()}</p>
                    </div>
                    <div className="text-xl font-black text-[#d4af37]">{h.abv_calc}%</div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[9px] font-black uppercase text-[#6b6b73]">
                    <div className="bg-black p-2 border border-[#1f1f23]">DI: <span className="text-white">{h.di}</span></div>
                    <div className="bg-black p-2 border border-[#1f1f23]">DF: <span className="text-white">{h.df}</span></div>
                    <div className="bg-black p-2 border border-[#1f1f23]">VOL: <span className="text-white">{h.volume_final}L</span></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}