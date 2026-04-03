/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  // On ne met PAS de basePath pour l'instant pour tester la racine
};

export default nextConfig;