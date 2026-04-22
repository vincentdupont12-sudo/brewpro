"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

/* ---------------- TIMER ---------------- */
function Timer({ minutes }: { minutes: number }) {
  const [time, setTime] = useState(minutes * 60);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    let i: any;
    if (running && time > 0) {
      i = setInterval(() => setTime((t) => t - 1), 1000);
    }
    return () => clearInterval(i);
  }, [running, time]);

  const format = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec < 10 ? "0" : ""}${sec}`;
  };

  return (
    <div className="flex items-center gap-4 mt-6">
      <div className="text-5xl font-mono text-[#d4af37]">{format(time)}</div>
      <button onClick={() => setRunning(true)}>▶</button>
      <button onClick={() => setRunning(false)}>❚❚</button>
      <button onClick={() => { setTime(minutes * 60); setRunning(false); }}>↺</button>
    </div>
  );
}

/* ---------------- BUILD STEPS ---------------- */
function buildSteps(recipe: any) {
  const d = recipe.data || {};
  const stats = d.stats_json || {};
  const steps = d.steps_json || [];

  const mash = steps.find((s: any) => s.isMashBlock);
  const boil = steps.find((s: any) => s.label === "ÉBULLITION");

  const getIng = (step: any) => step?.ingredients || [];

  return [
    {
      name: "Concassage",
      desc: "Préparer les grains.",
      content: getIng(mash).map((m: any, i: number) => (
        <div key={i}>{m.name} — {m.qty} kg</div>
      )),
    },
    {
      name: "Empâtage",
      desc: "Extraction des sucres.",
      timer: mash?.paliers?.reduce((a: number, p: any) => a + p.duration, 0),
      content: (
        <>
          <div>Eau : {stats.waterE} L</div>
          {mash?.paliers?.map((p: any, i: number) => (
            <div key={i}>{p.temp}°C — {p.duration} min</div>
          ))}
        </>
      ),
    },
    {
      name: "Filtration",
      desc: "Séparer le moût.",
    },
    {
      name: "Rinçage",
      desc: "Récupérer les sucres.",
      content: <div>Eau : {stats.waterR} L à 78°C</div>,
    },
    {
      name: "Ébullition",
      desc: "Ajouts.",
      timer: boil?.durationInMinutes || 60,
      content: getIng(boil).map((i: any, idx: number) => (
        <div key={idx}>{i.name} — {i.qty} g</div>
      )),
    },
    {
      name: "Refroidissement",
      desc: "Descendre la température.",
    },
    {
      name: "Fermentation",
      desc: "Fermentation.",
    },
    {
      name: "Embouteillage",
      desc: "Sucrage.",
      content: <div>{d.config?.resucrageDosage} g/L</div>,
    },
  ];
}

/* ---------------- APP ---------------- */
export default function BrewApp() {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const { data } = await supabase
      .from("recipes")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) setRecipes(data);
  };

  /* ---------------- SCREEN 1 : LISTE ---------------- */
  if (!selected) {
    return (
      <div className="min-h-screen bg-black text-white p-10 space-y-4">
        <h1 className="text-3xl font-black">Choisir une recette</h1>

        {recipes.map((r) => (
          <div
            key={r.id}
            onClick={() => setSelected(r)}
            className="p-4 border border-[#1f1f23] cursor-pointer hover:border-[#d4af37]"
          >
            {r.name}
          </div>
        ))}
      </div>
    );
  }

  /* ---------------- SCREEN 2 : BREW ---------------- */
  const steps = buildSteps(selected);
  const current = steps[step];

  return (
    <div className="min-h-screen bg-[#0b0b0c] text-white flex">

      {/* SIDEBAR */}
      <div className="w-64 border-r border-[#1f1f23] p-6 flex flex-col justify-between">
        <div>
          <div className="text-xs text-[#d4af37] mb-6">BREW CONTROL</div>

          {steps.map((s, i) => (
            <div key={i} className={`p-2 border ${
              i === step ? "border-[#d4af37]" : "border-[#1f1f23]"
            }`}>
              {i + 1}. {s.name}
            </div>
          ))}
        </div>

        <button onClick={() => setSelected(null)}>
          Quitter
        </button>
      </div>

      {/* MAIN */}
      <div className="flex-1 p-10">

        <h1 className="text-4xl font-black">{current.name}</h1>
        <p className="text-[#6b6b73]">{current.desc}</p>

        <div className="mt-6">{current.content}</div>

        {current.timer && <Timer minutes={current.timer} />}

        <div className="flex justify-between mt-10">
          <button onClick={() => setStep((s) => Math.max(0, s - 1))}>
            ←
          </button>
          <button onClick={() => setStep((s) => s + 1)}>
            →
          </button>
        </div>
      </div>
    </div>
  );
}