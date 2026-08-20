/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: ['vm-8efhd2kzc65tob43we3uw0l3.vusercontent.net'],
  /** Browser calls `/api/*` on the Next host; forward to FastAPI when NEXT_PUBLIC_API_URL is unset (see lib/api.ts). */
  async rewrites() {
    const backend =
      process.env.BACKEND_PROXY_URL?.replace(/\/$/, '') || 'http://127.0.0.1:8000';
    return [{ source: '/api/:path*', destination: `${backend}/api/:path*` }];
  },
};

export default nextConfig;
