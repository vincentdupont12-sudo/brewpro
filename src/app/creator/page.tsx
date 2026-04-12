'use client';

import { useState, useEffect } from 'react';
// Vérifie bien que le chemin vers ton supabaseClient est correct
// Si ton dossier 'lib' est à la racine du projet, '../../lib/...' est correct
import { supabase } from '../../../lib/supabaseClient';

// --- TYPAGES ---
interface Malt {
  name: string;
  qty: number;
  ebc: number;
  yield: number;
}

interface Stats {
  abv: number;
  ebc: number;
  ibu: number;
}

export default function CreatorPage() {
  // --- ÉTAT ---
  const [recipe, setRecipe] = useState({ 
    malts: [] as Malt[], 
    volume: 20, 
    efficiency: 75 
  });
  
  const [stats, setStats] = useState<Stats>({ abv: 0, ebc: 0, i: 0 } as any);

  // --- CALCULS ---
  const calculateStats = () => {
    if (recipe.malts.length === 0) {
        setStats({ abv: 0, ebc: 0, ibu: 0 });
        return;
    }

    // 1. Calcul de la couleur (Morey Formula)
    const volumeInGal = recipe.volume * 0.264172;
    let totalMCU = 0;
    recipe.malts.forEach(m => {
        const weightInLbs = m.qty * 2.20462;
        const srm = m.ebc * 0.508; 
        totalMCU += (weightInLbs * srm) / volumeInGal;
    });
    const srmResult = 1.4922 * Math.pow(totalMCU, 0.6859);
    const ebcResult = srmResult * 1.97;

    // 2. Calcul de l'alcool (ABV)
    let totalPoints = 0;
    recipe.malts.forEach(m => {
        totalPoints += (m.qty * 300 * (m.yield / 100) * (recipe.efficiency / 100));
    });
    const og = 1 + (totalPoints / recipe.volume) / 1000;
    const fg = 1 + (og - 1) * 0.25; 
    const abvResult = (og - fg) * 131.25;

    setStats({
      ebc: Math.round(ebcResult),
      abv: parseFloat(abvResult.toFixed(1)),
      ibu: 0
    });
  };

  useEffect(() => {
    calculateStats();
  }, [recipe]);

  // --- ACTIONS ---
  const addMalt = () => {
    setRecipe({
      ...recipe, 
      malts: [...recipe.malts, { name: 'Nouveau Malt', qty: 0, ebc: 4, yield: 80 }]
    });
  };

  const updateMalt = (index: number, field: keyof Malt, value: any) => {
    const newMalts = [...recipe.malts];
    newMalts[index] = { ...newMalts[index], [field]: value };
    setRecipe({ ...recipe, malts: newMalts });
  };

  const removeMalt = (index: number) => {
    const newMalts = recipe.malts.filter((_, i) => i !== index);
    setRecipe({ ...recipe, malts: newMalts });
  };

  // --- RENDU ---
  return (
    <div style={{ padding: '40px 20px', backgroundColor: '#0f0f0f', color: '#fff', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        
        <header style={{ marginBottom: '40px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '2.5rem', color: '#f39c12', marginBottom: '10px' }}>🧪 L'Alchimiste</h1>
          <p style={{ color: '#888' }}>Laboratoire de création de recettes (Mode Admin)</p>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px' }}>
          
          {/* CONFIGURATION ET INGRÉDIENTS */}
          <section>
            <div style={{ background: '#1a1a1a', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
              <h3 style={{ marginTop: 0, borderBottom: '1px solid #333', paddingBottom: '10px' }}>Config. Brassage</h3>
              <div style={{ display: 'flex', gap: '20px', marginTop: '15px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#666' }}>Volume (L)</label>
                  <input type="number" value={recipe.volume} onChange={(e) => setRecipe({...recipe, volume: parseFloat(e.target.value) || 0})}
                         style={{ background: '#2a2a2a', color: '#fff', border: '1px solid #444', padding: '8px', borderRadius: '6px', width: '80px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#666' }}>Efficacité (%)</label>
                  <input type="number" value={recipe.efficiency} onChange={(e) => setRecipe({...recipe, efficiency: parseFloat(e.target.value) || 0})}
                         style={{ background: '#2a2a2a', color: '#fff', border: '1px solid #444', padding: '8px', borderRadius: '6px', width: '80px' }} />
                </div>
              </div>
            </div>

            <div style={{ background: '#1a1a1a', padding: '20px', borderRadius: '12px' }}>
              <h3 style={{ marginTop: 0, borderBottom: '1px solid #333', paddingBottom: '10px' }}>Malts & Grains</h3>
              {recipe.malts.map((m, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center' }}>
                  <input placeholder="Nom" value={m.name} onChange={(e) => updateMalt(i, 'name', e.target.value)}
                         style={{ flex: 2, background: '#2a2a2a', color: '#fff', border: '1px solid #444', padding: '8px', borderRadius: '6px' }} />
                  <input type="number" placeholder="kg" value={m.qty} onChange={(e) => updateMalt(i, 'qty', parseFloat(e.target.value) || 0)}
                         style={{ width: '70px', background: '#2a2a2a', color: '#fff', border: '1px solid #444', padding: '8px', borderRadius: '6px' }} />
                  <input type="number" placeholder="EBC" value={m.ebc} onChange={(e) => updateMalt(i, 'ebc', parseFloat(e.target.value) || 0)}
                         style={{ width: '70px', background: '#2a2a2a', color: '#fff', border: '1px solid #444', padding: '8px', borderRadius: '6px' }} />
                  <button onClick={() => removeMalt(i)} style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
                </div>
              ))}
              <button onClick={addMalt} style={{ width: '100%', padding: '12px', marginTop: '10px', borderRadius: '8px', border: 'none', background: '#f39c12', color: '#000', fontWeight: 'bold', cursor: 'pointer' }}>
                + Ajouter un grain
              </button>
            </div>
          </section>

          {/* RÉSULTAT VISUEL */}
          <section style={{ background: '#1a1a1a', padding: '40px', borderRadius: '12px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h2 style={{ margin: '0 0 20px 0', color: '#888', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '1rem' }}>Estimation du Brassin</h2>
            
            <div style={{ 
              width: '150px', height: '180px', margin: '0 auto 30px', position: 'relative',
              backgroundColor: getBeerColor(stats.ebc), borderRadius: '10px 10px 40px 40px',
              border: '6px solid #333', boxShadow: `0 0 30px ${getBeerColor(stats.ebc)}44`
            }}>
              {/* Mousse du verre */}
              <div style={{ position: 'absolute', top: '-15px', left: '-5px', right: '-5px', height: '30px', background: '#fff', borderRadius: '20px', opacity: 0.9 }}></div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <span style={{ fontSize: '1.2rem', color: '#888' }}>Couleur : </span>
              <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f39c12' }}>{stats.ebc} EBC</span>
            </div>

            <div>
              <span style={{ fontSize: '1.2rem', color: '#888' }}>Alcool (ABV) : </span>
              <div style={{ fontSize: '4rem', fontWeight: '900', color: '#f39c12', lineHeight: '1' }}>
                {stats.abv}<span style={{ fontSize: '1.5rem' }}>%</span>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}

// Fonction utilitaire pour la robe de la bière
function getBeerColor(ebc: number) {
  if (ebc <= 4) return '#F3F993';
  if (ebc <= 8) return '#F5F75C';
  if (ebc <= 12) return '#E5E131';
  if (ebc <= 16) return '#D5BC26';
  if (ebc <= 20) return '#C29321';
  if (ebc <= 26) return '#AF701A';
  if (ebc <= 33) return '#9E5216';
  if (ebc <= 39) return '#813515';
  if (ebc <= 47) return '#702712';
  if (ebc <= 57) return '#53190F';
  if (ebc <= 69) return '#3E100C';
  return '#1A0506';
}