/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // basePath: 如果仓库名不是 username.github.io，需要设置 basePath
  // 例如：如果仓库名是 "my-project"，设置为 basePath: '/my-project'
  // 如果仓库名是 "username.github.io"，但代码在子目录下，也需要设置 basePath
  // 如果仓库名是 "username.github.io" 且代码在根目录，则不需要设置（或设为空字符串）
  basePath: '/Recruitment_Evaluation_System',
  // Disable SWC to use Babel instead (more reliable in CI environments)
  swcMinify: false,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  env: {
    API_URL: process.env.API_URL || 'http://localhost:5001/api',
    NEXT_PUBLIC_GOOGLE_FORM_URL: process.env.NEXT_PUBLIC_GOOGLE_FORM_URL,
  },
}

module.exports = nextConfig

