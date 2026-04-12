'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';

// --- BASE DE DONNÉES LOCALE DES MALTS ---
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

    // Calcul EBC (Formule de Morey)
    const volGal = recipe.volume * 0.264172;
    let totalMCU = 0;
    recipe.malts.forEach(m => {
      const weightLbs = m.qty * 2.20462;
      const srm = m.ebc * 0.508;
      totalMCU += (weightLbs * srm) / volGal;
    });
    const srm = 1.4922 * Math.pow(totalMCU, 0.6859);
    const ebc = srm * 1.97;

    // Calcul ABV (Alcool)
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
    setRecipe({
      ...recipe,
      malts: [...recipe.malts, { ...MALT_DATABASE[0], qty: 0 }]
    });
  };

  const updateMalt = (index: number, field: keyof MaltEntry, value: any) => {
    const newMalts = [...recipe.malts];
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

  const removeMalt = (index: number) => {
    setRecipe({ ...recipe, malts: recipe.malts.filter((_, i) => i !== index) });
  };

  return (
    <div style={{ padding: '30px', backgroundColor: '#0f0f0f', color: '#fff', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <h1 style={{ color: '#f39c12', textAlign: 'center', marginBottom: '40px' }}>🧪 L'Alchimiste - Créateur</h1>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '30px' }}>
          
          {/* PANNEAU DE SAISIE */}
          <section>
            {/* CONFIGURATION GENERALE */}
            <div style={{ background: '#1a1a1a', padding: '20px', borderRadius: '12px', marginBottom: '20px', display: 'flex', gap: '30px' }}>
              <div>
                <label style={labelStyle}>Volume Brassin</label>
                <div style={inputGroupStyle}>
                  <input type="number" step="0.5" value={recipe.volume} onChange={e => setRecipe({...recipe, volume: +e.target.value})} style={inputStyle} />
                  <span style={unitStyle}>L</span>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Efficacité</label>
                <div style={inputGroupStyle}>
                  <input type="number" value={recipe.efficiency} onChange={e => setRecipe({...recipe, efficiency: +e.target.value})} style={inputStyle} />
                  <span style={unitStyle}>%</span>
                </div>
              </div>
            </div>

            {/* LISTE DES INGREDIENTS */}
            <div style={{ background: '#1a1a1a', padding: '20px', borderRadius: '12px' }}>
              <h3 style={{ marginTop: 0 }}>Grains et Sucres</h3>
              {recipe.malts.map((m, i) => (
                <div key={i} style={{ display: 'flex', gap: '15px', marginBottom: '15px', alignItems: 'flex-end' }}>
                  <div style={{ flex: 2 }}>
                    <label style={labelStyle}>Type de grain</label>
                    <select value={m.name} onChange={e => updateMalt(i, 'name', e.target.value)} style={{...inputStyle, width: '100%'}}>
                      {MALT_DATABASE.map(ref => <option key={ref.name} value={ref.name}>{ref.name}</option>)}
                    </select>
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Masse</label>
                    <div style={inputGroupStyle}>
                      <input type="number" step="0.1" value={m.qty} onChange={e => updateMalt(i, 'qty', +e.target.value)} style={inputStyle} />
                      <span style={unitStyle}>kg</span>
                    </div>
                  </div>

                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Couleur</label>
                    <div style={inputGroupStyle}>
                      <input type="number" value={m.ebc} onChange={e => updateMalt(i, 'ebc', +e.target.value)} style={inputStyle} />
                      <span style={unitStyle}>EBC</span>
                    </div>
                  </div>

                  <button onClick={() => removeMalt(i)} style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', paddingBottom: '10px', fontSize: '1.5rem' }}>×</button>
                </div>
              ))}
              <button onClick={addMalt} style={addButtonStyle}>+ Ajouter un malt</button>
            </div>
          </section>

          {/* PANNEAU RESULTATS (FIXE AU SCROLL) */}
          <section style={{ position: 'sticky', top: '30px', height: 'fit-content', background: '#1a1a1a', padding: '30px', borderRadius: '15px', textAlign: 'center' }}>
             <h2 style={{ color: '#888', fontSize: '12px', letterSpacing: '2px', marginBottom: '20px' }}>RÉSULTAT ESTIMÉ</h2>
             
             <div style={{ 
                width: '120px', height: '160px', margin: '0 auto 20px',
                backgroundColor: getBeerColor(stats.ebc), borderRadius: '10px 10px 40px 40px',
                border: '5px solid #333', boxShadow: `0 0 40px ${getBeerColor(stats.ebc)}44`
             }} />

             <div style={{ fontSize: '4rem', fontWeight: '900', color: '#f39c12', lineHeight: '1' }}>{stats.abv}%</div>
             <div style={{ color: '#888', marginTop: '5px' }}>Alcool (ABV)</div>

             <div style={{ marginTop: '30px', borderTop: '1px solid #333', paddingTop: '20px' }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{stats.ebc} EBC</div>
                <div style={{ color: '#888', fontSize: '0.9rem' }}>Couleur finale</div>
             </div>
          </section>

        </div>
      </div>
    </div>
  );
}

// Styles réutilisables
const labelStyle = { display: 'block', fontSize: '11px', color: '#666', textTransform: 'uppercase', marginBottom: '5px', fontWeight: 'bold' };
const inputGroupStyle = { display: 'flex', alignItems: 'center', background: '#2a2a2a', borderRadius: '6px', border: '1px solid #444', overflow: 'hidden' };
const inputStyle = { background: 'transparent', color: '#fff', border: 'none', padding: '10px', width: '100%', outline: 'none', textAlign: 'right' };
const unitStyle = { background: '#333', padding: '10px', fontSize: '12px', color: '#aaa', minWidth: '35px', textAlign: 'center' };
const addButtonStyle = { width: '100%', padding: '12px', background: '#f39c12', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px', color: '#000' };

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