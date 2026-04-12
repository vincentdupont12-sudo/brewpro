'use client';

import { useState, useEffect } from 'react';

// --- BASES DE DONNÉES ---
const MALT_DATABASE = [
  { name: "Pilsner", ebc: 3.5, yield: 80 },
  { name: "Pale Ale", ebc: 8, yield: 79 },
  { name: "Munich", ebc: 15, yield: 78 },
  { name: "Amber", ebc: 50, yield: 75 },
  { name: "Chocolat", ebc: 900, yield: 68 },
  { name: "Black / Roasted Barley", ebc: 1200, yield: 65 },
];

const HOP_DATABASE = [
  { name: "Saaz", alpha: 3.5 },
  { name: "Cascade", alpha: 7.0 },
  { name: "Citra", alpha: 13.5 },
  { name: "Magnum", alpha: 12.0 },
  { name: "Mosaic", alpha: 12.5 },
];

const SALT_DATABASE = [
  { name: "Sulfate de Calcium (Gypse)", influence: "Exalte le houblon / Sec", ph: "Baisse le pH", dosage: 0.15 },
  { name: "Chlorure de Calcium", influence: "Exalte le malt / Soyeux", ph: "Baisse le pH", dosage: 0.15 },
  { name: "Sulfate de Magnésium (Epsom)", influence: "Amertume tranchante", ph: "Neutre/Léger bas", dosage: 0.05 },
  { name: "Bicarbonate de Soude", influence: "Rondeur (Stouts)", ph: "Augmente le pH", dosage: 0.1 },
];

interface MaltEntry { name: string; qty: number; ebc: number; yield: number; }
interface HopEntry { name: string; qty: number; alpha: number; time: number; }
interface SaltEntry { name: string; qty: number; influence: string; ph: string; }

export default function CreatorPage() {
  const [recipe, setRecipe] = useState({ 
    malts: [] as MaltEntry[], 
    hops: [] as HopEntry[],
    salts: [] as SaltEntry[],
    volume: 20, 
    efficiency: 75 
  });
  
  const [stats, setStats] = useState({ abv: 0, ebc: 0, ibu: 0, ratio: 0 });

  const calculateStats = () => {
    const volGal = recipe.volume * 0.264;
    let points = 0; let totalMCU = 0;
    recipe.malts.forEach(m => {
      totalMCU += ((m.qty * 2.204) * (m.ebc * 0.508)) / volGal;
      points += (m.qty * 300 * (m.yield / 100) * (recipe.efficiency / 100));
    });
    const og = 1 + (points / recipe.volume) / 1000;
    const gu = (og - 1) * 1000;
    let totalIBU = 0;
    recipe.hops.forEach(h => {
      const util = (1.65 * Math.pow(0.000125, og - 1)) * ((1 - Math.exp(-0.04 * h.time)) / 4.15);
      totalIBU += ((h.alpha / 100) * (h.qty * 1000) / recipe.volume) * util;
    });

    setStats({ 
      ebc: Math.round((1.49 * Math.pow(totalMCU, 0.68)) * 1.97) || 0, 
      abv: parseFloat(((og - (1 + (og - 1) * 0.25)) * 131.25).toFixed(1)) || 0,
      ibu: Math.round(totalIBU),
      ratio: gu > 0 ? parseFloat((totalIBU / gu).toFixed(2)) : 0
    });
  };

  useEffect(() => { calculateStats(); }, [recipe]);

  const addSalt = () => {
    const s = SALT_DATABASE[0];
    setRecipe({...recipe, salts: [...recipe.salts, { name: s.name, qty: s.dosage * recipe.volume, influence: s.influence, ph: s.ph }]});
  };

  return (
    <div style={{ padding: '30px', backgroundColor: '#0f0f0f', color: '#fff', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <style dangerouslySetInnerHTML={{ __html: `input::-webkit-outer-spin-button,input::-webkit-inner-spin-button {-webkit-appearance: none; margin: 0;} input[type=number] {-moz-appearance: textfield;}` }} />
      
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ color: '#f39c12', textAlign: 'center', marginBottom: '40px' }}>🧪 L'Alchimiste - Créateur</h1>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '30px' }}>
          
          <section>
            {/* CONFIG */}
            <div style={cardStyle}>
              <div style={{ display: 'flex', gap: '30px' }}>
                <div style={{flex:1}}><label style={labelStyle}>Volume Final</label><div style={inputGroupStyle}><input type="number" value={recipe.volume} onChange={e => setRecipe({...recipe, volume: +e.target.value})} style={inputStyle} /><span style={unitStyle}>L</span></div></div>
                <div style={{flex:1}}><label style={labelStyle}>Efficacité</label><div style={inputGroupStyle}><input type="number" value={recipe.efficiency} onChange={e => setRecipe({...recipe, efficiency: +e.target.value})} style={inputStyle} /><span style={unitStyle}>%</span></div></div>
              </div>
            </div>

            {/* MALTS & HOUBLONS (Condensés pour la place) */}
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
                <div style={cardStyle}>
                    <h3>🌾 Grains</h3>
                    {recipe.malts.map((m, i) => (
                        <div key={i} style={{display:'flex', gap:'5px', marginBottom:'5px'}}>
                            <select style={{...inputStyle, flex:2, fontSize:'12px'}} onChange={e => {
                                const ref = MALT_DATABASE.find(x => x.name === e.target.value);
                                const n = [...recipe.malts]; n[i] = {...n[i], name: ref!.name}; setRecipe({...recipe, malts: n});
                            }}>{MALT_DATABASE.map(x => <option key={x.name}>{x.name}</option>)}</select>
                            <input type="number" value={m.qty} onChange={e => {const n = [...recipe.malts]; n[i].qty = +e.target.value; setRecipe({...recipe, malts: n})}} style={{...inputStyle, width:'50px'}} />
                        </div>
                    ))}
                    <button onClick={() => setRecipe({...recipe, malts: [...recipe.malts, {...MALT_DATABASE[0], qty: 0}]})} style={smallBtn}>+ Grain</button>
                </div>
                <div style={cardStyle}>
                    <h3>🌿 Houblons</h3>
                    {recipe.hops.map((h, i) => (
                        <div key={i} style={{display:'flex', gap:'5px', marginBottom:'5px'}}>
                            <select style={{...inputStyle, flex:2, fontSize:'12px'}} onChange={e => {
                                const ref = HOP_DATABASE.find(x => x.name === e.target.value);
                                const n = [...recipe.hops]; n[i] = {...n[i], name: ref!.name, alpha: ref!.alpha}; setRecipe({...recipe, hops: n});
                            }}>{HOP_DATABASE.map(x => <option key={x.name}>{x.name}</option>)}</select>
                            <input type="number" value={h.qty} onChange={e => {const n = [...recipe.hops]; n[i].qty = +e.target.value; setRecipe({...recipe, hops: n})}} style={{...inputStyle, width:'40px'}} />
                        </div>
                    ))}
                    <button onClick={() => setRecipe({...recipe, hops: [...recipe.hops, {...HOP_DATABASE[0], qty: 0, time: 60}]})} style={{...smallBtn, background:'#27ae60'}}>+ Houblon</button>
                </div>
            </div>

            {/* SECTION SELS - TRAITEMENT DE L'EAU */}
            <div style={{...cardStyle, borderLeft: '5px solid #3498db'}}>
              <h3 style={{marginTop:0, color: '#3498db'}}>💧 Traitement de l'Eau (Sels)</h3>
              <p style={{fontSize: '12px', color: '#888', marginBottom: '15px'}}>L'influence sur le goût et le pH est indicative pour {recipe.volume}L.</p>
              
              {recipe.salts.map((s, i) => (
                <div key={i} style={{ background: '#252525', padding: '15px', borderRadius: '8px', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <select style={{...inputStyle, flex: 1, textAlign: 'left'}} value={s.name} onChange={e => {
                        const ref = SALT_DATABASE.find(x => x.name === e.target.value);
                        const n = [...recipe.salts]; 
                        n[i] = { name: ref!.name, qty: ref!.dosage * recipe.volume, influence: ref!.influence, ph: ref!.ph };
                        setRecipe({...recipe, salts: n});
                    }}>
                        {SALT_DATABASE.map(x => <option key={x.name}>{x.name}</option>)}
                    </select>
                    <div style={{...inputGroupStyle, width: '100px'}}>
                        <input type="number" step="0.1" value={s.qty} onChange={e => {const n = [...recipe.salts]; n[i].qty = +e.target.value; setRecipe({...recipe, salts: n})}} style={inputStyle} />
                        <span style={unitStyle}>g</span>
                    </div>
                    <button onClick={() => setRecipe({...recipe, salts: recipe.salts.filter((_, idx) => idx !== i)})} style={{color:'#ff4444', background:'none', border:'none', cursor:'pointer'}}>×</button>
                  </div>
                  <div style={{display:'flex', gap:'20px', marginTop:'10px', fontSize:'11px'}}>
                    <span style={{color: '#f1c40f'}}>✨ {s.influence}</span>
                    <span style={{color: '#e74c3c'}}>🧪 {s.ph}</span>
                  </div>
                </div>
              ))}
              <button onClick={addSalt} style={{...smallBtn, background: '#3498db'}}>+ Ajouter un sel minéral</button>
            </div>
          </section>

          {/* RÉSULTATS (STICKY) */}
          <section style={{ position: 'sticky', top: '30px', height: 'fit-content', background: '#1a1a1a', padding: '25px', borderRadius: '15px', textAlign: 'center' }}>
             <div style={{ width: '80px', height: '110px', margin: '0 auto 20px', backgroundColor: getBeerColor(stats.ebc), borderRadius: '5px 5px 25px 25px', border: '4px solid #333' }} />
             <div style={{ fontSize: '3rem', fontWeight: '900', color: '#f39c12' }}>{stats.abv}%</div>
             <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#27ae60' }}>{stats.ibu} IBU</div>
             <div style={{ background: '#000', padding: '10px', borderRadius: '8px', marginTop: '20px', border: '1px solid #333' }}>
                <div style={{ color: '#888', fontSize: '10px' }}>RATIO BU/GU</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{stats.ratio}</div>
             </div>
          </section>
        </div>
      </div>
    </div>
  );
}

// Styles
const cardStyle = { background: '#1a1a1a', padding: '20px', borderRadius: '12px', marginBottom: '20px' };
const labelStyle = { display: 'block', fontSize: '11px', color: '#666', textTransform: 'uppercase' as const, marginBottom: '5px' };
const inputGroupStyle = { display: 'flex', alignItems: 'center', background: '#2a2a2a', borderRadius: '6px', border: '1px solid #444', overflow: 'hidden' };
const inputStyle = { background: 'transparent', color: '#fff', border: 'none', padding: '10px', width: '100%', outline: 'none', textAlign: 'center' as const };
const unitStyle = { background: '#333', padding: '10px', fontSize: '12px', color: '#aaa' };
const smallBtn = { width: '100%', padding: '8px', background: '#f39c12', border: 'none', borderRadius: '6px', fontWeight: 'bold' as const, cursor: 'pointer', color: '#000', fontSize: '12px' };

function getBeerColor(ebc: number) {
  if (ebc <= 8) return '#F5F75C';
  if (ebc <= 20) return '#C29321';
  if (ebc <= 40) return '#8D4C17';
  return '#1A0506';
}