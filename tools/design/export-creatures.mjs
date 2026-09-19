import { readFile, writeFile } from 'node:fs/promises';
import vm from 'node:vm';
// Build-time only: the supplied vector generator runs without filesystem/network globals.
const source = await readFile(
  new URL('../../design/claude-source/creatures-v2.js', import.meta.url),
  'utf8',
);
const escape = (value) =>
  String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
const render = (tag, props, ...children) => {
  const attrs = Object.entries(props ?? {})
    .filter(([key]) => key !== 'style')
    .map(
      ([key, value]) =>
        `${key.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase()).replace('view-box', 'viewBox')}="${escape(value)}"`,
    )
    .join(' ');
  return `<${tag} ${tag === 'svg' ? 'xmlns="http://www.w3.org/2000/svg"' : ''} ${attrs}>${children.flat(Infinity).filter(Boolean).join('')}</${tag}>`;
};
const context = vm.createContext({ render });
vm.runInContext(
  source.replaceAll('export ', '') +
    '\n globalThis.assets = Object.fromEntries(Object.keys(SPECIES).map(key => [key, Object.fromEntries(["neutral","confident","defeated"].map(mood => [mood, draw(render,key,{mood})]))]));',
  context,
  { timeout: 2000 },
);
await writeFile(
  new URL('../../apps/mobile/src/creatures/art.json', import.meta.url),
  JSON.stringify(context.assets, null, 2) + '\n',
);
console.log('Exported six creatures × three poses from the v2 vector source.');
