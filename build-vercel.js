import fs from 'fs';

// 1. Copy _shell.html to index.html
fs.copyFileSync('dist/client/_shell.html', 'dist/client/index.html');

// 2. Create .vercel/output/static
fs.mkdirSync('.vercel/output/static', { recursive: true });

// 3. Copy dist/client contents to .vercel/output/static
fs.cpSync('dist/client', '.vercel/output/static', { recursive: true });

// 4. Create .vercel/output/config.json for SPA routing
const config = {
  version: 3,
  routes: [
    {
      handle: "filesystem"
    },
    {
      src: "/(.*)",
      dest: "/index.html"
    }
  ]
};
fs.writeFileSync('.vercel/output/config.json', JSON.stringify(config, null, 2));

console.log("Vercel Build Output generated successfully.");
