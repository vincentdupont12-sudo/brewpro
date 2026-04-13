'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';

// --- DATABASES (Pour les calculs) ---
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
  { name: "Sulfate de Calcium (Gypse)", influence: "Exalte le houblon (Sec/Tranchant)", ph_effect: "Baisse le pH" },
  { name: "Chlorure de Calcium", influence: "Exalte le malt (Rond/Soyeux)", ph_effect: "Baisse le pH" },
  { name: "Bicarbonate de Soude", influence: "Équilibre l'acidité", ph_effect: "Augmente le pH" },
];

export default function CreatorPage() {
  const [recipeName, setRecipeName] = useState("MA NOUVELLE RECETTE");
  const [loading, setLoading] = useState(false);

  // --- ÉTATS ---
  const [recipe, setRecipe] = useState({ 
    malts: [] as any[], 
    hops: [] as any[],
    salts: [] as any[],
    volume: 20, 
    efficiency: 75,
    mashTemp: 67 
  });

  const [steps, setSteps] = useState([
    { id: 1, label: 'Pesée des grains et concassage' },
    { id: 2, label: 'Nettoyage et désinfection du matériel' },
  ]);
  
  const [stats, setStats] = useState({ abv: 0, ebc: 0, ibu: 0, ratio: 0, og: 1.000, fg: 1.000 });

  // --- CALCULS SCIENTIFIQUES ---
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

  // --- LE PONT VERS BREWMASTER (Table 'recipes') ---
  const startBatch = async () => {
    if (!recipeName) return alert("Donne un nom à ta recette !");
    setLoading(true);

    const formattedSteps = [
      // 1. Actions manuelles du Creator
      ...steps.map(s => ({
        id: crypto.randomUUID(),
        type: "ACTION",
        title: s.label.toUpperCase(),
        instruction: "Étape logistique définie au Lab.",
        target: "",
        value: "",
        ingredients: []
      })),
      // 2. Palier d'empâtage auto-généré
      {
        id: "mash-main",
        type: "PALIER",
        title: "EMPÂTAGE PRINCIPAL",
        instruction: `Maintenir à ${recipe.mashTemp}°C pour conversion optimale.`,
        target: `${recipe.mashTemp}°C`,
        value: "60",
        ingredients: recipe.malts.map(m => ({ name: m.name.toUpperCase(), qty: m.qty.toString() }))
      },
      // 3. Mash out
      {
        id: "mash-out",
        type: "PALIER",
        title: "MASH OUT",
        instruction: "Montée en température pour fluidifier le moût.",
        target: "78°C",
        value: "10",
        ingredients: []
      },
      // 4. Houblons transformés en actions chronométrées
      ...recipe.hops.sort((a,b) => b.time - a.time).map((h, i) => ({
        id: `hop-${i}`,
        type: "ACTION",
        title: `HOUBLONNAGE : ${h.name.toUpperCase()}`,
        instruction: `Ajout à T-${h.time} minutes avant fin d'ébullition.`,
        target: "",
        value: "",
        ingredients: [{ name: h.name.toUpperCase(), qty: h.qty.toString() }]
      }))
    ];

    const recipeForPotes = {
      name: recipeName.toUpperCase(),
      eauE: (recipe.volume * 2.8).toFixed(1), // Ratio standard
      eauR: (recipe.volume * 1.2).toFixed(1), 
      steps: formattedSteps
    };

    const { error } = await supabase.from('recipes').insert([{ data: recipeForPotes }]);

    if (!error) {
      alert("🚀 TRANSFÉRÉ AU BREWMASTER ! Prêt pour le brassage.");
    } else {
      alert("Erreur Supabase : " + error.message);
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '40px', backgroundColor: '#050505', color: '#fff', minHeight: '100vh', fontFamily: 'monospace', textTransform: 'uppercase', fontStyle: 'italic' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
      `}} />

      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <header style={{ marginBottom: '40px', borderBottom: '2px solid #222', paddingBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: '10px', color: '#f39c12', fontWeight: 'bold' }}>PROJECT_NAME</span>
            <input value={recipeName} onChange={e => setRecipeName(e.target.value)} style={nameInputStyle} />
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '10px', color: '#444' }}>TARGET_OG</span>
            <div style={{ fontSize: '2rem', fontWeight: '900', color: '#f39c12' }}>{stats.og}</div>
          </div>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '40px' }}>
          <main>
            {/* GRAINS */}
            <div style={cardStyle}>
              <h3 style={cardTitle}>🌾 MALT_BILL</h3>
              {recipe.malts.map((m, i) => (
                <div key={i} style={rowStyle}>
                  <select style={{...inputStyle, flex: 3, textAlign: 'left'}} value={m.name} onChange={e => {
                    const ref = MALT_DATABASE.find(x => x.name === e.target.value);
                    const n = [...recipe.malts]; n[i] = {...n[i], name: ref!.name, ebc: ref!.ebc}; setRecipe({...recipe, malts: n});
                  }}>
                    {MALT_DATABASE.map(x => <option key={x.name}>{x.name}</option>)}
                  </select>
                  <div style={unitWrapper}>
                    <input type="number" step="0.1" value={m.qty} onChange={e => {const n = [...recipe.malts]; n[i].qty = +e.target.value; setRecipe({...recipe, malts: n})}} style={inputStyle} />
                    <span style={unitTag}>KG</span>
                  </div>
                  <button onClick={() => setRecipe({...recipe, malts: recipe.malts.filter((_, idx) => idx !== i)})} style={delBtn}>×</button>
                </div>
              ))}
              <button onClick={() => setRecipe({...recipe, malts: [...recipe.malts, {...MALT_DATABASE[0], qty: 1}]})} style={addBtn}>+ ADD_MALT</button>
            </div>

            {/* HOUBLONS */}
            <div style={cardStyle}>
              <h3 style={cardTitle}>🌿 HOP_SCHEDULE</h3>
              {recipe.hops.map((h, i) => (
                <div key={i} style={rowStyle}>
                  <select style={{...inputStyle, flex: 2, textAlign: 'left'}} value={h.name} onChange={e => {
                    const ref = HOP_DATABASE.find(x => x.name === e.target.value);
                    const n = [...recipe.hops]; n[i] = {...n[i], name: ref!.name, alpha: ref!.alpha}; setRecipe({...recipe, hops: n});
                  }}>
                    {HOP_DATABASE.map(x => <option key={x.name}>{x.name}</option>)}
                  </select>
                  <div style={unitWrapper}>
                    <input type="number" value={h.qty} onChange={e => {const n = [...recipe.hops]; n[i].qty = +e.target.value; setRecipe({...recipe, hops: n})}} style={inputStyle} />
                    <span style={unitTag}>G</span>
                  </div>
                  <div style={unitWrapper}>
                    <input type="number" value={h.time} onChange={e => {const n = [...recipe.hops]; n[i].time = +e.target.value; setRecipe({...recipe, hops: n})}} style={inputStyle} />
                    <span style={unitTag}>MIN</span>
                  </div>
                </div>
              ))}
              <button onClick={() => setRecipe({...recipe, hops: [...recipe.hops, {...HOP_DATABASE[0], qty: 20, time: 60}]})} style={{...addBtn, color: '#27ae60'}}>+ ADD_HOP</button>
            </div>

            {/* SELS */}
            <div style={{...cardStyle, borderLeft: '4px solid #3498db'}}>
              <h3 style={{...cardTitle, color: '#3498db'}}>💧 WATER_CHEMISTRY</h3>
              {recipe.salts.map((s, i) => (
                <div key={i} style={{marginBottom: '10px'}}>
                  <div style={rowStyle}>
                    <select style={{...inputStyle, flex: 3, textAlign: 'left'}} value={s.name} onChange={e => {
                      const ref = SALT_DATABASE.find(x => x.name === e.target.value);
                      const n = [...recipe.salts]; n[i] = {...n[i], name: ref!.name, influence: ref!.influence, ph_effect: ref!.ph_effect}; setRecipe({...recipe, salts: n});
                    }}>
                      {SALT_DATABASE.map(x => <option key={x.name}>{x.name}</option>)}
                    </select>
                    <div style={unitWrapper}>
                      <input type="number" step="0.1" value={s.qty} onChange={e => {const n = [...recipe.salts]; n[i].qty = +e.target.value; setRecipe({...recipe, salts: n})}} style={inputStyle} />
                      <span style={unitTag}>G</span>
                    </div>
                  </div>
                  <div style={memoBox}>GOÛT: {s.influence} | PH: {s.ph_effect}</div>
                </div>
              ))}
              <button onClick={() => setRecipe({...recipe, salts: [...recipe.salts, {...SALT_DATABASE[0], qty: 2}]})} style={{...addBtn, color: '#3498db'}}>+ ADD_SALT</button>
            </div>

            {/* TIMELINE ACTIONS */}
            <div style={{...cardStyle, borderLeft: '4px solid #9b59b6'}}>
              <h3 style={{...cardTitle, color: '#9b59b6'}}>🎬 BREW_DAY_ACTIONS</h3>
              {steps.map((step, i) => (
                <div key={step.id} style={rowStyle}>
                  <span style={{color: '#9b59b6'}}>⚡</span>
                  <input 
                    style={{...inputStyle, flex: 1, textAlign: 'left'}} 
                    value={step.label}
                    onChange={(e) => {
                      const n = [...steps]; n[i].label = e.target.value; setSteps(n);
                    }}
                  />
                  <button onClick={() => setSteps(steps.filter(s => s.id !== step.id))} style={delBtn}>×</button>
                </div>
              ))}
              <button onClick={() => setSteps([...steps, { id: Date.now(), label: 'NOUVELLE ÉTAPE' }])} style={{...addBtn, color: '#9b59b6'}}>+ ADD_ACTION</button>
            </div>
          </main>

          <aside style={sidebarStyle}>
             <div style={{ height: '150px', backgroundColor: getBeerColor(stats.ebc), borderRadius: '4px', marginBottom: '20px', border: '2px solid #222' }} />
             <div style={{ fontSize: '3.5rem', fontWeight: '900', color: '#f39c12', lineHeight: '1' }}>{stats.abv}%</div>
             <div style={{ fontSize: '10px', color: '#555', marginBottom: '30px' }}>ESTIMATED_ABV</div>
             
             <div style={statGrid}>
                <div style={statItem}><span style={statLabel}>IBU</span><span style={{color: '#27ae60'}}>{stats.ibu}</span></div>
                <div style={statItem}><span style={statLabel}>EBC</span><span style={{color: '#f39c12'}}>{stats.ebc}</span></div>
                <div style={statItem}><span style={statLabel}>RATIO</span><span style={{color: '#3498db'}}>{stats.ratio}</span></div>
             </div>

             <button onClick={startBatch} disabled={loading} style={commitBtn}>
                {loading ? "TRANSMITTING..." : "COMMIT_TO_BREWMASTER"}
             </button>
          </aside>
        </div>
      </div>
    </div>
  );
}

// --- STYLE OBJECTS ---
const nameInputStyle = { background: 'transparent', border: 'none', color: '#fff', fontSize: '3rem', fontWeight: '900', outline: 'none', width: '100%', fontStyle: 'italic', letterSpacing: '-2px' };
const cardStyle = { background: '#0a0a0a', padding: '25px', border: '1px solid #111', marginBottom: '25px' };
const cardTitle = { fontSize: '10px', letterSpacing: '2px', color: '#444', marginBottom: '20px', marginTop: 0 };
const inputStyle = { background: '#000', color: '#fff', border: '1px solid #222', padding: '12px', outline: 'none', width: '100%', fontSize: '12px', fontWeight: 'bold' };
const rowStyle = { display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center' };
const unitWrapper = { position: 'relative' as const, minWidth: '85px' };
const unitTag = { position: 'absolute' as const, right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '8px', color: '#444' };
const delBtn = { background: 'none', border: 'none', color: '#333', cursor: 'pointer', fontSize: '1.2rem' };
const addBtn = { background: 'none', border: 'none', color: '#f39c12', cursor: 'pointer', fontSize: '9px', fontWeight: 'bold', letterSpacing: '1px', marginTop: '10px' };
const memoBox = { fontSize: '9px', color: '#555', marginTop: '-5px', marginBottom: '15px', paddingLeft: '5px' };
const sidebarStyle = { position: 'sticky' as const, top: '40px', height: 'fit-content', textAlign: 'center' as const };
const statGrid = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '40px' };
const statItem = { background: '#0a0a0a', padding: '15px 5px', border: '1px solid #111' };
const statLabel = { display: 'block', fontSize: '8px', color: '#333', marginBottom: '5px' };
const commitBtn = { width: '100%', padding: '25px', background: '#f39c12', color: '#000', border: 'none', fontWeight: '900', cursor: 'pointer', fontSize: '12px', letterSpacing: '1px' };

function getBeerColor(ebc: number) {
  if (ebc <= 8) return '#F5F75C';
  if (ebc <= 20) return '#C29321';
  if (ebc <= 40) return '#8D4C17';
  return '#1A0506';
}