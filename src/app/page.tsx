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
    } else if (timeLeft === 0) {
      clearInterval(interval);
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
        <div className="text-[10px] text-[#6b6b73] uppercase font-bold mb-1">Compte à rebours</div>
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

  // --- MOTEUR DE GÉNÉRATION DE FEUILLE DE ROUTE ---
  const generateFullGuide = (recipe: any) => {
    const s = recipe.data?.stats_json;
    const c = recipe.data?.config;
    const rawSteps = recipe.data?.steps_json || [];

    const malts = rawSteps.flatMap((st: any) => st.ingredients || []).filter((ing: any) => ing.type === 'MALT');
    const hops = rawSteps.flatMap((st: any) => st.ingredients || []).filter((ing: any) => {
        const t = ing.type?.toUpperCase();
        return t === 'HOUBLON' || t === 'EPICES' || t === 'HOP';
    });
    const yeast = rawSteps.flatMap((st: any) => st.ingredients || []).filter((ing: any) => ing.type === 'LEVURE');

    return [
      {
        title: "01. PRÉPARATION",
        desc: "L'hygiène est la clé. Tout ce qui touche le moût après l'ébullition doit être stérile.",
        action: "Nettoyer et désinfecter la cuve, le fourquet et le fermenteur au Chemipro.",
        important: `VOLUME CIBLE FINAL : ${c?.volFinal || 20} LITRES`
      },
      {
        title: "02. CONCASSAGE",
        desc: "Casser le grain pour libérer l'amidon sans déchirer l'enveloppe.",
        action: "Passer les malts suivants au moulin.",
        items: malts
      },
      {
        title: "03. EMPÂTAGE (MASH)",
        desc: "Extraction des sucres par infusion dans l'eau chaude.",
        action: `Verser ${s?.waterE || 0}L d'eau et chauffer jusqu'au premier palier.`,
        important: `EAU D'EMPÂTAGE : ${s?.waterE || 0} LITRES`,
        paliers: (rawSteps.find((st: any) => st.isMashBlock)?.paliers || []).map((p: any) => {
            let info = "Palier standard.";
            if (p.temp <= 54) info = "PROTÉINIQUE : Aide à la limpidité et à la tenue de mousse.";
            if (p.temp >= 60 && p.temp <= 65) info = "MALTOSE : Transforme l'amidon en sucre fermentescible (Alcool).";
            if (p.temp >= 66 && p.temp <= 70) info = "DEXTRINES : Produit des sucres non-fermentescibles (Corps & Rondeur).";
            if (p.temp >= 75) info = "MASH OUT : Désactive les enzymes et fluidifie le moût pour la filtration.";
            return { ...p, autoDesc: info };
        }),
        timer: (rawSteps.find((st: any) => st.isMashBlock)?.paliers || []).reduce((acc: number, p: any) => acc + (p.duration || 0), 0)
      },
      {
        title: "04. FILTRATION & RINÇAGE",
        desc: "On sépare le 'jus' (moût) du grain épuisé (drêches).",
        action: `Rincer le gâteau de grains avec ${s?.waterR || 0}L d'eau chaude.`,
        important: `EAU DE RINÇAGE : ${s?.waterR || 0}L À 78°C`,
        instruction: "Recycler les 2-3 premiers litres (les reverser sur le grain) jusqu'à ce que le moût soit clair."
      },
      {
        title: "05. ÉBULLITION (BOIL)",
        desc: "Stérilisation, évaporation et amertume.",
        action: "Porter à ébullition franche (gros bouillons) pendant 60 min.",
        timer: 60,
        items: hops.map((h: any) => {
            const timeMatch = h.name.match(/\d+/);
            return { ...h, timing: timeMatch ? timeMatch[0] : "60" };
        })
      },
      {
        title: "06. REFROIDISSEMENT",
        desc: "Passage de 100°C à 20°C pour éviter les infections.",
        action: "Utiliser le serpentin refroidisseur. Une fois à 20°C, transférer en fermenteur.",
        instruction: "Oxygéner le moût en le laissant tomber vigoureusement dans le fermenteur."
      },
      {
        title: "07. FERMENTATION",
        desc: "Les levures transforment le sucre en alcool et en CO2.",
        action: "Ajouter la levure, fermer le fermenteur et poser le barboteur.",
        items: yeast,
        info: `RESUCRAGE À L'EMBOUTEILLAGE : ${c?.resucrageDosage || 7}G / LITRE`
      }
    ];
  };

  return (
    <div className="min-h-screen bg-[#0b0b0c] text-[#e7e7e7] font-sans selection:bg-[#d4af37]/30">
      {/* HEADER */}
      <div className="h-12 border-b border-[#1f1f23] flex items-center justify-between px-6 sticky top-0 bg-[#0b0b0c]/90 backdrop-blur-md z-50">
        <div className="text-[11px] tracking-[0.4em] text-[#d4af37] font-bold cursor-pointer" onClick={() => setView("home")}>BREW CONTROL CENTER</div>
        <div className="text-[9px] text-[#6b6b73] font-mono uppercase tracking-[0.2em]">System_v2.5_Stable</div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10">
        
        {/* VUE ACCUEIL */}
        {view === "home" && (
          <div className="py-20 space-y-8 animate-in fade-in duration-1000">
            <MenuCard title="Mode Brasseur" subtitle={`${recipes.length} Recettes de cuisine`} icon="BR" onClick={() => setView("recipes")} />
            <MenuCard title="Stock & Cave" subtitle="Gérer les ingrédients" icon="ST" onClick={() => setView("stock")} />
          </div>
        )}

        {/* VUE LISTE RECETTES */}
        {view === "recipes" && (
          <div className="animate-in slide-in-from-bottom-4 duration-500">
             <button onClick={() => setView("home")} className="text-[9px] tracking-[0.3em] text-[#6b6b73] hover:text-[#d4af37] mb-10 uppercase transition-colors">← Retour Console</button>
             <div className="grid gap-4">
              {recipes.map((r) => (
                <div key={r.id} onClick={() => { setSelected(r); setView("detail"); }} className="group p-6 bg-[#111113] border border-[#2a2a2e] rounded hover:border-[#d4af37] cursor-pointer transition-all">
                  <div className="flex justify-between items-center">
                    <div>
                        <div className="text-[10px] text-[#d4af37] font-bold tracking-widest uppercase mb-1">{r.data?.stats_json?.abv}% VOL</div>
                        <h3 className="text-xl font-light text-white group-hover:italic uppercase">{r.name}</h3>
                    </div>
                    <span className="text-[#333] group-hover:text-[#d4af37] transition-colors">→</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VUE DÉTAILLÉE (FEUILLE DE MARCHE) */}
        {view === "detail" && selected && (
          <div className="animate-in fade-in duration-700 space-y-12 pb-20">
            <header className="border-b border-[#1f1f23] pb-8">
              <button onClick={() => setView("recipes")} className="text-[9px] tracking-[0.3em] text-[#6b6b73] hover:text-[#d4af37] mb-6 uppercase transition-colors">← Choisir une autre bière</button>
              <h1 className="text-5xl font-black text-white italic uppercase tracking-tighter leading-none mb-4">{selected.name}</h1>
              <div className="flex gap-6 text-[10px] font-bold tracking-widest text-[#6b6b73] uppercase">
                <span className="bg-[#111113] px-3 py-1 border border-[#1f1f23]">ABV: <span className="text-[#d4af37]">{selected.data?.stats_json?.abv}%</span></span>
                <span className="bg-[#111113] px-3 py-1 border border-[#1f1f23]">IBU: <span className="text-[#d4af37]">{selected.data?.stats_json?.ibu}</span></span>
              </div>
            </header>

            <div className="space-y-20">
              {generateFullGuide(selected).map((step, idx) => (
                <div key={idx} className="relative">
                  {/* Titre Étape */}
                  <div className="flex items-center gap-4 mb-6">
                    <span className="text-3xl font-black italic text-[#1f1f23] group-hover:text-[#d4af37]/20 transition-colors">{String(idx + 1).padStart(2, '0')}</span>
                    <h2 className="text-xl font-bold text-white uppercase tracking-tight italic underline decoration-[#d4af37] underline-offset-8 decoration-2">{step.title}</h2>
                  </div>

                  <div className="bg-[#111113] border border-[#1f1f23] p-6 rounded-sm relative overflow-hidden group hover:border-[#d4af37]/30 transition-all">
                    <p className="text-[12px] text-[#6b6b73] mb-4 leading-relaxed">{step.desc}</p>
                    
                    <div className="flex gap-3 mb-6">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#d4af37] mt-1.5 shrink-0" />
                        <p className="text-sm text-white font-bold uppercase leading-relaxed">{step.action}</p>
                    </div>

                    {step.important && (
                      <div className="bg-[#d4af37]/5 text-[#d4af37] p-4 text-[11px] font-black tracking-widest border-l-2 border-[#d4af37] mb-6 uppercase">
                        {step.important}
                      </div>
                    )}

                    {/* PALIERS TEMPÉRATURE */}
                    {step.paliers && step.paliers.length > 0 && (
                      <div className="space-y-3 mb-6">
                        {step.paliers.map((p: any, i: number) => (
                          <div key={i} className="bg-[#0b0b0c] p-4 border border-[#1f1f23]">
                             <div className="flex justify-between items-center mb-1">
                                <span className="text-white font-bold text-sm">{p.temp}°C</span>
                                <span className="text-[#d4af37] font-mono text-xs">{p.duration} MIN</span>
                             </div>
                             <p className="text-[10px] text-[#6b6b73] italic leading-snug">{p.autoDesc}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* INGRÉDIENTS (TYPE ÉBULLITION OU AUTRE) */}
                    {step.items && step.items.length > 0 && (
                      <div className="grid gap-2 mb-6">
                        {step.items.map((it: any, i: number) => (
                          <div key={i} className="flex justify-between items-center p-3 bg-[#0b0b0c] border border-[#1f1f23]">
                            <div>
                                <div className="text-[11px] text-white font-bold uppercase">{it.name}</div>
                                {it.timing && <div className="text-[9px] text-[#a88f2a] font-black uppercase mt-0.5">⏱ À AJOUTER À T-{it.timing} MIN</div>}
                            </div>
                            <div className="text-xs font-mono text-[#d4af37] font-bold">{it.qty} {it.unit || (it.type === 'MALT' ? 'KG' : 'G')}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {step.instruction && (
                        <p className="text-[11px] text-[#6b6b73] italic border-t border-[#1f1f23] pt-4 mt-2">Note : {step.instruction}</p>
                    )}

                    {step.info && (
                        <div className="text-[10px] font-bold text-[#d4af37] tracking-widest uppercase mt-4">{step.info}</div>
                    )}

                    {/* TIMER DYNAMIQUE */}
                    {step.timer && step.timer > 0 && <StepTimer minutes={step.timer} />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VUE STOCK */}
        {view === "stock" && (
           <div className="animate-in slide-in-from-bottom-4 duration-500">
              <button onClick={() => setView("home")} className="text-[9px] tracking-[0.3em] text-[#6b6b73] hover:text-[#d4af37] mb-10 uppercase transition-colors">← Retour</button>
              <div className="grid gap-2">
                {inventory.map(i => (
                  <div key={i.id} className="flex justify-between p-5 bg-[#111113] border border-[#1f1f23] hover:border-[#d4af37]/30 transition-all">
                    <span className="text-sm font-bold text-white uppercase italic tracking-tight">{i.name}</span>
                    <span className="text-sm font-mono text-[#d4af37]">{i.quantity} {i.unit}</span>
                  </div>
                ))}
              </div>
           </div>
        )}
      </div>
    </div>
  );
}

// --- COMPOSANTS UI ---
function MenuCard({ title, subtitle, icon, onClick }: { title: string; subtitle: string; icon: string; onClick: () => void }) {
  return (
    <div onClick={onClick} className="group p-10 bg-[#111113] border border-[#2a2a2e] rounded hover:border-[#d4af37] cursor-pointer transition-all relative overflow-hidden">
      <div className="absolute right-[-10px] bottom-[-20px] text-9xl font-black text-white/[0.02] group-hover:text-[#d4af37]/[0.05] transition-all">{icon}</div>
      <h3 className="text-3xl font-extralight text-white uppercase italic tracking-tighter mb-2 group-hover:pl-2 transition-all">{title}</h3>
      <p className="text-[10px] text-[#6b6b73] font-bold uppercase tracking-[0.4em]">{subtitle}</p>
    </div>
  );
}