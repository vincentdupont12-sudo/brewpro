'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';

// --- BASES DE DONNÉES ---
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
  const [recipeName, setRecipeName] = useState("Ma Recette Secrète");
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

  // État pour les étapes d'action personnalisées (Côté "Pote")
  const [steps, setSteps] = useState([
    { id: 1, type: 'action', label: 'Pesée des grains et concassage', content: '' },
    { id: 2, type: 'action', label: 'Traitement de l\'eau (Ajout des sels)', content: '' },
  ]);
  
  const [stats, setStats] = useState({ abv: 0, ebc: 0, ibu: 0, ratio: 0, og: 1.000, fg: 1.000 });

  // --- CALCULS ---
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

  // --- ACTIONS SUR LA TIMELINE ---
  const addManualStep = () => {
    setSteps([...steps, { id: Date.now(), type: 'action', label: 'Nouvelle étape', content: '' }]);
  };

  const removeStep = (id: number) => {
    setSteps(steps.filter(s => s.id !== id));
  };

  // --- ENVOI VERS SUPABASE (Le pont Secret -> Pote) ---
  const startBatch = async () => {
    setLoading(true);
    
    // On fusionne tout pour l'interface "Pote"
    const batchData = {
      inventory: [
        ...recipe.malts.map(m => ({ item: m.name, qty: m.qty, unit: 'kg' })),
        ...recipe.hops.map(h => ({ item: h.name, qty: h.qty, unit: 'g' })),
        ...recipe.salts.map(s => ({ item: s.name, qty: s.qty, unit: 'g' }))
      ],
      // On combine tes actions manuelles et les paliers calculés
      timeline: [
        ...steps, // Tes actions (pesée, nettoyage...)
        { type: 'palier', label: 'Empâtage', temp: recipe.mashTemp, duration: 60 },
        { type: 'palier', label: 'Mash Out', temp: 78, duration: 10 },
        ...recipe.hops.sort((a,b) => b.time - a.time).map(h => ({
           type: 'action', label: `Ajout ${h.name}`, content: `${h.qty}g @ ${h.time}min`
        }))
      ],
      stats: stats
    };

    const { error } = await supabase.from('batches').insert([{ 
      recipe_name: recipeName, 
      status: 'Initialisé', 
      batch_data: batchData, 
      target_og: stats.og 
    }]);

    if (!error) alert("🚀 Envoyé au côté Pote !");
    setLoading(false);
  };

  return (
    <div style={{ padding: '30px', backgroundColor: '#0f0f0f', color: '#fff', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
      `}} />

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <header style={headerStyle}>
          <input value={recipeName} onChange={e => setRecipeName(e.target.value)} style={nameInputStyle} />
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.8rem', color: '#888' }}>ORIGINAL GRAVITY</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>OG: <span style={{ color: '#f39c12' }}>{stats.og}</span></div>
          </div>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '30px' }}>
          <section>
            {/* INGRÉDIENTS (Malts, Hops, Salts) - Comme avant mais avec les unités fixes */}
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
                    <input type="number" value={m.qty} onChange={e => {const n = [...recipe.malts]; n[i].qty = +e.target.value; setRecipe({...recipe, malts: n})}} style={inputStyle} />
                    <span style={unitStyle}>kg</span>
                  </div>
                  <button onClick={() => setRecipe({...recipe, malts: recipe.malts.filter((_, idx) => idx !== i)})} style={delBtn}>×</button>
                </div>
              ))}
              <button onClick={() => setRecipe({...recipe, malts: [...recipe.malts, {...MALT_DATABASE[0], qty: 0}]})} style={addButtonStyle}>+ Grain</button>
            </div>

            {/* SELS AVEC MÉMO pH/GOÛT */}
            <div style={{...cardStyle, borderLeft: '5px solid #3498db'}}>
              <h3 style={{marginTop:0, color:'#3498db'}}>💧 Sels Minéraux</h3>
              {recipe.salts.map((s, i) => (
                <div key={i} style={{marginBottom:'10px'}}>
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
                  <div style={memoBox}>✨ {s.influence} | 🧪 {s.ph_effect}</div>
                </div>
              ))}
              <button onClick={() => setRecipe({...recipe, salts: [...recipe.salts, {...SALT_DATABASE[0], qty: 0}]})} style={{...addButtonStyle, background:'#3498db'}}>+ Sel</button>
            </div>

            {/* --- NOUVELLE SECTION : TIMELINE D'ACTION --- */}
            <div style={{...cardStyle, borderLeft: '5px solid #9b59b6'}}>
              <h3 style={{marginTop:0, color:'#9b59b6'}}>🎬 Déroulé du Brassin (Côté Pote)</h3>
              <p style={{fontSize:'11px', color:'#666', marginBottom:'15px'}}>Ces étapes apparaîtront comme des tâches à cocher pour tes potes.</p>
              
              {steps.map((step, i) => (
                <div key={step.id} style={rowStyle}>
                  <span style={{fontSize:'1.2rem'}}>⚡</span>
                  <input 
                    style={{...inputStyle, flex: 3, textAlign: 'left'}} 
                    value={step.label}
                    onChange={(e) => {
                      const newSteps = [...steps];
                      newSteps[i].label = e.target.value;
                      setSteps(newSteps);
                    }}
                  />
                  <button onClick={() => removeStep(step.id)} style={delBtn}>×</button>
                </div>
              ))}
              <button onClick={addManualStep} style={{...addButtonStyle, background: '#9b59b6'}}>+ Ajouter une action (Nettoyage, etc.)</button>
            </div>
          </section>

          {/* SIDEBAR RÉSULTATS */}
          <section style={stickySidebar}>
             <div style={{ width: '80px', height: '110px', margin: '0 auto 20px', backgroundColor: getBeerColor(stats.ebc), borderRadius: '10px 10px 30px 30px', border: '4px solid #333' }} />
             <div style={{ fontSize: '3.2rem', fontWeight: '900', color: '#f39c12' }}>{stats.abv}%</div>
             <div style={{ display: 'flex', justifyContent: 'space-around', margin: '20px 0' }}>
                <div><div style={{fontSize:'1.5rem', color:'#27ae60'}}>{stats.ibu}</div><div>IBU</div></div>
                <div><div style={{fontSize:'1.5rem', color:'#3498db'}}>{stats.ratio}</div><div>BU/GU</div></div>
             </div>
             <button onClick={startBatch} disabled={loading} style={{...addButtonStyle, height:'60px'}}>
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
const unitInputWrapper = { position: 'relative' as const, display: 'flex', alignItems: 'center', width: '90px' };
const unitStyle = { position: 'absolute' as const, right: '8px', fontSize: '10px', color: '#666' };
const delBtn = { background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '1.2rem' };
const memoBox = { fontSize: '11px', background: '#000', padding: '6px', borderRadius: '6px', marginTop: '-5px', marginBottom: '10px', color: '#aaa' };
const addButtonStyle = { width: '100%', padding: '12px', background: '#f39c12', border: 'none', borderRadius: '8px', fontWeight: 'bold' as const, cursor: 'pointer', marginTop: '10px', color:'#000' };
const stickySidebar = { position: 'sticky' as const, top: '20px', height: 'fit-content', background: '#1a1a1a', padding: '25px', borderRadius: '15px', border: '2px solid #333', textAlign: 'center' as const };

function getBeerColor(ebc: number) {
  if (ebc <= 8) return '#F5F75C';
  if (ebc <= 20) return '#C29321';
  if (ebc <= 40) return '#8D4C17';
  return '#1A0506';
}