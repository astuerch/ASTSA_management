/** @type {import('next').NextConfig} */
const nextConfig = {
  // Lascia che questi pacchetti vengano risolti come moduli Node.js a runtime
  // invece di essere bundleati da webpack.
  // Risolve i warning "Can't resolve 'iconv-lite'" provenienti da
  // pdfkit/fontkit (dipendenza transitiva di swissqrbill).
  serverExternalPackages: [
    '@react-pdf/renderer',
    'swissqrbill',
    'pdfkit',
    'fontkit',
    '@libsql/client',
    '@prisma/adapter-libsql',
    'libsql',
  ],
};

export default nextConfig;
