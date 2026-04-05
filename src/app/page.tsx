"use client";

import { useState, useEffect } from "react";

/* ================= DESIGN SYSTEM ================= */
const COLORS = {
  bg: "#0A0A0A",
  card: "#141414",
  border: "#2A2A2A",

  text: "#F5F5F5",
  sub: "#A1A1A1",

  gold: "#D4AF37",
  goldSoft: "#D4AF3720",
  goldBorder: "#D4AF3740",
};

/* ================= TYPES ================= */
interface Malt { name: string; weight: number; }
interface Hop { name: string; weight: number; time: number; }
interface Recipe {
  id:number;
  name:string;
  volume:number;
  malts:Malt[];
  hops:Hop[];
  yeast:string;
}

/* ================= STEPS ================= */
const STEPS = [
  { key:"concassage", name:"Concassage", duration:0 },
  { key:"empatage", name:"Empâtage", duration:60 },
  { key:"mash_out", name:"Mash-out", duration:10 },
  { key:"rincage", name:"Rinçage", duration:0 },
  { key:"ebullition", name:"Ébullition", duration:60 },
  { key:"whirlpool", name:"Whirlpool", duration:15 },
  { key:"refroidissement", name:"Refroidissement", duration:0 },
  { key:"fermentation", name:"Fermentation", duration:10080 },
  { key:"sucrage", name:"Sucrage", duration:0 },
];

/* ================= APP ================= */
export default function Page(){

  const [recipes,setRecipes]=useState<Recipe[]>([]);
  const [selected,setSelected]=useState<Recipe|null>(null);
  const [view,setView]=useState<"home"|"create">("home");

  useEffect(()=>{
    setRecipes([
      {
        id:1,
        name:"IPA Citra",
        volume:20,
        malts:[
          {name:"Pale Ale",weight:5},
          {name:"Munich",weight:1}
        ],
        hops:[
          {name:"Citra",weight:50,time:60},
          {name:"Citra",weight:30,time:10}
        ],
        yeast:"US-05"
      }
    ]);
  },[]);

  if(selected) return <Process recipe={selected} onBack={()=>setSelected(null)}/>

  return(
    <div style={{background:COLORS.bg}} className="min-h-screen text-white p-6">

      {/* HOME */}
      {view==="home" && (
        <div className="space-y-6">

          <h1 className="text-4xl font-black" style={{color:COLORS.gold}}>
            BrewPro
          </h1>

          {recipes.map(r=>(
            <div key={r.id}
              onClick={()=>setSelected(r)}
              className="p-5 rounded-2xl cursor-pointer"
              style={{
                background:COLORS.card,
                border:`1px solid ${COLORS.border}`
              }}>
              <div className="font-bold">{r.name}</div>
              <div className="text-xs" style={{color:COLORS.sub}}>
                {r.volume}L
              </div>
            </div>
          ))}

          <button
            onClick={()=>setView("create")}
            className="w-full p-5 rounded-xl"
            style={{background:COLORS.gold,color:"#000"}}
          >
            Nouvelle recette
          </button>

        </div>
      )}

      {/* CREATE */}
      {view==="create" && (
        <Create onBack={()=>setView("home")} onSave={(r)=>{
          setRecipes([...recipes,r]);
          setView("home");
        }}/>
      )}

    </div>
  );
}

/* ================= CREATE ================= */
function Create({onBack,onSave}:{onBack:()=>void,onSave:(r:Recipe)=>void}){

  const [name,setName]=useState("");
  const [volume,setVolume]=useState(20);

  return(
    <div className="space-y-6">

      <button onClick={onBack}>←</button>

      <input
        placeholder="Nom recette"
        value={name}
        onChange={e=>setName(e.target.value)}
        className="w-full p-4 rounded-xl bg-white/5"
      />

      <input
        type="number"
        value={volume}
        onChange={e=>setVolume(Number(e.target.value))}
        className="w-full p-4 rounded-xl bg-white/5"
      />

      <button
        onClick={()=>onSave({
          id:Date.now(),
          name,
          volume,
          malts:[{name:"Pilsner",weight:5}],
          hops:[{name:"Cascade",weight:40,time:60}],
          yeast:"US-05"
        })}
        className="w-full p-5 rounded-xl"
        style={{background:COLORS.gold,color:"#000"}}
      >
        Créer
      </button>

    </div>
  );
}

/* ================= PROCESS ================= */
function Process({recipe,onBack}:{recipe:Recipe,onBack:()=>void}){

  const [step,setStep]=useState(0);
  const [time,setTime]=useState(STEPS[0].duration*60);
  const [run,setRun]=useState(false);

  useEffect(()=>{
    setTime(STEPS[step].duration*60);
    setRun(false);
  },[step]);

  useEffect(()=>{
    if(!run) return;
    const i=setInterval(()=>setTime(t=>t>0?t-1:0),1000);
    return ()=>clearInterval(i);
  },[run]);

  return(
    <div style={{background:COLORS.bg}} className="min-h-screen text-white p-6 overflow-x-hidden">

      {/* HEADER */}
      <div className="flex justify-between mb-6">
        <button onClick={onBack}>←</button>
        <div style={{color:COLORS.gold}}>{recipe.name}</div>
      </div>

      {/* CAROUSEL */}
      <div className="flex gap-8 overflow-x-auto py-6 snap-x snap-mandatory">

        {STEPS.map((s,i)=>{
          const active=i===step;
          const done=i<step;

          return(
            <div key={i}
              onClick={()=>setStep(i)}
              className="snap-center flex flex-col items-center flex-shrink-0 cursor-pointer">

              <div
                style={{
                  width: active?120:90,
                  height: active?120:90,
                  background: active?COLORS.goldSoft:done?"#1F1A12":COLORS.card,
                  border:`1px solid ${
                    active?COLORS.gold:done?COLORS.goldBorder:COLORS.border
                  }`,
                  borderRadius:28,
                  display:"flex",
                  alignItems:"center",
                  justifyContent:"center",
                  transform: active?"scale(1.1)":"scale(0.9)",
                  transition:"all 0.4s cubic-bezier(0.22,1,0.36,1)",
                  boxShadow: active?"0 10px 40px rgba(212,175,55,0.4)":"none"
                }}
              >
                <img
                  src={`/brewpro/icons/${s.key}.png`}
                  style={{
                    width: active?64:42,
                    height: active?64:42
                  }}
                />
              </div>

              <span
                className="mt-2 text-xs"
                style={{color:active?COLORS.gold:COLORS.sub}}
              >
                {s.name}
              </span>

            </div>
          )
        })}

      </div>

      {/* STEP CARD */}
      <div
        className="p-5 rounded-2xl mb-6"
        style={{
          background:COLORS.card,
          border:`1px solid ${COLORS.goldBorder}`
        }}
      >

        <h2 className="text-xl font-bold mb-3">{STEPS[step].name}</h2>

        {/* MALTS */}
        <div className="mb-4">
          <div style={{color:COLORS.gold}} className="text-sm">Malts</div>
          {recipe.malts.map((m,i)=>(
            <div key={i}>{m.name} : {m.weight} kg</div>
          ))}
        </div>

        {/* HOPS */}
        <div className="mb-4">
          <div style={{color:COLORS.gold}} className="text-sm">Houblons</div>
          {recipe.hops.map((h,i)=>(
            <div key={i}>{h.name} : {h.weight}g @ {h.time}min</div>
          ))}
        </div>

        {/* YEAST */}
        <div>
          <div style={{color:COLORS.gold}} className="text-sm">Levure</div>
          <div>{recipe.yeast}</div>
        </div>

      </div>

      {/* TIMER */}
      {STEPS[step].duration>0 && (
        <div className="text-center space-y-4">

          <div
            className="text-6xl font-mono"
            style={{color:COLORS.gold}}
          >
            {Math.floor(time/60)}:{(time%60).toString().padStart(2,"0")}
          </div>

          <div className="flex gap-3">
            <button
              onClick={()=>setRun(!run)}
              className="flex-1 p-3 rounded-xl"
              style={{background:COLORS.gold,color:"#000"}}
            >
              {run?"Stop":"Start"}
            </button>

            <button
              onClick={()=>setTime(STEPS[step].duration*60)}
              className="flex-1 p-3 rounded-xl bg-white/10"
            >
              RAZ
            </button>
          </div>

        </div>
      )}

      {/* NAV */}
      <div className="flex gap-4 mt-6">
        <button
          onClick={()=>setStep(s=>Math.max(0,s-1))}
          className="flex-1 p-4 rounded-xl bg-white/5"
        >
          Précédent
        </button>

        <button
          onClick={()=>setStep(s=>Math.min(STEPS.length-1,s+1))}
          className="flex-1 p-4 rounded-xl"
          style={{background:COLORS.gold,color:"#000"}}
        >
          Suivant
        </button>
      </div>

    </div>
  );
}