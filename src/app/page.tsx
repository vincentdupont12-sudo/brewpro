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
      if ("vibrate" in navigator) navigator.vibrate([500, 200, 500]);
      alert(`FIN DE L'ÉTAPE : ${label}`);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, label]);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="flex items-center gap-4 bg-[#0b0b0c] p-4 border border-[#d4af37]/20 rounded-md mt-4">
      <div className="flex-1">
        <div className="text-[9px] text-[#6b6b73] uppercase font-bold tracking-widest mb-1">Chronomètre étape</div>
        <div className="text-3xl font-mono font-black text-[#d4af37] leading-none">{formatTime(timeLeft)}</div>
      </div>
      <button 
        onClick={() => setIsActive(!isActive)}
        className={`px-6 py-3 text-[10px] font-black uppercase tracking-tighter rounded transition-all ${
          isActive ? 'bg-red-500/10 text-red-500 border border-red-500/50' : 'bg-[#d4af37]/10 text-[#d4af37] border border-[#d4af37]/50'
        }`}
      >
        {isActive ? "PAUSE" : "LANCER"}
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

  // États du calculateur (avec persistance locale pour ne pas perdre la DI pendant 3 semaines)
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
    const sugarPerL = selected.data?.config?.resucrageDosage || 7;
    
    const { error } = await supabase.from("brews").insert([{
      recipe_name: selected.name,
      di,
      df,
      volume_final: realVol,
      abv_calc: parseFloat(abv.toFixed(1)),
      sugar_added: Math.round(realVol * sugarPerL),
      notes: `Brassage réussi. DF mesurée après fermentation.`
    }]);

    if (!error) {
      alert("MISSION TERMINÉE : Brassin archivé !");
      localStorage.removeItem('last_di');
      fetchData();
      setView("history");
    }
  };

  const generateFullGuide = (recipe: any) => {
    const s = recipe.data?.stats_json;
    const c = recipe.data?.config;
    const rawSteps = recipe.data?.steps_json || [];

    const malts = rawSteps.flatMap((st: any) => st.ingredients || []).filter((ing: any) => ing.type === 'MALT');
    const hops = rawSteps.flatMap((st: any) => st.ingredients || []).filter((ing: any) => (ing.type || '').match(/HOP|HOUBLON|EPICE/i));
    const yeast = rawSteps.flatMap((st: any) => st.ingredients || []).filter((ing: any) => ing.type === 'LEVURE');

    return [
      { id: 1, title: "01. PRÉPARATION", action: "Désinfection totale (Chemipro).", important: `CIBLE : ${c?.volFinal || 20}L` },
      { id: 2, title: "02. CONCASSAGE", action: "Moudre le grain sans faire de farine.", items: malts },
      { 
        id: 3, title: "03. EMPÂTAGE", 
        action: `Chauffer ${s?.waterE || 0}L d'eau.`, 
        important: `EAU D'EMPÂTAGE : ${s?.waterE || 0}L`,
        paliers: (rawSteps.find((st: any) => st.isMashBlock)?.paliers || []).map((p: any) => {
          let desc = "Palier standard.";
          if (p.temp <= 54) desc = "PROTÉINES : Pour une mousse ferme et durable.";
          if (p.temp >= 60 && p.temp <= 65) desc = "MALTOSE : On crée le sucre qui fera l'alcool.";
          if (p.temp >= 66 && p.temp <= 70) desc = "DEXTRINES : On crée le corps et la rondeur.";
          return { ...p, desc };
        }),
        timer: (rawSteps.find((st: any) => st.isMashBlock)?.paliers || []).reduce((acc: number, p: any) => acc + (p.duration || 0), 0)
      },
      { id: 4, title: "04. FILTRATION & RINÇAGE", action: `Rincer avec ${s?.waterR || 0}L d'eau à 78°C.`, important: `EAU DE RINÇAGE : ${s?.waterR || 0}L` },
      { 
        id: 5, title: "05. ÉBULLITION", 
        action: "Bouillir 60 min. Ajouter les houblons.", 
        timer: 60, 
        items: hops.map((h: any) => ({ ...h, timing: h.name.match(/\d+/) ? h.name.match(/\d+/)[0] : "60" })) 
      },
      { id: 6, title: "06. FERMENTATION", action: "Refroidir à 20°C, oxygéner et ensemencer.", items: yeast }
    ];
  };

  return (
    <div className="min-h-screen bg-[#0b0b0c] text-[#e7e7e7] font-sans">
      {/* NAV */}
      <div className="h-14 border-b border-[#1f1f23] flex items-center justify-between px-6 sticky top-0 bg-[#0b0b0c]/90 backdrop-blur-md z-50">
        <div className="text-[10px] tracking-[0.5em] text-[#d4af37] font-black cursor-pointer" onClick={() => setView("home")}>BREW MASTER</div>
        <button onClick={() => setView("history")} className="text-[9px] text-[#6b6b73] uppercase tracking-widest hover:text-[#d4af37] transition-colors">Journal de bord</button>
      </div>

      <div className="max-w-xl mx-auto px-6 py-8">
        
        {/* VUE ACCUEIL */}
        {view === "home" && (
          <div className="py-12 space-y-4 animate-in fade-in duration-500">
            <MenuButton title="LANCER UN BRASSIN" sub="Suivre une recette étape par étape" icon="🔥" onClick={() => setView("recipes")} color="border-[#d4af37]" />
            <MenuButton title="ARCHIVES" sub="Historique et mesures de densités" icon="📋" onClick={() => setView("history")} color="border-[#1f1f23]" />
            <MenuButton title="STOCK" sub="Inventaire des matières premières" icon="🌾" onClick={() => setView("stock")} color="border-[#1f1f23]" />
          </div>
        )}

        {/* LISTE DES RECETTES */}
        {view === "recipes" && (
          <div className="space-y-4 animate-in slide-in-from-right duration-300">
             <button onClick={() => setView("home")} className="text-[9px] text-[#6b6b73] mb-6 uppercase tracking-[0.2em]">← Retour Menu</button>
             <h2 className="text-2xl font-black italic uppercase tracking-tighter mb-8">Sélectionner une recette</h2>
             {recipes.map(r => (
               <div key={r.id} onClick={() => { setSelected(r); setView("detail"); }} className="p-6 bg-[#111113] border border-[#1f1f23] rounded-sm hover:border-[#d4af37] cursor-pointer transition-all">
                 <div className="text-[9px] text-[#d4af37] font-black tracking-widest mb-1 uppercase">{r.data?.stats_json?.abv}% VOL — {r.data?.stats_json?.ibu} IBU</div>
                 <h3 className="text-xl font-bold text-white uppercase italic">{r.name}</h3>
               </div>
             ))}
          </div>
        )}

        {/* FEUILLE DE ROUTE DÉTAILLÉE */}
        {view === "detail" && selected && (
          <div className="space-y-12 pb-24 animate-in fade-in">
            <header className="border-b border-[#1f1f23] pb-8">
              <button onClick={() => setView("recipes")} className="text-[9px] text-[#6b6b73] mb-4 uppercase">← Annuler</button>
              <h1 className="text-5xl font-black text-white italic uppercase tracking-tighter leading-none">{selected.name}</h1>
            </header>

            {generateFullGuide(selected).map((step) => (
              <div key={step.id} className="space-y-4">
                <div className="flex items-center gap-3">
                    <span className="text-sm font-black text-[#d4af37]">{String(step.id).padStart(2, '0')}</span>
                    <h2 className="text-sm font-black text-white uppercase tracking-[0.2em]">{step.title}</h2>
                </div>
                <div className="bg-[#111113] border border-[#1f1f23] p-6 rounded-sm">
                  <p className="text-sm font-bold text-white uppercase mb-4 leading-tight">{step.action}</p>
                  
                  {step.important && (
                    <div className="bg-[#d4af37]/5 text-[#d4af37] p-4 text-[10px] font-black border-l-2 border-[#d4af37] mb-6 uppercase tracking-widest">
                        {step.important}
                    </div>
                  )}

                  {/* PALIERS */}
                  {step.paliers?.map((p: any, i: number) => (
                    <div key={i} className="mb-3 p-4 bg-[#0b0b0c] border border-[#1f1f23]">
                      <div className="flex justify-between text-xs font-black text-white mb-1 uppercase">
                        <span>{p.temp}°C</span>
                        <span className="text-[#d4af37]">{p.duration} MIN</span>
                      </div>
                      <p className="text-[10px] text-[#6b6b73] italic">{p.desc}</p>
                    </div>
                  ))}

                  {/* INGRÉDIENTS */}
                  <div className="grid gap-2">
                    {step.items?.map((it: any, i: number) => (
                      <div key={i} className="flex justify-between items-center p-3 bg-[#0b0b0c] border border-[#1f1f23] text-[11px]">
                        <div className="flex flex-col">
                            <span className="text-white font-bold uppercase">{it.name}</span>
                            {it.timing && <span className="text-[#a88f2a] font-black text-[9px] mt-0.5 uppercase tracking-tighter">Ajout à T-{it.timing} min</span>}
                        </div>
                        <span className="text-[#d4af37] font-mono font-bold">{it.qty}{it.unit || (it.type === 'MALT' ? 'kg' : 'g')}</span>
                      </div>
                    ))}
                  </div>

                  {step.timer && step.timer > 0 && <StepTimer minutes={step.timer} label={step.title} />}
                </div>
              </div>
            ))}

            {/* LE CALCULATEUR DE FIN DE FERMENTATION */}
            <div className="mt-20 pt-10 border-t-2 border-[#d4af37]">
              <div className="flex items-center gap-2 mb-6">
                <span className="w-2 h-2 bg-[#d4af37] rounded-full animate-pulse"></span>
                <h2 className="text-xl font-black text-white italic uppercase tracking-tighter">Mesures & Embouteillage</h2>
              </div>
              
              <div className="bg-[#111113] border border-[#d4af37]/30 p-8 rounded-sm space-y-8">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] text-[#6b6b73] uppercase font-bold">D. Initiale (DI)</label>
                    <input type="number" value={di} onChange={e => { setDi(Number(e.target.value)); localStorage.setItem('last_di', e.target.value); }} className="w-full bg-black border border-[#1f1f23] p-3 text-white font-mono text-center outline-none focus:border-[#d4af37]" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] text-[#6b6b73] uppercase font-bold text-[#d4af37]">D. Finale (DF)</label>
                    <input type="number" value={df} onChange={e => setDf(Number(e.target.value))} className="w-full bg-black border border-[#d4af37]/50 p-3 text-white font-mono text-center outline-none focus:border-[#d4af37]" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] text-[#6b6b73] uppercase font-bold">Volume (L)</label>
                    <input type="number" value={realVol} onChange={e => setRealVol(Number(e.target.value))} className="w-full bg-black border border-[#1f1f23] p-3 text-white font-mono text-center outline-none focus:border-[#d4af37]" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <ResultBox label="ALCOOL RÉEL" value={`${((di - df) / 7.5).toFixed(1)}%`} sub="Vol. Alc" />
                  <ResultBox label="SUCRE TOTAL" value={`${(realVol * (selected.data?.config?.resucrageDosage || 7)).toFixed(0)}g`} sub="À dissoudre" color="text-[#d4af37]" />
                </div>

                <div className="text-[10px] text-[#6b6b73] italic text-center px-4 leading-relaxed">
                  Note : La DF doit être stable sur 48h avant l'embouteillage. 
                  Une DF trop haute indique une fermentation incomplète (Danger explosion).
                </div>

                <button onClick={saveToHistory} className="w-full bg-[#d4af37] text-black font-black py-5 uppercase tracking-[0.2em] hover:bg-white transition-all text-sm italic shadow-lg shadow-[#d4af37]/10">
                  CLÔTURER LE BRASSIN & ARCHIVER 💾
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VUE HISTORIQUE / ARCHIVES */}
        {view === "history" && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4">
            <button onClick={() => setView("home")} className="text-[9px] text-[#6b6b73] mb-6 uppercase tracking-widest">← Menu</button>
            <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-8">Journal de Brasserie</h2>
            {history.length === 0 && <p className="text-[#6b6b73] text-center py-10 italic">Aucun brassin archivé pour le moment.</p>}
            {history.map(h => (
              <div key={h.id} className="p-6 bg-[#111113] border-l-4 border-[#d4af37] border-y border-r border-[#1f1f23] rounded-sm">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="font-black text-white uppercase italic tracking-tighter">{h.recipe_name}</h3>
                    <span className="text-[9px] text-[#6b6b73] font-mono">{new Date(h.brew_date).toLocaleDateString()}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                    <div className="bg-black/50 p-2 text-center rounded border border-[#1f1f23]">
                      <div className="text-[8px] text-[#6b6b73] uppercase mb-1">ABV Final</div>
                      <div className="text-sm font-black text-[#d4af37]">{h.abv_calc}%</div>
                    </div>
                    <div className="bg-black/50 p-2 text-center rounded border border-[#1f1f23]">
                      <div className="text-[8px] text-[#6b6b73] uppercase mb-1">Sucre</div>
                      <div className="text-sm font-black text-white">{h.sugar_added}g</div>
                    </div>
                    <div className="bg-black/50 p-2 text-center rounded border border-[#1f1f23]">
                      <div className="text-[8px] text-[#6b6b73] uppercase mb-1">Vol. Réel</div>
                      <div className="text-sm font-black text-white">{h.volume_final}L</div>
                    </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* VUE STOCK */}
        {view === "stock" && (
          <div className="space-y-4 animate-in slide-in-from-left">
            <button onClick={() => setView("home")} className="text-[9px] text-[#6b6b73] mb-6 uppercase tracking-widest">← Menu</button>
            <h2 className="text-2xl font-black italic uppercase mb-8">État des Stocks</h2>
            {inventory.map(i => (
              <div key={i.id} className="flex justify-between items-center p-4 bg-[#111113] border border-[#1f1f23] group hover:border-[#d4af37]/50 transition-colors">
                <span className="text-xs font-bold text-white uppercase tracking-tighter">{i.name}</span>
                <span className="text-sm font-mono text-[#d4af37] font-black">{i.quantity} <span className="text-[10px] text-[#6b6b73]">{i.unit}</span></span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// --- SOUS-COMPOSANTS UI ---

function MenuButton({ title, sub, icon, onClick, color }: any) {
    return (
        <button onClick={onClick} className={`w-full p-8 bg-[#111113] border ${color} rounded-sm text-left group hover:bg-[#d4af37]/5 transition-all relative overflow-hidden`}>
            <div className="absolute right-[-10px] bottom-[-15px] text-8xl opacity-[0.03] group-hover:opacity-[0.07] transition-all grayscale">{icon}</div>
            <h3 className="text-2xl font-black italic text-white uppercase tracking-tighter leading-none mb-2">{title}</h3>
            <p className="text-[9px] text-[#6b6b73] font-bold uppercase tracking-[0.2em]">{sub}</p>
        </button>
    );
}

function ResultBox({ label, value, sub, color = "text-white" }: any) {
    return (
        <div className="bg-black p-5 text-center border border-[#1f1f23] rounded-sm">
            <div className="text-[8px] text-[#6b6b73] uppercase font-black mb-1">{label}</div>
            <div className={`text-4xl font-black italic tracking-tighter leading-none ${color}`}>{value}</div>
            <div className="text-[8px] text-[#6b6b73] uppercase font-bold mt-2 tracking-widest">{sub}</div>
        </div>
    );
}