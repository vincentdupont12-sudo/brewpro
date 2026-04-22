"use client";

import { useState, useEffect } from "react";

/* ---------------- TIMER ---------------- */
function Timer({ minutes }: { minutes: number }) {
  const [time, setTime] = useState(minutes * 60);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    let interval: any;
    if (running && time > 0) {
      interval = setInterval(() => setTime((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [running, time]);

  const format = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec < 10 ? "0" : ""}${sec}`;
  };

  return (
    <div className="flex items-center gap-6 mt-6">
      <div className="text-6xl font-mono text-[#d4af37]">
        {format(time)}
      </div>

      <div className="flex gap-2">
        <button onClick={() => setRunning(true)} className="px-4 py-2 border border-[#1f1f23]">▶</button>
        <button onClick={() => setRunning(false)} className="px-4 py-2 border border-[#1f1f23]">❚❚</button>
        <button onClick={() => { setTime(minutes * 60); setRunning(false); }} className="px-4 py-2 border border-[#1f1f23]">↺</button>
      </div>
    </div>
  );
}

/* ---------------- DATA ---------------- */
const steps = [
  {
    name: "Concassage",
    desc: "Moudre les grains pour exposer l’amidon.",
  },
  {
    name: "Empâtage",
    desc: "Convertir l’amidon en sucres fermentescibles.",
    timer: 60,
    content: (
      <div className="space-y-2 text-sm">
        <div>45°C — 20 min</div>
        <div>62°C — 30 min</div>
        <div>72°C — 10 min</div>
      </div>
    ),
  },
  {
    name: "Filtration",
    desc: "Séparer le moût des drêches.",
    timer: 10,
  },
  {
    name: "Rinçage",
    desc: "Extraire les sucres restants avec eau chaude.",
    timer: 15,
    content: <div className="text-sm">Eau : 12L à 78°C</div>,
  },
  {
    name: "Ébullition",
    desc: "Stériliser le moût et ajouter les houblons.",
    timer: 60,
    content: (
      <div className="space-y-3 mt-4">
        {[
          { t: 60, n: "Magnum", q: 25 },
          { t: 20, n: "Cascade", q: 20 },
          { t: 10, n: "Citra", q: 20 },
          { t: 5, n: "Mosaic", q: 15 },
        ].map((h, i) => (
          <div key={i} className="flex justify-between border-b border-[#1f1f23] pb-2 text-sm">
            <span className="text-[#6b6b73]">{h.t} min</span>
            <span className="font-bold">{h.n}</span>
            <span>{h.q}g</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    name: "Refroidissement",
    desc: "Descendre rapidement la température.",
    timer: 20,
  },
  {
    name: "Fermentation",
    desc: "Transformer les sucres en alcool (plusieurs jours).",
  },
  {
    name: "Embouteillage",
    desc: "Carbonatation en bouteille avec sucre.",
  },
];

/* ---------------- APP ---------------- */
export default function BrewControlApp() {
  const [step, setStep] = useState(0);

  const current = steps[step];

  return (
    <div className="min-h-screen bg-[#0b0b0c] text-white flex">

      {/* SIDEBAR */}
      <div className="w-64 border-r border-[#1f1f23] p-6 flex flex-col justify-between">

        <div>
          <div className="text-xs text-[#d4af37] font-black tracking-widest mb-6">
            BREW CONTROL
          </div>

          <div className="space-y-2 text-xs uppercase">
            {steps.map((s, i) => (
              <div
                key={i}
                className={`p-3 border ${
                  i === step
                    ? "border-[#d4af37] text-white"
                    : i < step
                    ? "border-[#1f1f23] text-[#6b6b73] opacity-40"
                    : "border-[#1f1f23] text-[#6b6b73]"
                }`}
              >
                {i + 1}. {s.name}
              </div>
            ))}
          </div>
        </div>

        {/* ABANDON */}
        <button className="text-xs text-[#6b6b73] border border-[#1f1f23] p-3">
          Abandonner ✕
        </button>
      </div>

      {/* MAIN */}
      <div className="flex-1 p-10 flex flex-col justify-between">

        {/* TOP BAR */}
        <div className="flex justify-between items-center mb-10">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className="text-sm text-[#6b6b73]"
          >
            ← Retour
          </button>

          <div className="text-sm text-[#6b6b73]">
            Étape {step + 1} / {steps.length}
          </div>
        </div>

        {/* CONTENT */}
        <div>
          <h1 className="text-4xl font-black uppercase">
            {current.name}
          </h1>

          <p className="text-[#6b6b73] mt-2 mb-6">
            {current.desc}
          </p>

          {current.content}

          {current.timer && <Timer minutes={current.timer} />}
        </div>

        {/* NAVIGATION */}
        <div className="flex justify-between mt-10 pt-6 border-t border-[#1f1f23]">

          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className="text-sm text-[#6b6b73]"
          >
            ← Précédent
          </button>

          <button
            onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
            className="bg-[#d4af37] text-black px-6 py-3 font-bold"
          >
            Étape suivante →
          </button>

        </div>
      </div>
    </div>
  );
}