"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Settings, Beer, Activity, Droplets } from "lucide-react";

export default function BrewDashboard() {
  const [mounted, setMounted] = useState(false);

  // Données de test
  const recipe = {
    name: "IPA Session",
    ebc: 12,
    ibu: 45,
    og: 1.045,
    fg: 1.008,
    grainKg: 4.5
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="min-h-screen bg-black" />;

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 md:p-12 font-sans">
      
      {/* BANNIERE DE TEST - SI TU NE VOIS PAS CA, TU MODIFIES LE MAUVAIS FICHIER */}
      <div className="bg-red-600 text-white text-center p-3 font-black animate-bounce mb-10 rounded-xl border-4 border-white">
        VERSION V2.1 ACTIVE : ÉCHELLES EBC / IBU CHARGÉES
      </div>

      <div className="max-w-4xl mx-auto">
        
        {/* HEADER */}
        <div className="flex justify-between items-center mb-16">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500 rounded-2xl text-black">
              <Beer size={24} strokeWidth={3} />
            </div>
            <h1 className="text-2xl font-black uppercase italic tracking-tighter">
              BREWPRO <span className="text-amber-500">DIGITAL</span>
            </h1>
          </div>
          <Link href="/editor" className="p-4 bg-gray-900 border border-gray-800 rounded-2xl hover:border-amber-500 transition-all">
            <Settings size={20} className="text-gray-500" />
          </Link>
        </div>

        {/* --- SECTION ÉCHELLES --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          
          {/* EBC */}
          <div className="bg-[#0a0a0a] p-8 rounded-[40px] border border-gray-800 shadow-2xl relative">
            <div className="flex justify-between mb-6">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Couleur (EBC)</span>
              <span className="text-3xl font-mono font-black text-white">{recipe.ebc}</span>
            </div>
            <div className="relative h-4 w-full rounded-full bg-gray-900 border border-gray-800 overflow-visible">
              <div 
                className="absolute inset-0 rounded-full" 
                style={{ background: 'linear-gradient(90deg, #F3F993, #E18D19, #241103)' }} 
              />
              <div 
                className="absolute top-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-[0_0_20px_white] border-[6px] border-black z-20 transition-all duration-1000"
                style={{ left: `${(recipe.ebc / 80) * 100}%`, transform: 'translate(-50%, -50%)' }}
              />
            </div>
          </div>

          {/* IBU */}
          <div className="bg-[#0a0a0a] p-8 rounded-[40px] border border-gray-800 shadow-2xl relative">
            <div className="flex justify-between mb-6">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Amertume (IBU)</span>
              <span className="text-3xl font-mono font-black text-white">{recipe.ibu}</span>
            </div>
            <div className="relative h-4 w-full rounded-full bg-gray-900 border border-gray-800 overflow-visible">
              <div 
                className="absolute inset-0 rounded-full" 
                style={{ background: 'linear-gradient(90deg, #10b981, #f59e0b, #ef4444)' }} 
              />
              <div 
                className="absolute top-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-[0_0_20px_white] border-[6px] border-black z-20 transition-all duration-1000"
                style={{ left: `${(recipe.ibu / 100) * 100}%`, transform: 'translate(-50%, -50%)' }}
              />
            </div>
          </div>

        </div>

        {/* INFO RECETTE SIMPLE */}
        <div className="bg-[#0a0a0a] border border-gray-800 p-12 rounded-[50px] text-center shadow-2xl">
          <h2 className="text-5xl font-black uppercase tracking-tighter mb-4 text-white">
            {recipe.name}
          </h2>
          <div className="flex justify-center gap-10 border-t border-gray-900 pt-10 mt-6">
            <div className="text-center">
              <p className="text-[10px] text-gray-600 font-black uppercase">Alcool</p>
              <p className="text-2xl font-mono font-bold text-amber-500">
                {((recipe.og - recipe.fg) * 131).toFixed(1)}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-gray-600 font-black uppercase">Malt</p>
              <p className="text-2xl font-mono font-bold">{recipe.grainKg} kg</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}