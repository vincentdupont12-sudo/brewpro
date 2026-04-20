"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function BrewControlApp() {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: r } = await supabase.from("recipes").select("*").order('created_at', { ascending: false });
    if (r) setRecipes(r);
  };

  return (
    <div className="min-h-screen bg-[#0b0b0c] text-[#e7e7e7] font-sans tracking-tight">
      {/* TOP BAR */}
      <div className="h-12 border-b border-[#1f1f23] flex items-center justify-between px-6 sticky top-0 bg-[#0b0b0c]/80 backdrop-blur-md z-50">
        <div className="text-[13px] tracking-[0.25em] text-[#d4af37]">BREW CONTROL</div>
        <div className="text-[12px] text-[#6b6b73]">{new Date().toLocaleTimeString()}</div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* LISTE DES RECETTES (ACCUEIL) */}
        {!selected ? (
          <div>
            <SectionTitle title="MES RECETTES" />
            <div className="grid gap-4 mt-8">
              {recipes.map((r) => (
                <div
                  key={r.id}
                  onClick={() => setSelected(r)}
                  className="group relative bg-[#111113] border border-[#2a2a2e] rounded-md px-8 py-6 cursor-pointer hover:border-[#d4af37] transition-all duration-500"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-[11px] text-[#a88f2a] tracking-widest mb-1 uppercase font-bold">
                        {r.data?.stats_json?.abv}% VOL · {r.data?.stats_json?.ibu} IBU
                      </div>
                      <div className="text-xl font-light tracking-tight group-hover:text-white transition">
                        {r.name}
                      </div>
                    </div>
                    <div className="text-[#6b6b73] group-hover:text-[#d4af37] transition-transform group-hover:translate-x-2">→</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* FEUILLE DE MARCHE (DÉTAIL) */
          <div className="space-y-12 animate-in fade-in duration-700">
            {/* HEADER DETAIL */}
            <div className="flex items-end justify-between border-b border-[#1f1f23] pb-8">
              <div>
                <button 
                  onClick={() => setSelected(null)}
                  className="text-[10px] tracking-[0.3em] text-[#6b6b73] hover:text-[#d4af37] mb-4 block transition"
                >
                  ← RETOUR
                </button>
                <h1 className="text-4xl font-extralight text-white tracking-tighter uppercase italic">
                  {selected.name}
                </h1>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-[#6b6b73] tracking-widest uppercase">Volume Cible</div>
                <div className="text-2xl font-light text-[#d4af37]">{selected.data?.config?.volFinal}L</div>
              </div>
            </div>

            {/* QUICK STATS BAR */}
            <div className="grid grid-cols-4 gap-4">
              <StatBlock label="ALCOOL" value={`${selected.data?.stats_json?.abv}%`} />
              <StatBlock label="AMERTUME" value={`${selected.data?.stats_json?.ibu} IBU`} />
              <StatBlock label="COULEUR" value={`${selected.data?.stats_json?.ebc} EBC`} />
              <StatBlock label="SUCRE EMB." value={`${selected.data?.stats_json?.sucreBouteille}g`} />
            </div>

            {/* ETAPES DE BRASSAGE */}
            <div className="space-y-10">
              <SectionTitle title="FEUILLE DE ROUTE" />
              
              {selected.data?.steps_json?.map((step: any, idx: number) => (
                <div key={step.id} className="relative pl-12 border-l border-[#1f1f23]">
                  {/* Numero d'étape */}
                  <div className="absolute -left-[13px] top-0 w-6 h-6 rounded-full bg-[#0b0b0c] border border-[#d4af37] flex items-center justify-center text-[10px] text-[#d4af37] font-bold">
                    {idx + 1}
                  </div>

                  <div className="bg-[#111113] border border-[#2a2a2e] rounded-md overflow-hidden">
                    <div className="px-6 py-4 border-b border-[#1f1f23] flex justify-between items-center bg-[#161618]">
                      <h3 className="text-[13px] font-bold tracking-widest text-white uppercase">{step.label}</h3>
                      {step.durationInMinutes > 0 && (
                        <span className="text-[11px] text-[#6b6b73]">{step.durationInMinutes} MIN</span>
                      )}
                    </div>

                    <div className="p-6 space-y-6">
                      {/* Affichage des Volumes d'eau (Automatique selon l'étape) */}
                      {step.label.includes("EMPÂTAGE") && (
                        <div className="bg-[#0b0b0c] border border-[#d4af37]/20 p-4 rounded text-center">
                          <span className="text-[10px] text-[#6b6b73] block uppercase mb-1">Volume d'eau requis</span>
                          <span className="text-xl font-light text-[#d4af37]">{selected.data?.stats_json?.waterE} Litres</span>
                        </div>
                      )}
                      
                      {step.label.includes("RINÇAGE") && (
                        <div className="bg-[#0b0b0c] border border-[#d4af37]/20 p-4 rounded text-center">
                          <span className="text-[10px] text-[#6b6b73] block uppercase mb-1">Eau de rinçage requise</span>
                          <span className="text-xl font-light text-cyan-400">{selected.data?.stats_json?.waterR} Litres</span>
                        </div>
                      )}

                      {/* Sous-paliers d'empâtage (multi-paliers) */}
                      {step.isMashBlock && step.paliers?.map((p: any) => (
                        <div key={p.id} className="flex justify-between items-center border-b border-[#1f1f23] pb-3 last:border-none last:pb-0">
                          <div>
                            <div className="text-[12px] text-white font-medium">{p.name}</div>
                            <div className="text-[10px] text-[#6b6b73] italic">{p.desc}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-[13px] text-[#d4af37]">{p.temp}°C</div>
                            <div className="text-[10px] text-[#6b6b73]">{p.duration} MIN</div>
                          </div>
                        </div>
                      ))}

                      {/* Ingrédients filtrés pour cette étape */}
                      {step.ingredients?.length > 0 && (
                        <div className="space-y-2">
                          <span className="text-[9px] text-[#6b6b73] tracking-[0.2em] uppercase font-bold">Ingrédients à ajouter</span>
                          {step.ingredients.map((ing: any) => (
                            <div key={ing.id} className="flex justify-between bg-[#0b0b0c] px-4 py-3 rounded border border-[#1f1f23]">
                              <span className="text-[12px]">{ing.name}</span>
                              <span className="text-[12px] font-bold text-[#d4af37]">{ing.qty} {ing.type === 'MALT' ? 'KG' : 'G'}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Spécifique Fermentation */}
                      {step.label === "FERMENTATION" && (
                        <div className="grid grid-cols-2 gap-4">
                           <div className="text-center bg-[#0b0b0c] p-3 rounded">
                             <span className="text-[9px] block text-[#6b6b73]">DURÉE</span>
                             <span className="text-sm font-bold text-white">{step.durationInDays} JOURS</span>
                           </div>
                           <div className="text-center bg-[#0b0b0c] p-3 rounded">
                             <span className="text-[9px] block text-[#6b6b73]">SUCRE BTL</span>
                             <span className="text-sm font-bold text-[#d4af37]">{selected.data?.config?.resucrageDosage} g/L</span>
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

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-[11px] tracking-[0.35em] text-[#a88f2a] font-bold uppercase">
        {title}
      </h2>
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