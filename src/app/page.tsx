"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

// --- TIMER ---
function StepTimer({ minutes, label }: { minutes: number; label: string }) {
  const [timeLeft, setTimeLeft] = useState(minutes * 60);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    } else if (timeLeft === 0 && isActive) {
      clearInterval(interval);
      alert(`🔔 ACTION : ${label}`);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, label]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  };

  return (
    <div className="flex items-center gap-6 bg-black p-6 border-2 border-[#d4af37] rounded-lg my-6">
      <div className="flex-1 text-5xl font-mono font-black text-white">{formatTime(timeLeft)}</div>
      <button 
        onClick={() => setIsActive(!isActive)}
        className={`px-8 py-4 text-xs font-black uppercase rounded ${isActive ? 'bg-red-600' : 'bg-[#d4af37] text-black'}`}
      >
        {isActive ? "PAUSE" : "DÉPART"}
      </button>
    </div>
  );
}

export default function BrewControlApp() {
  const [view, setView] = useState<"home" | "recipes" | "detail">("home");
  const [recipes, setRecipes] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const { data: r } = await supabase.from("recipes").select("*");
    if (r) setRecipes(r);
  };

  const getBoilSteps = (recipeData: any) => {
    let hops: any[] = [];
    
    // On va chercher dans tous les ingrédients de toutes les étapes
    const steps = recipeData.steps_json || [];
    steps.forEach((step: any) => {
      if (step.ingredients) {
        step.ingredients.forEach((ing: any) => {
          // On normalise le type pour la comparaison (HOUBLON, houblon, Houblon...)
          const typeNormalized = (ing.type || "").toUpperCase();
          
          if (typeNormalized.includes("HOUBLON")) {
            hops.push({
              name: ing.name || "Houblon Inconnu",
              qty: ing.qty || ing.amount || "?",
              unit: ing.unit || "g",
              // On utilise durationInMinutes ou on cherche un chiffre dans le nom par défaut
              time: parseInt(ing.durationInMinutes) || (ing.name.match(/\d+/) ? parseInt(ing.name.match(/\d+/)[0]) : 60)
            });
          }
        });
      }
    });

    // Tri du plus long au plus court (Amérisant -> Aromatique)
    return hops.sort((a, b) => b.time - a.time);
  };

  return (
    <div className="min-h-screen bg-[#0b0b0c] text-white p-4 font-sans">
      {view === "home" && (
        <div className="max-w-md mx-auto pt-20">
          <button onClick={() => setView("recipes")} className="w-full p-12 border-2 border-[#d4af37] text-2xl font-black italic uppercase shadow-lg hover:bg-[#d4af37]/5 transition-all">
            MES RECETTES 🍺
          </button>
        </div>
      )}

      {view === "recipes" && (
        <div className="max-w-2xl mx-auto space-y-4">
          <button onClick={() => setView("home")} className="text-[10px] text-gray-400 uppercase tracking-widest mb-4">← Retour</button>
          {recipes.map(r => (
            <div key={r.id} onClick={() => { setSelected(r); setView("detail"); }} className="p-6 bg-[#111113] border border-gray-800 rounded-sm hover:border-[#d4af37] cursor-pointer transition-all">
              <h3 className="text-xl font-black uppercase italic">{r.name}</h3>
            </div>
          ))}
        </div>
      )}

      {view === "detail" && selected && (
        <div className="max-w-2xl mx-auto space-y-10 pb-20 animate-in fade-in">
          <button onClick={() => setView("recipes")} className="text-[10px] text-gray-400 uppercase tracking-widest">← Annuler</button>
          
          <header className="border-b-4 border-[#d4af37] pb-4">
            <h1 className="text-5xl font-black uppercase italic leading-none">{selected.name}</h1>
          </header>

          <section className="space-y-6">
            <div className="flex items-center gap-3">
                <span className="bg-[#d4af37] text-black px-2 py-0.5 font-bold italic">STEP 05</span>
                <h2 className="text-xl font-black uppercase italic underline decoration-[#d4af37]">ÉBULLITION (60 MIN)</h2>
            </div>

            <div className="bg-[#111113] border border-gray-800 p-6 rounded-sm shadow-2xl">
              <p className="text-sm text-gray-400 uppercase font-bold mb-4 tracking-tight">Démarrer dès les premiers gros bouillons :</p>
              
              <StepTimer minutes={60} label="COUPER LE FEU !" />

              <div className="mt-12 space-y-6 relative">
                {/* Ligne verticale de la timeline */}
                <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gradient-to-b from-[#d4af37] to-gray-800"></div>
                
                {getBoilSteps(selected.data).map((it, i) => (
                  <div key={i} className="relative pl-12 animate-in slide-in-from-left duration-300" style={{ animationDelay: `${i * 100}ms` }}>
                    {/* Le point indicateur */}
                    <div className="absolute left-[11px] top-4 w-3 h-3 bg-[#d4af37] rounded-full shadow-[0_0_15px_rgba(212,175,55,0.6)]"></div>
                    
                    <div className="bg-black border border-gray-800 p-5 rounded-sm flex justify-between items-center group hover:border-[#d4af37]/50 transition-colors">
                      <div>
                        <div className="text-[10px] font-black text-[#d4af37] uppercase mb-1 tracking-widest">
                            {it.time >= 60 ? "🏁 DÈS LE DÉBUT (À 60:00)" : `⏱️ QUAND LE TIMER AFFICHE ${it.time}:00`}
                        </div>
                        <div className="text-2xl font-black uppercase italic leading-tight">{it.name}</div>
                        <div className="text-[10px] text-gray-500 font-bold uppercase mt-1">Durée d'infusion : {it.time} min</div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-mono font-black text-white px-3 py-1 bg-[#111113] border border-gray-700">
                          {it.qty}{it.unit}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {getBoilSteps(selected.data).length === 0 && (
                  <div className="p-4 border border-dashed border-red-900 text-red-500 text-xs uppercase font-black text-center">
                    Aucun ingrédient détecté (Vérifiez le type 'HOUBLON')
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}