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

  // Liste des styles de bière type pour inspiration
  const beerStyles = [
    { name: "Pilsner", desc: "Claire, croquante, amertume florale.", stats: "4.5-5% VOL · 25-45 IBU" },
    { name: "IPA", desc: "Explosion de houblon, agrumes, amertume marquée.", stats: "6-7.5% VOL · 40-70 IBU" },
    { name: "Stout", desc: "Noire, notes de café et chocolat noir.", stats: "5-8% VOL · 30-50 IBU" },
    { name: "Saison", desc: "Sèche, épicée, rafraîchissante.", stats: "5-7% VOL · 20-35 IBU" },
    { name: "Weissbier", desc: "Blé, arômes de banane et clou de girofle.", stats: "5-5.5% VOL · 8-15 IBU" }
  ];

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
        
        {/* --- VUE ACCUEIL (HUB) --- */}
        {view === "home" && (
          <div className="space-y-12 animate-in fade-in duration-500">
            <header className="py-10 text-center">
              <h1 className="text-5xl font-extralight tracking-tighter text-white uppercase italic mb-2">Main Console</h1>
              <p className="text-[10px] tracking-[0.4em] text-[#6b6b73] uppercase">System Ready for Brewing</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <MenuCard 
                title="Lancer un Brassin" 
                subtitle="Accéder à vos recettes" 
                icon="→" 
                onClick={() => setView("recipes")} 
              />
              <MenuCard 
                title="Gestion des Stocks" 
                subtitle="Inventaire des matières premières" 
                icon="⌘" 
                onClick={() => setView("stock")} 
              />
            </div>

            <section>
              <SectionTitle title="Bibliothèque des Styles" />
              <div className="grid gap-3 mt-6">
                {beerStyles.map((style) => (
                  <div key={style.name} className="bg-[#111113] border border-[#2a2a2e] p-4 rounded flex justify-between items-center group">
                    <div>
                      <h4 className="text-[#d4af37] text-sm font-bold">{style.name}</h4>
                      <p className="text-[11px] text-[#6b6b73]">{style.desc}</p>
                    </div>
                    <span className="text-[9px] font-mono text-[#a88f2a] opacity-60">{style.stats}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* --- VUE RECETTES --- */}
        {view === "recipes" && (
          <div className="animate-in slide-in-from-right duration-500">
             <button onClick={() => setView("home")} className="text-[10px] tracking-[0.3em] text-[#6b6b73] hover:text-[#d4af37] mb-8 transition">← BACK TO CONSOLE</button>
             <SectionTitle title="MES RECETTES" />
             <div className="grid gap-4 mt-8">
              {recipes.map((r) => (
                <div key={r.id} onClick={() => { setSelected(r); setView("detail"); }} className="group bg-[#111113] border border-[#2a2a2e] rounded-md px-8 py-6 cursor-pointer hover:border-[#d4af37] transition-all">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-[11px] text-[#a88f2a] tracking-widest mb-1 uppercase font-bold">{r.data?.stats_json?.abv}% VOL · {r.data?.stats_json?.ibu} IBU</div>
                      <div className="text-xl font-light tracking-tight group-hover:text-white">{r.name}</div>
                    </div>
                    <div className="text-[#6b6b73] group-hover:text-[#d4af37]">→</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- VUE STOCKS --- */}
        {view === "stock" && (
          <div className="animate-in slide-in-from-right duration-500">
             <button onClick={() => setView("home")} className="text-[10px] tracking-[0.3em] text-[#6b6b73] hover:text-[#d4af37] mb-8 transition">← BACK TO CONSOLE</button>
             <SectionTitle title="INVENTAIRE" />
             <div className="bg-[#111113] border border-[#2a2a2e] rounded-md overflow-hidden mt-8">
                {inventory.map((item) => (
                  <div key={item.id} className="flex justify-between px-6 py-4 border-b border-[#1f1f23] last:border-none">
                    <div>
                      <div className="text-[13px] font-medium text-white">{item.name}</div>
                      <div className="text-[10px] text-[#6b6b73] uppercase tracking-wider">{item.type}</div>
                    </div>
                    <div className="text-[14px] font-mono">{item.quantity} <span className="text-[#a88f2a] text-[11px] uppercase">{item.unit}</span></div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {/* --- VUE DÉTAIL (FEUILLE DE MARCHE) --- */}
        {view === "detail" && selected && (
          <div className="space-y-12 animate-in fade-in duration-700">
            <div className="flex items-end justify-between border-b border-[#1f1f23] pb-8">
              <div>
                <button onClick={() => setView("recipes")} className="text-[10px] tracking-[0.3em] text-[#6b6b73] hover:text-[#d4af37] mb-4 block">← LISTE RECETTES</button>
                <h1 className="text-4xl font-extralight text-white tracking-tighter uppercase italic">{selected.name}</h1>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-[#6b6b73] tracking-widest uppercase">Volume Cible</div>
                <div className="text-2xl font-light text-[#d4af37]">{selected.data?.config?.volFinal}L</div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatBlock label="ALCOOL" value={`${selected.data?.stats_json?.abv}%`} />
              <StatBlock label="AMERTUME" value={`${selected.data?.stats_json?.ibu} IBU`} />
              <StatBlock label="COULEUR" value={`${selected.data?.stats_json?.ebc} EBC`} />
              <StatBlock label="SUCRE EMB." value={`${selected.data?.stats_json?.sucreBouteille}g`} />
            </div>

            <div className="space-y-10">
              <SectionTitle title="FEUILLE DE ROUTE" />
              {selected.data?.steps_json?.map((step: any, idx: number) => (
                <div key={step.id} className="relative pl-12 border-l border-[#1f1f23]">
                  <div className="absolute -left-[13px] top-0 w-6 h-6 rounded-full bg-[#0b0b0c] border border-[#d4af37] flex items-center justify-center text-[10px] text-[#d4af37] font-bold">{idx + 1}</div>
                  <div className="bg-[#111113] border border-[#2a2a2e] rounded-md overflow-hidden">
                    <div className="px-6 py-4 border-b border-[#1f1f23] flex justify-between items-center bg-[#161618]">
                      <h3 className="text-[13px] font-bold tracking-widest text-white uppercase">{step.label}</h3>
                      {step.durationInMinutes > 0 && <span className="text-[11px] text-[#6b6b73]">{step.durationInMinutes} MIN</span>}
                    </div>
                    <div className="p-6 space-y-6">
                      {step.label.includes("EMPÂTAGE") && (
                        <WaterAlert label="Volume d'eau requis" value={selected.data?.stats_json?.waterE} color="#d4af37" />
                      )}
                      {step.label.includes("RINÇAGE") && (
                        <WaterAlert label="Eau de rinçage requise" value={selected.data?.stats_json?.waterR} color="#00e5ff" />
                      )}
                      {step.isMashBlock && step.paliers?.map((p: any) => (
                        <div key={p.id} className="flex justify-between items-center border-b border-[#1f1f23] pb-3 last:border-none last:pb-0">
                          <div><div className="text-[12px] text-white font-medium">{p.name}</div><div className="text-[10px] text-[#6b6b73] italic">{p.desc}</div></div>
                          <div className="text-right"><div className="text-[13px] text-[#d4af37]">{p.temp}°C</div><div className="text-[10px] text-[#6b6b73]">{p.duration} MIN</div></div>
                        </div>
                      ))}
                      {step.ingredients?.length > 0 && (
                        <div className="space-y-2">
                          <span className="text-[9px] text-[#6b6b73] tracking-[0.2em] uppercase font-bold">Ingrédients</span>
                          {step.ingredients.map((ing: any) => (
                            <div key={ing.id} className="flex justify-between bg-[#0b0b0c] px-4 py-3 rounded border border-[#1f1f23]">
                              <span className="text-[12px]">{ing.name}</span>
                              <span className="text-[12px] font-bold text-[#d4af37]">{ing.qty} {ing.type === 'MALT' ? 'KG' : 'G'}</span>
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

// --- SOUS-COMPOSANTS DESIGN ---

function MenuCard({ title, subtitle, icon, onClick }: { title: string; subtitle: string; icon: string; onClick: () => void }) {
  return (
    <div 
      onClick={onClick}
      className="group bg-[#111113] border border-[#2a2a2e] p-8 rounded-md cursor-pointer hover:border-[#d4af37] transition-all relative overflow-hidden"
    >
      <div className="absolute right-[-10px] bottom-[-20px] text-8xl text-white opacity-[0.02] font-black group-hover:opacity-[0.05] transition-all">{icon}</div>
      <h3 className="text-xl font-light text-white uppercase tracking-tight mb-1">{title}</h3>
      <p className="text-[11px] text-[#6b6b73] uppercase tracking-widest">{subtitle}</p>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-[11px] tracking-[0.35em] text-[#a88f2a] font-bold uppercase">{title}</h2>
      <div className="h-px bg-gradient-to-r from-transparent via-[#d4af37] to-transparent mt-4 opacity-30" />
    </div>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#111113] border border-[#2a2a2e] p-4 rounded-md text-center">
      <div className="text-[9px] text-[#6b6b73] tracking-widest uppercase mb-1 font-bold">{label}</div>
      <div className="text-lg font-light text-white tracking-tight">{value}</div>
    </div>
  );
}

function WaterAlert({ label, value, color }: { label: string; value: any; color: string }) {
  return (
    <div className="bg-[#0b0b0c] border p-4 rounded text-center" style={{ borderColor: `${color}33` }}>
      <span className="text-[10px] text-[#6b6b73] block uppercase mb-1">{label}</span>
      <span className="text-xl font-light" style={{ color: color }}>{value} Litres</span>
    </div>
  );
}