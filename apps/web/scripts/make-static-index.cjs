const fs = require('fs');
const path = require('path');
const outDir = path.join(process.cwd(), 'dist', 'client');
const assetsDir = path.join(outDir, 'assets');
const assets = fs.readdirSync(assetsDir);
const js = assets.find((name) => /^index-.*\.js$/.test(name));
const css = assets.find((name) => /^index-.*\.css$/.test(name));
if (!js) throw new Error('No built index JS asset found');
const html = `<!doctype html>
<html lang="en" class="dark" style="color-scheme: dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="dark" />
    <meta name="theme-color" content="#1a1a1a" />
    <title>timeclock</title>
    <link rel="icon" href="/favicon.ico" sizes="any" />
    <link rel="icon" type="image/png" href="/favicon-32x32.png" sizes="32x32" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
    ${css ? `<link rel="stylesheet" crossorigin href="/assets/${css}" />` : ''}
    <script type="module" crossorigin src="/assets/${js}"></script>
  </head>
  <body><div id="root"></div></body>
</html>
`;
fs.writeFileSync(path.join(outDir, 'index.html'), html);
console.log(`wrote dist/client/index.html using ${js}`);
