"use client";

import { useEffect, useState } from "react";

/* ---------------- TIMER PRO ---------------- */
function StepTimer({ minutes }: { minutes: number }) {
  const [timeLeft, setTimeLeft] = useState(minutes * 60);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let interval: any = null;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    }

    if (timeLeft === 0 && isActive) {
      setIsActive(false);
      alert("Étape terminée 🔔");
    }

    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const format = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec < 10 ? "0" : ""}${sec}`;
  };

  return (
    <div className="flex items-center gap-4">
      <div className="text-5xl font-mono text-[#d4af37]">
        {format(timeLeft)}
      </div>

      <div className="flex gap-2">
        <button onClick={() => setIsActive(true)} className="bg-green-600 px-4 py-2">▶</button>
        <button onClick={() => setIsActive(false)} className="bg-yellow-500 px-4 py-2">❚❚</button>
        <button onClick={() => { setTimeLeft(minutes * 60); setIsActive(false); }} className="bg-red-600 px-4 py-2">↺</button>
      </div>
    </div>
  );
}

/* ---------------- TIMELINE ---------------- */
function Timeline({ items }: any) {
  return (
    <div className="relative border-l-2 border-[#333] pl-10 space-y-8 mt-8">
      {items.map((it: any, i: number) => (
        <div key={i} className="relative">

          <div className={`absolute -left-[14px] top-2 w-6 h-6 rounded-full ${
            it.type === "amérisant" ? "bg-red-500"
            : it.type === "goût" ? "bg-yellow-400"
            : "bg-green-400"
          }`} />

          <div className="bg-[#111113] border border-[#1f1f23] p-5 rounded flex justify-between">
            <div>
              <div className="text-xs text-[#d4af37]">{it.time} min</div>
              <div className="text-xl font-black">{it.name}</div>
              <div className="text-xs text-[#6b6b73] uppercase">{it.type}</div>
            </div>
            <div className="text-xl font-mono">{it.qty}g</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------------- STEP BLOCK ---------------- */
function StepBlock({ title, objective, children, active }: any) {
  return (
    <div className={`border rounded p-6 ${
      active ? "border-[#d4af37]" : "border-[#1f1f23]"
    }`}>
      <h2 className="text-lg font-black text-[#d4af37] uppercase mb-2">
        {title}
      </h2>

      <p className="text-sm text-[#6b6b73] mb-4">
        {objective}
      </p>

      {children}
    </div>
  );
}

/* ---------------- APP ---------------- */
export default function BrewApp() {

  const hops = [
    { name: "Magnum", qty: 25, time: 60, type: "amérisant" },
    { name: "Cascade", qty: 20, time: 20, type: "goût" },
    { name: "Citra", qty: 20, time: 10, type: "aromatique" },
    { name: "Mosaic", qty: 15, time: 5, type: "aromatique" },
  ];

  return (
    <div className="min-h-screen bg-[#0b0b0c] text-white flex">

      {/* SIDEBAR */}
      <div className="w-64 border-r border-[#1f1f23] p-6 space-y-6">
        <div className="text-xs text-[#d4af37] font-black tracking-widest">
          BREW CONTROL
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span>Volume</span><span>20L</span></div>
          <div className="flex justify-between"><span>Alcool</span><span>5%</span></div>
          <div className="flex justify-between"><span>IBU</span><span>30</span></div>
        </div>

        <div className="space-y-2 text-xs uppercase">
          {["Concassage","Empâtage","Filtration","Rinçage","Ébullition","Refroidissement","Fermentation","Embouteillage"].map((s,i)=>(
            <div key={i} className={`p-2 border ${i===4?"border-[#d4af37]":"border-[#1f1f23]"}`}>
              {i+1}. {s}
            </div>
          ))}
        </div>
      </div>

      {/* MAIN */}
      <div className="flex-1 p-10 space-y-10">

        {/* EBULLITION */}
        <StepBlock
          title="Ébullition (60 min)"
          objective="Stériliser et ajouter les houblons"
          active
        >
          <StepTimer minutes={60} />
          <Timeline items={hops} />
        </StepBlock>

        {/* EMPATAGE */}
        <StepBlock
          title="Empâtage"
          objective="Conversion des sucres"
        >
          <div className="space-y-2 text-sm">
            <div>45°C — 20 min</div>
            <div>62°C — 30 min</div>
            <div>72°C — 10 min</div>
          </div>
          <StepTimer minutes={60} />
        </StepBlock>

        {/* FILTRATION */}
        <StepBlock
          title="Filtration"
          objective="Séparer le moût"
        >
          <StepTimer minutes={10} />
        </StepBlock>

        {/* RINCAGE */}
        <StepBlock
          title="Rinçage"
          objective="Extraire les sucres"
        >
          <div className="text-sm mb-2">12L à 78°C</div>
          <StepTimer minutes={15} />
        </StepBlock>

      </div>
    </div>
  );
}