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

interface MaltEntry { name: string; qty: number; ebc: number; yield: number; }
interface HopEntry { name: string; qty: number; alpha: number; time: number; }

export default function CreatorPage() {
  const [recipe, setRecipe] = useState({ 
    malts: [] as MaltEntry[], 
    hops: [] as HopEntry[],
    volume: 20, 
    efficiency: 75 
  });
  
  const [stats, setStats] = useState({ abv: 0, ebc: 0, ibu: 0, ratio: 0 });

  const calculateStats = () => {
    const volGal = recipe.volume * 0.264;
    let totalMCU = 0;
    let points = 0;
    
    recipe.malts.forEach(m => {
      totalMCU += ((m.qty * 2.204) * (m.ebc * 0.508)) / volGal;
      points += (m.qty * 300 * (m.yield / 100) * (recipe.efficiency / 100));
    });
    
    const ebc = (1.49 * Math.pow(totalMCU, 0.68)) * 1.97;
    const og = 1 + (points / recipe.volume) / 1000;
    const gu = (og - 1) * 1000; // Gravity Units (ex: 55 pour 1.055)
    const fg = 1 + (og - 1) * 0.25;
    const abv = (og - fg) * 131.25;

    let totalIBU = 0;
    recipe.hops.forEach(h => {
      const bignessFactor = 1.65 * Math.pow(0.000125, og - 1);
      const timeFactor = (1 - Math.exp(-0.04 * h.time)) / 4.15;
      const utilization = bignessFactor * timeFactor;
      const mgLAlpha = (h.alpha / 100) * (h.qty * 1000) / recipe.volume;
      totalIBU += mgLAlpha * utilization;
    });

    const ratio = gu > 0 ? totalIBU / gu : 0;

    setStats({ 
      ebc: Math.round(ebc || 0), 
      abv: parseFloat(abv.toFixed(1)) || 0,
      ibu: Math.round(totalIBU),
      ratio: parseFloat(ratio.toFixed(2))
    });
  };

  useEffect(() => { calculateStats(); }, [recipe]);

  // Helpers pour l'équilibre
  const getBalanceLabel = (r: number) => {
    if (r === 0) return "En attente...";
    if (r < 0.3) return { txt: "Très Douce", col: "#3498db" };
    if (r < 0.5) return { txt: "Équilibrée / Maltée", col: "#2ecc71" };
    if (r < 0.7) return { txt: "Légèrement Amère", col: "#f1c40f" };
    if (r < 1.0) return { txt: "Amère (Style IPA)", col: "#e67e22" };
    return { txt: "Explosive / Très Amère", col: "#e74c3c" };
  };

  const balance = getBalanceLabel(stats.ratio);

  return (
    <div style={{ padding: '30px', backgroundColor: '#0f0f0f', color: '#fff', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <style dangerouslySetInnerHTML={{ __html: `input::-webkit-outer-spin-button,input::-webkit-inner-spin-button {-webkit-appearance: none; margin: 0;} input[type=number] {-moz-appearance: textfield;}` }} />
      
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <h1 style={{ color: '#f39c12', textAlign: 'center', marginBottom: '40px' }}>🧪 L'Alchimiste - Créateur</h1>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '30px' }}>
          
          <section>
            {/* CARTE CONFIG (Volume/Efficacité) */}
            <div style={cardStyle}>
              <div style={{ display: 'flex', gap: '30px' }}>
                <div style={{flex:1}}>
                    <label style={labelStyle}>Volume Brassin</label>
                    <div style={inputGroupStyle}><input type="number" value={recipe.volume} onChange={e => setRecipe({...recipe, volume: +e.target.value})} style={inputStyle} /> <span style={unitStyle}>L</span></div>
                </div>
                <div style={{flex:1}}>
                    <label style={labelStyle}>Efficacité</label>
                    <div style={inputGroupStyle}><input type="number" value={recipe.efficiency} onChange={e => setRecipe({...recipe, efficiency: +e.target.value})} style={inputStyle} /> <span style={unitStyle}>%</span></div>
                </div>
              </div>
            </div>

            {/* CARTE GRAINS */}
            <div style={cardStyle}>
              <h3 style={{marginTop:0, color: '#f39c12'}}>🌾 Grains</h3>
              {recipe.malts.map((m, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                  <select style={{...inputStyle, flex: 2, textAlign: 'left', paddingLeft: '10px'}} value={m.name} onChange={e => {
                    const ref = MALT_DATABASE.find(x => x.name === e.target.value);
                    const newM = [...recipe.malts]; newM[i] = {...newM[i], name: ref!.name, ebc: ref!.ebc};
                    setRecipe({...recipe, malts: newM});
                  }}>
                    {MALT_DATABASE.map(x => <option key={x.name}>{x.name}</option>)}
                  </select>
                  <div style={inputGroupStyle}><input type="number" value={m.qty} onChange={e => {const newM = [...recipe.malts]; newM[i].qty = +e.target.value; setRecipe({...recipe, malts: newM})}} style={inputStyle} /><span style={unitStyle}>kg</span></div>
                  <button onClick={() => setRecipe({...recipe, malts: recipe.malts.filter((_, idx) => idx !== i)})} style={{background:'none', border:'none', color:'#555', cursor:'pointer'}}>×</button>
                </div>
              ))}
              <button onClick={() => setRecipe({...recipe, malts: [...recipe.malts, {...MALT_DATABASE[0], qty: 0}]})} style={addButtonStyle}>+ Ajouter un grain</button>
            </div>

            {/* CARTE HOUBLONS */}
            <div style={cardStyle}>
              <h3 style={{marginTop:0, color: '#27ae60'}}>🌿 Houblons</h3>
              {recipe.hops.map((h, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                  <select style={{...inputStyle, flex: 2, textAlign: 'left', paddingLeft: '10px'}} value={h.name} onChange={e => {
                    const ref = HOP_DATABASE.find(x => x.name === e.target.value);
                    const newH = [...recipe.hops]; newH[i] = {...newH[i], name: ref!.name, alpha: ref!.alpha};
                    setRecipe({...recipe, hops: newH});
                  }}>
                    {HOP_DATABASE.map(x => <option key={x.name}>{x.name}</option>)}
                  </select>
                  <div style={inputGroupStyle}><input type="number" value={h.qty} onChange={e => {const newH = [...recipe.hops]; newH[i].qty = +e.target.value; setRecipe({...recipe, hops: newH})}} style={inputStyle} /><span style={unitStyle}>g</span></div>
                  <div style={inputGroupStyle}><input type="number" value={h.time} onChange={e => {const newH = [...recipe.hops]; newH[i].time = +e.target.value; setRecipe({...recipe, hops: newH})}} style={inputStyle} /><span style={unitStyle}>min</span></div>
                  <button onClick={() => setRecipe({...recipe, hops: recipe.hops.filter((_, idx) => idx !== i)})} style={{background:'none', border:'none', color:'#555', cursor:'pointer'}}>×</button>
                </div>
              ))}
              <button onClick={() => setRecipe({...recipe, hops: [...recipe.hops, {...HOP_DATABASE[0], qty: 0, time: 60}]})} style={{...addButtonStyle, background: '#27ae60'}}>+ Ajouter un houblon</button>
            </div>
          </section>

          {/* SECTION RÉSULTATS (STICKY) */}
          <section style={{ position: 'sticky', top: '30px', height: 'fit-content', background: '#1a1a1a', padding: '25px', borderRadius: '15px', textAlign: 'center', border: '1px solid #333' }}>
             <h2 style={{ color: '#888', fontSize: '12px', letterSpacing: '2px', marginBottom: '20px' }}>PRÉVISIONS</h2>
             
             <div style={{ width: '80px', height: '110px', margin: '0 auto 20px', backgroundColor: getBeerColor(stats.ebc), borderRadius: '5px 5px 25px 25px', border: '4px solid #333', boxShadow: `0 0 30px ${getBeerColor(stats.ebc)}33` }} />

             <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '3.5rem', fontWeight: '900', color: '#f39c12', lineHeight: 1 }}>{stats.abv}%</div>
                <div style={{ color: '#888', fontSize: '12px' }}>ALCOOL</div>
             </div>

             <div style={{ marginBottom: '25px' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#27ae60', lineHeight: 1 }}>{stats.ibu}</div>
                <div style={{ color: '#888', fontSize: '12px' }}>IBU (AMERTUME)</div>
             </div>

             <div style={{ background: '#000', padding: '15px', borderRadius: '10px', border: '1px solid #222' }}>
                <div style={{ color: '#888', fontSize: '10px', marginBottom: '5px' }}>RAPPORT BU/GU (ÉQUILIBRE)</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: typeof balance === 'string' ? '#fff' : balance.col }}>
                    {stats.ratio}
                </div>
                <div style={{ fontSize: '0.9rem', color: typeof balance === 'string' ? '#fff' : balance.col, marginTop: '2px' }}>
                    {typeof balance === 'string' ? balance : balance.txt}
                </div>
             </div>

             <div style={{ marginTop: '20px', color: '#666', fontSize: '12px' }}>{stats.ebc} EBC</div>
          </section>

        </div>
      </div>
    </div>
  );
}

// Styles inchangés
const cardStyle = { background: '#1a1a1a', padding: '20px', borderRadius: '12px', marginBottom: '20px' };
const labelStyle = { display: 'block', fontSize: '11px', color: '#666', textTransform: 'uppercase' as const, marginBottom: '5px', fontWeight: 'bold' };
const inputGroupStyle = { display: 'flex', alignItems: 'center', background: '#2a2a2a', borderRadius: '6px', border: '1px solid #444', overflow: 'hidden' };
const inputStyle = { background: 'transparent', color: '#fff', border: 'none', padding: '10px', width: '100%', outline: 'none', textAlign: 'center' as const };
const unitStyle = { background: '#333', padding: '10px', fontSize: '12px', color: '#aaa', minWidth: '35px' };
const addButtonStyle = { width: '100%', padding: '12px', background: '#f39c12', border: 'none', borderRadius: '8px', fontWeight: 'bold' as const, cursor: 'pointer', marginTop: '10px', color: '#000' };

function getBeerColor(ebc: number) {
  if (ebc <= 4) return '#F3F993';
  if (ebc <= 8) return '#F5F75C';
  if (ebc <= 12) return '#E5E131';
  if (ebc <= 20) return '#C29321';
  if (ebc <= 33) return '#9E5216';
  if (ebc <= 47) return '#702712';
  return '#1A0506';
}