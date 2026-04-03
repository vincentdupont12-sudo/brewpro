"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

// --- DONNÉES DE RÉFÉRENCE ---
const MALTS_LIB = [
  { nom: "Pale Ale", couleur: 10, rendementSucre: 300 },
  { nom: "Munich", couleur: 20, rendementSucre: 300 },
  { nom: "Caramel 40", couleur: 40, rendementSucre: 280 },
  { nom: "Chocolate", couleur: 120, rendementSucre: 260 },
  { nom: "Pilsner", couleur: 5, rendementSucre: 310 },
];

const HOUBLONS_LIB = [
  { nom: "Cascade", alpha: 0.05 },
  { nom: "Centennial", alpha: 0.10 },
  { nom: "Citra", alpha: 0.12 },
  { nom: "Saaz", alpha: 0.04 },
];

const LEVURES_LIB = [
  { nom: "Safale US-05", attenuation: 0.75 },
  { nom: "Wyeast 1056", attenuation: 0.78 },
  { nom: "Saflager S-23", attenuation: 0.78 },
];

const ETAPES_PROCESS = [
  { id: 0, nom: "Concassage", desc: "Broyage du malt pour libérer l'amidon", icon: "🌾" },
  { id: 1, nom: "Empâtage", desc: "Extraction des sucres entre 62°C et 68°C", icon: "🌡️" },
  { id: 2, nom: "Filtration", desc: "Séparation du moût liquide et des résidus de grains", icon: "☕" },
  { id: 3, nom: "Ébullition", desc: "Stérilisation et infusion des houblons", icon: "🔥" },
  { id: 4, nom: "Refroidissement", desc: "Passage de 100°C à 20°C via échangeur", icon: "❄️" },
  { id: 5, nom: "Fermentation", desc: "Les levures transforment le sucre en alcool", icon: "🍺" },
  { id: 6, nom: "Conditionnement", desc: "Mise en bouteille et refermentation", icon: "🍾" },
];

// --- COMPOSANTS MODULES ---

const ResultatsModule = ({ recette }) => {
  if (!recette) return null;

  const totalSucres = recette.grains.reduce((s, g) => s + (g.poids * g.rendementSucre), 0);
  const di = 1 + (totalSucres * recette.rendement) / (recette.volume * 1000);
  const attenuation = recette.levures[0]?.attenuation || 0.75;
  const df = 1 + (di - 1) * (1 - attenuation);
  const alcool = (di - df) * 131.25;
  const ibu = recette.houblons.reduce((s, h) => {
    const util = 1 - Math.exp(-0.04 * h.temps);
    return s + (h.poids * h.alpha * util * 1000) / recette.volume;
  }, 0);

  const stats = [
    { label: "Densité Initiale", val: di.toFixed(3), color: "text-amber-500" },
    { label: "Densité Finale", val: df.toFixed(3), color: "text-amber-200" },
    { label: "Alcool Estimé", val: `${alcool.toFixed(1)}%`, color: "text-emerald-500" },
    { label: "Amertume (IBU)", val: Math.round(ibu), color: "text-orange-500" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {stats.map((s, i) => (
        <div key={i} className="bg-gray-900/50 border border-gray-800 p-4 rounded-xl text-center">
          <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">{s.label}</p>
          <p className={`text-2xl font-bold ${s.color}`}>{s.val}</p>
        </div>
      ))}
    </div>
  );
};

const ProcessModule = ({ recette }) => {
  const [index, setIndex] = useState(0);
  const etape = ETAPES_PROCESS[index];

  return (
    <div className="bg-[#05070a] border border-gray-800 rounded-3xl p-8 relative overflow-hidden">
      <div className="flex flex-col md:flex-row gap-12 items-center relative z-10">
        <div className="w-full md:w-1/3 space-y-2">
          {ETAPES_PROCESS.map((step, i) => (
            <button 
              key={i} 
              onClick={() => setIndex(i)}
              className={`w-full text-left p-3 rounded-lg transition-all ${i === index ? "bg-amber-500/10 border-l-4 border-amber-500 text-white" : "text-gray-500 opacity-50"}`}
            >
              <span className="text-xs font-mono mr-2">0{i+1}</span> {step.nom}
            </button>
          ))}
        </div>
        
        <div className="w-full md:w-2/3 text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="py-10"
            >
              <div className="text-9 blurred-glow mb-6">{etape.icon}</div>
              <h3 className="text-4xl font-bold text-white mb-4">{etape.nom}</h3>
              <p className="text-gray-400 text-lg max-w-md mx-auto">{etape.desc}</p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      <div className="absolute top-0 right-0 p-8 opacity-5 font-mono text-xs text-white">
        BREW_PROCESS_CORE_v2.0
      </div>
    </div>
  );
};

// --- COMPOSANT PRINCIPAL ---

export default function BrewProApp() {
  const [recetteActive, setRecetteActive] = useState(null);
  const [onglet, setOnglet] = useState("Dashboard");

  useEffect(() => {
    // Recette par défaut
    const defaultRecette = {
      nom: "IPA Impériale",
      volume: 20,
      rendement: 0.75,
      grains: [{ ...MALTS_LIB[0], poids: 6 }, { ...MALTS_LIB[2], poids: 0.5 }],
      houblons: [{ ...HOUBLONS_LIB[2], poids: 50, temps: 60 }],
      levures: [LEVURES_LIB[0]],
    };
    setRecetteActive(defaultRecette);
  }, []);

  if (!recetteActive) return null;

  return (
    <div className="min-h-screen bg-black text-gray-100 font-sans selection:bg-amber-500/30">
      {/* Navigation */}
      <nav className="border-b border-gray-900 bg-black/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-black font-black">B</div>
            <span className="text-xl font-bold tracking-tighter uppercase">BrewPro <span className="text-amber-500">App</span></span>
          </div>
          <div className="flex gap-6">
            {["Dashboard", "Recettes", "Brassage"].map(t => (
              <button 
                key={t} 
                onClick={() => setOnglet(t)}
                className={`text-sm font-medium transition-colors ${onglet === t ? "text-amber-500" : "text-gray-500 hover:text-white"}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-6">
        {onglet === "Dashboard" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex justify-between items-end mb-8">
              <div>
                <h2 className="text-gray-500 text-sm uppercase tracking-widest mb-1">Recette Active</h2>
                <h1 className="text-5xl font-black italic">{recetteActive.nom}</h1>
              </div>
              <div className="text-right">
                <p className="text-3xl font-light">{recetteActive.volume}L</p>
                <p className="text-gray-500 text-xs uppercase">Volume Final</p>
              </div>
            </div>

            <ResultatsModule recette={recetteActive} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Ingrédients List */}
              <div className="lg:col-span-1 bg-gray-900/30 border border-gray-800 rounded-2xl p-6">
                <h3 className="text-lg font-bold mb-4 border-b border-gray-800 pb-2">Malts & Grains</h3>
                {recetteActive.grains.map((g, i) => (
                  <div key={i} className="flex justify-between py-2 text-sm">
                    <span className="text-gray-400">{g.nom}</span>
                    <span className="font-mono text-amber-500">{g.poids}kg</span>
                  </div>
                ))}
                <h3 className="text-lg font-bold mt-6 mb-4 border-b border-gray-800 pb-2">Houblons</h3>
                {recetteActive.houblons.map((h, i) => (
                  <div key={i} className="flex justify-between py-2 text-sm">
                    <span className="text-gray-400">{h.nom} ({h.temps}')</span>
                    <span className="font-mono text-orange-500">{h.poids}g</span>
                  </div>
                ))}
              </div>

              {/* Chart Placeholder */}
              <div className="lg:col-span-2 bg-gray-900/30 border border-gray-800 rounded-2xl p-6 min-h-[300px]">
                <h3 className="text-lg font-bold mb-6 italic">Courbe de fermentation (Est.)</h3>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={[
                      { day: 0, d: 1.065 }, { day: 2, d: 1.045 }, { day: 5, d: 1.020 }, { day: 10, d: 1.012 }, { day: 14, d: 1.011 }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                      <XAxis dataKey="day" stroke="#555" fontSize={12} />
                      <YAxis domain={['auto', 'auto']} stroke="#555" fontSize={12} />
                      <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }} />
                      <Line type="monotone" dataKey="d" stroke="#f59e0b" strokeWidth={3} dot={{ fill: '#f59e0b' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {onglet === "Brassage" && (
          <ProcessModule recette={recetteActive} />
        )}

        {onglet === "Recettes" && (
          <div className="py-20 text-center border-2 border-dashed border-gray-900 rounded-3xl">
            <p className="text-gray-600 uppercase tracking-tighter">Gestionnaire de recettes en cours de déploiement...</p>
          </div>
        )}
      </main>

      <style jsx global>{`
        .blurred-glow {
          text-shadow: 0 0 30px rgba(245, 158, 11, 0.6);
        }
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;700;900&display=swap');
        body { font-family: 'Inter', sans-serif; }
      `}</style>
    </div>
  );
}