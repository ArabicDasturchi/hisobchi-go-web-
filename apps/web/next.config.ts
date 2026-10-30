import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Umumiy hisob-kitob moduli (BigInt formulasi) TypeScript manba sifatida ulanadi
  transpilePackages: ['@hisobchi/core'],
  poweredByHeader: false,
  // Core paketi ESM uslubida './x.js' deb import qiladi (manba .ts). Turbopack buni hal qilmaydi,
  // shuning uchun dev/build webpack bilan (--webpack) va extensionAlias orqali ishlaydi.
  webpack: (config) => {
    config.resolve.extensionAlias = { '.js': ['.ts', '.tsx', '.js'] };
    return config;
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
        ],
      },
    ];
  },
};

export default nextConfig;
