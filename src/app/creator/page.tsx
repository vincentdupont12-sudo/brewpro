'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';

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

export default function CreatorPage() {
  const [recipeName, setRecipeName] = useState("Ma Recette Pro");
  const [recipe, setRecipe] = useState({ 
    malts: [] as any[], 
    hops: [] as any[],
    volume: 20, 
    efficiency: 75,
    mashTemp: 67 // Température d'empâtage
  });
  
  const [stats, setStats] = useState({ abv: 0, ebc: 0, ibu: 0, ratio: 0, og: 1.000, fg: 1.000 });

  const calculateStats = () => {
    const volGal = recipe.volume * 0.264;
    let points = 0; let totalMCU = 0;
    recipe.malts.forEach(m => {
      totalMCU += ((m.qty * 2.204) * (m.ebc * 0.508)) / volGal;
      points += (m.qty * 300 * (m.yield / 100) * (recipe.efficiency / 100));
    });

    const og = 1 + (points / recipe.volume) / 1000;
    
    // IMPACT TEMPERATURE : Plus c'est chaud, plus la FG est haute (bière ronde)
    const attenuationBase = 0.75; 
    const tempEffect = (recipe.mashTemp - 67) * 0.015;
    const fg = 1 + (og - 1) * (1 - (attenuationBase - tempEffect));
    
    const abv = (og - fg) * 131.25;
    const gu = (og - 1) * 1000;

    let totalIBU = 0;
    recipe.hops.forEach(h => {
      const util = (1.65 * Math.pow(0.000125, og - 1)) * ((1 - Math.exp(-0.04 * h.time)) / 4.15);
      totalIBU += ((h.alpha / 100) * (h.qty * 1000) / recipe.volume) * util;
    });

    setStats({ 
      og: parseFloat(og.toFixed(3)),
      fg: parseFloat(fg.toFixed(3)),
      ebc: Math.round((1.49 * Math.pow(totalMCU, 0.68)) * 1.97) || 0, 
      abv: parseFloat(abv.toFixed(1)) || 0,
      ibu: Math.round(totalIBU),
      ratio: gu > 0 ? parseFloat((totalIBU / gu).toFixed(2)) : 0
    });
  };

  useEffect(() => { calculateStats(); }, [recipe]);

  const getHopTag = (t: number) => {
    if (t >= 45) return { txt: "AMÉRISANT", col: "#e74c3c" };
    if (t > 5) return { txt: "AROMATIQUE", col: "#f1c40f" };
    return { txt: "FLAME OUT / ARÔME", col: "#2ecc71" };
  };

  return (
    <div style={{ padding: '30px', backgroundColor: '#0f0f0f', color: '#fff', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <style dangerouslySetInnerHTML={{ __html: `input::-webkit-outer-spin-button,input::-webkit-inner-spin-button {-webkit-appearance: none; margin: 0;} input[type=number] {-moz-appearance: textfield;}` }} />
      
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* HEADER */}
        <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', background: '#1a1a1a', padding: '20px', borderRadius: '12px' }}>
          <input value={recipeName} onChange={e => setRecipeName(e.target.value)} style={{ background: 'transparent', border: 'none', borderBottom: '2px solid #f39c12', color: '#fff', fontSize: '1.2rem', outline: 'none' }} />
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
            OG: <span style={{ textDecoration: 'underline', color: '#f39c12' }}>{stats.og}</span>
          </div>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '30px' }}>
          
          <section>
            {/* EMPÂTAGE */}
            <div style={cardStyle}>
              <h3 style={{marginTop:0}}>🌡️ Empâtage (Mash)</h3>
              <input type="range" min="62" max="72" step="0.5" value={recipe.mashTemp} onChange={e => setRecipe({...recipe, mashTemp: +e.target.value})} style={{width: '100%', cursor: 'pointer'}} />
              <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '10px'}}>
                <span>Sec (62°C)</span>
                <span style={{color:'#f39c12', fontWeight:'bold'}}>{recipe.mashTemp}°C</span>
                <span>Rond (72°C)</span>
              </div>
            </div>

            {/* GRAINS & HOUBLONS */}
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
                  <span style={{alignSelf:'center'}}>kg</span>
                </div>
              ))}
              <button onClick={() => setRecipe({...recipe, malts: [...recipe.malts, {...MALT_DATABASE[0], qty: 0}]})} style={addButtonStyle}>+ Grain</button>
            </div>

            <div style={cardStyle}>
              <h3>🌿 Houblonnages</h3>
              {recipe.hops.map((h, i) => (
                <div key={i} style={{ marginBottom: '15px', padding: '10px', background: '#252525', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <select style={{...inputStyle, flex: 2}} value={h.name} onChange={e => {
                        const ref = HOP_DATABASE.find(x => x.name === e.target.value);
                        const n = [...recipe.hops]; n[i] = {...n[i], name: ref!.name, alpha: ref!.alpha}; setRecipe({...recipe, hops: n});
                    }}>
                        {HOP_DATABASE.map(x => <option key={x.name}>{x.name}</option>)}
                    </select>
                    <input type="number" value={h.qty} onChange={e => {const n = [...recipe.hops]; n[i].qty = +e.target.value; setRecipe({...recipe, hops: n})}} style={{...inputStyle, width: '60px'}} />
                    <span style={{alignSelf:'center'}}>g</span>
                    <input type="number" value={h.time} onChange={e => {const n = [...recipe.hops]; n[i].time = +e.target.value; setRecipe({...recipe, hops: n})}} style={{...inputStyle, width: '60px'}} />
                    <span style={{alignSelf:'center'}}>min</span>
                  </div>
                  <div style={{fontSize: '10px', marginTop: '5px', color: getHopTag(h.time).col, fontWeight: 'bold'}}>
                    {getHopTag(h.time).txt}
                  </div>
                </div>
              ))}
              <button onClick={() => setRecipe({...recipe, hops: [...recipe.hops, {...HOP_DATABASE[0], qty: 0, time: 60}]})} style={{...addButtonStyle, background: '#27ae60'}}>+ Houblon</button>
            </div>
          </section>

          {/* RÉSULTATS */}
          <section style={{ position: 'sticky', top: '30px', height: 'fit-content', background: '#1a1a1a', padding: '25px', borderRadius: '15px', textAlign: 'center', border: '1px solid #333' }}>
             <div style={{ width: '80px', height: '110px', margin: '0 auto 20px', backgroundColor: getBeerColor(stats.ebc), borderRadius: '5px 5px 25px 25px', border: '4px solid #333' }} />
             <div style={{ fontSize: '3.5rem', fontWeight: '900', color: '#f39c12' }}>{stats.abv}%</div>
             <div style={{ color: '#888', marginBottom: '20px' }}>DF Estimée : {stats.fg}</div>
             
             <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#27ae60' }}>{stats.ibu} IBU</div>
             
             <div style={{ background: '#000', padding: '15px', borderRadius: '10px', marginTop: '20px' }}>
                <div style={{ color: '#888', fontSize: '10px' }}>ÉQUILIBRE (BU/GU)</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{stats.ratio}</div>
             </div>
             <div style={{marginTop:'20px', color: '#555'}}>{stats.ebc} EBC</div>
          </section>
        </div>
      </div>
    </div>
  );
}

const cardStyle = { background: '#1a1a1a', padding: '20px', borderRadius: '12px', marginBottom: '20px' };
const inputStyle = { background: '#2a2a2a', color: '#fff', border: '1px solid #444', padding: '10px', borderRadius: '6px', outline: 'none', textAlign: 'center' as const };
const addButtonStyle = { width: '100%', padding: '10px', background: '#f39c12', border: 'none', borderRadius: '8px', fontWeight: 'bold' as const, cursor: 'pointer', marginTop: '10px', color: '#000' };

function getBeerColor(ebc: number) {
  if (ebc <= 8) return '#F5F75C';
  if (ebc <= 20) return '#C29321';
  if (ebc <= 40) return '#8D4C17';
  return '#1A0506';
}