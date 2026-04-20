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

  const sortIngredients = (ingredients: any[]) => {
    return [...(ingredients || [])].sort((a, b) => b.qty - a.qty);
  };

  // Groupement du stock par type
  const stockByCategory = inventory.reduce((acc: any, item: any) => {
    const cat = item.type || "AUTRES";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-[#0b0b0c] text-[#e7e7e7] font-sans tracking-tight">
      {/* TOP BAR */}
      <div className="h-12 border-b border-[#1f1f23] flex items-center justify-between px-6 sticky top-0 bg-[#0b0b0c]/80 backdrop-blur-md z-50">
        <div className="text-[13px] tracking-[0.25em] text-[#d4af37] cursor-pointer font-bold" onClick={() => setView("home")}>
          BREW CONTROL
        </div>
        <div className="text-[10px] text-[#6b6b73] font-mono uppercase tracking-widest">System_v2.0</div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10">
        
        {/* --- ACCUEIL --- */}
        {view === "home" && (
          <div className="space-y-12 animate-in fade-in duration-500">
            <header className="py-10 text-center">
              <h1 className="text-5xl font-extralight tracking-tighter text-white uppercase italic mb-2">Main Console</h1>
              <div className="h-[1px] w-12 bg-[#d4af37] mx-auto mb-4" />
              <p className="text-[9px] tracking-[0.5em] text-[#6b6b73] uppercase font-bold">Ready to craft</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <MenuCard title="Lancer un Brassin" subtitle={`${recipes.length} Recettes dispo`} icon="RE" onClick={() => setView("recipes")} />
              <MenuCard title="Gestion des Stocks" subtitle={`${inventory.length} Articles en cave`} icon="ST" onClick={() => setView("stock")} />
            </div>
          </div>
        )}

        {/* --- LISTE DES RECETTES --- */}
        {view === "recipes" && (
          <div className="animate-in slide-in-from-right duration-500">
             <button onClick={() => setView("home")} className="text-[10px] tracking-[0.3em] text-[#6b6b73] hover:text-[#d4af37] mb-8 transition">← RETOUR CONSOLE</button>
             <SectionTitle title="RECETTES_SUPABASE" />
             <div className="grid gap-4 mt-8">
              {recipes.length === 0 && <p className="text-center py-10 text-[#6b6b73] italic text-sm">Aucune recette trouvée. Crée-en une dans le Labo !</p>}
              {recipes.map((r) => (
                <div 
                  key={r.id} 
                  onClick={() => { setSelected(r); setView("detail"); }}
                  className="group bg-[#111113] border border-[#2a2a2e] rounded-md px-8 py-6 cursor-pointer hover:border-[#d4af37] hover:bg-[#161619] transition-all"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-[10px] text-[#a88f2a] tracking-widest mb-1 font-bold uppercase">{r.data?.stats_json?.abv || 0}% VOL · {r.data?.stats_json?.ibu || 0} IBU</div>
                      <div className="text-xl font-light tracking-tight text-white/90 group-hover:text-white">{r.name}</div>
                    </div>
                    <div className="text-[#6b6b73] group-hover:text-[#d4af37] translate-x-0 group-hover:translate-x-2 transition-transform">→</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- STOCK ORGANISE --- */}
        {view === "stock" && (
          <div className="animate-in slide-in-from-right duration-500 space-y-10">
             <button onClick={() => setView("home")} className="text-[10px] tracking-[0.3em] text-[#6b6b73] hover:text-[#d4af37] mb-4 transition">← RETOUR CONSOLE</button>
             
             {Object.keys(stockByCategory).map(category => (
               <div key={category} className="space-y-4">
                  <h3 className="text-[10px] tracking-[0.2em] text-[#d4af37] font-bold border-b border-[#1f1f23] pb-2 uppercase">{category}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {stockByCategory[category].map((item: any) => (
                      <div key={item.id} className="flex justify-between items-center bg-[#111113] border border-[#2a2a2e] px-5 py-3 rounded-sm">
                        <span className="text-[13px] font-light text-white/80">{item.name}</span>
                        <span className="text-[13px] font-mono text-white italic">{item.quantity}<span className="text-[#a88f2a] text-[10px] ml-1">{item.unit}</span></span>
                      </div>
                    ))}
                  </div>
               </div>
             ))}
          </div>
        )}

        {/* --- FEUILLE DE MARCHE --- */}
        {view === "detail" && selected && (
          <div className="space-y-12 animate-in fade-in duration-700">
            <div className="flex items-end justify-between border-b border-[#1f1f23] pb-8">
              <button onClick={() => setView("recipes")} className="text-[10px] tracking-[0.3em] text-[#6b6b73] hover:text-[#d4af37] transition">← LISTE RECETTES</button>
              <h1 className="text-4xl font-extralight text-white uppercase italic tracking-tighter">{selected.name}</h1>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatBlock label="ALCOOL" value={`${selected.data?.stats_json?.abv || 0}%`} />
              <StatBlock label="AMERTUME" value={`${selected.data?.stats_json?.ibu || 0} IBU`} />
              <StatBlock label="EAU EMP." value={`${selected.data?.stats_json?.waterE || 0}L`} />
              <StatBlock label="EAU RIN." value={`${selected.data?.stats_json?.waterR || 0}L`} />
            </div>

            <div className="space-y-10">
              <SectionTitle title="DÉROULÉ TECHNIQUE" />
              {selected.data?.steps_json?.map((step: any, idx: number) => (
                <div key={step.id} className="relative pl-12 border-l border-[#1f1f23]">
                  <div className="absolute -left-[13px] top-0 w-6 h-6 rounded-full bg-[#0b0b0c] border border-[#d4af37] flex items-center justify-center text-[10px] text-[#d4af37] font-bold">{idx + 1}</div>
                  <div className="bg-[#111113] border border-[#2a2a2e] rounded-md overflow-hidden shadow-xl shadow-black/20">
                    <div className="px-6 py-3 border-b border-[#1f1f23] bg-[#161618] flex justify-between items-center">
                      <h3 className="text-[12px] font-bold tracking-widest text-white uppercase">{step.label}</h3>
                      {step.durationInMinutes > 0 && <span className="text-[10px] font-mono text-[#6b6b73]">{step.durationInMinutes} MIN</span>}
                    </div>
                    
                    <div className="p-6 space-y-6">
                      {step.isMashBlock && step.paliers?.map((p: any) => (
                        <div key={p.id} className="bg-[#0b0b0c] p-4 border border-[#1f1f23] rounded flex justify-between items-center group hover:border-[#d4af37]/30 transition-colors">
                          <div className="flex-1">
                            <div className="text-[12px] text-[#d4af37] font-bold tracking-wide uppercase">{p.name}</div>
                            <div className="text-[10px] text-[#6b6b73] italic mt-1 leading-relaxed">{p.desc}</div>
                          </div>
                          <div className="ml-4 text-right">
                            <div className="text-lg font-extralight text-white">{p.temp}°C</div>
                            <div className="text-[9px] text-[#6b6b73] font-mono uppercase">{p.duration} MIN</div>
                          </div>
                        </div>
                      ))}

                      {step.ingredients?.length > 0 && (
                        <div className="space-y-3">
                          <div className="text-[9px] text-[#6b6b73] tracking-[0.3em] uppercase font-bold mb-2">Ingrédients requis :</div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {sortIngredients(step.ingredients).map((ing: any) => (
                              <div key={ing.id} className="flex justify-between items-center bg-[#0b0b0c] px-4 py-3 border border-[#1f1f23] rounded-sm group hover:border-[#a88f2a]/20 transition-colors">
                                <span className="text-[12px] text-white/70 italic group-hover:text-white transition-colors">{ing.name}</span>
                                <span className="text-[12px] font-mono font-bold text-[#d4af37]">{ing.qty}<span className="text-[9px] ml-0.5">{ing.type === 'MALT' ? 'KG' : 'G'}</span></span>
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

// --- SOUS-COMPOSANTS ---

function MenuCard({ title, subtitle, icon, onClick }: { title: string; subtitle: string; icon: string; onClick: () => void }) {
  return (
    <div onClick={onClick} className="group bg-[#111113] border border-[#2a2a2e] p-8 rounded-md cursor-pointer hover:border-[#d4af37] transition-all relative overflow-hidden">
      <div className="absolute -right-2 -bottom-2 text-6xl font-black text-white/[0.03] group-hover:text-[#d4af37]/[0.05] transition-colors">{icon}</div>
      <div className="text-xl font-light text-white uppercase mb-1 tracking-tight group-hover:text-[#d4af37] transition-colors">{title}</div>
      <p className="text-[9px] text-[#6b6b73] uppercase tracking-[0.2em] font-bold">{subtitle}</p>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-[10px] tracking-[0.5em] text-[#a88f2a] font-bold uppercase">{title}</h2>
      <div className="h-px bg-gradient-to-r from-[#d4af37] to-transparent opacity-20 mt-3" />
    </div>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#111113] border border-[#2a2a2e] p-5 rounded text-center">
      <div className="text-[8px] text-[#6b6b73] tracking-[0.2em] uppercase mb-1 font-bold">{label}</div>
      <div className="text-xl font-light text-white tracking-tighter">{value}</div>
    </div>
  );
}