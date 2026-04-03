/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  // On vire tout le reste pour laisser GitHub gérer
};
export default nextConfig;