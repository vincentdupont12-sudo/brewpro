"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

// --- COMPOSANT TIMER AVEC ALERTES ---
function StepTimer({ minutes, label }: { minutes: number; label: string }) {
  const [timeLeft, setTimeLeft] = useState(minutes * 60);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    } else if (timeLeft === 0 && isActive) {
      clearInterval(interval);
      alert(`🔔 ALERTE : ${label}`);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, label]);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="flex items-center gap-6 bg-[#0b0b0c] p-6 border-2 border-[#d4af37] rounded-lg my-8 shadow-[0_0_20px_rgba(212,175,55,0.15)]">
      <div className="flex-1">
        <div className="text-[10px] text-[#6b6b73] uppercase font-black tracking-widest mb-1">CHRONO ÉBULLITION</div>
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

    const malts = rawSteps.flatMap((st: any) => st.ingredients || []).filter((ing: any) => (ing.type || '').toUpperCase().includes('MALT'));
    const boilItems = rawSteps.flatMap((st: any) => st.ingredients || [])
        .filter((ing: any) => {
            const t = (ing.type || '').toUpperCase();
            return !t.includes('MALT') && !t.includes('LEVURE');
        });
    const yeast = rawSteps.flatMap((st: any) => st.ingredients || []).filter((ing: any) => (ing.type || '').toUpperCase().includes('LEVURE'));

    return [
      { id: 1, title: "01. PRÉPARATION", action: "Nettoyage et désinfection (Chemipro).", important: `OBJECTIF : ${c?.volFinal || 20}L EN FERMENTEUR` },
      { id: 2, title: "02. CONCASSAGE", action: "Moudre le grain (texture concassée, pas de farine).", items: malts },
      { 
        id: 3, title: "03. EMPÂTAGE", 
        action: `Chauffer ${s?.waterE || 0}L d'eau.`, 
        paliers: (rawSteps.find((st: any) => st.isMashBlock)?.paliers || []).map((p: any) => ({
          ...p, desc: p.temp <= 54 ? "MOUSSE : Aide à la tenue du col blanc." : p.temp <= 65 ? "ALCOOL : Crée les sucres fermentescibles." : "CORPS : Apporte de la rondeur en bouche."
        })),
        timer: (rawSteps.find((st: any) => st.isMashBlock)?.paliers || []).reduce((acc: number, p: any) => acc + (p.duration || 0), 0)
      },
      { id: 4, title: "04. FILTRATION", action: `Rincer les grains lentement.`, important: `EAU DE RINÇAGE : ${s?.waterR || 0}L À 78°C` },
      { 
        id: 5, title: "05. ÉBULLITION (60 MIN)", 
        action: "Dès que le moût bout à gros bouillons, lancez le timer.", 
        timer: 60, 
        isBoil: true,
        items: boilItems.map((h: any) => {
            const time = h.name.match(/\d+/) ? parseInt(h.name.match(/\d+/)[0]) : 60;
            return { ...h, timeTarget: time };
        }).sort((a, b) => b.timeTarget - a.timeTarget) 
      },
      { id: 6, title: "06. FERMENTATION", action: "Refroidir à 20°C, transvaser et ajouter la levure.", items: yeast }
    ];
  };

  return (
    <div className="min-h-screen bg-[#0b0b0c] text-[#e7e7e7] font-sans">
      {/* NAV */}
      <div className="h-14 border-b border-[#1f1f23] flex items-center justify-between px-6 sticky top-0 bg-[#0b0b0c]/90 backdrop-blur-md z-50">
        <div className="text-[10px] tracking-[0.5em] text-[#d4af37] font-black cursor-pointer uppercase" onClick={() => setView("home")}>Brew Station</div>
        <button onClick={() => setView("history")} className="text-[9px] text-[#6b6b73] uppercase tracking-widest">Archives</button>
      </div>

      <div className="max-w-xl mx-auto px-6 py-8">
        
        {view === "home" && (
          <div className="py-12 space-y-4 animate-in fade-in">
            <MenuBtn title="LANCER BRASSAGE" sub="Suivre une recette" icon="🔥" onClick={() => setView("recipes")} active />
            <MenuBtn title="JOURNAL DE BORD" sub="Historique & mesures" icon="📜" onClick={() => setView("history")} />
            <MenuBtn title="STOCKS" sub="Ingrédients disponibles" icon="🌾" onClick={() => setView("stock")} />
          </div>
        )}

        {view === "recipes" && (
          <div className="space-y-4 animate-in slide-in-from-right">
             <button onClick={() => setView("home")} className="text-[9px] text-[#6b6b73] mb-6 uppercase tracking-[0.2em]">← Menu</button>
             {recipes.map(r => (
               <div key={r.id} onClick={() => { setSelected(r); setView("detail"); }} className="p-6 bg-[#111113] border border-[#1f1f23] rounded-sm hover:border-[#d4af37] cursor-pointer transition-all">
                 <h3 className="text-xl font-bold text-white uppercase italic">{r.name}</h3>
                 <p className="text-[10px] text-[#d4af37] font-black mt-1 uppercase tracking-widest">{r.data?.stats_json?.abv}% — {r.data?.stats_json?.ibu} IBU</p>
               </div>
             ))}
          </div>
        )}

        {view === "detail" && selected && (
          <div className="space-y-12 pb-24 animate-in fade-in">
            <header className="border-b border-[#1f1f23] pb-8">
              <button onClick={() => setView("recipes")} className="text-[9px] text-[#6b6b73] mb-4 uppercase tracking-widest">← Annuler</button>
              <h1 className="text-5xl font-black text-white italic uppercase tracking-tighter leading-none">{selected.name}</h1>
            </header>

            {generateFullGuide(selected).map((step) => (
              <div key={step.id} className="space-y-4">
                <h2 className="text-xs font-black text-[#d4af37] uppercase tracking-[0.3em] flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-[#d4af37] rounded-full" />
                    {step.title}
                </h2>
                
                <div className="bg-[#111113] border border-[#1f1f23] p-5 rounded-sm">
                  <p className="text-sm font-bold text-white uppercase mb-4 leading-tight">{step.action}</p>

                  {step.isBoil ? (
                    <div className="space-y-8">
                        <StepTimer minutes={step.timer || 60} label="Ébullition terminée !" />
                        
                        <div className="relative space-y-6 pl-4 border-l border-[#2a2a2e]">
                            <p className="text-[10px] text-[#6b6b73] font-black uppercase mb-4 tracking-tighter">Timeline des ajouts :</p>
                            
                            {step.items?.map((it: any, i: number) => (
                                <div key={i} className="relative pl-6">
                                    <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 bg-[#d4af37] rounded-full ring-4 ring-[#111113]" />
                                    
                                    <div className="bg-black border border-[#1f1f23] p-4 rounded-sm">
                                        <div className="text-[11px] font-black text-[#d4af37] uppercase mb-2">
                                            {it.timeTarget >= 60 
                                              ? "👉 À AJOUTER DÈS QUE LE TIMER DÉMARRE (À 60:00)" 
                                              : `👉 À AJOUTER QUAND LE TIMER AFFICHE ${it.timeTarget}:00`
                                            }
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <div className="text-white font-black uppercase italic">{it.name}</div>
                                            <div className="text-sm font-mono text-white bg-[#1f1f23] px-2 py-1 rounded">{it.qty}{it.unit || 'g'}</div>
                                        </div>
                                        <div className="text-[9px] text-[#6b6b73] mt-2 italic">
                                            {it.timeTarget >= 45 
                                              ? "Infusion longue pour l'amertume." 
                                              : `Infusion de ${it.timeTarget} min pour l'arôme.`
                                            }
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                        {step.important && <div className="bg-[#d4af37]/5 text-[#d4af37] p-3 text-[10px] font-black border-l-2 border-[#d4af37] mb-4 uppercase">{step.important}</div>}
                        {step.paliers?.map((p: any, i: number) => (
                            <div key={i} className="p-3 bg-black border border-[#1f1f23]">
                                <div className="flex justify-between text-[11px] font-black text-white uppercase"><span>{p.temp}°C</span><span>{p.duration} MIN</span></div>
                                <p className="text-[9px] text-[#6b6b73] mt-1 italic">{p.desc}</p>
                            </div>
                        ))}
                        {step.items?.map((it: any, i: number) => (
                            <div key={i} className="flex justify-between p-3 bg-black border border-[#1f1f23] text-[11px] font-bold uppercase">
                                <span className="text-[#6b6b73]">{it.name}</span>
                                <span className="text-white font-mono">{it.qty}{it.unit || 'g'}</span>
                            </div>
                        ))}
                        {step.timer && step.timer > 0 && <StepTimer minutes={step.timer} label="Étape terminée" />}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* SECTION DENSITÉ FINALE & ARCHIVAGE */}
            <div className="mt-20 pt-10 border-t-2 border-[#d4af37]">
              <h2 className="text-xl font-black text-white italic uppercase mb-6">Clôture du Brassin (Embouteillage)</h2>
              <div className="bg-[#111113] border border-[#d4af37]/30 p-6 space-y-6">
                <div className="grid grid-cols-3 gap-3">
                  <InputBox label="DI (Brassage)" value={di} onChange={setDi} />
                  <InputBox label="DF (Mesurée)" value={df} onChange={setDf} active />
                  <InputBox label="Vol. Réel" value={realVol} onChange={setRealVol} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <StatBox label="Alcool Réel" value={`${((di - df) / 7.5).toFixed(1)}%`} />
                  <StatBox label="Sucre à Peser" value={`${(realVol * (selected.data?.config?.resucrageDosage || 7)).toFixed(0)}g`} highlight />
                </div>
                <button onClick={saveToHistory} className="w-full bg-[#d4af37] text-black font-black py-5 uppercase tracking-[0.2em] hover:bg-white transition-all italic text-sm">
                  ARCHIVER DÉFINITIVEMENT 💾
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ARCHIVES */}
        {view === "history" && (
          <div className="space-y-6 animate-in fade-in">
            <button onClick={() => setView("home")} className="text-[9px] text-[#6b6b73] mb-6 uppercase tracking-widest">← Menu</button>
            <h2 className="text-3xl font-black italic uppercase mb-8 tracking-tighter">Historique de Brassage</h2>
            {history.map(h => (
              <div key={h.id} className="p-5 bg-[#111113] border-l-4 border-[#d4af37] border border-[#1f1f23]">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="font-black text-white uppercase italic text-sm">{h.recipe_name}</h3>
                    <span className="text-[9px] text-[#6b6b73]">{new Date(h.brew_date).toLocaleDateString()}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                    <div className="bg-black p-2 text-center"><div className="text-[8px] text-[#6b6b73] uppercase mb-1">ABV</div><div className="text-xs font-black text-[#d4af37]">{h.abv_calc}%</div></div>
                    <div className="bg-black p-2 text-center"><div className="text-[8px] text-[#6b6b73] uppercase mb-1">SUCRE</div><div className="text-xs font-black text-white">{h.sugar_added}g</div></div>
                    <div className="bg-black p-2 text-center"><div className="text-[8px] text-[#6b6b73] uppercase mb-1">VOLUME</div><div className="text-xs font-black text-white">{h.volume_final}L</div></div>
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

function InputBox({ label, value, onChange, active }: any) {
    return (
        <div className="space-y-1">
            <label className="text-[8px] text-[#6b6b73] uppercase font-black tracking-widest">{label}</label>
            <input type="number" value={value} onChange={e => onChange(Number(e.target.value))} className={`w-full bg-black ${active ? 'border-[#d4af37]' : 'border-[#1f1f23]'} border p-3 text-white font-mono text-center outline-none`} />
        </div>
    );
}

function StatBox({ label, value, highlight }: any) {
    return (
        <div className="bg-black p-4 text-center border border-[#1f1f23]">
            <div className="text-[8px] text-[#6b6b73] uppercase font-black mb-1">{label}</div>
            <div className={`text-3xl font-black italic tracking-tighter ${highlight ? 'text-[#d4af37]' : 'text-white'}`}>{value}</div>
        </div>
    );
}