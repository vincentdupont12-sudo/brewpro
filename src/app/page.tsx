"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

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
        <button
          onClick={() => {
            setTime(minutes * 60);
            setRunning(false);
          }}
          className="px-4 py-2 border border-[#1f1f23]"
        >
          ↺
        </button>
      </div>
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

  const getIng = (step: any, type?: string) =>
    (step?.ingredients || []).filter((i: any) =>
      type ? (i.type || "").includes(type) : true
    );

  return [
    {
      name: "Concassage",
      desc: "Préparer les grains.",
      content: (
        <div className="space-y-1 text-sm">
          {getIng(mash, "MALT").map((m: any, i: number) => (
            <div key={i}>
              {m.name} — {m.qty} kg
            </div>
          ))}
        </div>
      ),
    },

    {
      name: "Empâtage",
      desc: "Conversion des sucres.",
      timer: mash?.paliers?.reduce(
        (acc: number, p: any) => acc + (p.duration || 0),
        0
      ),
      content: (
        <div className="space-y-3 text-sm">
          <div>Eau : {stats.waterE} L</div>

          <div className="border-t border-[#1f1f23] pt-2">
            {mash?.paliers?.map((p: any, i: number) => (
              <div key={i} className="flex justify-between">
                <span>{p.temp}°C</span>
                <span>{p.duration} min</span>
              </div>
            ))}
          </div>

          <div className="border-t border-[#1f1f23] pt-2">
            {getIng(mash, "MALT").map((m: any, i: number) => (
              <div key={i}>
                {m.name} — {m.qty} kg
              </div>
            ))}
          </div>
        </div>
      ),
    },

    {
      name: "Filtration",
      desc: "Séparer le moût des drêches.",
    },

    {
      name: "Rinçage",
      desc: "Extraire les sucres restants.",
      content: (
        <div className="text-sm">
          Eau : {stats.waterR} L à 78°C
        </div>
      ),
    },

    {
      name: "Ébullition",
      desc: "Stériliser et ajouter les ingrédients.",
      timer: boil?.durationInMinutes || 60,
      content: (
        <div className="space-y-2 text-sm">
          {getIng(boil).map((i: any, idx: number) => (
            <div key={idx} className="flex justify-between border-b border-[#1f1f23] pb-1">
              <span>{i.name}</span>
              <span>{i.qty} g</span>
            </div>
          ))}
        </div>
      ),
    },

    {
      name: "Refroidissement",
      desc: "Descendre rapidement la température.",
    },

    {
      name: "Fermentation",
      desc: "Ajouter la levure et laisser fermenter.",
    },

    {
      name: "Embouteillage",
      desc: "Sucrage et mise en bouteille.",
      content: (
        <div className="text-sm">
          Sucre : {d.config?.resucrageDosage} g/L
        </div>
      ),
    },
  ];
}

/* ---------------- APP ---------------- */
export default function BrewControlApp() {
  const [recipe, setRecipe] = useState<any>(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const fetchRecipe = async () => {
      const { data } = await supabase
        .from("recipes")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (data) setRecipe(data);
    };

    fetchRecipe();
  }, []);

  if (!recipe) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Chargement recette...
      </div>
    );
  }

  const steps = buildSteps(recipe);
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

        <button
          onClick={() => {
            if (confirm("Abandonner le brassin ?")) {
              setStep(0);
            }
          }}
          className="text-xs text-[#6b6b73] border border-[#1f1f23] p-3"
        >
          Abandonner ✕
        </button>
      </div>

      {/* MAIN */}
      <div className="flex-1 p-10 flex flex-col justify-between">

        {/* HEADER */}
        <div className="flex justify-between mb-10">
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

        {/* NAV */}
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