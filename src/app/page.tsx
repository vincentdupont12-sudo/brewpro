"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

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

  // --- LE MOTEUR DE RECETTE POUR LES NULS ---
  // Cette fonction transforme tes 2 étapes en un guide complet de 7 étapes
  const generateFullGuide = (recipe: any) => {
    const s = recipe.data?.stats_json;
    const c = recipe.data?.config;
    const rawSteps = recipe.data?.steps_json || [];

    // On récupère les ingrédients par type pour les dispatcher
    const malts = rawSteps.flatMap((st: any) => st.ingredients || []).filter((ing: any) => ing.type === 'MALT');
    const hops = rawSteps.flatMap((st: any) => st.ingredients || []).filter((ing: any) => ing.type === 'HOUBLON' || ing.type === 'EPICES');
    const yeast = rawSteps.flatMap((st: any) => st.ingredients || []).filter((ing: any) => ing.type === 'LEVURE');

    return [
      {
        title: "01. PRÉPARATION & HYGIÈNE",
        desc: "L'étape la plus importante : tout ce qui touchera la bière doit être désinfecté au Chemipro.",
        action: `Rassembler le matériel et vérifier les stocks. Volume cible : ${c?.volFinal}L.`,
        items: [{ name: "Désinfectant", qty: "QS", unit: "" }]
      },
      {
        title: "02. CONCASSAGE DU GRAIN",
        desc: "Régler le moulin pour casser le grain sans le réduire en farine.",
        action: "Concasser tous les malts listés ci-dessous.",
        items: malts
      },
      {
        title: "03. EMPÂTAGE (MASH)",
        desc: `C'est ici qu'on extrait le sucre. Chauffer ${s?.waterE}L d'eau.`,
        action: `Verser le grain concassé quand l'eau atteint la température du premier palier.`,
        paliers: rawSteps.find((st: any) => st.isMashBlock)?.paliers || [{ name: "Palier Unique", temp: 67, duration: 60, desc: "Extraction standard" }]
      },
      {
        title: "04. FILTRATION & RINÇAGE",
        desc: "On sépare le jus (moût) des grains épuisés (drêches).",
        action: `Rincer doucement avec ${s?.waterR}L d'eau chauffée à 78°C.`,
        items: []
      },
      {
        title: "05. ÉBULLITION (BOIL)",
        desc: "Stérilisation du moût et ajout de l'amertume.",
        action: "Porter à ébullition pendant 60 min. Ajouter les houblons selon le timing.",
        items: hops
      },
      {
        title: "06. REFROIDISSEMENT",
        desc: "Étape critique : il faut passer de 100°C à 20°C le plus vite possible.",
        action: "Utiliser le serpentin. Une fois à 20°C, transférer en fermenteur en faisant mousser (oxygène).",
        items: []
      },
      {
        title: "07. FERMENTATION",
        desc: "Le moment où les levures travaillent pour nous.",
        action: `Saupoudrer la levure, fermer le barboteur. Laisser reposer à 20°C constants.`,
        items: yeast,
        info: `Resucrage prévu à l'embouteillage : ${c?.resucrageDosage}g/L.`
      }
    ];
  };

  return (
    <div className="min-h-screen bg-[#0b0b0c] text-[#e7e7e7] font-sans selection:bg-[#d4af37]/30">
      {/* TOP BAR */}
      <div className="h-12 border-b border-[#1f1f23] flex items-center justify-between px-6 sticky top-0 bg-[#0b0b0c]/90 backdrop-blur-md z-50">
        <div className="text-[11px] tracking-[0.4em] text-[#d4af37] cursor-pointer font-bold" onClick={() => setView("home")}>BREW CONTROL CENTER</div>
        <div className="text-[10px] text-[#6b6b73] font-mono uppercase tracking-[0.2em]">{new Date().toLocaleDateString()}</div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10">
        
        {/* --- HOME --- */}
        {view === "home" && (
          <div className="space-y-16 animate-in fade-in duration-700">
            <div className="text-center space-y-4">
              <h1 className="text-6xl font-extralight tracking-tighter text-white uppercase italic">Dashboard</h1>
              <div className="w-16 h-px bg-[#d4af37] mx-auto opacity-50" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <MenuCard title="Mes Recettes" subtitle="Accéder aux protocoles" icon="DR" onClick={() => setView("recipes")} />
              <MenuCard title="Stock Lab" subtitle="Inventaire matières" icon="IV" onClick={() => setView("stock")} />
            </div>
          </div>
        )}

        {/* --- RECIPES LIST --- */}
        {view === "recipes" && (
          <div className="animate-in slide-in-from-bottom-4 duration-500">
             <button onClick={() => setView("home")} className="text-[9px] tracking-[0.3em] text-[#6b6b73] hover:text-[#d4af37] mb-12 uppercase">← Retour Console</button>
             <div className="grid gap-6">
              {recipes.map((r) => (
                <div key={r.id} onClick={() => { setSelected(r); setView("detail"); }} className="group relative bg-[#111113] border border-[#2a2a2e] p-8 rounded hover:border-[#d4af37] transition-all cursor-pointer">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-[10px] text-[#d4af37] font-bold tracking-[0.2em] uppercase mb-2">{r.data?.stats_json?.abv}% VOL · {r.data?.stats_json?.ibu} IBU</div>
                      <h3 className="text-2xl font-light text-white group-hover:italic transition-all">{r.name}</h3>
                    </div>
                    <div className="text-[#333] group-hover:text-[#d4af37] text-3xl font-thin">→</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- DETAIL: LA RECETTE DE CUISINE POUR LES NULS --- */}
        {view === "detail" && selected && (
          <div className="animate-in fade-in duration-700 space-y-12">
            <header className="border-b border-[#1f1f23] pb-8 relative">
              <button onClick={() => setView("recipes")} className="text-[9px] tracking-[0.3em] text-[#6b6b73] hover:text-[#d4af37] mb-6 uppercase">← Choisir une autre bière</button>
              <h1 className="text-5xl font-black text-white italic uppercase tracking-tighter mb-4">{selected.name}</h1>
              <div className="flex gap-8 text-[10px] tracking-widest text-[#6b6b73] uppercase font-bold">
                 <span>ABV: <b className="text-[#d4af37]">{selected.data?.stats_json?.abv}%</b></span>
                 <span>IBU: <b className="text-[#d4af37]">{selected.data?.stats_json?.ibu}</b></span>
                 <span>VOL: <b className="text-[#d4af37]">{selected.data?.config?.volFinal}L</b></span>
              </div>
            </header>

            <div className="space-y-16">
              {generateFullGuide(selected).map((step, idx) => (
                <div key={idx} className="relative">
                  <div className="flex gap-8">
                    <div className="hidden md:flex flex-col items-center">
                      <div className="text-[#2a2a2e] text-4xl font-black italic">{String(idx + 1).padStart(2, '0')}</div>
                      <div className="w-px h-full bg-[#1f1f23] mt-4" />
                    </div>
                    <div className="flex-1 space-y-4">
                      <h3 className="text-xl font-bold text-white tracking-tight uppercase italic underline decoration-[#d4af37] underline-offset-8 decoration-2">{step.title}</h3>
                      <p className="text-sm text-[#6b6b73] leading-relaxed">{step.desc}</p>
                      
                      <div className="bg-[#111113] border border-[#1f1f23] p-6 rounded-sm space-y-4">
                        <div className="flex gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#d4af37] mt-1.5 shrink-0" />
                          <p className="text-[13px] text-white font-medium leading-relaxed uppercase tracking-wide">{step.action}</p>
                        </div>

                        {/* LISTE DES ITEMS (Malts, Houblons...) */}
                        {step.items && step.items.length > 0 && (
                          <div className="grid grid-cols-1 gap-2 mt-4">
                            {step.items.map((it: any, i: number) => (
                              <div key={i} className="flex justify-between text-[11px] bg-[#0b0b0c] p-3 border border-[#1f1f23]">
                                <span className="text-[#6b6b73] uppercase font-bold">{it.name}</span>
                                <span className="text-[#d4af37] font-mono">{it.qty} {it.unit || (it.type === 'MALT' ? 'KG' : 'G')}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* PALIERS DE TEMPÉRATURE */}
                        {step.paliers && (
                          <div className="space-y-2 mt-4">
                            {step.paliers.map((p: any, i: number) => (
                              <div key={i} className="flex justify-between items-center bg-[#d4af37]/5 border border-[#d4af37]/20 p-4">
                                <div>
                                  <div className="text-[10px] text-[#d4af37] font-black uppercase mb-1">{p.name}</div>
                                  <div className="text-[11px] text-[#6b6b73] italic">{p.desc}</div>
                                </div>
                                <div className="text-right">
                                  <div className="text-2xl font-light text-white">{p.temp}°C</div>
                                  <div className="text-[10px] font-mono text-[#6b6b73] uppercase">{p.duration} MIN</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- STOCK VIEW (Simplifiée) --- */}
        {view === "stock" && (
          <div className="animate-in slide-in-from-bottom-4 duration-500">
             <button onClick={() => setView("home")} className="text-[9px] tracking-[0.3em] text-[#6b6b73] hover:text-[#d4af37] mb-12 uppercase">← Retour Console</button>
             <div className="grid gap-2">
                {inventory.map((item) => (
                  <div key={item.id} className="flex justify-between p-4 bg-[#111113] border border-[#1f1f23]">
                    <span className="text-sm font-medium text-white uppercase tracking-tighter">{item.name}</span>
                    <span className="text-sm font-mono text-[#d4af37]">{item.quantity} {item.unit}</span>
                  </div>
                ))}
             </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MenuCard({ title, subtitle, icon, onClick }: { title: string; subtitle: string; icon: string; onClick: () => void }) {
  return (
    <div onClick={onClick} className="group bg-[#111113] border border-[#2a2a2e] p-10 rounded-sm cursor-pointer hover:border-[#d4af37] transition-all relative overflow-hidden">
      <div className="absolute -right-4 -bottom-6 text-9xl font-black text-white/[0.02] group-hover:text-[#d4af37]/[0.05] transition-all">{icon}</div>
      <h3 className="text-2xl font-light text-white uppercase tracking-tighter mb-2">{title}</h3>
      <p className="text-[10px] text-[#6b6b73] uppercase tracking-[0.3em] font-bold">{subtitle}</p>
    </div>
  );
}