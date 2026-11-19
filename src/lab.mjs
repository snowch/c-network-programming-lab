import { course } from './course.mjs';

const $ = id => document.getElementById(id);
const source = $('source');
const file = $('file');
const terminal = $('terminal');
const command = $('command');
const status = $('runtime-status');
const encoder = new TextEncoder();
let decoder = new TextDecoder();
const serialByte = new Uint8Array(1);
const defaults = new Map();
const edits = new Map();
const files = Object.keys(course.files);
const key = 'linux-lab:' + course.slug + ':';
let lesson, activeFile, selection = 0;
let vm, boot, bootController, running = false, line = '', terminalText = '';
let runNumber = 0, resultMarker = '';

function read(keyName) {
  try { return localStorage.getItem(key + keyName); } catch { return null; }
}
function save(keyName, value) {
  try { localStorage.setItem(key + keyName, value); } catch { /* editor stays usable */ }
}
function remove(keyName) {
  try { localStorage.removeItem(key + keyName); } catch { /* storage unavailable */ }
}
function theme(value) {
  document.documentElement.dataset.theme = value;
  $('theme').textContent = value === 'dark' ? 'Light theme' : 'Dark theme';
}
theme(read('theme') ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
$('theme').onclick = () => {
  const value = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  theme(value);
  save('theme', value);
};

const starterFiles = Promise.all(files.map(async name => {
  const response = await fetch(course.files[name]);
  if (!response.ok) throw Error('Could not load ' + name);
  defaults.set(name, await response.text());
})).then(() => true).catch(error => {
  status.textContent = error.message;
  return false;
});

function draftKey(name) { return lesson.id + '/' + name; }
function valueOf(name) {
  const draft = draftKey(name);
  return edits.get(draft) ?? read(draft) ?? defaults.get(name);
}
function showSource(name) {
  activeFile = name;
  file.value = name;
  source.value = valueOf(name) ?? '';
  source.scrollTop = 0;
  source.scrollLeft = 0;
  const needle = lesson.focus;
  if (needle && name === lesson.file) {
    const start = source.value.indexOf(needle);
    if (start >= 0) {
      source.setSelectionRange(start, start);
      const row = source.value.slice(0, start).split('\n').length;
      const lineHeight = parseFloat(getComputedStyle(source).lineHeight);
      source.scrollTop = Math.max(0, (row - 4) * lineHeight);
    }
  }
}
source.oninput = () => {
  const draft = draftKey(activeFile);
  edits.set(draft, source.value);
  save(draft, source.value);
};
file.onchange = () => showSource(file.value);
$('restore').onclick = () => {
  if (source.value !== defaults.get(activeFile) && !confirm('Restore the starter for this file in this lesson?')) return;
  const draft = draftKey(activeFile);
  edits.delete(draft);
  remove(draft);
  showSource(activeFile);
};

const picker = $('lesson-picker');
let group;
for (const item of course.lessons) {
  if (group?.label !== item.section) {
    group = document.createElement('optgroup');
    group.label = item.section;
    picker.append(group);
  }
  group.append(new Option(item.title, item.id));
}
picker.onchange = () => { location.hash = picker.value; };

async function showLesson(index) {
  lesson = course.lessons[index];
  const thisSelection = ++selection;
  document.title = lesson.title + ' · ' + course.title;
  for (const [id, field] of Object.entries({
    'lesson-title':'title', section:'section', intro:'intro', question:'question',
    instructions:'instructions', task:'task', hint:'hint', explanation:'explanation',
    transfer:'transfer'
  })) $(id).textContent = lesson[field] ?? course[field];
  const reference = $('reference');
  reference.href = lesson.reference[1];
  reference.textContent = lesson.reference[0];
  picker.value = lesson.id;
  $('next-lesson').replaceChildren();
  for (const [other, label] of [[course.lessons[index - 1], 'Previous'], [course.lessons[index + 1], 'Next']]) {
    if (!other) continue;
    const link = document.createElement('a');
    link.href = '#' + other.id;
    link.textContent = label + ' · ' + other.title;
    $('next-lesson').append(link);
  }
  source.disabled = true;
  $('run').disabled = true;
  if (await starterFiles && selection === thisSelection) {
    file.replaceChildren(new Option(lesson.file, lesson.file));
    showSource(lesson.file);
    source.disabled = false;
    $('run').disabled = running;
  }
}
function showRoute(moveFocus = false) {
  const index = course.lessons.findIndex(item => '#' + item.id === location.hash);
  const inLesson = index >= 0;
  const pickerFocused = document.activeElement === picker;
  $('overview').hidden = inLesson;
  $('lesson-navigation').hidden = !inLesson;
  $('workbench').hidden = !inLesson;
  if (inLesson) void showLesson(index);
  else document.title = course.title;
  if (moveFocus) {
    if (!inLesson || !pickerFocused)
      $(inLesson ? 'lesson-title' : 'overview-title').focus({preventScroll: true});
    $('main').scrollIntoView();
  }
}
document.querySelector('.skip-link').onclick = event => {
  event.preventDefault();
  $('main').focus();
};
addEventListener('hashchange', () => {
  if (location.hash !== '#main') showRoute(true);
});
showRoute();

let repaint = 0;
function paint() {
  if (repaint) return;
  repaint = requestAnimationFrame(() => {
    repaint = 0;
    const nearBottom = terminal.scrollHeight - terminal.scrollTop - terminal.clientHeight < 40;
    terminal.textContent = (terminalText + line).replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '');
    if (nearBottom) terminal.scrollTop = terminal.scrollHeight;
  });
}
function enableShell(enabled) {
  command.disabled = !enabled;
  $('shell').querySelector('button').disabled = !enabled;
}
function idle(message) {
  running = false;
  resultMarker = '';
  status.textContent = message;
  $('run').disabled = source.disabled;
  $('stop').disabled = !vm;
  enableShell(Boolean(vm));
}
function receive(byte) {
  if (byte === 10) {
    const completed = line.replace(/\r/g, '');
    if (resultMarker && completed.startsWith(resultMarker)) {
      const exit = completed.slice(resultMarker.length);
      if (/^\d+$/.test(exit)) {
        idle(exit === '0' ? 'Run finished' : 'Run exited with status ' + exit);
        line = '';
        paint();
        return;
      }
    }
    terminalText = (terminalText + completed + '\n').slice(-32000);
    line = '';
  } else if (byte === 8) {
    line = line.slice(0, -1);
  } else if (byte !== 13 && (byte >= 32 || byte === 9 || byte === 27)) {
    serialByte[0] = byte;
    line = (line + decoder.decode(serialByte, { stream: true })).slice(-5000);
  }
  paint();
}

async function initrd(signal) {
  const response = await fetch('./runtime/parts.json', { signal });
  if (!response.ok) throw Error('Could not open the Linux guest manifest');
  const { parts, bytes } = await response.json();
  const image = new Uint8Array(bytes);
  // The image builder writes fixed 16 MiB parts, with a shorter final part.
  // Stream into the final buffer so overlapping requests do not duplicate the image.
  const partSize = 16 * 1024 * 1024;
  if (parts.length !== Math.ceil(bytes / partSize)) throw Error('Invalid Linux guest manifest');
  let loaded = 0, progress = -1;
  async function loadPart(name, index) {
    const start = index * partSize;
    const end = Math.min(start + partSize, bytes);
    let offset = start;
    const part = await fetch('./runtime/' + name, { signal });
    if (!part.ok) throw Error('Could not load Linux guest file ' + name);
    function append(chunk) {
      if (offset + chunk.length > end) throw Error('Invalid Linux guest file ' + name);
      image.set(chunk, offset);
      offset += chunk.length;
      loaded += chunk.length;
      const percent = Math.floor(100 * loaded / bytes);
      if (percent !== progress) {
        progress = percent;
        status.textContent = 'Loading Linux image · ' + progress + '%';
      }
    }
    if (part.body?.getReader) {
      const reader = part.body.getReader();
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          append(value);
        }
      } finally {
        reader.releaseLock();
      }
    } else {
      append(new Uint8Array(await part.arrayBuffer()));
    }
    if (offset !== end) throw Error('Incomplete Linux guest file ' + name);
  }
  const batchSize = 3;
  for (let index = 0; index < parts.length; index += batchSize) {
    await Promise.all(parts.slice(index, index + batchSize).map((name, offset) =>
      loadPart(name, index + offset)));
  }
  return image.buffer;
}

async function bootLinux(signal) {
  terminalText = 'Booting the local Linux guest…\n';
  line = '';
  decoder = new TextDecoder();
  paint();
  const [{ V86 }, image] = await Promise.all([import('./runtime/libv86.mjs'), initrd(signal)]);
  if (signal.aborted) throw signal.reason;
  status.textContent = 'Booting Linux';
  vm = new V86({
    wasm_path: './runtime/v86.wasm',
    bios: { url: './runtime/seabios.bin' },
    vga_bios: { url: './runtime/vgabios.bin' },
    bzimage: { url: './runtime/vmlinuz-virt' },
    initrd: { buffer: image },
    cmdline: 'console=ttyS0,115200 rdinit=/init rootfstype=ramfs nokaslr panic=1 quiet',
    memory_size: 768 * 1024 * 1024, filesystem: {}, autostart: true
  });
  await new Promise((resolve, reject) => {
    let recent = '';
    const timeout = setTimeout(() => finish(new Error('Linux did not reach its shell. Try running again.')), 300000);
    const cancel = () => finish(signal.reason);
    function finish(error) {
      clearTimeout(timeout);
      signal.removeEventListener('abort', cancel);
      vm.remove_listener('serial0-output-byte', listener);
      if (error) reject(error); else resolve();
    }
    function listener(byte) {
      recent = (recent + String.fromCharCode(byte)).slice(-200);
      if (recent.includes('LAB_EXCHANGE_FAILED')) finish(Error('Linux could not mount the editor file share.'));
      if (recent.includes('LAB_READY') && recent.includes('~ # ')) finish();
    }
    signal.addEventListener('abort', cancel, { once: true });
    vm.add_listener('serial0-output-byte', receive);
    vm.add_listener('serial0-output-byte', listener);
  });
  enableShell(true);
  $('restart').disabled = false;
}

$('run').onclick = async () => {
  if (running) return;
  status.textContent = 'Preparing source';
  const current = lesson;
  const code = encoder.encode(valueOf(current.file));
  const prefix = 'run-' + (++runNumber) + '-';
  const marker = '__LAB_RESULT_' + runNumber + '__';
  running = true;
  $('run').disabled = true;
  $('restart').disabled = true;
  enableShell(false);
  try {
    if (!boot) {
      status.textContent = 'Loading Linux';
      bootController = new AbortController();
      $('stop').disabled = false;
      boot = bootLinux(bootController.signal);
    }
    await boot;
    if (bootController?.signal.aborted) throw bootController.signal.reason;
    bootController = undefined;
    $('stop').disabled = true;
    $('restart').disabled = true;
    enableShell(false);
    const uploaded = [current.file, ...(current.assets ?? [])];
    await vm.create_file(prefix + current.file, code);
    for (const name of current.assets ?? []) {
      const response = await fetch('./examples/' + name);
      if (!response.ok) throw Error('Could not load ' + name);
      await vm.create_file(prefix + name, new Uint8Array(await response.arrayBuffer()));
    }
    resultMarker = marker;
    const input = '/tmp/lesson-input/';
    const temporary = uploaded.map(name => '/exchange/' + prefix + name);
    const scriptName = '/exchange/' + prefix + 'exercise.sh';
    const setup = [
      'set -e',
      `trap 'rm -f ${temporary.join(' ')} ${scriptName}' EXIT`,
      'trap "exit 130" INT TERM',
      'mkdir -p ' + input,
      ...uploaded.map((name, index) =>
        `cmp -s ${temporary[index]} ${input}${name} || cp ${temporary[index]} ${input}${name}`)
    ];
    const script = [...setup, current.prepare ?? course.prepare, current.command].join('\n') + '\n';
    await vm.create_file(prefix + 'exercise.sh', encoder.encode(script));
    terminalText = '';
    line = '';
    terminal.scrollTop = 0;
    status.textContent = 'Running in Linux';
    $('stop').disabled = false;
    $('restart').disabled = false;
    vm.serial0_send(`sh ${scriptName}; printf '\\n${marker}%s\\n' "$?"\n`);
  } catch (error) {
    const cancelled = bootController?.signal.aborted;
    bootController?.abort();
    bootController = undefined;
    if (vm) await vm.destroy().catch(() => {});
    vm = undefined;
    boot = undefined;
    $('restart').disabled = true;
    enableShell(false);
    idle(cancelled ? 'Linux startup stopped. Run again to restart.' : error.message);
    $('stop').disabled = true;
  }
};

$('stop').onclick = () => {
  if (bootController) {
    $('stop').disabled = true;
    bootController.abort();
    return;
  }
  if (!vm) return;
  vm.serial0_send('\x03');
  if (running) status.textContent = 'Interrupt sent to Linux';
};
$('restart').onclick = async () => {
  if (!vm || !confirm('Reset Linux and discard its temporary files? Editor changes are kept.')) return;
  $('restart').disabled = true;
  $('run').disabled = true;
  $('stop').disabled = true;
  running = true;
  enableShell(false);
  const old = vm;
  vm = undefined;
  boot = undefined;
  resultMarker = '';
  await old.destroy();
  terminalText = 'Linux has been reset. Run the experiment to start again.\n';
  line = '';
  paint();
  idle('Linux is off');
  $('stop').disabled = true;
};
$('shell').onsubmit = event => {
  event.preventDefault();
  if (!vm || running || !command.value.trim()) return;
  vm.serial0_send(command.value + '\n');
  command.value = '';
};

const offline = $('offline');
const offlineStatus = $('offline-status');
function showOffline(message) {
  offlineStatus.textContent = message;
  offlineStatus.hidden = !message;
}
function ask(worker, type, handle) {
  const channel = new MessageChannel();
  channel.port1.onmessage = event => {
    handle(event.data);
    if (event.data.done) channel.port1.close();
  };
  worker.postMessage(type, [channel.port2]);
}
offline.disabled = true;
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./offline.js').then(async () => {
    const registration = await navigator.serviceWorker.ready;
    const worker = registration.active;
    ask(worker, 'status', result => {
      offline.disabled = result.saved;
      if (result.saved) {
        offline.textContent = 'Available offline';
        showOffline('This course and its Linux guest are saved on this device.');
      }
    });
    offline.onclick = async () => {
      offline.disabled = true;
      showOffline('Preparing the offline download…');
      try { await navigator.storage?.persist?.(); } catch { /* browser chooses */ }
      ask(worker, 'download', result => {
        showOffline(result.message);
        if (!result.done) return;
        offline.disabled = result.saved;
        if (result.saved) offline.textContent = 'Available offline';
      });
    };
  }).catch(() => showOffline('Offline downloads are unavailable in this browser.'));
} else {
  showOffline('Offline downloads require a browser with service workers.');
}
