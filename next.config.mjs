/** @type {import('next').NextConfig} */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const packageJson = require('./package.json');

const nextConfig = {
  basePath: '/creatorclub',
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
  },
};

export default nextConfig;
