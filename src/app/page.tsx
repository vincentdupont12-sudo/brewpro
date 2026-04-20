"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function BrewMasterSpaceX() {
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
    <div className="h-screen bg-black text-white flex flex-col font-sans">
      {/* TOP BAR */}
      <div className="h-14 border-b border-zinc-800 flex items-center justify-between px-6 text-sm">
        <div className="font-semibold tracking-widest">BREW CONTROL</div>
        <div className="text-zinc-500">{new Date().toLocaleTimeString()}</div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* SIDEBAR */}
        <aside className="w-64 border-r border-zinc-800 p-6 space-y-6">
          <div className="text-xs text-zinc-500 uppercase">Navigation</div>

          <nav className="flex flex-col gap-2">
            <NavButton label="Dashboard" active={view === "dashboard"} onClick={() => setView("dashboard")} />
            <NavButton label="Recipes" active={view === "recipes"} onClick={() => setView("recipes")} />
            <NavButton label="Inventory" active={view === "inventory"} onClick={() => setView("inventory")} />
          </nav>
        </aside>

        {/* MAIN */}
        <main className="flex-1 p-8 overflow-y-auto">

          {/* DASHBOARD */}
          {view === "dashboard" && (
            <div className="space-y-8">
              <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>

              <div className="grid grid-cols-3 gap-6">
                <Metric title="Recipes" value={recipes.length} />
                <Metric title="Ingredients" value={inventory.length} />
                <Metric title="Active Brew" value={selected ? 1 : 0} />
              </div>
            </div>
          )}

          {/* RECIPES */}
          {view === "recipes" && (
            <div>
              <h1 className="text-3xl font-semibold mb-6">Recipes</h1>

              <div className="grid grid-cols-2 gap-6">
                {recipes.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => {
                      setSelected(r);
                      setView("brew");
                    }}
                    className="p-6 border border-zinc-800 rounded-xl hover:border-white transition cursor-pointer"
                  >
                    <div className="text-lg font-medium">{r.name}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* BREW */}
          {view === "brew" && selected && (
            <div>
              <button onClick={() => setView("recipes")} className="mb-6 text-sm text-zinc-500">← Back</button>

              <h1 className="text-3xl font-semibold mb-10">{selected.name}</h1>

              <div className="space-y-4">
                {selected.data?.steps_json?.map((step: any) => (
                  <div
                    key={step.id}
                    className={`p-5 border rounded-lg flex justify-between items-center transition ${
                      completedSteps.includes(step.id)
                        ? "border-zinc-700 bg-zinc-900 opacity-40"
                        : "border-zinc-800"
                    }`}
                  >
                    <div>
                      <div className="font-medium">{step.label}</div>
                      {step.temp && (
                        <div className="text-sm text-zinc-500">
                          {step.temp}°C · {step.durationInMinutes} min
                        </div>
                      )}
                    </div>

                    <input
                      type="checkbox"
                      className="w-5 h-5"
                      onChange={() =>
                        setCompletedSteps((p) =>
                          p.includes(step.id)
                            ? p.filter((x) => x !== step.id)
                            : [...p, step.id]
                        )
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* INVENTORY */}
          {view === "inventory" && (
            <div>
              <h1 className="text-3xl font-semibold mb-6">Inventory</h1>

              <div className="grid grid-cols-2 gap-6">
                {inventory.map((item) => (
                  <div key={item.id} className="p-6 border border-zinc-800 rounded-xl">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-sm text-zinc-500">{item.type}</div>
                    <div className="text-lg mt-2">{item.quantity} {item.unit}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function NavButton({ label, active, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`text-left px-4 py-2 rounded-lg text-sm transition ${
        active
          ? "bg-white text-black"
          : "text-zinc-400 hover:text-white hover:bg-zinc-800"
      }`}
    >
      {label}
    </button>
  );
}

function Metric({ title, value }: any) {
  return (
    <div className="p-6 border border-zinc-800 rounded-xl">
      <div className="text-sm text-zinc-500">{title}</div>
      <div className="text-3xl font-semibold mt-2">{value}</div>
    </div>
  );
}
