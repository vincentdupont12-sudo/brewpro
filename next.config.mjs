/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  // REMPLACE 'brewpro' par le nom EXACT de ton dépôt GitHub (majuscules incluses)
  basePath: '/brewpro', 
  assetPrefix: '/brewpro', 
  images: {
    unoptimized: true,
  },
};

export default nextConfig;