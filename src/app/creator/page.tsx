'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';

// --- 1. BASES DE DONNÉES ---
const MALT_DATABASE = [
  { name: "Pilsner", ebc: 3.5, yield: 80 },
  { name: "Pale Ale", ebc: 8, yield: 79 },
  { name: "Munich", ebc: 15, yield: 78 },
  { name: "Amber", ebc: 50, yield: 75 },
  { name: "Chocolat", ebc: 900, yield: 68 },
];

const HOP_DATABASE = [
  { name: "Saaz", alpha: 3.5 },
  { name: "Cascade", alpha: 7.0 },
  { name: "Citra", alpha: 13.5 },
  { name: "Magnum", alpha: 12.0 },
  { name: "Mosaic", alpha: 12.5 },
];

const SALT_DATABASE = [
  { name: "Sulfate de Calcium (Gypse)", influence: "Exalte le houblon / Sec", dosage: 0.15 },
  { name: "Chlorure de Calcium", influence: "Exalte le malt / Soyeux", dosage: 0.15 },
  { name: "Sulfate de Magnésium (Epsom)", influence: "Amertume tranchante", dosage: 0.05 },
];

export default function CreatorPage() {
  // --- 2. ÉTATS (STATES) ---
  const [recipeName, setRecipeName] = useState("Ma Recette Légendaire");
  const [loading, setLoading] = useState(false);
  const [recipe, setRecipe] = useState({ 
    malts: [] as any[], 
    hops: [] as any[],
    salts: [] as any[],
    volume: 20, 
    efficiency: 75,
    mashTemp: 67 
  });
  
  const [stats, setStats] = useState({ abv: 0, ebc: 0, ibu: 0, ratio: 0, og: 1.000, fg: 1.000 });

  // --- 3. CALCULS ALCHIMIQUES ---
  const calculateStats = () => {
    const volGal = recipe.volume * 0.264;
    let points = 0; let totalMCU = 0;
    
    recipe.malts.forEach(m => {
      totalMCU += ((m.qty * 2.204) * (m.ebc * 0.508)) / volGal;
      points += (m.qty * 300 * (m.yield / 100) * (recipe.efficiency / 100));
    });

    const og = 1 + (points / recipe.volume) / 1000;
    
    // Impact température sur la DF (Plus chaud = plus de corps = DF plus haute)
    const attenuationBase = 0.75; 
    const tempEffect = (recipe.mashTemp - 67) * 0.02; 
    const fg = 1 + (og - 1) * (1 - (attenuationBase - tempEffect));
    
    const abv = (og - fg) * 131.25;
    const gu = (og - 1) * 1000;

    let totalIBU = 0;
    recipe.hops.forEach(h => {
      const util = (1.65 * Math.pow(0.000125, og - 1)) * ((1 - Math.exp(-0.04 * h.time)) / 4.15);
      totalIBU += ((h.alpha / 100) * (h.qty * 1000) / recipe.volume) * util;
    });

    setStats({ 
      og: parseFloat(og.toFixed(3)) || 1.000,
      fg: parseFloat(fg.toFixed(3)) || 1.000,
      ebc: Math.round((1.49 * Math.pow(totalMCU, 0.68)) * 1.97) || 0, 
      abv: parseFloat(abv.toFixed(1)) || 0,
      ibu: Math.round(totalIBU) || 0,
      ratio: gu > 0 ? parseFloat((totalIBU / gu).toFixed(2)) : 0
    });
  };

  useEffect(() => { calculateStats(); }, [recipe]);

  // --- 4. LE PASSAGE À L'ACTION (START BATCH) ---
  const startBatch = async () => {
    setLoading(true);

    // Transposition des données de recherche en étapes d'action
    const steps = {
      inventory: [
        ...recipe.malts.map(m => ({ item: m.name, qty: m.qty, unit: 'kg', type: 'Malt' })),
        ...recipe.hops.map(h => ({ item: h.name, qty: h.qty, unit: 'g', type: 'Houblon', time: h.time })),
        ...recipe.salts.map(s => ({ item: s.name, qty: s.qty, unit: 'g', type: 'Sel' }))
      ],
      process: {
        mash: [
          { label: "Empâtage Principal", target_temp: recipe.mashTemp, duration: 60 },
          { label: "Mash Out", target_temp: 78, duration: 10 }
        ],
        boil: recipe.hops.sort((a, b) => b.time - a.time).map(h => ({
          label: `Ajout ${h.name}`,
          time: h.time,
          qty: h.qty
        }))
      },
      targets: stats
    };

    const { error } = await supabase
      .from('batches')
      .insert([{ 
        recipe_name: recipeName,
        status: 'En cours',
        batch_data: steps, // L'objet complet avec les sels et paliers
        target_og: stats.og,
        created_at: new Date()
      }]);

    if (error) {
      alert("Erreur : " + error.message);
    } else {
      alert("🚀 Brassin '" + recipeName + "' envoyé vers NEW_BATCH !");
    }
    setLoading(false);
  };

  // --- 5. INTERFACE (JSX) ---
  return (
    <div style={{ padding: '30px', backgroundColor: '#0f0f0f', color: '#fff', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* HEADER */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', background: '#1a1a1a', padding: '20px', borderRadius: '12px', border: '1px solid #333' }}>
          <input 
            value={recipeName} 
            onChange={e => setRecipeName(e.target.value)} 
            style={{ background: 'transparent', border: 'none', borderBottom: '2px solid #f39c12', color: '#fff', fontSize: '1.5rem', outline: 'none', width: '50%' }} 
          />
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.8rem', color: '#888' }}>DENSITÉ INITIALE (PROJETÉE)</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>
               OG: <span style={{ textDecoration: 'underline', color: '#f39c12' }}>{stats.og}</span>
            </div>
          </div>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '30px' }}>
          
          {/* COLONNE ÉDITION */}
          <section>
            <div style={cardStyle}>
              <h3 style={{marginTop:0}}>🌡️ Empâtage & Corps</h3>
              <input type="range" min="62" max="72" step="0.5" value={recipe.mashTemp} onChange={e => setRecipe({...recipe, mashTemp: +e.target.value})} style={{width:'100%'}} />
              <div style={{display:'flex', justifyContent:'space-between', fontSize:'12px', marginTop:'10px'}}>
                <span>Sec (62°C)</span>
                <span style={{color:'#f39c12', fontWeight:'bold'}}>{recipe.mashTemp}°C</span>
                <span>Rond (72°C)</span>
              </div>
            </div>

            <div style={cardStyle}>
              <h3>🌾 Grains</h3>
              {recipe.malts.map((m, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                  <select style={{...inputStyle, flex: 3}} value={m.name} onChange={e => {
                    const ref = MALT_DATABASE.find(x => x.name === e.target.value);
                    const n = [...recipe.malts]; n[i] = {...n[i], name: ref!.name, ebc: ref!.ebc}; setRecipe({...recipe, malts: n});
                  }}>
                    {MALT_DATABASE.map(x => <option key={x.name}>{x.name}</option>)}
                  </select>
                  <input type="number" step="0.1" value={m.qty} onChange={e => {const n = [...recipe.malts]; n[i].qty = +e.target.value; setRecipe({...recipe, malts: n})}} style={{...inputStyle, width: '80px'}} />
                  <button onClick={() => setRecipe({...recipe, malts: recipe.malts.filter((_, idx) => idx !== i)})} style={delBtn}>×</button>
                </div>
              ))}
              <button onClick={() => setRecipe({...recipe, malts: [...recipe.malts, {...MALT_DATABASE[0], qty: 0}]})} style={addButtonStyle}>+ Ajouter Grain</button>
            </div>

            <div style={cardStyle}>
              <h3>🌿 Houblons</h3>
              {recipe.hops.map((h, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                  <select style={{...inputStyle, flex: 3}} value={h.name} onChange={e => {
                    const ref = HOP_DATABASE.find(x => x.name === e.target.value);
                    const n = [...recipe.hops]; n[i] = {...n[i], name: ref!.name, alpha: ref!.alpha}; setRecipe({...recipe, hops: n});
                  }}>
                    {HOP_DATABASE.map(x => <option key={x.name}>{x.name}</option>)}
                  </select>
                  <input type="number" value={h.qty} onChange={e => {const n = [...recipe.hops]; n[i].qty = +e.target.value; setRecipe({...recipe, hops: n})}} style={{...inputStyle, width: '60px'}} />
                  <input type="number" value={h.time} onChange={e => {const n = [...recipe.hops]; n[i].time = +e.target.value; setRecipe({...recipe, hops: n})}} style={{...inputStyle, width: '60px'}} />
                  <button onClick={() => setRecipe({...recipe, hops: recipe.hops.filter((_, idx) => idx !== i)})} style={delBtn}>×</button>
                </div>
              ))}
              <button onClick={() => setRecipe({...recipe, hops: [...recipe.hops, {...HOP_DATABASE[0], qty: 0, time: 60}]})} style={{...addButtonStyle, background: '#27ae60'}}>+ Ajouter Houblon</button>
            </div>

            <div style={{...cardStyle, borderLeft: '5px solid #3498db'}}>
              <h3 style={{marginTop:0, color:'#3498db'}}>💧 Sels Minéraux (Ingrédients)</h3>
              {recipe.salts.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                  <select style={{...inputStyle, flex: 3}} value={s.name} onChange={e => {
                    const ref = SALT_DATABASE.find(x => x.name === e.target.value);
                    const n = [...recipe.salts]; n[i] = {...n[i], name: ref!.name, influence: ref!.influence}; setRecipe({...recipe, salts: n});
                  }}>
                    {SALT_DATABASE.map(x => <option key={x.name}>{x.name}</option>)}
                  </select>
                  <input type="number" step="0.1" value={s.qty} onChange={e => {const n = [...recipe.salts]; n[i].qty = +e.target.value; setRecipe({...recipe, salts: n})}} style={{...inputStyle, width: '70px'}} />
                  <button onClick={() => setRecipe({...recipe, salts: recipe.salts.filter((_, idx) => idx !== i)})} style={delBtn}>×</button>
                </div>
              ))}
              <button onClick={() => setRecipe({...recipe, salts: [...recipe.salts, { ...SALT_DATABASE[0], qty: 2 }]})} style={{...addButtonStyle, background: '#3498db'}}>+ Ajouter Sels</button>
            </div>
          </section>

          {/* COLONNE RÉSULTATS (STICKY) */}
          <section style={{ position: 'sticky', top: '20px', height: 'fit-content', background: '#1a1a1a', padding: '25px', borderRadius: '15px', textAlign: 'center', border: '2px solid #333' }}>
             <div style={{ width: '100px', height: '130px', margin: '0 auto 20px', backgroundColor: getBeerColor(stats.ebc), borderRadius: '10px 10px 40px 40px', border: '5px solid #333' }} />
             
             <div style={{ fontSize: '3.5rem', fontWeight: '900', color: '#f39c12' }}>{stats.abv}%</div>
             <div style={{ color: '#888', fontSize: '12px' }}>ALCOOL ESTIMÉ (DF: {stats.fg})</div>

             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', margin: '20px 0' }}>
                <div style={statBox}>
                    <div style={{fontSize: '1.5rem', color: '#27ae60'}}>{stats.ibu}</div>
                    <div style={{fontSize: '10px', color: '#666'}}>IBU</div>
                </div>
                <div style={statBox}>
                    <div style={{fontSize: '1.5rem', color: '#3498db'}}>{stats.ratio}</div>
                    <div style={{fontSize: '10px', color: '#666'}}>BU/GU</div>
                </div>
             </div>

             <div style={{ background: '#000', padding: '15px', borderRadius: '10px', textAlign: 'left', fontSize: '11px', lineHeight: '1.6' }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#f39c12' }}>MÉMO DE L'ALCHIMISTE</h4>
                • Corps : {recipe.mashTemp > 67 ? 'Rond et soyeux' : 'Sec et léger'}<br/>
                • Équilibre : {stats.ratio > 0.6 ? 'Profil Amère' : 'Profil Malté'}<br/>
                • Sels : {recipe.salts.length > 0 ? 'Eau traitée' : 'Eau brute'}
             </div>

             <button 
                onClick={startBatch} 
                disabled={loading}
                style={{ ...addButtonStyle, marginTop: '20px', height: '60px', fontSize: '1.1rem' }}
             >
                {loading ? "TRANSFERT..." : "🔥 CRÉER NEW_BATCH"}
             </button>
          </section>
        </div>
      </div>
    </div>
  );
}

// --- STYLES ---
const cardStyle = { background: '#1a1a1a', padding: '20px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #222' };
const inputStyle = { background: '#2a2a2a', color: '#fff', border: '1px solid #444', padding: '10px', borderRadius: '6px', outline: 'none', textAlign: 'center' as const };
const addButtonStyle = { width: '100%', padding: '12px', background: '#f39c12', border: 'none', borderRadius: '8px', fontWeight: 'bold' as const, cursor: 'pointer', marginTop: '10px', color: '#000' };
const delBtn = { background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '1.2rem' };
const statBox = { background: '#222', padding: '10px', borderRadius: '8px' };

function getBeerColor(ebc: number) {
  if (ebc <= 8) return '#F5F75C';
  if (ebc <= 20) return '#C29321';
  if (ebc <= 40) return '#8D4C17';
  return '#1A0506';
}