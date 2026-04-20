"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function BrewControlCore() {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [temp, setTemp] = useState(65);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    fetchData();

    // fake live data
    const interval = setInterval(() => {
      setTemp((t) => t + (Math.random() * 2 - 1));
      setProgress((p) => (p < 100 ? p + 0.2 : p));
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    const { data } = await supabase.from("recipes").select("*");
    if (data) setRecipes(data);
  };

  return (
    <div className="h-screen bg-black text-white font-mono flex flex-col">

      {/* STATUS BAR */}
      <div className="h-10 border-b border-zinc-800 flex items-center justify-between px-4 text-xs tracking-widest">
        <div className="flex gap-6">
          <span className="text-green-500">● ONLINE</span>
          <span className="text-zinc-500">BREW CORE // UNIT-01</span>
        </div>
        <div className="text-zinc-500">{new Date().toLocaleTimeString()}</div>
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-4 grid-rows-2 gap-4 p-4 flex-1">

        {/* CONTROL PANEL */}
        <div className="col-span-1 row-span-2 border border-zinc-800 p-4 flex flex-col justify-between">
          <div>
            <div className="text-yellow-500 text-xs mb-4">CONTROL PANEL</div>

            <div className="space-y-3">
              {recipes.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelected(r)}
                  className="w-full text-left border border-zinc-800 p-3 hover:border-yellow-500 hover:bg-zinc-900 transition"
                >
                  {r.name}
                </button>
              ))}
            </div>
          </div>

          <button className="border border-zinc-700 py-3 mt-4 hover:bg-yellow-500 hover:text-black transition">
            START SEQUENCE
          </button>
        </div>

        {/* LIVE DATA */}
        <div className="col-span-2 row-span-1 border border-zinc-800 p-4">
          <div className="text-cyan-400 text-xs mb-4">LIVE DATA</div>

          <div className="flex gap-10">
            <div>
              <div className="text-5xl font-bold">{temp.toFixed(1)}°C</div>
              <div className="text-zinc-500 text-sm">Temperature</div>
            </div>

            <div>
              <div className="text-5xl font-bold">{Math.floor(progress)}%</div>
              <div className="text-zinc-500 text-sm">Progress</div>
            </div>
          </div>
        </div>

        {/* PROCESS FLOW */}
        <div className="col-span-2 row-span-1 border border-zinc-800 p-4">
          <div className="text-yellow-500 text-xs mb-4">PROCESS FLOW</div>

          <div className="flex items-center gap-6">
            {["MASH", "BOIL", "HOP", "COOL"].map((step, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="w-4 h-4 bg-yellow-500 mb-2 animate-pulse" />
                <div className="text-xs text-zinc-400">{step}</div>
              </div>
            ))}
          </div>
        </div>

        {/* DETAIL */}
        <div className="col-span-4 row-span-1 border border-zinc-800 p-4 overflow-y-auto">
          <div className="text-yellow-500 text-xs mb-4">SEQUENCE LOG</div>

          {selected ? (
            <div className="space-y-3">
              {selected.data?.steps_json?.map((step: any) => (
                <div key={step.id} className="flex justify-between border-b border-zinc-800 pb-2">
                  <div>{step.label}</div>
                  <div className="text-zinc-500 text-xs">
                    {step.temp ? `${step.temp}°C` : "-"} | {step.durationInMinutes} min
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-zinc-600 text-sm">NO SEQUENCE SELECTED</div>
          )}
        </div>

      </div>

      {/* SCANLINE EFFECT */}
      <div className="pointer-events-none fixed inset-0 opacity-[0.03] bg-[linear-gradient(transparent_50%,white_50%)] bg-[size:100%_2px]" />

    </div>
  );
}
