"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

// --- COMPOSANT TIMER ---
function StepTimer({ minutes }: { minutes: number }) {
  const [timeLeft, setTimeLeft] = useState(minutes * 60);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    } else if (timeLeft === 0 && isActive) {
      clearInterval(interval);
      alert("⏲ TEMPS ÉCOULÉ !");
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="flex items-center gap-4 bg-[#0b0b0c] p-4 border border-[#d4af37]/30 rounded mt-4 mb-2">
      <div>
        <div className="text-[10px] text-[#6b6b73] uppercase font-bold mb-1">Minuteur</div>
        <div className="text-3xl font-mono font-bold text-[#d4af37] leading-none">{formatTime(timeLeft)}</div>
      </div>
      <button 
        onClick={() => setIsActive(!isActive)}
        className={`ml-auto px-6 py-2 text-[10px] font-bold uppercase tracking-widest rounded transition-all ${
          isActive ? 'bg-red-500/20 text-red-500 border border-red-500/50' : 'bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/50'
        }`}
      >
        {isActive ? "Pause" : "Démarrer"}
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

  // États pour le calculateur
  const [di, setDi] = useState<number>(1050);
  const [df, setDf] = useState<number>(1010);
  const [realVol, setRealVol] = useState<number>(20);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const { data: r } = await supabase.from("recipes").select("*").order('created_at', { ascending: false });
    const { data: i } = await supabase.from("inventory").select("*").order('name');
    const { data: h } = await supabase.from("brews").select("*").order('brew_date', { ascending: false });
    if (r) setRecipes(r);
    if (i) setInventory(i);
    if (h) setHistory(h);
  };

  const saveBrew = async () => {
    const abv = (di - df) / 7.5;
    const sugar = realVol * (selected.data?.config?.resucrageDosage || 7);
    
    const { error } = await supabase.from("brews").insert([
      {
        recipe_name: selected.name,
        di,
        df,
        volume_final: realVol,
        abv_calc: parseFloat(abv.toFixed(1)),
        sugar_added: Math.round(sugar),
      }
    ]);

    if (!error) {
      alert("Brassin archivé avec succès !");
      fetchData();
      setView("history");
    }
  };

  const generateFullGuide = (recipe: any) => {
    const s = recipe.data?.stats_json;
    const c = recipe.data?.config;
    const rawSteps = recipe.data?.steps_json || [];
    const malts = rawSteps.flatMap((st: any) => st.ingredients || []).filter((ing: any) => ing.type === 'MALT');
    const hops = rawSteps.flatMap((st: any) => st.ingredients || []).filter((ing: any) => (ing.type || '').toUpperCase().includes('HOP') || (ing.type || '').toUpperCase().includes('HOUBLON'));
    const yeast = rawSteps.flatMap((st: any) => st.ingredients || []).filter((ing: any) => ing.type === 'LEVURE');

    return [
      { title: "01. PRÉPARATION", desc: "Hygiène stricte au Chemipro.", action: "Désinfecter tout le matériel.", important: `CIBLE : ${c?.volFinal || 20}L` },
      { title: "02. CONCASSAGE", desc: "Moudre le grain.", action: "Concasser les malts.", items: malts },
      { 
        title: "03. EMPÂTAGE", 
        action: `Verser ${s?.waterE || 0}L d'eau.`, 
        important: `EAU EMPÂTAGE : ${s?.waterE || 0}L`,
        paliers: (rawSteps.find((st: any) => st.isMashBlock)?.paliers || []).map((p: any) => {
          let info = "Palier standard.";
          if (p.temp <= 54) info = "PROTÉINES : Mousse & Limpidité.";
          if (p.temp >= 60 && p.temp <= 65) info = "MALTOSE : Création de l'alcool.";
          if (p.temp >= 66 && p.temp <= 70) info = "DEXTRINES : Corps & Moelleux.";
          return { ...p, autoDesc: info };
        }),
        timer: (rawSteps.find((st: any) => st.isMashBlock)?.paliers || []).reduce((acc: number, p: any) => acc + (p.duration || 0), 0)
      },
      { title: "04. FILTRATION", action: `Rincer avec ${s?.waterR || 0}L d'eau à 78°C.`, important: `EAU RINÇAGE : ${s?.waterR || 0}L` },
      { title: "05. ÉBULLITION", action: "Bouillir 60 min sans couvercle.", timer: 60, items: hops.map((h: any) => ({ ...h, timing: h.name.match(/\d+/) ? h.name.match(/\d+/)[0] : "60" })) },
      { title: "06. FERMENTATION", action: "Refroidir à 20°C et ensemencer.", items: yeast }
    ];
  };

  return (
    <div className="min-h-screen bg-[#0b0b0c] text-[#e7e7e7] font-sans italic-none">
      {/* HEADER */}
      <div className="h-14 border-b border-[#1f1f23] flex items-center justify-between px-6 sticky top-0 bg-[#0b0b0c]/90 backdrop-blur-md z-50">
        <div className="text-[11px] tracking-[0.4em] text-[#d4af37] font-bold cursor-pointer" onClick={() => setView("home")}>BREW MASTER OS</div>
        <div className="flex gap-4">
            <button onClick={() => setView("history")} className="text-[9px] text-[#6b6b73] hover:text-white uppercase tracking-widest">Archives</button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10">
        
        {/* HOME */}
        {view === "home" && (
          <div className="py-20 space-y-6 animate-in fade-in duration-700">
            <MenuCard title="Brasser" subtitle="Lancer une recette" icon="♨" onClick={() => setView("recipes")} />
            <MenuCard title="Archives" subtitle="Historique des brassins" icon="⚗" onClick={() => setView("history")} />
            <MenuCard title="Stock" subtitle="Matières premières" icon="📦" onClick={() => setView("stock")} />
          </div>
        )}

        {/* LISTE RECETTES */}
        {view === "recipes" && (
          <div className="space-y-4">
             <button onClick={() => setView("home")} className="text-[9px] text-[#6b6b73] mb-8 uppercase tracking-widest">← Menu</button>
             {recipes.map(r => (
               <div key={r.id} onClick={() => { setSelected(r); setView("detail"); }} className="p-6 bg-[#111113] border border-[#1f1f23] rounded hover:border-[#d4af37] cursor-pointer transition-all">
                 <h3 className="text-lg font-bold text-white uppercase italic">{r.name}</h3>
                 <p className="text-[10px] text-[#d4af37] tracking-widest font-bold">{r.data?.stats_json?.abv}% VOL</p>
               </div>
             ))}
          </div>
        )}

        {/* FEUILLE DE MARCHE + CALCULATEUR */}
        {view === "detail" && selected && (
          <div className="space-y-16 pb-20 animate-in fade-in">
            <header className="border-b border-[#1f1f23] pb-8">
              <button onClick={() => setView("recipes")} className="text-[9px] text-[#6b6b73] mb-4 uppercase">← Retour</button>
              <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter">{selected.name}</h1>
            </header>

            {generateFullGuide(selected).map((step, idx) => (
              <div key={idx} className="space-y-4">
                <h2 className="text-sm font-black text-[#d4af37] uppercase tracking-[0.3em]">{step.title}</h2>
                <div className="bg-[#111113] border border-[#1f1f23] p-6 rounded-sm">
                  <p className="text-sm font-bold text-white uppercase mb-4">{step.action}</p>
                  {step.important && <div className="bg-[#d4af37]/10 text-[#d4af37] p-3 text-[10px] font-black border-l-2 border-[#d4af37] mb-4 uppercase">{step.important}</div>}
                  
                  {step.paliers?.map((p: any, i: number) => (
                    <div key={i} className="mb-2 p-3 bg-[#0b0b0c] border border-[#1f1f23]">
                      <div className="flex justify-between text-xs font-bold text-white"><span>{p.temp}°C</span><span>{p.duration} MIN</span></div>
                      <p className="text-[9px] text-[#6b6b73] mt-1 italic">{p.autoDesc}</p>
                    </div>
                  ))}

                  {step.items?.map((it: any, i: number) => (
                    <div key={i} className="flex justify-between p-2 text-[11px] border-b border-[#1f1f23] last:border-none">
                      <span className="text-[#6b6b73] uppercase">{it.name} {it.timing && <b className="text-[#d4af37] ml-2">T-{it.timing}</b>}</span>
                      <span className="text-white font-mono">{it.qty} {it.unit || (it.type === 'MALT' ? 'KG' : 'G')}</span>
                    </div>
                  ))}
                  {step.timer && step.timer > 0 && <StepTimer minutes={step.timer} />}
                </div>
              </div>
            ))}

            {/* LE CALCULATEUR D'EMBOUTEILLAGE */}
            <div className="mt-20 pt-10 border-t-2 border-[#d4af37]">
              <h2 className="text-xl font-black text-white italic uppercase mb-6">Fin de fermentation & Alcool</h2>
              <div className="bg-[#111113] border border-[#d4af37]/30 p-6 space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div><label className="text-[9px] text-[#6b6b73] uppercase font-bold">DI (Initiale)</label><input type="number" value={di} onChange={e => setDi(Number(e.target.value))} className="w-full bg-black border border-[#1f1f23] p-2 text-white font-mono mt-1" /></div>
                  <div><label className="text-[9px] text-[#6b6b73] uppercase font-bold">DF (Finale)</label><input type="number" value={df} onChange={e => setDf(Number(e.target.value))} className="w-full bg-black border border-[#1f1f23] p-2 text-white font-mono mt-1" /></div>
                  <div><label className="text-[9px] text-[#6b6b73] uppercase font-bold">Vol (L)</label><input type="number" value={realVol} onChange={e => setRealVol(Number(e.target.value))} className="w-full bg-black border border-[#1f1f23] p-2 text-white font-mono mt-1" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-black p-4 text-center border border-[#1f1f23]">
                    <div className="text-[9px] text-[#6b6b73] uppercase">Alcool Réel</div>
                    <div className="text-3xl font-black text-[#d4af37] italic uppercase">{((di - df) / 7.5).toFixed(1)}%</div>
                  </div>
                  <div className="bg-black p-4 text-center border border-[#1f1f23]">
                    <div className="text-[9px] text-[#6b6b73] uppercase">Sucre Total</div>
                    <div className="text-3xl font-black text-white italic uppercase">{(realVol * (selected.data?.config?.resucrageDosage || 7)).toFixed(0)}g</div>
                  </div>
                </div>
                <button onClick={saveBrew} className="w-full bg-[#d4af37] text-black font-black py-4 uppercase tracking-[0.2em] hover:bg-white transition-all text-sm italic">Archiver ce Brassin 💾</button>
              </div>
            </div>
          </div>
        )}

        {/* VUE HISTORIQUE */}
        {view === "history" && (
          <div className="space-y-6 animate-in slide-in-from-right">
            <button onClick={() => setView("home")} className="text-[9px] text-[#6b6b73] mb-8 uppercase tracking-widest">← Menu</button>
            <h2 className="text-2xl font-black text-white italic uppercase mb-8">Journal de Brasserie</h2>
            {history.map(h => (
              <div key={h.id} className="p-5 bg-[#111113] border-l-2 border-[#d4af37] border-y border-r border-[#1f1f23]">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-white uppercase">{h.recipe_name}</h3>
                    <span className="text-[10px] text-[#6b6b73]">{new Date(h.brew_date).toLocaleDateString()}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                    <div className="text-center bg-black p-2"><div className="text-[8px] text-[#6b6b73] uppercase">ABV</div><div className="text-xs font-bold text-[#d4af37]">{h.abv_calc}%</div></div>
                    <div className="text-center bg-black p-2"><div className="text-[8px] text-[#6b6b73] uppercase">Sucre</div><div className="text-xs font-bold text-white">{h.sugar_added}g</div></div>
                    <div className="text-center bg-black p-2"><div className="text-[8px] text-[#6b6b73] uppercase">Volume</div><div className="text-xs font-bold text-white">{h.volume_final}L</div></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* VUE STOCK */}
        {view === "stock" && (
          <div className="space-y-4">
            <button onClick={() => setView("home")} className="text-[9px] text-[#6b6b73] mb-8 uppercase tracking-widest">← Menu</button>
            {inventory.map(i => (
              <div key={i.id} className="flex justify-between p-4 bg-[#111113] border border-[#1f1f23]">
                <span className="text-xs font-bold text-white uppercase">{i.name}</span>
                <span className="text-xs font-mono text-[#d4af37]">{i.quantity} {i.unit}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MenuCard({ title, subtitle, icon, onClick }: { title: string, subtitle: string, icon: string, onClick: () => void }) {
  return (
    <div onClick={onClick} className="group p-8 bg-[#111113] border border-[#1f1f23] rounded-sm hover:border-[#d4af37] cursor-pointer transition-all relative overflow-hidden">
      <div className="absolute right-[-10px] bottom-[-10px] text-7xl opacity-5 group-hover:opacity-10 transition-all">{icon}</div>
      <h3 className="text-2xl font-black text-white italic uppercase mb-1">{title}</h3>
      <p className="text-[9px] text-[#6b6b73] uppercase tracking-[0.2em] font-bold">{subtitle}</p>
    </div>
  );
}