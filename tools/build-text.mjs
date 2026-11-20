// Turns the practice text (.md) into the passages inside index.html.
// Run after editing the text:  node tools/build-text.mjs
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const mdFile = readdirSync(root).find((f) => f.endsWith('.md') && f !== 'README.md');
const source = readFileSync(join(root, mdFile), 'utf8');

// One entry per paragraph of the .md, in order. `splits` are the words each
// later passage of that section starts with; every passage is one Next press.
const sections = [
  { bo: 'དལ་འབྱོར་གྱི་མི་ལུས་རིན་ཆེན་བསམ་པ།' },
  { bo: 'འཆི་བ་དང་མི་རྟག་པར་བསམ་པ།' },
  { bo: 'ལས་རྒྱུ་འབྲས་ལ་བསམ་པ།' },
  { bo: 'འཁོར་བའི་ཉེས་དམིགས་བསམ་པ།' },
  { bo: 'སྐྱབས་འགྲོ།', splits: ['མདུན་དུ་རང་དང་མ་སོགས', 'ནམ་མཁའི་གནས་སུ་ནམ་མཁའ'] },
  { bo: 'ཚད་མེད་བཞི།' },
  { bo: 'སེམས་བསྐྱེད།' },
  { bo: 'འབྲས་བུའི་སེམས་བསྐྱེད།' },
  { bo: 'མཎ་ཌལ།' },
  {
    bo: 'རྡོ་རྗེ་སེམས་དཔའ།',
    splits: ['སྟོབས་བཞི་ཚང་པའི', 'ཐུན་མཐར། མགོན་པོ', 'ཞེས་གསོལ་བ་བཏབ་པས', 'མཐར། དགེ་བ་འདི་ཡིས'],
  },
  { bo: 'བླ་མའི་རྣལ་འབྱོར།', splits: ['ཧྰུྃ༔ ཨོ་རྒྱན་ཡུལ'] },
  {
    bo: 'ཡན་ལག་བདུན་པ།',
    splits: ['གསོལ་བ་གདབ་་པ་ནི', 'གཞན་ཡང་ཨོ་རྒྱན་ཆེན་པོ', 'ཐུན་མཐར་དབང་བཞི', 'སྐྱེ་བ་ཀུན་ཏུ'],
  },
];

const paragraphs = source.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
if (paragraphs.length !== sections.length) {
  throw new Error(`${paragraphs.length} paragraphs in the text, ${sections.length} sections listed`);
}

// A paragraph as runs of recited text and small-print notes (<sub>).
const toRuns = (paragraph) =>
  paragraph
    .split(/(<sub>.*?<\/sub>)/s)
    .map((part) => {
      const note = part.startsWith('<sub>');
      return { note, text: part.replace(/<\/?sub>/g, '') };
    })
    .filter((run) => run.text.trim());

// Cuts the runs wherever a split phrase begins; a phrase may span two runs.
function toPassages(runs, splits = []) {
  const plain = runs.map((r) => r.text).join('');
  const cuts = splits.map((s) => {
    const at = plain.indexOf(s);
    if (at < 0) throw new Error(`Split not found: ${s}`);
    return at;
  });
  const passages = [[]];
  let offset = 0;
  for (const run of runs) {
    let start = 0;
    const end = offset + run.text.length;
    for (const cut of cuts.filter((c) => c >= offset && c < end)) {
      const head = run.text.slice(start, cut - offset);
      if (head.trim()) passages.at(-1).push({ note: run.note, text: head });
      passages.push([]);
      start = cut - offset;
    }
    passages.at(-1).push({ note: run.note, text: run.text.slice(start) });
    offset = end;
  }
  return passages;
}

const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
// Each verse line ends at a shad or a terma mark; the mark stays on its line.
const toLines = (text) => text.match(/[^།༔]*(?:། *།|།|༔)\s*|[^།༔]+$/g).map((l) => l.trim()).filter(Boolean);

function runHtml(run) {
  if (run.note) return `<p class="note" lang="bo">${escape(run.text.trim())}</p>`;
  const lines = toLines(run.text).map((l) => `<span class="line">${escape(l)}</span>`);
  return `<p class="verse" lang="bo">${lines.join('')}</p>`;
}

let count = 0;
const recited = [];
const articles = paragraphs.flatMap((paragraph, s) => {
  const section = sections[s];
  return toPassages(toRuns(paragraph), section.splits).map((runs) => {
    recited.push(...runs.map((r) => r.text));
    count += 1;
    return [
      `<article class="passage" data-section="${s}">`,
      `<header class="passage__head"><h2 lang="bo">${section.bo}</h2></header>`,
      ...runs.map(runHtml),
      '</article>',
    ].join('\n');
  });
});

// The site must carry the text exactly: nothing lost, nothing added.
const bare = (s) => s.replace(/<\/?sub>/g, '').replace(/\s/g, '');
if (bare(recited.join('')) !== bare(source)) throw new Error('Passages differ from the source text');

const options = sections.map((s, i) => `<option value="${i}">${s.bo}</option>`);
const inject = (html, name, body) =>
  html.replace(new RegExp(`(<!-- ${name}:start -->)[\\s\\S]*?(<!-- ${name}:end -->)`), `$1\n${body}\n$2`);

const page = join(root, 'index.html');
let html = readFileSync(page, 'utf8');
html = inject(html, 'passages', articles.join('\n'));
html = inject(html, 'sections', options.join('\n'));
writeFileSync(page, html);
console.log(`${count} passages in ${sections.length} sections, text verified against ${mdFile}`);
