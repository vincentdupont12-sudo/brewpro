'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';

// --- DATABASE ---
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
];

const SALT_DATABASE = [
  { name: "Sulfate de Calcium (Gypse)", influence: "Exalte le houblon (Sec/Tranchant)", ph_effect: "Baisse le pH", dosage: 0.15 },
  { name: "Chlorure de Calcium", influence: "Exalte le malt (Rond/Soyeux)", ph_effect: "Baisse le pH", dosage: 0.15 },
  { name: "Bicarbonate de Soude", influence: "Équilibre l'acidité", ph_effect: "Augmente le pH", dosage: 0.05 },
];

export default function CreatorPage() {
  const [recipeName, setRecipeName] = useState("Nouvelle Recette");
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

  const calculateStats = () => {
    const volGal = recipe.volume * 0.264;
    let points = 0; let totalMCU = 0;
    recipe.malts.forEach(m => {
      totalMCU += ((m.qty * 2.204) * (m.ebc * 0.508)) / volGal;
      points += (m.qty * 300 * (m.yield / 100) * (recipe.efficiency / 100));
    });
    const og = 1 + (points / recipe.volume) / 1000;
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

  const startBatch = async () => {
    setLoading(true);
    const steps = {
      inventory: [
        ...recipe.malts.map(m => ({ item: m.name, qty: m.qty, unit: 'kg' })),
        ...recipe.hops.map(h => ({ item: h.name, qty: h.qty, unit: 'g', time: h.time })),
        ...recipe.salts.map(s => ({ item: s.name, qty: s.qty, unit: 'g' }))
      ],
      targets: stats
    };
    const { error } = await supabase.from('batches').insert([{ 
      recipe_name: recipeName, status: 'En cours', batch_data: steps, target_og: stats.og 
    }]);
    if (!error) alert("🚀 Batch créé !");
    setLoading(false);
  };

  return (
    <div style={{ padding: '30px', backgroundColor: '#0f0f0f', color: '#fff', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      {/* CSS pour virer les spinners */}
      <style dangerouslySetInnerHTML={{ __html: `
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
      `}} />

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <header style={headerStyle}>
          <input value={recipeName} onChange={e => setRecipeName(e.target.value)} style={nameInputStyle} />
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.8rem', color: '#888' }}>ORIGINAL GRAVITY</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>
               OG: <span style={{ textDecoration: 'underline', color: '#f39c12' }}>{stats.og}</span>
            </div>
          </div>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '30px' }}>
          <section>
            {/* EMPÂTAGE */}
            <div style={cardStyle}>
              <h3 style={{marginTop:0}}>🌡️ Empâtage : {recipe.mashTemp}°C</h3>
              <input type="range" min="62" max="72" step="0.5" value={recipe.mashTemp} onChange={e => setRecipe({...recipe, mashTemp: +e.target.value})} style={{width:'100%'}} />
            </div>

            {/* GRAINS */}
            <div style={cardStyle}>
              <h3>🌾 Grains</h3>
              {recipe.malts.map((m, i) => (
                <div key={i} style={rowStyle}>
                  <select style={{...inputStyle, flex: 3}} value={m.name} onChange={e => {
                    const ref = MALT_DATABASE.find(x => x.name === e.target.value);
                    const n = [...recipe.malts]; n[i] = {...n[i], name: ref!.name, ebc: ref!.ebc}; setRecipe({...recipe, malts: n});
                  }}>
                    {MALT_DATABASE.map(x => <option key={x.name}>{x.name}</option>)}
                  </select>
                  <div style={unitInputWrapper}>
                    <input type="number" step="0.1" value={m.qty} onChange={e => {const n = [...recipe.malts]; n[i].qty = +e.target.value; setRecipe({...recipe, malts: n})}} style={inputStyle} />
                    <span style={unitStyle}>kg</span>
                  </div>
                </div>
              ))}
              <button onClick={() => setRecipe({...recipe, malts: [...recipe.malts, {...MALT_DATABASE[0], qty: 0}]})} style={addButtonStyle}>+ Grain</button>
            </div>

            {/* HOUBLONS */}
            <div style={cardStyle}>
              <h3>🌿 Houblons</h3>
              {recipe.hops.map((h, i) => (
                <div key={i} style={rowStyle}>
                  <select style={{...inputStyle, flex: 2}} value={h.name} onChange={e => {
                    const ref = HOP_DATABASE.find(x => x.name === e.target.value);
                    const n = [...recipe.hops]; n[i] = {...n[i], name: ref!.name, alpha: ref!.alpha}; setRecipe({...recipe, hops: n});
                  }}>
                    {HOP_DATABASE.map(x => <option key={x.name}>{x.name}</option>)}
                  </select>
                  <div style={unitInputWrapper}>
                    <input type="number" value={h.qty} onChange={e => {const n = [...recipe.hops]; n[i].qty = +e.target.value; setRecipe({...recipe, hops: n})}} style={inputStyle} />
                    <span style={unitStyle}>g</span>
                  </div>
                  <div style={unitInputWrapper}>
                    <input type="number" value={h.time} onChange={e => {const n = [...recipe.hops]; n[i].time = +e.target.value; setRecipe({...recipe, hops: n})}} style={inputStyle} />
                    <span style={unitStyle}>min</span>
                  </div>
                </div>
              ))}
              <button onClick={() => setRecipe({...recipe, hops: [...recipe.hops, {...HOP_DATABASE[0], qty: 0, time: 60}]})} style={{...addButtonStyle, background: '#27ae60'}}>+ Houblon</button>
            </div>

            {/* SELS & MÉMO */}
            <div style={{...cardStyle, borderLeft: '5px solid #3498db'}}>
              <h3 style={{marginTop:0, color:'#3498db'}}>💧 Sels Minéraux</h3>
              {recipe.salts.map((s, i) => (
                <div key={i} style={{marginBottom:'15px'}}>
                  <div style={rowStyle}>
                    <select style={{...inputStyle, flex: 3}} value={s.name} onChange={e => {
                      const ref = SALT_DATABASE.find(x => x.name === e.target.value);
                      const n = [...recipe.salts]; n[i] = {...n[i], name: ref!.name, influence: ref!.influence, ph_effect: ref!.ph_effect}; setRecipe({...recipe, salts: n});
                    }}>
                      {SALT_DATABASE.map(x => <option key={x.name}>{x.name}</option>)}
                    </select>
                    <div style={unitInputWrapper}>
                      <input type="number" step="0.1" value={s.qty} onChange={e => {const n = [...recipe.salts]; n[i].qty = +e.target.value; setRecipe({...recipe, salts: n})}} style={inputStyle} />
                      <span style={unitStyle}>g</span>
                    </div>
                  </div>
                  <div style={memoBox}>
                    <span style={{color:'#3498db'}}>✨ Goût :</span> {s.influence} | <span style={{color:'#e67e22'}}>🧪 pH :</span> {s.ph_effect}
                  </div>
                </div>
              ))}
              <button onClick={() => setRecipe({...recipe, salts: [...recipe.salts, { ...SALT_DATABASE[0], qty: 2 }]})} style={{...addButtonStyle, background: '#3498db'}}>+ Ajouter Sels</button>
            </div>
          </section>

          {/* RÉSULTATS */}
          <section style={stickySidebar}>
             <div style={{ width: '80px', height: '110px', margin: '0 auto 20px', backgroundColor: getBeerColor(stats.ebc), borderRadius: '10px 10px 30px 30px', border: '4px solid #333' }} />
             <div style={{ fontSize: '3.2rem', fontWeight: '900', color: '#f39c12' }}>{stats.abv}%</div>
             <div style={{ color: '#888', fontSize: '12px', marginBottom: '20px' }}>Densité Finale : {stats.fg}</div>
             <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '20px' }}>
                <div><div style={{fontSize:'1.5rem', color:'#27ae60'}}>{stats.ibu}</div><div style={{fontSize:'10px'}}>IBU</div></div>
                <div><div style={{fontSize:'1.5rem', color:'#3498db'}}>{stats.ratio}</div><div style={{fontSize:'10px'}}>BU/GU</div></div>
             </div>
             <button onClick={startBatch} disabled={loading} style={addButtonStyle}>
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
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', background: '#1a1a1a', padding: '20px', borderRadius: '12px' };
const nameInputStyle = { background: 'transparent', border: 'none', borderBottom: '2px solid #f39c12', color: '#fff', fontSize: '1.5rem', outline: 'none', width: '50%' };
const inputStyle = { background: '#2a2a2a', color: '#fff', border: '1px solid #444', padding: '10px', borderRadius: '6px', outline: 'none', textAlign: 'center' as const, width: '100%' };
const rowStyle = { display: 'flex', gap: '10px', marginBottom: '8px', alignItems: 'center' };
const unitInputWrapper = { position: 'relative' as const, display: 'flex', alignItems: 'center', width: '80px' };
const unitStyle = { position: 'absolute' as const, right: '8px', fontSize: '10px', color: '#666', pointerEvents: 'none' as const };
const memoBox = { fontSize: '11px', background: '#000', padding: '8px', borderRadius: '6px', marginTop: '4px' };
const addButtonStyle = { width: '100%', padding: '12px', background: '#f39c12', border: 'none', borderRadius: '8px', fontWeight: 'bold' as const, cursor: 'pointer', marginTop: '10px' };
const stickySidebar = { position: 'sticky' as const, top: '20px', height: 'fit-content', background: '#1a1a1a', padding: '25px', borderRadius: '15px', border: '2px solid #333', textAlign: 'center' as const };

function getBeerColor(ebc: number) {
  if (ebc <= 8) return '#F5F75C';
  if (ebc <= 20) return '#C29321';
  if (ebc <= 40) return '#8D4C17';
  return '#1A0506';
}