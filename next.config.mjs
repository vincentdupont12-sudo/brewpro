/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/brewpro', // Remplace par le nom EXACT de ton repo GitHub
  assetPrefix: '/brewpro', 
  images: {
    unoptimized: true, // Le mode Sudo pour les images
  },
  trailingSlash: true,
};

export default nextConfig;