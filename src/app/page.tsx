"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

// --- TIMER ---
function StepTimer({ minutes, label }: { minutes: number; label: string }) {
  const [timeLeft, setTimeLeft] = useState(minutes * 60);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    } else if (timeLeft === 0 && isActive) {
      clearInterval(interval);
      alert(`🔔 TERMINE : ${label}`);
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
  const [view, setView] = useState<"home" | "recipes" | "stock" | "detail" | "history">("home");
  const [recipes, setRecipes] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);

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
    await supabase.from("brews").insert([{
      recipe_name: selected.name,
      di, df, volume_final: realVol,
      abv_calc: parseFloat(abv.toFixed(1)),
      sugar_added: Math.round(realVol * (selected.data?.config?.resucrageDosage || 7)),
    }]);
    setView("history"); fetchData(); localStorage.removeItem('last_di');
  };

  const generateFullGuide = (recipe: any) => {
    const s = recipe.data?.stats_json;
    const c = recipe.data?.config;
    const rawSteps = recipe.data?.steps_json || [];

    // ASPIRATEUR TOUT-TERRAIN
    const allIng = rawSteps.flatMap((st: any) => st.ingredients || []);

    const findItems = (forbidden: string[], isReverse = false) => {
      return allIng.filter(ing => {
        const t = (ing.type || ing.kind || '').toUpperCase();
        const n = (ing.name || ing.title || '').toUpperCase();
        const match = forbidden.some(word => t.includes(word) || n.includes(word));
        return isReverse ? !match : match;
      });
    };

    const malts = findItems(['MALT', 'GRAIN']);
    const yeast = findItems(['LEVURE', 'YEAST']);
    
    // Pour l'ébu : tout ce qui n'est ni grain ni levure
    const boilItems = allIng.filter(ing => {
        const t = (ing.type || ing.kind || '').toUpperCase();
        const n = (ing.name || ing.title || '').toUpperCase();
        return !t.includes('MALT') && !t.includes('GRAIN') && !t.includes('LEVURE') && !t.includes('YEAST') && !n.includes('MALT');
    }).map(h => {
        const nameText = (h.name || h.title || 'Ingrédient inconnu');
        const timeMatch = nameText.match(/\d+/) || (h.desc || '').match(/\d+/);
        return { 
            ...h, 
            displayName: nameText,
            displayQty: h.qty || h.amount || h.quantity || '?',
            displayUnit: h.unit || 'g',
            timeTarget: timeMatch ? parseInt(timeMatch[0]) : 60 
        };
    }).sort((a, b) => b.timeTarget - a.timeTarget);

    return [
      { id: 1, title: "01. PRÉPARATION", action: "Désinfection (Chemipro).", important: `CIBLE : ${c?.volFinal || 20}L` },
      { id: 2, title: "02. CONCASSAGE", action: "Moudre les grains.", items: malts },
      { 
        id: 3, title: "03. EMPÂTAGE", 
        action: `Chauffer ${s?.waterE || 0}L d'eau.`, 
        paliers: (rawSteps.find((st: any) => st.isMashBlock)?.paliers || []),
        timer: (rawSteps.find((st: any) => st.isMashBlock)?.paliers || []).reduce((acc: number, p: any) => acc + (p.duration || 0), 0)
      },
      { id: 4, title: "04. FILTRATION", action: `Rincer (${s?.waterR || 0}L à 78°C).` },
      { 
        id: 5, title: "05. ÉBULLITION", 
        action: "Ajoutez les ingrédients aux moments indiqués sur le timer.", 
        timer: 60, 
        isBoil: true,
        items: boilItems 
      },
      { id: 6, title: "06. FERMENTATION", action: "Refroidir et ensemencer.", items: yeast }
    ];
  };

  return (
    <div className="min-h-screen bg-[#0b0b0c] text-[#e7e7e7] font-sans italic-none">
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

                  {step.isBoil ? (
                    <div className="space-y-8">
                        <StepTimer minutes={60} label="Ébullition terminée !" />
                        <div className="relative space-y-6 pl-4 border-l border-[#2a2a2e]">
                            {step.items?.map((it: any, i: number) => (
                                <div key={i} className="relative pl-6">
                                    <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 bg-[#d4af37] rounded-full ring-4 ring-[#111113]" />
                                    <div className="bg-black border border-[#1f1f23] p-4 rounded-sm">
                                        <div className="text-[10px] font-black text-[#d4af37] uppercase mb-2">
                                            {it.timeTarget >= 60 ? "👉 DÈS LE DÉBUT (À 60:00)" : `👉 QUAND LE TIMER AFFICHE ${it.timeTarget}:00`}
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <div className="text-white font-black uppercase italic text-lg">{it.displayName || it.name || it.title}</div>
                                            <div className="text-sm font-mono text-white bg-[#1f1f23] px-2 py-1 rounded">{it.displayQty}{it.displayUnit}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                        {step.items?.map((it: any, i: number) => (
                            <div key={i} className="flex justify-between p-3 bg-black border border-[#1f1f23] text-[11px] font-bold uppercase">
                                <span className="text-[#6b6b73]">{it.name || it.title || it.displayName}</span>
                                <span className="text-white">{it.qty || it.amount}{it.unit || 'g'}</span>
                            </div>
                        ))}
                        {step.timer && step.timer > 0 && <StepTimer minutes={step.timer} label="Étape terminée" />}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* CALCULATEUR */}
            <div className="mt-20 pt-10 border-t-2 border-[#d4af37]">
              <h2 className="text-xl font-black text-white italic uppercase mb-6 tracking-tighter">Embouteillage</h2>
              <div className="bg-[#111113] border border-[#d4af37]/30 p-6 space-y-6">
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[8px] text-[#6b6b73] uppercase font-black">DI</label>
                    <input type="number" value={di} onChange={e => {setDi(Number(e.target.value)); localStorage.setItem('last_di', e.target.value);}} className="w-full bg-black border border-[#1f1f23] p-3 text-white text-center" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] text-[#6b6b73] uppercase font-black">DF</label>
                    <input type="number" value={df} onChange={e => setDf(Number(e.target.value))} className="w-full bg-black border border-[#d4af37] p-3 text-white text-center" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] text-[#6b6b73] uppercase font-black">Vol (L)</label>
                    <input type="number" value={realVol} onChange={e => setRealVol(Number(e.target.value))} className="w-full bg-black border border-[#1f1f23] p-3 text-white text-center" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-black p-4 text-center border border-[#1f1f23]">
                    <div className="text-[8px] text-[#6b6b73] mb-1">ALCOOL</div>
                    <div className="text-3xl font-black text-[#d4af37] italic uppercase tracking-tighter">{((di - df) / 7.5).toFixed(1)}%</div>
                  </div>
                  <div className="bg-black p-4 text-center border border-[#1f1f23]">
                    <div className="text-[8px] text-[#6b6b73] mb-1">SUCRE</div>
                    <div className="text-3xl font-black text-white italic uppercase tracking-tighter">{(realVol * (selected.data?.config?.resucrageDosage || 7)).toFixed(0)}g</div>
                  </div>
                </div>
                <button onClick={saveToHistory} className="w-full bg-[#d4af37] text-black font-black py-5 uppercase tracking-widest hover:bg-white transition-all text-sm italic">ARCHIVER 💾</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}