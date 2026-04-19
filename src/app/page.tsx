"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function BrewMasterPro() {
  const [view, setView] = useState("dashboard");
  const [recipes, setRecipes] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [inventory, setInventory] = useState<any[]>([]);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: r } = await supabase.from("recipes").select("*");
    const { data: i } = await supabase.from("inventory").select("*");
    if (r) setRecipes(r);
    if (i) setInventory(i);
  };

  return (
    <div className="flex h-screen bg-zinc-950 text-white">
      {/* SIDEBAR */}
      <aside className="w-64 bg-black border-r border-zinc-800 p-6 flex flex-col justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight mb-10">
            BREW<span className="text-yellow-500">.PRO</span>
          </h1>

          <nav className="space-y-2 text-sm">
            <button onClick={() => setView("dashboard")} className="w-full text-left p-3 rounded hover:bg-zinc-800">Dashboard</button>
            <button onClick={() => setView("recipes")} className="w-full text-left p-3 rounded hover:bg-zinc-800">Recipes</button>
            <button onClick={() => setView("inventory")} className="w-full text-left p-3 rounded hover:bg-zinc-800">Inventory</button>
          </nav>
        </div>

        <div className="text-xs text-zinc-500">v1.0 BREW SYSTEM</div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 p-10 overflow-y-auto">

        {/* DASHBOARD */}
        {view === "dashboard" && (
          <div className="space-y-10">
            <h2 className="text-3xl font-bold">Dashboard</h2>

            <div className="grid grid-cols-3 gap-6">
              <Card title="Recipes" value={recipes.length} />
              <Card title="Ingredients" value={inventory.length} />
              <Card title="Active Brew" value={selected ? 1 : 0} />
            </div>
          </div>
        )}

        {/* RECIPES */}
        {view === "recipes" && (
          <div>
            <h2 className="text-3xl font-bold mb-6">Recipes</h2>

            <div className="grid grid-cols-2 gap-6">
              {recipes.map((r) => (
                <div
                  key={r.id}
                  onClick={() => {
                    setSelected(r);
                    setView("brew");
                  }}
                  className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 hover:border-yellow-500 cursor-pointer transition"
                >
                  <div className="text-lg font-bold">{r.name}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* BREW VIEW */}
        {view === "brew" && selected && (
          <div>
            <button onClick={() => setView("recipes")} className="mb-6 text-sm text-zinc-400">← Back</button>

            <h2 className="text-3xl font-bold mb-10">{selected.name}</h2>

            <div className="space-y-6">
              {selected.data?.steps_json?.map((step: any) => (
                <div
                  key={step.id}
                  className={`p-6 rounded-lg border transition ${
                    completedSteps.includes(step.id)
                      ? "bg-zinc-800 border-zinc-700 opacity-40"
                      : "bg-zinc-900 border-zinc-700"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-bold">{step.label}</div>
                      {step.temp && (
                        <div className="text-sm text-cyan-400">
                          {step.temp}°C · {step.durationInMinutes} min
                        </div>
                      )}
                    </div>

                    <input
                      type="checkbox"
                      className="w-6 h-6"
                      onChange={() =>
                        setCompletedSteps((p) =>
                          p.includes(step.id)
                            ? p.filter((x) => x !== step.id)
                            : [...p, step.id]
                        )
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* INVENTORY */}
        {view === "inventory" && (
          <div>
            <h2 className="text-3xl font-bold mb-6">Inventory</h2>

            <div className="grid grid-cols-2 gap-6">
              {inventory.map((item) => (
                <div
                  key={item.id}
                  className="bg-zinc-900 p-6 rounded-xl border border-zinc-800"
                >
                  <div className="font-bold">{item.name}</div>
                  <div className="text-sm text-zinc-400">{item.type}</div>
                  <div className="text-xl mt-2">
                    {item.quantity} {item.unit}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Card({ title, value }: { title: string; value: number }) {
  return (
    <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
      <div className="text-sm text-zinc-400">{title}</div>
      <div className="text-3xl font-bold mt-2">{value}</div>
    </div>
  );
}

