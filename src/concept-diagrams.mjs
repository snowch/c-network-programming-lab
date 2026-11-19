function element(tag, className, text) {
  const child = document.createElement(tag);
  if (className) child.className = className;
  if (text !== undefined) child.textContent = text;
  return child;
}

function card([label, detail], className = 'diagram-card') {
  const node = element('div', className);
  node.append(element('strong', '', label), element('span', '', detail));
  return node;
}

function connector(className = 'diagram-connector') {
  const arrow = element('span', className);
  arrow.setAttribute('aria-hidden', 'true');
  return arrow;
}

function orderedList(className) {
  const list = element('ol', className);
  list.setAttribute('role', 'list');
  return list;
}

function renderFlow(nodes) {
  const list = orderedList('diagram-flow');
  for (const step of nodes) {
    const item = element('li');
    item.append(card(step));
    list.append(item);
  }
  return list;
}

function renderSequence({ participants, messages }) {
  const [left, right] = participants;
  const sequence = element('div', 'diagram-sequence');
  const actors = element('div', 'sequence-actors');
  actors.append(element('strong', '', left), element('strong', '', right));
  const timeline = orderedList('sequence-timeline');

  for (const [direction, label, note] of messages) {
    const item = element('li', 'sequence-message sequence-' + direction);
    const description = element('div', 'sequence-label');
    const prefix = {
      right: `${left} to ${right}. `,
      left: `${right} to ${left}. `,
      'local-left': `At ${left}. `,
      'local-right': `At ${right}. `
    };
    description.append(element('span', 'diagram-sr', prefix[direction]), element('strong', '', label));
    if (note) description.append(element('span', 'sequence-note', note));
    item.append(description, connector('sequence-wire'));
    timeline.append(item);
  }
  sequence.append(actors, timeline);
  return sequence;
}

function renderState({ identity, before, action, after }) {
  const state = element('div', 'diagram-state');
  const change = element('div', 'state-change');
  const operation = element('div', 'state-operation');
  operation.append(element('span', 'diagram-operation', action), connector());
  change.append(card(before, 'diagram-card state-before'), operation, card(after, 'diagram-card state-after'));
  if (identity) state.append(element('div', 'state-identity', identity));
  state.append(change);
  return state;
}

function renderCompare({ cases }) {
  const comparison = element('div', 'diagram-compare');
  for (const { label, facts } of cases) {
    const panel = element('div', 'diagram-card comparison-panel');
    const rows = element('dl', 'diagram-fields');
    for (const [name, value] of facts) {
      const row = element('div');
      row.append(element('dt', '', name), element('dd', '', value));
      rows.append(row);
    }
    panel.append(element('strong', 'comparison-title', label), rows);
    comparison.append(panel);
  }
  return comparison;
}

function renderObject({ sources, target, field }) {
  const graph = element('div', 'diagram-object');
  const handles = element('div', 'object-handles');
  for (const source of sources) handles.append(card(source, 'diagram-card object-handle'));
  const object = card(target, 'diagram-card object-target');
  if (field) {
    const row = element('div', 'object-field');
    row.append(element('span', '', field[0]), element('strong', '', field[1]));
    object.append(row);
  }
  graph.append(handles, connector('object-join'), object);
  return graph;
}

function renderBytes({ bands, result }) {
  const bytes = element('div', 'diagram-bytes');
  const track = element('div', 'byte-track');
  track.style.gridTemplateColumns = bands.map(band =>
    `minmax(0, ${band.cells?.length ?? band.width}fr)`
  ).join(' ');

  for (const band of bands) {
    const group = element('div', `byte-group tone-${band.tone}`);
    const block = element('div', 'byte-block');
    if (band.cells) {
      block.style.gridTemplateColumns = `repeat(${band.cells.length}, minmax(0, 1fr))`;
      for (const value of band.cells) block.append(element('span', 'byte-cell', value));
    } else {
      block.append(element('span', 'byte-size', band.value));
    }
    group.append(element('strong', 'byte-heading', band.label), block);
    if (band.note) group.append(element('span', 'byte-note', band.note));
    track.append(group);
  }
  bytes.append(track);
  if (result) bytes.append(card(result, 'diagram-result'));
  return bytes;
}

function renderQueue({ writer, name, cells, reader, signal }) {
  const queue = element('div', 'diagram-queue');
  const path = element('div', 'queue-path');
  const buffer = element('div', 'diagram-card queue-buffer');
  const slots = element('div', 'queue-slots');
  for (const value of cells) {
    const slot = element('span', value === null ? 'queue-slot vacant' : 'queue-slot', value ?? '');
    if (value === null) slot.setAttribute('aria-label', 'Empty slot');
    slots.append(slot);
  }
  buffer.append(element('strong', '', name), slots);
  path.append(card(writer), connector(), buffer, connector(), card(reader));
  queue.append(path);
  if (signal) queue.append(card(signal, 'diagram-result queue-signal'));
  return queue;
}

function renderLayers({ layers, crossings }) {
  const stack = element('div', 'diagram-layers');
  for (const [index, layer] of layers.entries()) {
    const [area, label, detail] = layer;
    if (index) {
      const crossing = element('div', 'layer-crossing');
      crossing.append(connector(), element('span', 'diagram-operation', crossings[index - 1]));
      stack.append(crossing);
    }
    const panel = element('div', 'diagram-card layer-panel');
    panel.append(element('span', 'layer-area', area), card([label, detail], 'layer-detail'));
    stack.append(panel);
  }
  return stack;
}

const renderers = {
  sequence: renderSequence,
  state: renderState,
  compare: renderCompare,
  object: renderObject,
  bytes: renderBytes,
  queue: renderQueue,
  layers: renderLayers
};

export function showConcept(concept) {
  document.getElementById('concept-title').textContent = concept.title;
  document.getElementById('concept-caption').textContent = concept.caption;
  const drawing = document.getElementById('concept-diagram');
  drawing.replaceChildren(concept.visual
    ? renderers[concept.visual.kind](concept.visual)
    : renderFlow(concept.nodes));
}
