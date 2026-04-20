"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function BrewControlGoldRefined() {
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
    <div className="min-h-screen bg-[#0b0b0c] text-[#e7e7e7] font-sans tracking-tight">

      {/* TOP BAR */}
      <div className="h-12 border-b border-[#1f1f23] flex items-center justify-between px-6">
        <div className="text-[13px] tracking-[0.25em] text-[#d4af37]">
          BREW CONTROL
        </div>
        <div className="text-[12px] text-[#6b6b73]">
          {new Date().toLocaleTimeString()}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-10 space-y-14">

        {/* METRICS */}
        <div className="grid grid-cols-3 gap-6">
          <Metric label="RECIPES" value={recipes.length} />
          <Metric label="INGREDIENTS" value={inventory.length} />
          <Metric label="ACTIVE" value={selected ? 1 : 0} />
        </div>

        {/* RECIPES */}
        <div>
          <SectionTitle title="RECIPES" />

          <div className="grid grid-cols-2 gap-6">
            {recipes.map((r) => (
              <div
                key={r.id}
                onClick={() => setSelected(r)}
                className="group relative bg-[#111113] border border-[#2a2a2e] rounded-md p-6 cursor-pointer transition-all duration-200 hover:border-[#d4af37]"
              >
                {/* GOLD LINE SIGNATURE */}
                <div className="absolute top-0 left-0 h-[2px] w-0 bg-[#d4af37] group-hover:w-full transition-all duration-300" />

                <div className="text-[20px] font-[450]">
                  {r.name}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SELECTED RECIPE */}
        {selected && (
          <div>
            <SectionTitle title={selected.name} />

            <div className="bg-[#111113] border border-[#2a2a2e] rounded-md p-6">
              {selected.data?.steps_json?.map((step: any) => (
                <div
                  key={step.id}
                  className="flex justify-between border-b border-[#1f1f23] py-4 last:border-none"
                >
                  <div className="text-[13px] font-[450]">
                    {step.label}
                  </div>

                  <div className="text-[12px] text-[#6b6b73]">
                    {step.temp ? (
                      <>
                        <span>{step.temp}</span>
                        <span className="text-[#a88f2a]">°C</span>
                      </>
                    ) : (
                      "-"
                    )}
                    {' '}· {step.durationInMinutes} min
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
              <div
                key={item.id}
                className="bg-[#111113] border border-[#2a2a2e] rounded-md p-6"
              >
                <div className="text-[13px] font-[450]">
                  {item.name}
                </div>

                <div className="text-[12px] text-[#6b6b73] mt-1">
                  {item.type}
                </div>

                <div className="text-[22px] font-[300] mt-3">
                  {item.quantity}{" "}
                  <span className="text-[#a88f2a] text-[14px]">
                    {item.unit}
                  </span>
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
    <div className="mb-6">
      <h2 className="text-[11px] tracking-[0.25em] text-[#a88f2a]">
        {title}
      </h2>

      <div className="h-px bg-gradient-to-r from-transparent via-[#d4af37] to-transparent mt-4" />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-[#111113] border border-[#2a2a2e] rounded-md p-6">
      <div className="text-[11px] text-[#6b6b73] tracking-[0.2em] mb-3">
        {label}
      </div>

      <div className="text-[32px] font-[300]">
        {value}
      </div>
    </div>
  );
}
