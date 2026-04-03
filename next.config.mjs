/** @type {import('next').NextConfig} */
const nextConfig = {
  // Indique à Next.js de générer des fichiers statiques (obligatoire pour GitHub Pages)
  output: 'export',
  
  // Désactive l'optimisation d'image native (non supportée en export statique simple)
  images: {
    unoptimized: true,
  },

  // Configuration spécifique pour le sous-dossier GitHub
  basePath: '/brewpro',
  assetPrefix: '/brewpro',

  // AJOUT DE L'OPTION : Transforme /about en /about/ (crée un dossier about/index.html)
  trailingSlash: true,
};

export default nextConfig;