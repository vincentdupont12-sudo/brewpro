/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/brewpro',
  assetPrefix: '/brewpro/', 
  images: {
    unoptimized: true,
  },
  trailingSlash: true, // Crucial pour que l'index.html soit trouvé
};

export default nextConfig;