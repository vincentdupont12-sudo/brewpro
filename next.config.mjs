/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  // Très important : ajoute le nom de ton dépôt ici
  basePath: '/brewpro', 
  assetPrefix: '/brewpro', 
  images: {
    unoptimized: true,
  },
};

export default nextConfig;