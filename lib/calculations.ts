export const calcABV = (og: number, fg: number): number => {
  if (!og || !fg) return 0;
  return (og - fg) * 131.25;
};

export const calcEBC = (malts: { weight: number; ebc: number }[], volume: number): number => {
  if (volume <= 0) return 0;
  const totalMCU = malts.reduce((acc, m) => acc + (m.weight * m.ebc), 0) / volume;
  return 1.97 * (1.4922 * Math.pow(totalMCU, 0.6859));
};

export const calcIBU = (hops: { weight: number; aa: number; time: number }[], volume: number, og: number): number => {
  if (volume <= 0) return 0;
  return hops.reduce((acc, h) => {
    const bignessFactor = 1.65 * Math.pow(0.000125, og - 1);
    const timeFactor = (1 - Math.exp(-0.04 * h.time)) / 4.15;
    const utilization = bignessFactor * timeFactor;
    return acc + (h.weight * (h.aa / 100) * utilization * 1000) / volume;
  }, 0);
};

export const getEbcColor = (ebc: number): string => {
  if (ebc <= 4) return "#F3F99A"; 
  if (ebc <= 12) return "#F5B100";
  if (ebc <= 20) return "#E67E22";
  if (ebc <= 35) return "#BD3E03";
  if (ebc <= 50) return "#7E3301";
  return "#241103";
};