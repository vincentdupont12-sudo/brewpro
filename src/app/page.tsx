"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

// --- STYLE INJECTÉ (Pour forcer le look Dark) ---
const STYLES = {
  bg: { backgroundColor: "#0b0b0c", minHeight: "100-vh", color: "#e7e7e7", fontFamily: "sans-serif" },
  card: { backgroundColor: "#111113", border: "1px solid #1f1f23", padding: "20px", borderRadius: "4px" },
  gold: { color: "#d4af37" },
  btnGold: { backgroundColor: "#d4af37", color: "#000", fontWeight: "900", padding: "15px", border: "none", cursor: "pointer", textTransform: "uppercase" as const },
  input: { backgroundColor: "#000", border: "1px solid #1f1f23", color: "#fff", padding: "10px", textAlign: "center" as const }
};

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
    <div style={{...STYLES.card, border: "2px solid #d4af37", display: "flex", alignItems: "center", gap: "20px", margin: "20px 0"}}>
      <div style={{flex: 1, fontSize: "40px", fontWeight: "900", fontFamily: "monospace"}}>{format(timeLeft)}</div>
      <button onClick={() => setIsActive(!isActive)} style={{...STYLES.btnGold, backgroundColor: isActive ? "#ef4444" : "#d4af37"}}>
        {isActive ? "STOP" : "LANCER"}
      </button>
    </div>
  );
}

export default function BrewControlApp() {
  const [view, setView] = useState<"home" | "recipes" | "detail" | "history">("home");
  const [recipes, setRecipes] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [di, setDi] = useState(1050); const [df, setDf] = useState(1010); const [realVol, setRealVol] = useState(20);

  useEffect(() => {
    const fetchData = async () => {
      const { data: r } = await supabase.from("recipes").select("*").order('created_at', { ascending: false });
      const { data: h } = await supabase.from("brews").select("*").order('brew_date', { ascending: false });
      if (r) setRecipes(r); if (h) setHistory(h);
    };
    fetchData();
  }, []);

  const saveToHistory = async () => {
    await supabase.from("brews").insert([{
      recipe_name: selected.name, di, df, volume_final: realVol,
      abv_calc: parseFloat(((di - df) / 7.5).toFixed(1)),
      sugar_added: Math.round(realVol * (selected.data?.config?.resucrageDosage || 7)),
    }]);
    setView("history"); fetchData();
  };

  const getGuide = (recipe: any) => {
    const d = recipe.data || {}; const steps = d.steps_json || [];
    const getIng = (term: string) => steps.flatMap((s: any) => s.ingredients || []).filter((i: any) => 
      (i.type || "").toUpperCase().includes(term.toUpperCase()) || (i.name || "").toUpperCase().includes(term.toUpperCase())
    );
    const hops = getIng("HOUBLON").map((h: any) => ({
      name: h.name, qty: h.qty || h.amount || "?", unit: h.unit || "g",
      time: parseInt(h.durationInMinutes) || (h.name.match(/\d+/) ? parseInt(h.name.match(/\d+/)[0]) : 60)
    })).sort((a: any, b: any) => b.time - a.time);

    return [
      { id: 1, title: "01. PREP", action: "Désinfection totale.", info: `VOLUME CIBLE : ${d.config?.volFinal || 20}L` },
      { id: 2, title: "02. MALT", action: "Concassage.", items: getIng("MALT") },
      { id: 3, title: "03. MASH", action: "Empâtage.", paliers: (steps.find((s: any) => s.isMashBlock)?.paliers || []), timer: (steps.find((s: any) => s.isMashBlock)?.paliers || []).reduce((acc: number, p: any) => acc + (p.duration || 0), 0) },
      { id: 4, title: "04. RINÇAGE", action: `Rincer avec ${d.stats_json?.waterR || '?'}L à 78°C.` },
      { id: 5, title: "05. EBULLITION", action: "Timeline Houblons.", isBoil: true, items: hops },
      { id: 6, title: "06. FERMENTATION", action: "Ensemencement.", items: getIng("LEVURE") }
    ];
  };

  return (
    <div style={STYLES.bg}>
      {/* HEADER FIXE */}
      <div style={{height: "60px", borderBottom: "1px solid #1f1f23", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", position: "sticky", top: 0, backgroundColor: "rgba(11,11,12,0.9)"}}>
        <div onClick={() => setView("home")} style={{fontSize: "12px", fontWeight: "900", letterSpacing: "4px", color: "#d4af37", cursor: "pointer"}}>BREW STATION</div>
        <button onClick={() => setView("history")} style={{background: "none", border: "none", color: "#6b6b73", fontSize: "10px", fontWeight: "bold"}}>ARCHIVES</button>
      </div>

      <div style={{maxWidth: "600px", margin: "0 auto", padding: "30px 20px"}}>
        {view === "home" && (
          <div style={{display: "flex", flexDirection: "column", gap: "20px"}}>
            <button onClick={() => setView("recipes")} style={{...STYLES.btnGold, fontSize: "24px", textAlign: "left", padding: "40px"}}>LANCER BRASSAGE 🔥</button>
            <button onClick={() => setView("history")} style={{...STYLES.card, color: "#fff", fontWeight: "900", textAlign: "left", fontSize: "20px"}}>HISTORIQUE 📜</button>
          </div>
        )}

        {view === "recipes" && (
          <div style={{display: "flex", flexDirection: "column", gap: "10px"}}>
            <button onClick={() => setView("home")} style={{color: "#6b6b73", background: "none", border: "none", textAlign: "left", marginBottom: "20px"}}>← RETOUR</button>
            {recipes.map(r => (
              <div key={r.id} onClick={() => { setSelected(r); setView("detail"); }} style={{...STYLES.card, cursor: "pointer"}} className="hover-gold">
                <h3 style={{margin: 0, fontSize: "22px", fontWeight: "900", textTransform: "uppercase", fontStyle: "italic"}}>{r.name}</h3>
              </div>
            ))}
          </div>
        )}

        {view === "detail" && selected && (
          <div style={{display: "flex", flexDirection: "column", gap: "40px"}}>
            <header>
              <button onClick={() => setView("recipes")} style={{color: "#6b6b73", background: "none", border: "none", marginBottom: "10px"}}>← ANNULER</button>
              <h1 style={{fontSize: "45px", fontWeight: "900", margin: 0, textTransform: "uppercase", fontStyle: "italic", lineHeight: 0.9}}>{selected.name}</h1>
            </header>

            {getGuide(selected).map(step => (
              <div key={step.id}>
                <h2 style={{...STYLES.gold, fontSize: "12px", fontWeight: "900", letterSpacing: "2px", marginBottom: "10px"}}>{step.title}</h2>
                <div style={STYLES.card}>
                  <p style={{fontWeight: "bold", fontSize: "14px", textTransform: "uppercase", marginBottom: "20px"}}>{step.action}</p>
                  {step.info && <div style={{fontSize: "10px", color: "#d4af37", border: "1px solid #d4af37", padding: "5px", display: "inline-block", marginBottom: "15px"}}>{step.info}</div>}
                  
                  {step.isBoil ? (
                    <div>
                      <StepTimer minutes={60} label="COUPER LE FEU" />
                      <div style={{borderLeft: "2px solid #1f1f23", paddingLeft: "15px"}}>
                        {step.items.map((it: any, i: number) => (
                          <div key={i} style={{backgroundColor: "#000", border: "1px solid #1f1f23", padding: "15px", marginBottom: "10px", display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                            <div>
                              <div style={{fontSize: "10px", fontWeight: "900", color: "#d4af37"}}>T-{it.time}:00</div>
                              <div style={{fontSize: "18px", fontWeight: "900", fontStyle: "italic", textTransform: "uppercase"}}>{it.name}</div>
                            </div>
                            <div style={{fontSize: "20px", fontWeight: "bold"}}>{it.qty}{it.unit}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{display: "flex", flexDirection: "column", gap: "5px"}}>
                      {step.paliers?.map((p: any, i: number) => (
                        <div key={i} style={{display: "flex", justifyContent: "space-between", padding: "10px", backgroundColor: "#000", fontSize: "12px", fontWeight: "bold"}}>
                          <span>{p.temp}°C</span><span style={STYLES.gold}>{p.duration} MIN</span>
                        </div>
                      ))}
                      {step.items?.map((it: any, i: number) => (
                        <div key={i} style={{display: "flex", justifyContent: "space-between", padding: "10px", backgroundColor: "#000", borderBottom: "1px solid #1f1f23", fontSize: "11px"}}>
                          <span style={{color: "#6b6b73"}}>{it.name}</span><span>{it.qty}{it.unit}</span>
                        </div>
                      ))}
                      {step.timer && step.timer > 0 && <StepTimer minutes={step.timer} label="PALIER TERMINÉ" />}
                    </div>
                  )}
                </div>
              </div>
            ))}

            <div style={{marginTop: "50px", borderTop: "2px solid #d4af37", paddingTop: "30px"}}>
               <h2 style={{fontSize: "24px", fontWeight: "900", fontStyle: "italic", marginBottom: "20px"}}>FIN DE BRASSAGE</h2>
               <div style={{...STYLES.card, display: "flex", flexDirection: "column", gap: "20px"}}>
                  <div style={{display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px"}}>
                    <div><label style={{fontSize: "8px", color: "#6b6b73"}}>DI</label><input type="number" value={di} onChange={e => setDi(Number(e.target.value))} style={STYLES.input} /></div>
                    <div><label style={{fontSize: "8px", color: "#6b6b73"}}>DF</label><input type="number" value={df} onChange={e => setDf(Number(e.target.value))} style={{...STYLES.input, borderColor: "#d4af37"}} /></div>
                    <div><label style={{fontSize: "8px", color: "#6b6b73"}}>VOL</label><input type="number" value={realVol} onChange={e => setRealVol(Number(e.target.value))} style={STYLES.input} /></div>
                  </div>
                  <button onClick={saveToHistory} style={STYLES.btnGold}>ARCHIVER 💾</button>
               </div>
            </div>
          </div>
        )}

        {view === "history" && (
          <div style={{display: "flex", flexDirection: "column", gap: "20px"}}>
            <button onClick={() => setView("home")} style={{color: "#6b6b73", background: "none", border: "none", textAlign: "left"}}>← MENU</button>
            <h1 style={{fontSize: "30px", fontWeight: "900", fontStyle: "italic"}}>ARCHIVES</h1>
            {history.map((h, i) => (
              <div key={i} style={STYLES.card}>
                <div style={{display: "flex", justifyContent: "space-between", marginBottom: "10px"}}>
                  <span style={{fontWeight: "900", fontStyle: "italic", textTransform: "uppercase"}}>{h.recipe_name}</span>
                  <span style={STYLES.gold}>{h.abv_calc}%</span>
                </div>
                <div style={{fontSize: "10px", color: "#6b6b73"}}>{h.di} → {h.df} | {h.volume_final}L</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}