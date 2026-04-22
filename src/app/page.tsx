"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

/* ---------------- TIMER PRO ---------------- */
function StepTimer({
  minutes,
  label,
}: {
  minutes: number;
  label: string;
}) {
  const [timeLeft, setTimeLeft] = useState(minutes * 60);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let interval: any = null;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((t) => t - 1);
      }, 1000);
    }

    if (timeLeft === 0 && isActive) {
      setIsActive(false);
      alert(`🔔 ${label}`);
    }

    return () => clearInterval(interval);
  }, [isActive, timeLeft, label]);

  const format = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec < 10 ? "0" : ""}${sec}`;
  };

  return (
    <div className="flex items-center gap-3 mt-4">
      <div className="text-3xl font-mono font-black text-[#d4af37]">
        {format(timeLeft)}
      </div>

      <button
        onClick={() => setIsActive(true)}
        className="px-3 py-2 bg-green-600 text-xs font-bold"
      >
        ▶
      </button>

      <button
        onClick={() => setIsActive(false)}
        className="px-3 py-2 bg-yellow-500 text-xs font-bold"
      >
        ❚❚
      </button>

      <button
        onClick={() => {
          setTimeLeft(minutes * 60);
          setIsActive(false);
        }}
        className="px-3 py-2 bg-red-600 text-xs font-bold"
      >
        ↺
      </button>
    </div>
  );
}

/* ---------------- TIMELINE HOUBLONS ---------------- */
function BoilTimeline({ hops }: any) {
  return (
    <div className="relative pl-6 border-l border-[#333] space-y-6 mt-6">
      {hops.map((h: any, i: number) => (
        <div key={i} className="flex justify-between items-center">
          <div>
            <div className="text-xs text-[#d4af37] font-bold">
              T-{h.time} min
            </div>
            <div className="font-black text-white">{h.name}</div>
            <div
              className={`text-[10px] font-bold ${
                h.type === "amérisant"
                  ? "text-red-500"
                  : h.type === "goût"
                  ? "text-yellow-400"
                  : "text-green-400"
              }`}
            >
              {h.type}
            </div>
          </div>

          <div className="font-mono text-lg">{h.qty}g</div>
        </div>
      ))}
    </div>
  );
}

/* ---------------- STEP CARD ---------------- */
function StepCard({ title, objective, children }: any) {
  return (
    <div className="bg-[#111113] border border-[#1f1f23] p-5 rounded space-y-3">
      <h2 className="text-sm font-black text-[#d4af37] uppercase">
        {title}
      </h2>

      <div className="text-xs text-[#6b6b73] uppercase font-bold">
        OBJECTIF
      </div>

      <p className="text-sm text-white">{objective}</p>

      {children}
    </div>
  );
}

/* ---------------- APP ---------------- */
export default function BrewControlApp() {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);

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

  const buildHops = (recipe: any) => {
    const steps = recipe.data?.steps_json || [];

    return steps
      .flatMap((s: any) => s.ingredients || [])
      .filter((i: any) =>
        (i.name || "").toUpperCase().includes("HOUBLON")
      )
      .map((h: any) => {
        const time = parseInt(h.durationInMinutes) || 60;

        let type = "aromatique";
        if (time >= 45) type = "amérisant";
        else if (time >= 15) type = "goût";

        return {
          name: h.name,
          qty: h.qty || 10,
          time,
          type,
        };
      })
      .sort((a: any, b: any) => b.time - a.time);
  };

  if (!selected) {
    return (
      <div className="p-10 space-y-4">
        <h1 className="text-3xl font-black">Choisir recette</h1>

        {recipes.map((r) => (
          <div
            key={r.id}
            onClick={() => setSelected(r)}
            className="p-4 bg-black border cursor-pointer"
          >
            {r.name}
          </div>
        ))}
      </div>
    );
  }

  const hops = buildHops(selected);

  return (
    <div className="max-w-xl mx-auto p-6 space-y-10">

      {/* EMPATAGE */}
      <StepCard
        title="EMPÂTAGE"
        objective="Convertir l'amidon en sucres fermentescibles."
      >
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span>45°C</span>
            <span>20 min - Acid rest</span>
          </div>
          <div className="flex justify-between text-xs">
            <span>62°C</span>
            <span>30 min - Beta amylase</span>
          </div>
          <div className="flex justify-between text-xs">
            <span>72°C</span>
            <span>10 min - Alpha amylase</span>
          </div>
        </div>

        <StepTimer minutes={60} label="Fin empâtage" />
      </StepCard>

      {/* FILTRATION */}
      <StepCard
        title="FILTRATION"
        objective="Séparer le moût des drêches."
      >
        <StepTimer minutes={10} label="Fin filtration" />
      </StepCard>

      {/* RINÇAGE */}
      <StepCard
        title="RINÇAGE"
        objective="Extraire les sucres restants avec eau chaude."
      >
        <div className="flex justify-between text-xs">
          <span>Volume eau</span>
          <span>12 L</span>
        </div>
        <div className="flex justify-between text-xs">
          <span>Température</span>
          <span>78°C</span>
        </div>

        <StepTimer minutes={15} label="Fin rinçage" />
      </StepCard>

      {/* EBULLITION */}
      <StepCard
        title="ÉBULLITION"
        objective="Stériliser et ajouter les houblons."
      >
        <StepTimer minutes={60} label="Fin ébullition" />
        <BoilTimeline hops={hops} />
      </StepCard>

      {/* REFROIDISSEMENT */}
      <StepCard
        title="REFROIDISSEMENT"
        objective="Refroidir rapidement le moût."
      >
        <StepTimer minutes={20} label="Moût refroidi" />
      </StepCard>

      {/* FERMENTATION */}
      <StepCard
        title="FERMENTATION"
        objective="Transformer les sucres en alcool."
      >
        <div className="text-sm">10 jours</div>
      </StepCard>

      {/* EMBOUTEILLAGE */}
      <StepCard
        title="EMBOUTEILLAGE"
        objective="Carbonatation en bouteille."
      >
        <div className="text-sm">Sucre: 7 g/L</div>
      </StepCard>
    </div>
  );
}