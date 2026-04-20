"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function BrewControlApp() {
  const [view, setView] = useState<"home" | "recipes" | "stock" | "detail">("home");
  const [recipes, setRecipes] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: r } = await supabase.from("recipes").select("*").order('created_at', { ascending: false });
    const { data: i } = await supabase.from("inventory").select("*").order('name');
    if (r) setRecipes(r);
    if (i) setInventory(i);
  };

  // Fonction de tri pour les ingrédients (Poids décroissant)
  const sortIngredients = (ingredients: any[]) => {
    return [...ingredients].sort((a, b) => b.qty - a.qty);
  };

  return (
    <div className="min-h-screen bg-[#0b0b0c] text-[#e7e7e7] font-sans tracking-tight">
      {/* TOP BAR */}
      <div className="h-12 border-b border-[#1f1f23] flex items-center justify-between px-6 sticky top-0 bg-[#0b0b0c]/80 backdrop-blur-md z-50">
        <div className="text-[13px] tracking-[0.25em] text-[#d4af37] cursor-pointer" onClick={() => setView("home")}>
          BREW CONTROL
        </div>
        <div className="text-[12px] text-[#6b6b73]">{new Date().toLocaleTimeString()}</div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10">
        
        {/* --- ACCUEIL --- */}
        {view === "home" && (
          <div className="space-y-12 animate-in fade-in duration-500">
            <header className="py-10 text-center">
              <h1 className="text-5xl font-extralight tracking-tighter text-white uppercase italic mb-2">Main Console</h1>
              <p className="text-[10px] tracking-[0.4em] text-[#6b6b73] uppercase font-bold text-yellow-600/50">System Ready</p>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <MenuCard title="Lancer un Brassin" subtitle="Recettes synchronisées" icon="→" onClick={() => setView("recipes")} />
              <MenuCard title="Gestion des Stocks" subtitle="Matières premières" icon="⌘" onClick={() => setView("stock")} />
            </div>
          </div>
        )}

        {/* --- LISTE DES RECETTES (CORRIGÉE) --- */}
        {view === "recipes" && (
          <div className="animate-in slide-in-from-right duration-500">
             <button onClick={() => setView("home")} className="text-[10px] tracking-[0.3em] text-[#6b6b73] hover:text-[#d4af37] mb-8">← BACK TO CONSOLE</button>
             <SectionTitle title="MES RECETTES" />
             <div className="grid gap-4 mt-8">
              {recipes.map((r) => (
                <div 
                  key={r.id} 
                  onClick={() => { setSelected(r); setView("detail"); }} // CLIC ACTIVÉ ICI
                  className="group bg-[#111113] border border-[#2a2a2e] rounded-md px-8 py-6 cursor-pointer hover:border-[#d4af37] hover:bg-[#161619] transition-all"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-[11px] text-[#a88f2a] tracking-widest mb-1 font-bold uppercase">{r.data?.stats_json?.abv}% VOL</div>
                      <div className="text-xl font-light tracking-tight group-hover:text-white">{r.name}</div>
                    </div>
                    <div className="text-[#6b6b73] group-hover:text-[#d4af37] transform group-hover:translate-x-1 transition">→</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- STOCK --- */}
        {view === "stock" && (
          <div className="animate-in slide-in-from-right duration-500">
             <button onClick={() => setView("home")} className="text-[10px] tracking-[0.3em] text-[#6b6b73] hover:text-[#d4af37] mb-8">← BACK TO CONSOLE</button>
             <SectionTitle title="INVENTAIRE" />
             <div className="bg-[#111113] border border-[#2a2a2e] rounded-md overflow-hidden mt-8">
                {inventory.map((item) => (
                  <div key={item.id} className="flex justify-between px-6 py-4 border-b border-[#1f1f23] last:border-none">
                    <div><div className="text-[13px] font-medium text-white">{item.name}</div><div className="text-[10px] text-[#6b6b73] uppercase">{item.type}</div></div>
                    <div className="text-[14px] font-mono">{item.quantity} <span className="text-[#a88f2a] text-[11px]">{item.unit}</span></div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {/* --- DÉTAIL / FEUILLE DE MARCHE (TRIÉ & COLONNES) --- */}
        {view === "detail" && selected && (
          <div className="space-y-12 animate-in fade-in duration-700">
            <div className="flex items-end justify-between border-b border-[#1f1f23] pb-8">
              <button onClick={() => setView("recipes")} className="text-[10px] tracking-[0.3em] text-[#6b6b73] hover:text-[#d4af37]">← LISTE RECETTES</button>
              <h1 className="text-4xl font-extralight text-white uppercase italic">{selected.name}</h1>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <StatBlock label="ALCOOL" value={`${selected.data?.stats_json?.abv}%`} />
              <StatBlock label="AMERTUME" value={`${selected.data?.stats_json?.ibu} IBU`} />
              <StatBlock label="EAU EMP." value={`${selected.data?.stats_json?.waterE}L`} />
              <StatBlock label="EAU RIN." value={`${selected.data?.stats_json?.waterR}L`} />
            </div>

            <div className="space-y-10">
              <SectionTitle title="SÉQUENCE DE BRASSAGE" />
              {selected.data?.steps_json?.map((step: any, idx: number) => (
                <div key={step.id} className="relative pl-12 border-l border-[#1f1f23]">
                  <div className="absolute -left-[13px] top-0 w-6 h-6 rounded-full bg-[#0b0b0c] border border-[#d4af37] flex items-center justify-center text-[10px] text-[#d4af37] font-bold">{idx + 1}</div>
                  <div className="bg-[#111113] border border-[#2a2a2e] rounded-md overflow-hidden">
                    <div className="px-6 py-3 border-b border-[#1f1f23] bg-[#161618] flex justify-between">
                      <h3 className="text-[12px] font-bold tracking-widest text-white uppercase">{step.label}</h3>
                      {step.durationInMinutes > 0 && <span className="text-[11px] text-[#6b6b73]">{step.durationInMinutes} MIN</span>}
                    </div>
                    
                    <div className="p-6 space-y-6">
                      {/* Paliers d'empâtage */}
                      {step.isMashBlock && step.paliers?.map((p: any) => (
                        <div key={p.id} className="flex justify-between items-center bg-[#0b0b0c] p-3 border border-[#1f1f23] rounded">
                          <div><div className="text-[12px] text-[#d4af37] font-bold">{p.name}</div><div className="text-[10px] text-[#6b6b73] italic">{p.desc}</div></div>
                          <div className="text-right text-sm font-mono text-white">{p.temp}°C · {p.duration}m</div>
                        </div>
                      ))}

                      {/* INGRÉDIENTS EN COLONNES (2 COLONNES) */}
                      {step.ingredients?.length > 0 && (
                        <div className="space-y-3">
                          <span className="text-[9px] text-[#6b6b73] tracking-[0.2em] uppercase font-bold">Matières premières</span>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {sortIngredients(step.ingredients).map((ing: any) => (
                              <div key={ing.id} className="flex justify-between bg-[#0b0b0c] px-4 py-2 border border-[#1f1f23] rounded">
                                <span className="text-[11px] truncate pr-2 italic">{ing.name}</span>
                                <span className="text-[11px] font-bold text-[#d4af37] whitespace-nowrap">{ing.qty}{ing.type === 'MALT' ? 'KG' : 'G'}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- COMPOSANTS ---
function MenuCard({ title, subtitle, icon, onClick }: { title: string; subtitle: string; icon: string; onClick: () => void }) {
  return (
    <div onClick={onClick} className="group bg-[#111113] border border-[#2a2a2e] p-8 rounded-md cursor-pointer hover:border-[#d4af37] transition-all relative">
      <div className="text-xl font-light text-white uppercase mb-1">{title}</div>
      <p className="text-[10px] text-[#6b6b73] uppercase tracking-widest">{subtitle}</p>
      <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[#d4af37] opacity-0 group-hover:opacity-100 transition-all">{icon}</div>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-[10px] tracking-[0.4em] text-[#a88f2a] font-bold uppercase">{title}</h2>
      <div className="h-px bg-[#d4af37] opacity-20 mt-2" />
    </div>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#111113] border border-[#2a2a2e] p-4 rounded text-center">
      <div className="text-[8px] text-[#6b6b73] tracking-widest uppercase mb-1">{label}</div>
      <div className="text-md font-light text-white">{value}</div>
    </div>
  );
}