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
    try {
      const { data: r, error: errR } = await supabase.from("recipes").select("*").order('created_at', { ascending: false });
      const { data: i, error: errI } = await supabase.from("inventory").select("*").order('name');
      
      if (errR) console.error("Erreur recettes:", errR);
      if (errI) console.error("Erreur stock:", errI);
      
      if (r) setRecipes(r);
      if (i) setInventory(i);
    } catch (e) {
      console.error("Erreur système:", e);
    }
  };

  const sortIngredients = (ingredients: any[]) => {
    if (!ingredients) return [];
    return [...ingredients].sort((a, b) => (b.qty || 0) - (a.qty || 0));
  };

  return (
    <div className="min-h-screen bg-[#0b0b0c] text-[#e7e7e7] font-sans tracking-tight">
      {/* TOP BAR */}
      <div className="h-12 border-b border-[#1f1f23] flex items-center justify-between px-6 sticky top-0 bg-[#0b0b0c]/80 backdrop-blur-md z-50">
        <div className="text-[13px] tracking-[0.25em] text-[#d4af37] cursor-pointer font-bold" onClick={() => setView("home")}>
          BREW CONTROL
        </div>
        <div className="text-[10px] text-[#6b6b73] font-mono tracking-widest uppercase">
          {new Date().toLocaleTimeString()}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10">
        
        {/* --- VUE ACCUEIL --- */}
        {view === "home" && (
          <div className="space-y-12 animate-in fade-in duration-500">
            <header className="py-10 text-center">
              <h1 className="text-5xl font-extralight tracking-tighter text-white uppercase italic mb-2">Main Console</h1>
              <div className="h-[1px] w-12 bg-[#d4af37] mx-auto mb-4" />
              <p className="text-[9px] tracking-[0.5em] text-[#6b6b73] uppercase font-bold text-yellow-600/40">Operation Status: Online</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <MenuCard title="Lancer un Brassin" subtitle={`${recipes?.length || 0} Recettes`} icon="→" onClick={() => setView("recipes")} />
              <MenuCard title="Gestion des Stocks" subtitle={`${inventory?.length || 0} Articles`} icon="⌘" onClick={() => setView("stock")} />
            </div>
          </div>
        )}

        {/* --- VUE LISTE RECETTES --- */}
        {view === "recipes" && (
          <div className="animate-in slide-in-from-right duration-500">
             <button onClick={() => setView("home")} className="text-[10px] tracking-[0.3em] text-[#6b6b73] hover:text-[#d4af37] mb-8 transition">← BACK TO CONSOLE</button>
             <SectionTitle title="VOS PROTOCOLES" />
             <div className="grid gap-4 mt-8">
              {recipes?.map((r) => (
                <div key={r.id} onClick={() => { setSelected(r); setView("detail"); }} className="group bg-[#111113] border border-[#2a2a2e] rounded-md px-8 py-6 cursor-pointer hover:border-[#d4af37] transition-all">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-[10px] text-[#a88f2a] tracking-widest mb-1 uppercase font-bold">{r.data?.stats_json?.abv || 0}% VOL · {r.data?.stats_json?.ibu || 0} IBU</div>
                      <div className="text-xl font-light tracking-tight group-hover:text-white">{r.name}</div>
                    </div>
                    <div className="text-[#6b6b73] group-hover:text-[#d4af37]">→</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- VUE STOCK --- */}
        {view === "stock" && (
          <div className="animate-in slide-in-from-right duration-500">
             <button onClick={() => setView("home")} className="text-[10px] tracking-[0.3em] text-[#6b6b73] hover:text-[#d4af37] mb-8 transition">← BACK TO CONSOLE</button>
             <SectionTitle title="INVENTAIRE ACTUEL" />
             <div className="bg-[#111113] border border-[#2a2a2e] rounded-md overflow-hidden mt-8">
                {inventory?.map((item) => (
                  <div key={item.id} className="flex justify-between px-6 py-4 border-b border-[#1f1f23] last:border-none">
                    <div>
                      <div className="text-[13px] font-medium text-white">{item.name}</div>
                      <div className="text-[9px] text-[#6b6b73] uppercase tracking-tighter">{item.type}</div>
                    </div>
                    <div className="text-[14px] font-mono">{item.quantity} <span className="text-[#a88f2a] text-[10px] uppercase">{item.unit}</span></div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {/* --- VUE DÉTAIL (LA FEUILLE DE ROUTE) --- */}
        {view === "detail" && selected && (
          <div className="space-y-12 animate-in fade-in duration-700">
            <div className="flex items-end justify-between border-b border-[#1f1f23] pb-8">
              <div>
                <button onClick={() => setView("recipes")} className="text-[10px] tracking-[0.3em] text-[#6b6b73] hover:text-[#d4af37] mb-4 block transition">← LISTE DES RECETTES</button>
                <h1 className="text-4xl font-extralight text-white tracking-tighter uppercase italic">{selected.name}</h1>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-[#6b6b73] tracking-widest uppercase">Volume Cible</div>
                <div className="text-2xl font-light text-[#d4af37]">{selected.data?.config?.volFinal || 0}L</div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatBlock label="ALCOOL" value={`${selected.data?.stats_json?.abv || 0}%`} />
              <StatBlock label="AMERTUME" value={`${selected.data?.stats_json?.ibu || 0} IBU`} />
              <StatBlock label="EAU EMPÂTAGE" value={`${selected.data?.stats_json?.waterE || 0}L`} />
              <StatBlock label="EAU RINÇAGE" value={`${selected.data?.stats_json?.waterR || 0}L`} />
            </div>

            <div className="space-y-10">
              <SectionTitle title="INSTRUCTIONS DE BRASSAGE" />
              {selected.data?.steps_json?.map((step: any, idx: number) => (
                <div key={step.id} className="relative pl-12 border-l border-[#1f1f23]">
                  <div className="absolute -left-[13px] top-0 w-6 h-6 rounded-full bg-[#0b0b0c] border border-[#d4af37] flex items-center justify-center text-[10px] text-[#d4af37] font-bold">
                    {idx + 1}
                  </div>

                  <div className="bg-[#111113] border border-[#2a2a2e] rounded-md overflow-hidden">
                    <div className="px-6 py-4 border-b border-[#1f1f23] flex justify-between items-center bg-[#161618]">
                      <h3 className="text-[12px] font-bold tracking-widest text-white uppercase">{step.label}</h3>
                      {step.durationInMinutes > 0 && <span className="text-[10px] text-[#6b6b73]">{step.durationInMinutes} MIN</span>}
                    </div>

                    <div className="p-6 space-y-6">
                      {/* TEXTES DIRECTIFS POUR TES POTES */}
                      <div className="text-sm text-[#d4af37] italic border-l border-[#d4af37] pl-4">
                        {step.label.includes("EMPÂTAGE") && `Verser ${selected.data?.stats_json?.waterE}L d'eau et chauffer.`}
                        {step.label.includes("RINÇAGE") && `Préparer ${selected.data?.stats_json?.waterR}L d'eau à 78°C.`}
                        {step.label.includes("FERMENTATION") && `Transférer en fermenteur après refroidissement.`}
                      </div>

                      {/* PALIERS SI DISPONIBLES */}
                      {step.isMashBlock && step.paliers?.map((p: any, pIdx: number) => (
                        <div key={pIdx} className="flex justify-between items-center border-b border-[#1f1f23] pb-3 last:border-none">
                          <div>
                            <div className="text-[12px] text-white font-medium">{p.name}</div>
                            <div className="text-[10px] text-[#6b6b73]">{p.desc}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-[13px] text-[#d4af37]">{p.temp}°C</div>
                            <div className="text-[10px] text-[#6b6b73]">{p.duration} MIN</div>
                          </div>
                        </div>
                      ))}

                      {/* INGRÉDIENTS EN 2 COLONNES */}
                      {step.ingredients?.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {sortIngredients(step.ingredients).map((ing: any, iIdx: number) => (
                            <div key={iIdx} className="flex justify-between bg-[#0b0b0c] px-4 py-2 rounded border border-[#1f1f23]">
                              <span className="text-[11px] italic">{ing.name}</span>
                              <span className="text-[11px] font-bold text-[#d4af37]">{ing.qty} {ing.type === 'MALT' ? 'KG' : 'G'}</span>
                            </div>
                          ))}
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

// --- COMPOSANTS DE STYLE ---

function MenuCard({ title, subtitle, icon, onClick }: { title: string; subtitle: string; icon: string; onClick: () => void }) {
  return (
    <div onClick={onClick} className="group bg-[#111113] border border-[#2a2a2e] p-8 rounded-md cursor-pointer hover:border-[#d4af37] transition-all relative overflow-hidden">
      <div className="absolute right-2 bottom-2 text-6xl text-white/5 group-hover:text-[#d4af37]/10 transition-colors font-black">{icon}</div>
      <h3 className="text-xl font-light text-white uppercase tracking-tight mb-1">{title}</h3>
      <p className="text-[10px] text-[#6b6b73] tracking-[0.2em] uppercase">{subtitle}</p>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-[10px] tracking-[0.4em] text-[#a88f2a] font-bold uppercase">{title}</h2>
      <div className="h-px bg-gradient-to-r from-transparent via-[#d4af37] to-transparent mt-3 opacity-20" />
    </div>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#111113] p-4 text-center">
      <div className="text-[8px] text-[#6b6b73] tracking-widest uppercase mb-1">{label}</div>
      <div className="text-lg font-light text-white tracking-tight">{value}</div>
    </div>
  );
}