"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function BrewControlApp() {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);

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

        {/* HOME: RECIPES + INVENTORY */}
        {!selected && (
          <>
            {/* RECIPES */}
            <div>
              <SectionTitle title="RECIPES" />

              <div className="bg-[#111113] border border-[#2a2a2e] rounded-md overflow-hidden">
                {recipes.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => setSelected(r)}
                    className="group relative px-6 py-4 border-b border-[#1f1f23] last:border-none cursor-pointer hover:bg-[#0f0f10] transition"
                  >
                    <div className="absolute top-0 left-0 h-[2px] w-0 bg-[#d4af37] group-hover:w-full transition-all duration-300" />

                    <div className="text-[14px] font-[450]">
                      {r.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* INVENTORY */}
            <div>
              <SectionTitle title="INVENTORY" />

              <div className="bg-[#111113] border border-[#2a2a2e] rounded-md overflow-hidden">
                {inventory.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between px-6 py-4 border-b border-[#1f1f23] last:border-none"
                  >
                    <div>
                      <div className="text-[13px] font-[450]">
                        {item.name}
                      </div>
                      <div className="text-[11px] text-[#6b6b73]">
                        {item.type}
                      </div>
                    </div>

                    <div className="text-[14px]">
                      {item.quantity}{" "}
                      <span className="text-[#a88f2a] text-[12px]">
                        {item.unit}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* RECIPE DETAIL */}
        {selected && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <SectionTitle title={selected.name} />

              <button
                onClick={() => setSelected(null)}
                className="text-[11px] tracking-[0.2em] text-[#6b6b73] hover:text-[#d4af37] transition"
              >
                ← BACK
              </button>
            </div>

            <div className="bg-[#111113] border border-[#2a2a2e] rounded-md p-6">
              {selected.data?.steps_json?.map((step: any, index: number) => (
                <div
                  key={step.id}
                  className="flex justify-between border-b border-[#1f1f23] py-4 last:border-none"
                >
                  <div className="text-[13px] font-[450]">
                    {index + 1}. {step.label}
                  </div>

                  <div className="text-[12px] text-[#6b6b73]">
                    {step.temp ? (
                      <>
                        {step.temp}
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

      </div>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-[11px] tracking-[0.25em] text-[#a88f2a]">
        {title}
      </h2>
      <div className="h-px bg-gradient-to-r from-transparent via-[#d4af37] to-transparent mt-3" />
    </div>
  );
}
