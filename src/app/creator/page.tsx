'use client';

import { useState, useEffect } from 'react';
// Vérifie ce chemin d'import selon ta structure (../../../lib/...)
import { supabase } from '../../../lib/supabaseClient';

// --- RÉFÉRENCES DES MALTS ---
const MALT_DATABASE = [
  { name: "Pilsner", ebc: 3.5, yield: 80 },
  { name: "Pale Ale", ebc: 8, yield: 79 },
  { name: "Munich", ebc: 15, yield: 78 },
  { name: "Amber", ebc: 50, yield: 75 },
  { name: "Crystal / Caramunich", ebc: 120, yield: 74 },
  { name: "Chocolat", ebc: 900, yield: 68 },
  { name: "Black / Roasted Barley", ebc: 1200, yield: 65 },
  { name: "Flocons d'Avoine/Blé", ebc: 2, yield: 70 },
];

interface MaltEntry {
  name: string;
  qty: number;
  ebc: number;
  yield: number;
}

export default function CreatorPage() {
  const [recipe, setRecipe] = useState({ 
    malts: [] as MaltEntry[], 
    volume: 20, 
    efficiency: 75 
  });
  
  const [stats, setStats] = useState({ abv: 0, ebc: 0 });

  const calculateStats = () => {
    if (recipe.malts.length === 0) {
      setStats({ abv: 0, ebc: 0 });
      return;
    }

    // Calcul EBC (Morey)
    const volGal = recipe.volume * 0.264172;
    let totalMCU = 0;
    recipe.malts.forEach(m => {
      const weightLbs = m.qty * 2.20462;
      const srm = m.ebc * 0.508;
      totalMCU += (weightLbs * srm) / volGal;
    });
    const srm = 1.4922 * Math.pow(totalMCU, 0.6859);
    const ebc = srm * 1.97;

    // Calcul Alcool (ABV)
    let points = 0;
    recipe.malts.forEach(m => {
      points += (m.qty * 300 * (m.yield / 100) * (recipe.efficiency / 100));
    });
    const og = 1 + (points / recipe.volume) / 1000;
    const fg = 1 + (og - 1) * 0.25; 
    const abv = (og - fg) * 131.25;

    setStats({ ebc: Math.round(ebc), abv: parseFloat(abv.toFixed(1)) });
  };

  useEffect(() => { calculateStats(); }, [recipe]);

  const addMalt = () => {
    const firstMalt = MALT_DATABASE[0];
    setRecipe({
      ...recipe,
      malts: [...recipe.malts, { ...firstMalt, qty: 0 }]
    });
  };

  const updateMalt = (index: number, field: keyof MaltEntry, value: any) => {
    const newMalts = [...recipe.malts];
    
    // Si on change le nom via la liste déroulante, on met à jour EBC et yield auto
    if (field === 'name') {
      const ref = MALT_DATABASE.find(m => m.name === value);
      if (ref) {
        newMalts[index] = { ...newMalts[index], name: ref.name, ebc: ref.ebc, yield: ref.yield };
      }
    } else {
      newMalts[index] = { ...newMalts[index], [field]: value };
    }
    
    setRecipe({ ...recipe, malts: newMalts });
  };

  return (
    <div style={{ padding: '30px', backgroundColor: '#0f0f0f', color: '#fff', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <h1 style={{ color: '#f39c12', textAlign: 'center' }}>🧪 L'Alchimiste</h1>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '20px', marginTop: '30px' }}>
          
          {/* GAUCHE : ÉDITEUR */}
          <section>
            <div style={{ background: '#1a1a1a', padding: '20px', borderRadius: '10px', marginBottom: '20px' }}>
              <h3>⚙️ Configuration</h3>
              <div style={{ display: 'flex', gap: '15px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#888' }}>Volume Final</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <input type="number" value={recipe.volume} onChange={e => setRecipe({...recipe, volume: +e.target.value})} style={inputStyle} />
                    <span>L</span>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#888' }}>Efficacité</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <input type="number" value={recipe.efficiency} onChange={e => setRecipe({...recipe, efficiency: +e.target.value})} style={inputStyle} />
                    <span>%</span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ background: '#1a1a1a', padding: '20px', borderRadius: '10px' }}>
              <h3>🌾 Malts & Grains</h3>
              {recipe.malts.map((m, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '10px', background: '#252525', padding: '10px', borderRadius: '6px' }}>
                  <select value={m.name} onChange={e => updateMalt(i, 'name', e.target.value)} style={{...inputStyle, flex: 1}}>
                    {MALT_DATABASE.map(ref => <option key={ref.name} value={ref.name}>{ref.name}</option>)}
                  </select>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <input type="number" value={m.qty} onChange={e => updateMalt(i, 'qty', +e.target.value)} style={{...inputStyle, width: '60px'}} />
                    <span style={{fontSize: '12px'}}>kg</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <input type="number" value={m.ebc} onChange={e => updateMalt(i, 'ebc', +e.target.value)} style={{...inputStyle, width: '50px'}} />
                    <span style={{fontSize: '12px'}}>EBC</span>
                  </div>
                </div>
              ))}
              <button onClick={addMalt} style={btnStyle}>+ Ajouter un ingrédient</button>
            </div>
          </section>

          {/* DROITE : RÉSULTATS */}
          <section style={{ background: '#1a1a1a', padding: '30px', borderRadius: '15px', textAlign: 'center', height: 'fit-content' }}>
             <h2 style={{ color: '#888', fontSize: '14px' }}>PRÉVISUALISATION</h2>
             <div style={{ 
                width: '100px', height: '140px', margin: '20px auto',
                backgroundColor: getBeerColor(stats.ebc), borderRadius: '5px 5px 20px 20px',
                border: '4px solid #333', boxShadow: `0 0 20px ${getBeerColor(stats.ebc)}66`
             }} />
             <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#f39c12' }}>{stats.abv}%</div>
             <div style={{ color: '#888' }}>Alcool par volume</div>
             <hr style={{ border: '0.5px solid #333', margin: '20px 0' }} />
             <div style={{ fontSize: '1.5rem' }}>{stats.ebc} <span style={{fontSize: '1rem'}}>EBC</span></div>
          </section>

        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  background: '#333', color: '#fff', border: '1px solid #444', padding: '8px', borderRadius: '4px', outline: 'none'
};

const btnStyle = {
  width: '100%', padding: '10px', background: '#f39c12', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px'
};

function getBeerColor(ebc: number) {
  if (ebc <= 4) return '#F3F993';
  if (ebc <= 12) return '#F5F75C';
  if (ebc <= 20) return '#E18F2E';
  if (ebc <= 40) return '#8D4C17';
  if (ebc <= 60) return '#5D341A';
  return '#261716';
}