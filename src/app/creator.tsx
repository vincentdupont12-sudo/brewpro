import { useState, useEffect } from 'react';

// 1. On définit les types pour que TypeScript soit content
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

export default function Creator() {
  // 2. Initialisation avec les types
  const [recipe, setRecipe] = useState({ 
    malts: [] as Malt[], 
    volume: 20, 
    efficiency: 70 
  });
  
  const [stats, setStats] = useState<Stats>({ abv: 0, ebc: 0, ibu: 0 });

  const calculateStats = () => {
    if (recipe.malts.length === 0) {
        setStats({ abv: 0, ebc: 0, ibu: 0 });
        return;
    }

    // Calcul EBC (Morey)
    // MCU = (Weight_lbs * Color_SRM) / Volume_gal
    const volumeInGal = recipe.volume * 0.264172;
    let totalMCU = 0;
    
    recipe.malts.forEach(m => {
        const weightInLbs = m.qty * 2.20462;
        const srm = m.ebc * 0.508; // Conversion EBC vers SRM
        totalMCU += (weightInLbs * srm) / volumeInGal;
    });

    const srmResult = 1.4922 * Math.pow(totalMCU, 0.6859);
    const ebcResult = srmResult * 1.97;

    // Calcul ABV simplifié
    // Potentiel moyen : 1.036 par kg pour 20L à 100% efficacité
    let totalPoints = 0;
    recipe.malts.forEach(m => {
        totalPoints += (m.qty * 300 * (m.yield / 100) * (recipe.efficiency / 100));
    });
    
    const og = 1 + (totalPoints / recipe.volume) / 1000;
    const fg = 1 + (og - 1) * 0.25; // Atténuation standard de 75%
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

  // Fonction pour mettre à jour un malt spécifique
  const updateMalt = (index: number, field: keyof Malt, value: string | number) => {
    const newMalts = [...recipe.malts];
    newMalts[index] = { ...newMalts[index], [field]: value };
    setRecipe({ ...recipe, malts: newMalts });
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#121212', color: '#e0e0e0', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <header style={{ borderBottom: '1px solid #333', marginBottom: '20px', paddingBottom: '10px' }}>
        <h1 style={{ color: '#f39c12' }}>🧪 L'Alchimiste <span style={{fontSize: '0.5em', color: '#666'}}>v1.0</span></h1>
      </header>
      
      <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
        
        {/* CONFIGURATION */}
        <section style={{ flex: '1', minWidth: '300px' }}>
          <div style={{ marginBottom: '20px', background: '#1e1e1e', padding: '15px', borderRadius: '8px' }}>
            <label>Volume du brassin (L) : </label>
            <input 
                type="number" 
                value={recipe.volume} 
                onChange={(e) => setRecipe({...recipe, volume: parseFloat(e.target.value) || 0})}
                style={{ background: '#333', color: 'white', border: 'none', padding: '5px', borderRadius: '4px', width: '60px' }}
            />
          </div>

          <h3>Malts & Grains</h3>
          {recipe.malts.map((m, i) => (
            <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center', background: '#252525', padding: '10px', borderRadius: '5px' }}>
              <input 
                placeholder="Nom"
                value={m.name} 
                onChange={(e) => updateMalt(i, 'name', e.target.value)}
                style={{ flex: 2, background: '#333', color: 'white', border: '1px solid #444', padding: '5px' }}
              />
              <input 
                type="number" 
                placeholder="kg"
                value={m.qty} 
                onChange={(e) => updateMalt(i, 'qty', parseFloat(e.target.value) || 0)}
                style={{ width: '60px', background: '#333', color: 'white', border: '1px solid #444', padding: '5px' }}
              />
              <input 
                type="number" 
                placeholder="EBC"
                value={m.ebc} 
                onChange={(e) => updateMalt(i, 'ebc', parseFloat(e.target.value) || 0)}
                style={{ width: '60px', background: '#333', color: 'white', border: '1px solid #444', padding: '5px' }}
              />
            </div>
          ))}
          <button 
            onClick={() => setRecipe({...recipe, malts: [...recipe.malts, {name: '', qty: 0, ebc: 4, yield: 80}]})}
            style={{ background: '#f39c12', color: 'black', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            + Ajouter un grain
          </button>
        </section>

        {/* RENDU VISUEL */}
        <section style={{ flex: '1', minWidth: '300px', background: '#1e1e1e', padding: '30px', borderRadius: '15px', textAlign: 'center' }}>
          <h2 style={{marginTop: 0}}>Prédiction</h2>
          <div style={{ 
            width: '120px', height: '120px', borderRadius: '50% 50% 10% 10%', margin: '20px auto',
            backgroundColor: getBeerColor(stats.ebc), border: '4px solid #333',
            boxShadow: '0 0 20px rgba(0,0,0,0.5)'
          }} />
          <div style={{ fontSize: '1.2em', marginBottom: '10px' }}>
             Couleur : <span style={{color: '#f39c12'}}>{stats.ebc} EBC</span>
          </div>
          <div style={{ fontSize: '3em', fontWeight: 'bold', color: '#f39c12' }}>
            {stats.abv}% <span style={{fontSize: '0.3em', color: '#888'}}>ABV</span>
          </div>
        </section>

      </div>
    </div>
  );
}

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