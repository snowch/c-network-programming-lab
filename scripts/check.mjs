import {createHash} from 'node:crypto';
import {validateRelease} from '../src/release-contract.mjs';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { course } from '../content/course.mjs';
import { references } from '../dist/references.mjs';
import { concepts } from '../dist/concepts.mjs';

const hasText = value => typeof value === 'string' && Boolean(value.trim());
const pair = value => Array.isArray(value) && value.length === 2 && value.every(hasText);
const listOf = (value, minimum, valid) =>
  Array.isArray(value) && value.length >= minimum && value.every(valid);

function checkDiagram(concept, id) {
  assert(hasText(concept?.title) && hasText(concept.caption), id + ': concept explanation is required');
  const diagram = concept.visual;
  if (!diagram) {
    assert(listOf(concept.nodes, 2, pair), id + ': label each process stage');
    return;
  }
  const { kind } = diagram;
  let valid;
  switch (kind) {
    case 'sequence':
      valid = pair(diagram.participants) && listOf(diagram.messages, 2, ([direction, label, note]) =>
        ['left', 'right', 'local-left', 'local-right'].includes(direction) &&
        hasText(label) && (note === undefined || hasText(note)));
      break;
    case 'state':
      valid = hasText(diagram.identity) && pair(diagram.before) &&
        hasText(diagram.action) && pair(diagram.after);
      break;
    case 'compare':
      valid = diagram.cases?.length === 2 &&
        listOf(diagram.cases, 2, ({ label, facts }) => hasText(label) && listOf(facts, 1, pair));
      break;
    case 'object':
      valid = diagram.sources?.length === 2 && listOf(diagram.sources, 2, pair) &&
        pair(diagram.target) && (diagram.field === undefined || pair(diagram.field));
      break;
    case 'bytes':
      valid = listOf(diagram.bands, 2, ({ label, tone, cells, width, value, note }) =>
        hasText(label) && ['head', 'data', 'pending', 'discarded'].includes(tone) &&
        (cells ? listOf(cells, 1, hasText) : Number.isFinite(width) && width > 0 && hasText(value)) &&
        (note === undefined || hasText(note))) && (diagram.result === undefined || pair(diagram.result));
      break;
    case 'queue':
      valid = pair(diagram.writer) && pair(diagram.reader) && hasText(diagram.name) &&
        listOf(diagram.cells, 1, value => value === null || hasText(value)) &&
        (diagram.signal === undefined || pair(diagram.signal));
      break;
    case 'layers':
      valid = listOf(diagram.layers, 2, layer => layer.length === 3 && layer.every(hasText)) &&
        listOf(diagram.crossings, 1, hasText) && diagram.crossings.length === diagram.layers.length - 1;
      break;
  }
  assert(valid, id + ': invalid ' + kind + ' concept diagram');
}

const dist = new URL('../dist/', import.meta.url);
const release = validateRelease(JSON.parse(await readFile(new URL('release.json', dist), 'utf8')));
const offlinePaths = new Set(release.files.map(file => file.path));
for (const file of release.files) {
  const body = await readFile(new URL(file.path, dist));
  assert.equal(body.byteLength, file.bytes, file.path + ': recorded byte count');
  assert.equal(createHash('sha256').update(body).digest('hex'), file.sha256, file.path + ': recorded file hash');
}
const guest = JSON.parse(await readFile(new URL('runtime/parts.json', dist), 'utf8'));
let bytes = 0;
for (const name of guest.parts) {
  bytes += (await stat(new URL('runtime/' + name, dist))).size;
  assert(offlinePaths.has('runtime/' + name), name + ' must be saved offline');
}
assert.equal(bytes, guest.bytes);
for (const path of ['index.html', 'style.css', 'concept-diagrams.css', 'concept-diagrams.mjs',
  'lab.mjs', 'course.mjs', 'walkthroughs.mjs', 'references.mjs', 'concepts.mjs', 'runtime/libv86.mjs',
  'runtime/v86.wasm', 'runtime/vmlinuz-virt', 'runtime/parts.json',
  'runtime/seabios.bin', 'runtime/vgabios.bin', 'fonts/plex-sans.woff2', 'fonts/plex-mono-400.woff2'])
  assert(offlinePaths.has(path), path + ' must be saved offline');
for (const [name, url] of Object.entries(course.files)) {
  assert(offlinePaths.has(url.slice(2)), name + ' must be saved offline');
}
for (const image of ['cover.webp', 'favicon.ico', 'apple-touch-icon.png'])
  assert(offlinePaths.has(image), image + ' must be saved offline');
const html = await readFile(new URL('index.html', dist), 'utf8');
assert(html.includes('href="#' + course.lessons[0].id + '"'), 'overview links to the first lesson');
assert(!html.includes('{{'), 'overview placeholders must be rendered');
const ids = new Set();
for (const lesson of course.lessons) {
  assert(!ids.has(lesson.id), 'duplicate lesson ID');
  ids.add(lesson.id);
  checkDiagram(concepts[lesson.id], lesson.id);
  const entries = references[lesson.id];
  assert(Array.isArray(entries) && entries.length >= 2, lesson.id + ': expected API references');
  const urls = new Set();
  for (const { title, url, note } of entries) {
    assert(typeof title === 'string' && title.trim(), lesson.id + ': reference title');
    assert(typeof note === 'string' && note.trim(), lesson.id + ': offline reference note');
    assert.equal(new URL(url).protocol, 'https:', lesson.id + ': reference URL');
    assert(!urls.has(url), lesson.id + ': duplicate reference link: ' + url);
    urls.add(url);
  }
  for (const key of ['section', 'title', 'intro', 'question', 'evidence', 'task', 'hint', 'explanation', 'transfer', 'command'])
    assert(typeof lesson[key] === 'string' && lesson[key].trim(), lesson.id + ': ' + key);
  if (lesson.previous) {
    const archived = course.files[lesson.previous.file];
    assert(archived && offlinePaths.has(archived.slice(2)), lesson.id + ': earlier draft source must be saved offline');
  }
  for (const name of lesson.assets ?? []) {
    assert(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(name), 'invalid guest asset name');
    assert(offlinePaths.has('examples/' + name), name + ' must be saved offline');
  }
  const path = course.files[lesson.file];
  assert(path, lesson.id + ': active file must exist');
  assert(offlinePaths.has(path.slice(2)), lesson.id + ': starter must be saved offline');
  for (const prerequisite of lesson.buildsOn ?? [])
    assert(prerequisite !== lesson.id && ids.has(prerequisite), lesson.id + ': smaller example must come first');
  const source = await readFile(new URL(path, dist), 'utf8');
  assert(source.includes(lesson.focus), lesson.id + ': intended code must exist');
}
assert.equal(Object.keys(references).length, ids.size, 'one reference list per lesson');
assert.equal(Object.keys(concepts).length, ids.size, 'one concept diagram per lesson');
for (const [section, lessons] of Map.groupBy(course.lessons, lesson => lesson.section)) {
  if (section === 'Capstone' || section === 'Capstones') continue;
  const capstones = lessons.filter(lesson => lesson.sectionCapstone);
  assert.deepEqual(capstones, [lessons.at(-1)], section + ': close with a section capstone');
  const capstone = capstones[0];
  assert(capstone.buildsOn?.length, section + ': section capstone needs prerequisites');
  const earlier = new Set(lessons.slice(0, -1).map(lesson => lesson.id));
  for (const prerequisite of capstone.buildsOn)
    assert(earlier.has(prerequisite), section + ': prerequisites must come from this section');
}
console.log(`Checked ${ids.size} lessons and ${offlinePaths.size} offline assets`);
