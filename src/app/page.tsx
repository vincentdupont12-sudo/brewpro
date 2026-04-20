"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function BrewControlGold() {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [inventory, setInventory] = useState<any[]>([]);

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
    <div className="min-h-screen bg-[#0b0b0c] text-[#e7e7e7] font-sans">

      {/* TOP BAR */}
      <div className="h-12 border-b border-[#1f1f23] flex items-center justify-between px-6">
        <div className="text-sm tracking-widest text-[#d4af37]">BREW CONTROL</div>
        <div className="text-xs text-[#6b6b73]">{new Date().toLocaleTimeString()}</div>
      </div>

      <div className="max-w-6xl mx-auto p-8 space-y-10">

        {/* METRICS */}
        <div className="grid grid-cols-3 gap-6">
          <Metric label="RECIPES" value={recipes.length} />
          <Metric label="INGREDIENTS" value={inventory.length} />
          <Metric label="SELECTED" value={selected ? 1 : 0} />
        </div>

        {/* RECIPES */}
        <div>
          <SectionTitle title="RECIPES" />
          <div className="grid grid-cols-2 gap-6">
            {recipes.map((r) => (
              <div
                key={r.id}
                onClick={() => setSelected(r)}
                className="bg-[#111113] border border-[#1f1f23] rounded-lg p-6 cursor-pointer hover:border-[#d4af37] transition"
              >
                <div className="text-lg">{r.name}</div>
              </div>
            ))}
          </div>
        </div>

        {/* SELECTED RECIPE */}
        {selected && (
          <div>
            <SectionTitle title={selected.name} />

            <div className="bg-[#111113] border border-[#1f1f23] rounded-lg p-6">
              {selected.data?.steps_json?.map((step: any) => (
                <div key={step.id} className="flex justify-between border-b border-[#1f1f23] py-4 last:border-none">
                  <div className="text-sm">{step.label}</div>
                  <div className="text-xs text-[#6b6b73]">
                    {step.temp ? `${step.temp}°C` : "-"} · {step.durationInMinutes} min
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* INVENTORY */}
        <div>
          <SectionTitle title="INVENTORY" />
          <div className="grid grid-cols-2 gap-6">
            {inventory.map((item) => (
              <div key={item.id} className="bg-[#111113] border border-[#1f1f23] rounded-lg p-6">
                <div className="text-sm">{item.name}</div>
                <div className="text-xs text-[#6b6b73]">{item.type}</div>
                <div className="text-xl mt-2">
                  {item.quantity} <span className="text-[#a88f2a]">{item.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-xs tracking-[0.2em] text-[#a88f2a]">{title}</h2>
      <div className="h-px bg-gradient-to-r from-transparent via-[#d4af37] to-transparent mt-3" />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-[#111113] border border-[#1f1f23] rounded-lg p-6">
      <div className="text-xs text-[#6b6b73] mb-2">{label}</div>
      <div className="text-3xl font-light">
        {value}
      </div>
    </div>
  );
}
