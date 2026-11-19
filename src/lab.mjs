import { course } from './course.mjs';
import { tutorials } from './walkthroughs.mjs';
import { references } from './references.mjs';

const $ = id => document.getElementById(id);
const source = $('source');
const file = $('file');
const terminal = $('terminal');
const shellOutput = $('shell-output');
const command = $('command');
const status = $('runtime-status');
const runButton = $('run');
const encoder = new TextEncoder();
let decoder = new TextDecoder();
const serialByte = new Uint8Array(1);
const defaults = new Map();
const edits = new Map();
const draftMessages = new Map();
const latestRuns = new Map();
const earlierRuns = new Map();
const key = 'linux-lab:' + course.slug + ':';
let lesson, activeFile, selection = 0, sourceError = '';
let vm, guestReady = false, resetting = false;
let activeRun, runNumber = 0, line = '', shellText = '';

function read(keyName) {
  try { return localStorage.getItem(key + keyName); } catch { return null; }
}
function save(keyName, value) {
  try { localStorage.setItem(key + keyName, value); return true; } catch { return false; }
}
function remove(keyName) {
  try { localStorage.removeItem(key + keyName); return true; } catch { return false; }
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

async function loadStarter(name) {
  if (defaults.has(name)) return;
  const response = await fetch(course.files[name]);
  if (!response.ok) throw Error('Could not load ' + name + '. Reload this page to try again.');
  defaults.set(name, await response.text());
}

function draftKey(name = activeFile) { return lesson.id + '/' + name; }
function draftOf(name = activeFile) {
  const keyName = draftKey(name);
  return edits.get(keyName) ?? read(keyName);
}
function valueOf() { return draftOf() ?? defaults.get(activeFile); }
function showDraftStatus() {
  const message = source.disabled ? undefined : draftMessages.get(draftKey());
  const notice = $('draft-status');
  if (notice.textContent !== (message?.text ?? '')) notice.textContent = message?.text ?? '';
  notice.hidden = !message;
  $('draft-backup').hidden = message?.saved !== false;
  const earlier = activeFile !== lesson.file;
  const changed = source.value !== defaults.get(activeFile);
  const draftNotice = $('draft-notice');
  draftNotice.hidden = source.disabled || (!changed && !earlier);
  setText(draftNotice, earlier ? `Run in Linux will use the earlier shared program in ${activeFile}. Open editor at the change to switch to ${lesson.file} for this lesson’s edit.` :
    'Run in Linux will use the draft in this lesson’s editor.');
  $('restore').hidden = source.disabled || (!changed && message?.saved !== false);
}
function positionSource(needle) {
  const scope = Math.max(0, source.value.indexOf(lesson.focus));
  const afterFocus = source.value.indexOf(needle, scope);
  const start = afterFocus >= 0 ? afterFocus : source.value.indexOf(needle);
  if (start < 0) return;
  source.setSelectionRange(start, start);
  const row = source.value.slice(0, start).split('\n').length;
  const lineHeight = parseFloat(getComputedStyle(source).lineHeight);
  source.scrollTop = Math.max(0, (row - 3) * lineHeight);
  source.scrollLeft = 0;
}
function showSource(name) {
  activeFile = name;
  file.value = name;
  $('source-name').textContent = name;
  const support = $('support-code');
  support.hidden = name !== lesson.file || !lesson.support;
  if (!support.hidden) support.href = './examples/' + lesson.support;
  source.value = valueOf() ?? '';
  source.scrollTop = 0;
  source.scrollLeft = 0;
  positionSource(lesson.focus);
}
$('edit-step').onclick = () => {
  if (!lesson || source.disabled) return;
  $('program').open = true;
  if (activeFile !== lesson.file) {
    showSource(lesson.file);
    showDraftStatus();
    showRun();
  }
  source.focus();
  const edit = tutorials[lesson.id].edit;
  positionSource(source.value.includes(edit) ? edit : lesson.focus);
};
$('program').addEventListener('toggle', () => {
  if (lesson && $('program').open && document.activeElement !== source) positionSource(lesson.focus);
});
file.onchange = () => {
  if (source.disabled) return;
  showSource(file.value);
  showDraftStatus();
  showRun();
};
source.oninput = () => {
  const draft = draftKey();
  edits.set(draft, source.value);
  const saved = save(draft, source.value);
  draftMessages.set(draft, {
    saved,
    text: saved ? 'Draft saved in this browser.' :
      'The browser could not save this edit. You can keep working in this tab and download the source before leaving.'
  });
  showDraftStatus();
  showRun();
};
$('restore').onclick = () => {
  if (!confirm(`Restore the starter source for ${activeFile}?`)) return;
  const draft = draftKey();
  const saved = remove(draft);
  if (saved) edits.delete(draft);
  else edits.set(draft, defaults.get(activeFile));
  draftMessages.set(draft, {
    saved,
    text: saved ? 'Starter source restored.' :
      'Starter source restored in this tab. The browser could not remove the saved draft, which may return when you reopen the lesson.'
  });
  showSource(activeFile);
  showDraftStatus();
  showRun();
  source.focus({ preventScroll: true });
};
$('download-source').onclick = () => {
  const url = URL.createObjectURL(new Blob([source.value], { type: 'text/plain' }));
  const link = document.createElement('a');
  link.download = activeFile;
  link.href = url;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
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

function showReferences(id) {
  $('lesson-references').open = false;
  $('reference-list').replaceChildren(...references[id].map(({ title, url, note }) => {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = title;
    const detail = document.createElement('p');
    detail.textContent = note;
    item.append(link, detail);
    return item;
  }));
}

async function showLesson(index) {
  lesson = course.lessons[index];
  activeFile = lesson.file;
  sourceError = '';
  const thisSelection = ++selection;
  const tutorial = tutorials[lesson.id];
  $('program').open = false;
  $('draft-notice').hidden = true;
  $('walkthrough').replaceChildren(...tutorial.steps.map(step => {
    const item = document.createElement('li');
    const title = document.createElement('h3');
    const description = document.createElement('p');
    const sample = document.createElement('pre');
    sample.tabIndex = 0;
    const code = document.createElement('code');
    title.textContent = step.heading;
    description.textContent = step.text;
    code.textContent = step.code;
    sample.append(code);
    item.append(title, description, sample);
    return item;
  }));
  document.title = lesson.title + ' · ' + course.title;
  for (const [id, field] of Object.entries({
    'lesson-title':'title', section:'section', intro:'intro', question:'question', evidence:'evidence',
    instructions:'instructions', task:'task', hint:'hint', explanation:'explanation',
    transfer:'transfer'
  })) $(id).textContent = lesson[field] ?? course[field] ?? '';
  const smaller = course.lessons.find(item => item.id === lesson.buildsOn);
  $('builds-on').hidden = !smaller;
  if (smaller) {
    $('builds-on-link').href = '#' + smaller.id;
    $('builds-on-link').textContent = smaller.title;
  }
  showReferences(lesson.id);
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
  $('edit-step').disabled = true;
  $('source-options').hidden = true;
  $('support-code').hidden = true;
  source.value = '';
  $('source-name').textContent = lesson.file;
  openComparison();
  showDraftStatus();
  showRun();
  const previous = lesson.previous?.file;
  const previousDraft = previous ? draftOf(previous) : null;
  const required = previousDraft == null ? [lesson.file] : [lesson.file, previous];
  try {
    await Promise.all(required.map(loadStarter));
  } catch (error) {
    if (selection === thisSelection) {
      sourceError = error.message;
      showRun();
    }
    return;
  }
  if (selection !== thisSelection) return;
  file.replaceChildren(new Option(lesson.file, lesson.file));
  const showArchive = previousDraft != null && (previousDraft !== defaults.get(previous) ||
    draftMessages.get(draftKey(previous))?.saved === false);
  if (showArchive) file.add(new Option('Earlier draft · ' + previous, previous));
  $('source-options').hidden = !showArchive;
  $('source-name').hidden = showArchive;
  showSource(lesson.file);
  source.disabled = false;
  $('edit-step').disabled = false;
  showDraftStatus();
  showRun();
}

function showRoute(moveFocus = false) {
  const index = course.lessons.findIndex(item => '#' + item.id === location.hash);
  const inLesson = index >= 0;
  const pickerFocused = document.activeElement === picker;
  $('overview').hidden = inLesson;
  $('overview-icon').hidden = inLesson;
  $('overview-link').hidden = !inLesson;
  $('lesson-navigation').hidden = !inLesson;
  $('workbench').hidden = !inLesson;
  if (inLesson) void showLesson(index);
  else {
    lesson = undefined;
    selection++;
    document.title = course.title;
  }
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
function setText(element, value) {
  if (element.textContent !== value) element.textContent = value;
}
function paint() {
  if (!repaint) repaint = requestAnimationFrame(() => {
    repaint = 0;
    showOutput();
  });
}
function output(element, text) {
  const nearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 40;
  setText(element, text.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, ''));
  if (nearBottom) element.scrollTop = element.scrollHeight;
}
function showOutput() {
  if (!lesson) return;
  const run = latestRuns.get(lesson.id);
  const liveLine = run && run === activeRun && run.capture ? line : '';
  output(terminal, run ? (run.text + liveLine || 'Waiting for Linux output…') :
    'Select Run in Linux to see output from this lesson.');
  output(shellOutput, shellText + (!activeRun ? line : '') || 'Linux is off.');
}
function openComparison() {
  const current = latestRuns.get(lesson.id);
  const earlier = earlierRuns.get(lesson.id);
  $('earlier-run').open = Boolean(earlier && current !== activeRun && (earlier.file !== current.file || earlier.code !== current.code));
}
function showRun() {
  if (!lesson) return;
  const run = latestRuns.get(lesson.id);
  const earlier = earlierRuns.get(lesson.id);
  const sourceLabel = $('result-source');
  sourceLabel.hidden = !run;
  if (run) {
    const kind = run.code === defaults.get(run.file) ? 'starter source' : 'edited source';
    const stale = run.file !== activeFile || run.code !== valueOf();
    setText(sourceLabel, `Run ${run.number} used ${kind} in ${run.file}.` +
      (stale ? ' The editor has changed. Select Run in Linux to use the current source.' : ''));
  }
  $('earlier-run').hidden = !earlier;
  if (earlier) {
    const kind = earlier.code === defaults.get(earlier.file) ? 'starter source' : 'edited source';
    setText($('earlier-run').querySelector('summary'), `Previous completed run ${earlier.number} · ${kind} in ${earlier.file}`);
    setText($('earlier-output'), earlier.text);
  }
  const busy = Boolean(activeRun || resetting);
  const message = resetting ? 'Resetting Linux…' : activeRun && activeRun !== run ?
    `A run is active in ${activeRun.lesson.title}.` : run?.message ?? (guestReady ? 'Linux is ready' : 'Linux is off');
  setText(status, sourceError || message);
  runButton.disabled = source.disabled;
  if (busy) runButton.setAttribute('aria-disabled', 'true');
  else runButton.removeAttribute('aria-disabled');
  const stopButton = $('stop');
  const canStop = activeRun && activeRun === run && (activeRun.controller || activeRun.submitted);
  if (!canStop && document.activeElement === stopButton) runButton.focus({ preventScroll: true });
  setText(stopButton, activeRun?.controller ? 'Cancel Linux startup' : 'Interrupt run');
  if (activeRun?.controller?.signal.aborted) stopButton.setAttribute('aria-disabled', 'true');
  else stopButton.removeAttribute('aria-disabled');
  stopButton.hidden = !canStop;
  const shellReady = guestReady && !busy;
  command.disabled = !shellReady;
  $('shell').querySelector('button').disabled = !shellReady;
  $('shell-stop').disabled = !shellReady;
  $('restart').disabled = !guestReady || resetting || Boolean(activeRun && !activeRun.submitted);
  showOutput();
}
function runMessage(run, message) {
  run.message = message;
  showRun();
}
function complete(run, message, completed = false) {
  run.completed = completed;
  activeRun = undefined;
  line = '';
  if (lesson === run.lesson) openComparison();
  runMessage(run, message);
}
function receive(byte) {
  const run = activeRun;
  if (byte === 10) {
    const completed = line;
    line = '';
    if (run && completed === run.startMarker) {
      run.capture = true;
    } else if (run && completed === run.programMarker) {
      run.program = true;
    } else if (run && completed.startsWith(run.resultMarker) && /^\d+$/.test(completed.slice(run.resultMarker.length))) {
      const exit = completed.slice(run.resultMarker.length);
      if (exit === '0') complete(run, 'Run completed', true);
      else if (run.interrupt && (exit === '130' || exit === '143')) complete(run, 'Run interrupted');
      else if (run.program) complete(run, 'Program exited with status ' + exit);
      else complete(run, 'Build failed with status ' + exit);
    } else if (run?.capture) {
      run.text = (run.text + completed + '\n').slice(-32000);
    } else if (!run) {
      shellText = (shellText + completed + '\n').slice(-16000);
    }
  } else if (byte === 8) {
    line = line.slice(0, -1);
  } else if (byte !== 13 && (byte >= 32 || byte === 9 || byte === 27)) {
    serialByte[0] = byte;
    line = (line + decoder.decode(serialByte, { stream: true })).slice(-5000);
    if (run?.interrupt && line === '~ # ') complete(run, 'Run interrupted');
  }
  paint();
}

async function initrd(run, signal) {
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
      if (percent !== progress && !signal.aborted) {
        progress = percent;
        runMessage(run, 'Loading Linux image · ' + progress + '%');
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

async function bootLinux(run) {
  const { signal } = run.controller;
  shellText = '';
  line = '';
  decoder = new TextDecoder();
  const [{ V86 }, image] = await Promise.all([import('./runtime/libv86.mjs'), initrd(run, signal)]);
  signal.throwIfAborted();
  runMessage(run, 'Booting Linux');
  vm = new V86({
    wasm_path: './runtime/v86.wasm',
    bios: { url: './runtime/seabios.bin' },
    vga_bios: { url: './runtime/vgabios.bin' },
    bzimage: { url: './runtime/vmlinuz-virt' },
    initrd: { buffer: image },
    cmdline: 'console=ttyS0,115200 rdinit=/init rootfstype=ramfs nokaslr panic=1 quiet',
    memory_size: 768 * 1024 * 1024, filesystem: {}, autostart: true,
    disable_keyboard: true, disable_mouse: true
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
      else if (recent.includes('LAB_READY') && recent.includes('~ # ')) finish();
    }
    signal.addEventListener('abort', cancel, { once: true });
    vm.add_listener('serial0-output-byte', receive);
    vm.add_listener('serial0-output-byte', listener);
  });
  guestReady = true;
}

runButton.onclick = async () => {
  if (!lesson || source.disabled || activeRun || resetting) return;
  const current = activeFile === lesson.previous?.file ? lesson.previous : lesson;
  const number = ++runNumber;
  const marker = '__LAB_RUN_' + number;
  const run = { lesson, file: current.file, number, code: valueOf(), text: '',
    startMarker: marker + '_START__', programMarker: marker + '_PROGRAM__', resultMarker: marker + '_EXIT__' };
  const earlier = latestRuns.get(lesson.id);
  if (earlier?.completed) earlierRuns.set(lesson.id, earlier);
  $('earlier-run').open = false;
  latestRuns.set(lesson.id, run);
  activeRun = run;
  terminal.scrollTop = 0;
  runMessage(run, guestReady ? 'Preparing source' : 'Loading Linux');
  try {
    if (!guestReady) {
      run.controller = new AbortController();
      showRun();
      await bootLinux(run);
      run.controller.signal.throwIfAborted();
      run.controller = undefined;
      showRun();
    }
    const prefix = 'run-' + number + '-';
    const uploaded = [current.file, ...(current.assets ?? [])];
    await vm.create_file(prefix + current.file, encoder.encode(run.code));
    for (const name of current.assets ?? []) {
      const response = await fetch('./examples/' + name);
      if (!response.ok) throw Error('Could not load ' + name);
      await vm.create_file(prefix + name, new Uint8Array(await response.arrayBuffer()));
    }
    const input = '/tmp/lesson-input/';
    const temporary = uploaded.map(name => '/exchange/' + prefix + name);
    const scriptName = '/exchange/' + prefix + 'exercise.sh';
    const setup = [
      'set -e',
      `trap 'rm -f ${temporary.join(' ')} ${scriptName}' EXIT`,
      'trap "exit 130" INT TERM',
      `printf '\n${run.startMarker}\n'`,
      'mkdir -p ' + input,
      ...uploaded.map((name, index) =>
        `cmp -s ${temporary[index]} ${input}${name} || cp ${temporary[index]} ${input}${name}`)
    ];
    const script = [...setup, current.prepare ?? course.prepare,
      `printf '\n${run.programMarker}\n'`, current.command].join('\n') + '\n';
    await vm.create_file(prefix + 'exercise.sh', encoder.encode(script));
    run.submitted = true;
    runMessage(run, 'Running in Linux');
    vm.serial0_send(`sh ${scriptName}; printf '\\n${run.resultMarker}%s\\n' "$?"\n`);
  } catch (error) {
    const cancelled = run.controller?.signal.aborted;
    run.controller?.abort();
    run.controller = undefined;
    if (vm) await vm.destroy().catch(() => {});
    vm = undefined;
    guestReady = false;
    run.text = cancelled ? 'Select Run in Linux to start the guest again.' : error.message;
    complete(run, cancelled ? 'Linux startup cancelled' : 'Could not start the run');
  }
};

$('stop').onclick = () => {
  const controller = activeRun?.controller;
  if (controller) {
    if (!controller.signal.aborted) {
      controller.abort();
      runMessage(activeRun, 'Cancelling Linux startup…');
    }
    return;
  }
  if (!vm || !activeRun?.submitted) return;
  activeRun.interrupt = true;
  runMessage(activeRun, 'Interrupt sent to Linux');
  vm.serial0_send('\x03');
};
$('shell-stop').onclick = () => vm?.serial0_send('\x03');
$('restart').onclick = async () => {
  if (!guestReady || resetting || !confirm('Reset Linux? This clears temporary guest files and keeps editor changes.')) return;
  resetting = true;
  if (activeRun) complete(activeRun, 'Run ended when Linux was reset');
  const old = vm;
  vm = undefined;
  guestReady = false;
  showRun();
  try {
    await old.destroy();
    shellText = 'Linux has been reset. Select Run in Linux to start it again.\n';
  } catch (error) {
    shellText = 'Could not finish resetting Linux: ' + error.message;
  } finally {
    line = '';
    resetting = false;
    showRun();
  }
};
$('shell').onsubmit = event => {
  event.preventDefault();
  if (!guestReady || activeRun || resetting || !command.value.trim()) return;
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
