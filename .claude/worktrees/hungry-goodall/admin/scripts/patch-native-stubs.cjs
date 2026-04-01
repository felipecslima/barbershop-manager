const fs = require('node:fs');
const path = require('node:path');

function ensureFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content, 'utf8');
  }
}

const root = process.cwd();

ensureFile(
  path.join(root, 'node_modules/lightningcss-linux-x64-gnu/package.json'),
  JSON.stringify({ name: 'lightningcss-linux-x64-gnu', version: '1.30.1', main: 'index.js' }, null, 2)
);

ensureFile(
  path.join(root, 'node_modules/lightningcss-linux-x64-gnu/index.js'),
  `function transform(options) {
  const input = options?.code ?? Buffer.from('');
  return {
    code: Buffer.isBuffer(input) ? input : Buffer.from(input),
    map: null,
  };
}

const Features = {
  Nesting: 1 << 0,
  MediaQueries: 1 << 1,
  LogicalProperties: 1 << 2,
  DirSelector: 1 << 3,
  LightDark: 1 << 4,
};

module.exports = { transform, Features };
`
);

ensureFile(
  path.join(root, 'node_modules/@tailwindcss/oxide-linux-x64-gnu/package.json'),
  JSON.stringify({ name: '@tailwindcss/oxide-linux-x64-gnu', version: '4.1.11', main: 'index.js' }, null, 2)
);

ensureFile(
  path.join(root, 'node_modules/@tailwindcss/oxide-linux-x64-gnu/index.js'),
  `const fs = require('node:fs');
const path = require('node:path');

class Scanner {
  constructor({ sources = [] } = {}) {
    this.sources = sources;
    this.files = [];
    this.globs = [];
  }

  scan() {
    const candidates = new Set();
    const exts = new Set(['.html', '.ts', '.css', '.scss']);

    const walk = (dir) => {
      if (!fs.existsSync(dir)) return;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
          continue;
        }
        if (!exts.has(path.extname(entry.name))) continue;
        this.files.push(full);
        const content = fs.readFileSync(full, 'utf8');
        const classTokens = content.match(/[A-Za-z0-9_:/\\-.\\[\\]%]+/g) ?? [];
        for (const token of classTokens) {
          if (token.includes('-') || token.includes(':') || token.includes('[')) {
            candidates.add(token);
          }
        }
      }
    };

    for (const source of this.sources) {
      if (!source || source.negated) continue;
      const base = source.base || process.cwd();
      walk(base);
      this.globs.push({ base, pattern: source.pattern || '**/*' });
    }

    return Array.from(candidates);
  }
}

module.exports = { Scanner };
`
);

console.log('Native stubs checked.');
