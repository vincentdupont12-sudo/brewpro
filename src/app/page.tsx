"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

function StepTimer({ minutes, label }: { minutes: number; label: string }) {
  const [timeLeft, setTimeLeft] = useState(minutes * 60);
  const [isActive, setIsActive] = useState(false);
  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) interval = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    else if (timeLeft === 0 && isActive) { clearInterval(interval); alert(`🔔 ${label}`); }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, label]);
  const format = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  return (
    <div className="flex items-center gap-4 bg-black p-4 border border-[#d4af37] rounded my-2">
      <div className="flex-1 text-4xl font-mono font-black text-white">{format(timeLeft)}</div>
      <button onClick={() => setIsActive(!isActive)} className={`px-6 py-3 text-[10px] font-black uppercase rounded ${isActive ? 'bg-red-600' : 'bg-[#d4af37] text-black'}`}>
        {isActive ? "STOP" : "START"}
      </button>
    </div>
  );
}

export default function BrewApp() {
  const [view, setView] = useState<"home" | "recipes" | "detail">("home");
  const [recipes, setRecipes] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => { const fetch = async () => { 
    const { data } = await supabase.from("recipes").select("*"); 
    if (data) setRecipes(data); 
  }; fetch(); }, []);

  const getGuide = (recipe: any) => {
    const d = recipe.data || {}, s = d.stats_json || {}, steps = d.steps_json || [];
    const getIng = (t: string) => steps.flatMap((x: any) => x.ingredients || []).filter((i: any) => (i.type || "").toUpperCase().includes(t));
    
    const hops = getIng("HOUBLON").map((h: any) => ({
      name: h.name, qty: h.qty || h.amount || "?", unit: h.unit || "g",
      time: parseInt(h.durationInMinutes) || (h.name.match(/\d+/) ? parseInt(h.name.match(/\d+/)[0]) : 60)
    })).sort((a: any, b: any) => b.time - a.time);

    return [
      { id: 1, title: "01. PREP", action: "Désinfection Chemipro.", info: `Cible: ${d.config?.volFinal || 20}L` },
      { id: 2, title: "02. MALT", action: "Concassage des grains.", items: getIng("MALT") },
      { 
        id: 3, title: "03. MASH", action: `Chauffer ${s.waterE || '?'}L d'eau.`, 
        paliers: (steps.find((x: any) => x.isMashBlock)?.paliers || []),
        timer: (steps.find((x: any) => x.isMashBlock)?.paliers || []).reduce((a: number, p: any) => a + (p.duration || 0), 0)
      },
      { id: 4, title: "04. RINÇAGE", action: `Rincer avec ${s.waterR || '?'}L à 78°C.` },
      { id: 5, title: "05. ÉBULLITION", action: "Suivre la timeline des houblons.", isBoil: true, items: hops },
      { id: 6, title: "06. FERMENTATION", action: "Refroidir et ensemencer.", items: getIng("LEVURE") }
    ];
  };

  return (
    <div className="min-h-screen bg-[#0b0b0c] text-white font-sans p-4">
      {view === "home" && (
        <div className="max-w-md mx-auto pt-20">
          <button onClick={() => setView("recipes")} className="w-full p-12 border-2 border-[#d4af37] text-2xl font-black italic uppercase">BRASSAGE 🔥</button>
        </div>
      )}

      {view === "recipes" && (
        <div className="max-w-2xl mx-auto space-y-4">
          <button onClick={() => setView("home")} className="text-[10px] text-gray-500 uppercase tracking-widest">← RETOUR</button>
          {recipes.map(r => (
            <div key={r.id} onClick={() => { setSelected(r); setView("detail"); }} className="p-6 bg-[#111113] border border-gray-800 rounded hover:border-[#d4af37] cursor-pointer">
              <h3 className="text-xl font-black uppercase italic">{r.name}</h3>
            </div>
          ))}
        </div>
      )}

      {view === "detail" && selected && (
        <div className="max-w-2xl mx-auto space-y-10 pb-20">
          <header className="border-b-4 border-[#d4af37] pb-4 flex justify-between items-end">
            <div>
              <button onClick={() => setView("recipes")} className="text-[10px] text-gray-500 uppercase mb-2">← ANNULER</button>
              <h1 className="text-4xl font-black uppercase italic leading-none">{selected.name}</h1>
            </div>
            <div className="text-right text-[10px] font-bold text-[#d4af37]">DI: {selected.data?.stats_json?.di || '?'}</div>
          </header>

          {getGuide(selected).map((step) => (
            <div key={step.id} className="space-y-4">
              <h2 className="text-[#d4af37] font-black uppercase tracking-widest text-sm flex items-center gap-2">
                <span className="bg-[#d4af37] text-black px-1.5 py-0.5 text-[10px]">{step.id}</span> {step.title}
              </h2>
              
              <div className="bg-[#111113] border border-gray-800 p-5 rounded-sm">
                <p className="text-sm font-bold uppercase mb-4 text-gray-300">{step.action}</p>

                {step.isBoil ? (
                  <div className="space-y-4">
                    <StepTimer minutes={60} label="COUPER LE FEU" />
                    <div className="space-y-2 border-l-2 border-gray-800 ml-2">
                      {step.items.map((it: any, i: number) => (
                        <div key={i} className="ml-4 p-3 bg-black border border-gray-800 flex justify-between items-center">
                          <div>
                            <div className="text-[8px] font-black text-[#d4af37] uppercase">T-{it.time}:00</div>
                            <div className="text-sm font-black uppercase italic">{it.name}</div>
                          </div>
                          <div className="font-mono text-white">{it.qty}{it.unit}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {step.paliers?.map((p: any, i: number) => (
                      <div key={i} className="flex justify-between p-2 bg-black border border-gray-800 text-[10px] font-bold uppercase">
                        <span>{p.temp}°C</span><span>{p.duration} MIN</span>
                      </div>
                    ))}
                    {step.items?.map((it: any, i: number) => (
                      <div key={i} className="flex justify-between p-2 bg-black border border-gray-800 text-[10px] font-bold uppercase">
                        <span className="text-gray-500">{it.name}</span><span>{it.qty}{it.unit}</span>
                      </div>
                    ))}
                    {step.timer && step.timer > 0 && <StepTimer minutes={step.timer} label="Étape terminée" />}
                  </div>
                )}
              </div>
            </div>
          ))}

          <div className="bg-[#d4af37] p-6 text-black text-center font-black uppercase italic rounded-sm">
             Bon Brassage ! 🍻
          </div>
        </div>
      )}
    </div>
  );
}