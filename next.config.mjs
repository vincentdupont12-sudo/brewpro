/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/brewpro',
  assetPrefix: '/brewpro/', // Ajoute bien le slash ici
  images: {
    unoptimized: true,
  },
};
export default nextConfig;