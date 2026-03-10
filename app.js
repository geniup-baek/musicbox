const STORAGE_KEY = "musicbox-songs-v1";
const DEFAULT_STEPS = 32;
const PITCHES = [
  "C6", "B5", "A5", "G5", "F5", "E5", "D5", "C5",
  "B4", "A4", "G4", "F4", "E4", "D4", "C4"
];

const NOTE_FREQ = {
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  G4: 392,
  A4: 440,
  B4: 493.88,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  F5: 698.46,
  G5: 783.99,
  A5: 880,
  B5: 987.77,
  C6: 1046.5
};

const LEGACY_VOICE_MAP = {
  sine: "musicbox",
  triangle: "musicbox",
  square: "bell",
  sawtooth: "warm"
};

const TIMBRE_PRESETS = {
  musicbox: {
    attack: 0.003,
    sustain: 0.22,
    tail: 2.1,
    overlapSteps: 0.4,
    releaseSteps: 0.7,
    highpass: 380,
    lowpass: 6000,
    partials: [
      { ratio: 1, gain: 0.92, decay: 1 },
      { ratio: 2.01, gain: 0.28, decay: 0.72 },
      { ratio: 4.05, gain: 0.14, decay: 0.54 },
      { ratio: 6.08, gain: 0.08, decay: 0.45 }
    ],
    hitNoise: 0.02
  },
  bell: {
    attack: 0.004,
    sustain: 0.25,
    tail: 2.5,
    overlapSteps: 0.5,
    releaseSteps: 0.9,
    highpass: 280,
    lowpass: 7200,
    partials: [
      { ratio: 1, gain: 0.82, decay: 1 },
      { ratio: 2.76, gain: 0.33, decay: 0.82 },
      { ratio: 4.1, gain: 0.22, decay: 0.65 },
      { ratio: 5.43, gain: 0.14, decay: 0.5 }
    ],
    hitNoise: 0.012
  },
  warm: {
    attack: 0.006,
    sustain: 0.2,
    tail: 1.6,
    overlapSteps: 0.35,
    releaseSteps: 0.6,
    highpass: 180,
    lowpass: 4200,
    partials: [
      { ratio: 1, gain: 0.9, decay: 1 },
      { ratio: 1.99, gain: 0.24, decay: 0.7 },
      { ratio: 2.98, gain: 0.12, decay: 0.55 }
    ],
    hitNoise: 0
  }
};

const playerSongSelect = document.getElementById("playerSongSelect");
const editorSongSelect = document.getElementById("editorSongSelect");
const tempoInput = document.getElementById("tempoInput");
const tempoValue = document.getElementById("tempoValue");
const sustainInput = document.getElementById("sustainInput");
const sustainValue = document.getElementById("sustainValue");
const voiceSelect = document.getElementById("voiceSelect");
const playBtn = document.getElementById("playBtn");
const stopBtn = document.getElementById("stopBtn");
const loopBtn = document.getElementById("loopBtn");
const nowPlaying = document.getElementById("nowPlaying");
const songSummary = document.getElementById("songSummary");

const noteLengthInput = document.getElementById("noteLengthInput");
const noteLengthValue = document.getElementById("noteLengthValue");
const stepCountInput = document.getElementById("stepCountInput");
const stepUnitSelect = document.getElementById("stepUnitSelect");
const resizeStepsBtn = document.getElementById("resizeStepsBtn");
const newSongBtn = document.getElementById("newSongBtn");
const renameSongBtn = document.getElementById("renameSongBtn");
const deleteSongBtn = document.getElementById("deleteSongBtn");
const rangeInfo = document.getElementById("rangeInfo");
const rangeMenu = document.getElementById("rangeMenu");
const doubleRangeBtn = document.getElementById("doubleRangeBtn");
const halfRangeBtn = document.getElementById("halfRangeBtn");
const cutRangeBtn = document.getElementById("cutRangeBtn");
const copyRangeBtn = document.getElementById("copyRangeBtn");
const pasteRangeBtn = document.getElementById("pasteRangeBtn");
const rollHeader = document.getElementById("rollHeader");
const roll = document.getElementById("roll");

const tabs = Array.from(document.querySelectorAll(".tab"));
const pages = Array.from(document.querySelectorAll(".page"));

let songs = normalizeSongs(loadSongs());
let selectedSongId = songs[0]?.id || null;
let noteLength = Number(noteLengthInput.value);
let isLoop = false;
let dragState = null;
let sustainStrength = 1;
let headerDragState = null;
let selectedRange = null;
let rangeClipboard = null;
let suppressCellClickUntil = 0;

const engine = createAudioEngine();

init();

function init() {
  bindEvents();
  renderSongSelects();
  syncSongSettingsToControls();
  renderRoll();
  updateSummary();
  registerServiceWorker();
}

function bindEvents() {
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => switchTab(tab.dataset.tab));
  });

  playerSongSelect.addEventListener("change", () => {
    selectedSongId = playerSongSelect.value;
    editorSongSelect.value = selectedSongId;
    syncSongSettingsToControls();
    renderRoll();
    updateSummary();
  });

  editorSongSelect.addEventListener("change", () => {
    selectedSongId = editorSongSelect.value;
    playerSongSelect.value = selectedSongId;
    syncSongSettingsToControls();
    renderRoll();
    updateSummary();
  });

  tempoInput.addEventListener("input", () => {
    tempoValue.textContent = tempoInput.value;
    const song = getSelectedSong();
    if (!song) return;
    song.tempo = Number(tempoInput.value);
    persistSongs();
    updateSummary();
  });

  sustainInput.addEventListener("input", () => {
    const song = getSelectedSong();
    if (!song) return;

    sustainStrength = Number(sustainInput.value) / 100;
    song.sustainStrength = sustainStrength;
    sustainInput.value = String(Math.round(sustainStrength * 100));
    sustainValue.textContent = `${Math.round(sustainStrength * 100)}%`;
    engine.setSustainStrength(sustainStrength);
    persistSongs();
    updateSummary();
  });

  voiceSelect.addEventListener("change", () => {
    const song = getSelectedSong();
    if (!song) return;
    song.voice = voiceSelect.value;
    persistSongs();
    updateSummary();
  });

  playBtn.addEventListener("click", () => {
    startPlayback();
  });

  stopBtn.addEventListener("click", () => {
    engine.stop();
    clearPlayingHighlight();
    nowPlaying.textContent = "정지됨";
  });

  loopBtn.addEventListener("click", () => {
    isLoop = !isLoop;
    loopBtn.setAttribute("aria-pressed", String(isLoop));
    loopBtn.textContent = `반복: ${isLoop ? "켜짐" : "꺼짐"}`;
  });

  noteLengthInput.addEventListener("input", () => {
    noteLength = Number(noteLengthInput.value);
    noteLengthValue.textContent = String(noteLength);
  });

  resizeStepsBtn.addEventListener("click", () => {
    const song = getSelectedSong();
    if (!song) return;
    const nextSteps = clamp(Number(stepCountInput.value), 8, 96);
    song.steps = nextSteps;
    song.notes = song.notes.filter((n) => n.start < nextSteps).map((n) => {
      const maxLength = Math.max(1, nextSteps - n.start);
      return { ...n, length: Math.min(n.length, maxLength) };
    });
    persistSongs();
    renderRoll();
    updateSummary();
  });

  stepUnitSelect.addEventListener("change", () => {
    const song = getSelectedSong();
    if (!song) return;
    song.beatPerStep = normalizeBeatPerStep(Number(stepUnitSelect.value));
    persistSongs();
    renderRoll();
    updateSummary();
  });

  newSongBtn.addEventListener("click", () => {
    const title = globalThis.prompt("새 곡 이름을 입력하세요", "새 오르골 곡");
    if (!title) return;
    const song = createSong(title.trim() || "새 오르골 곡");
    songs.push(song);
    selectedSongId = song.id;
    persistSongs();
    renderSongSelects();
    syncSongSettingsToControls();
    renderRoll();
    updateSummary();
  });

  renameSongBtn.addEventListener("click", () => {
    const song = getSelectedSong();
    if (!song) return;
    const next = globalThis.prompt("곡 이름 변경", song.title);
    if (!next) return;
    song.title = next.trim() || song.title;
    persistSongs();
    renderSongSelects();
    updateSummary();
  });

  deleteSongBtn.addEventListener("click", () => {
    if (songs.length <= 1) {
      globalThis.alert("최소 1개의 곡은 남겨두어야 합니다.");
      return;
    }
    const song = getSelectedSong();
    if (!song) return;
    const ok = globalThis.confirm(`'${song.title}' 곡을 삭제할까요?`);
    if (!ok) return;
    songs = songs.filter((s) => s.id !== song.id);
    selectedSongId = songs[0].id;
    persistSongs();
    renderSongSelects();
    syncSongSettingsToControls();
    renderRoll();
    updateSummary();
  });

  rollHeader.addEventListener("pointerdown", onHeaderPointerDown);
  document.addEventListener("pointermove", onHeaderPointerMove);
  document.addEventListener("pointerup", onHeaderPointerUp);

  doubleRangeBtn.addEventListener("click", onDoubleRange);
  halfRangeBtn.addEventListener("click", onHalfRange);
  cutRangeBtn.addEventListener("click", onCutRange);
  copyRangeBtn.addEventListener("click", onCopyRange);
  pasteRangeBtn.addEventListener("click", onPasteRange);

  document.addEventListener("pointermove", onGlobalPointerMove);
  document.addEventListener("pointerup", onGlobalPointerUp);
}

function switchTab(name) {
  tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === name));
  pages.forEach((page) => page.classList.toggle("active", page.id === name));
}

function startPlayback() {
  const song = getSelectedSong();
  if (!song) return;

  engine.play(song, {
    onStep: highlightPlayingStep,
    onEnd: () => {
      if (isLoop) {
        startPlayback();
      } else {
        clearPlayingHighlight();
        nowPlaying.textContent = "연주 종료";
      }
    }
  });

  nowPlaying.textContent = `재생 중: ${song.title}`;
}

function renderSongSelects() {
  const options = songs
    .map((song) => `<option value="${song.id}">${escapeHtml(song.title)}</option>`)
    .join("");

  playerSongSelect.innerHTML = options;
  editorSongSelect.innerHTML = options;

  if (!selectedSongId || !songs.some((s) => s.id === selectedSongId)) {
    selectedSongId = songs[0]?.id || null;
  }

  playerSongSelect.value = selectedSongId;
  editorSongSelect.value = selectedSongId;
}

function syncSongSettingsToControls() {
  const song = getSelectedSong();
  if (!song) return;

  sustainStrength = clamp(Number(song.sustainStrength) || 1, 0.5, 1.8);

  tempoInput.value = String(song.tempo);
  tempoValue.textContent = String(song.tempo);
  sustainInput.value = String(Math.round(sustainStrength * 100));
  sustainValue.textContent = `${Math.round(sustainStrength * 100)}%`;
  engine.setSustainStrength(sustainStrength);
  voiceSelect.value = song.voice;
  stepCountInput.value = String(song.steps);
  stepUnitSelect.value = String(song.beatPerStep);
  selectedRange = null;
  updateRangeMenuState();
}

function renderRoll() {
  const song = getSelectedSong();
  if (!song) return;

  roll.style.setProperty("--steps", String(song.steps));
  rollHeader.style.setProperty("--steps", String(song.steps));

  const headerCells = ["<div></div>"];
  const stepsPerBeat = Math.max(1, Math.round(1 / song.beatPerStep));
  const stepsPerMeasure = stepsPerBeat * 4;
  for (let i = 0; i < song.steps; i += 1) {
    const isSelected = selectedRange && i >= selectedRange.start && i <= selectedRange.end;
    const beatMarker = i % stepsPerBeat === 0 ? String((Math.floor(i / stepsPerBeat) % 4) + 1) : "·";
    const isBeatEnd = (i + 1) % stepsPerBeat === 0;
    const isMeasureEnd = (i + 1) % stepsPerMeasure === 0;
    headerCells.push(`<div class="tick${isSelected ? " selected" : ""}${isBeatEnd ? " beatEnd" : ""}${isMeasureEnd ? " measureEnd" : ""}" data-step="${i}">${beatMarker}</div>`);
  }
  rollHeader.innerHTML = headerCells.join("");

  const rowsHtml = PITCHES.map((pitch, rowIndex) => {
    const cells = [];
    for (let step = 0; step < song.steps; step += 1) {
      const isBeatEnd = (step + 1) % stepsPerBeat === 0;
      const isMeasureEnd = (step + 1) % stepsPerMeasure === 0;
      const cellClass = `cell${isBeatEnd ? " beatEnd" : ""}${isMeasureEnd ? " measureEnd" : ""}`;
      const note = findNote(song, rowIndex, step);
      if (note?.start === step) {
        const width = `calc(${note.length} * (100% + 1px) - 2px)`;
        cells.push(`<div class="${cellClass}" data-row="${rowIndex}" data-step="${step}"><div class="note" data-id="${note.id}" style="width:${width}"></div></div>`);
      } else {
        cells.push(`<div class="${cellClass}" data-row="${rowIndex}" data-step="${step}"></div>`);
      }
    }
    return `<div class="row"><div class="pitchLabel">${pitch}</div>${cells.join("")}</div>`;
  }).join("");

  roll.innerHTML = rowsHtml;

  roll.querySelectorAll(".cell").forEach((cell) => {
    cell.addEventListener("click", onCellClick);
  });

  roll.querySelectorAll(".note").forEach((noteEl) => {
    noteEl.addEventListener("pointerdown", onNotePointerDown);
  });
}

function onHeaderPointerDown(e) {
  const tick = e.target.closest(".tick");
  if (!tick) return;

  const song = getSelectedSong();
  if (!song) return;

  const step = Number(tick.dataset.step);
  if (!Number.isFinite(step)) return;

  e.preventDefault();
  headerDragState = { anchor: step, current: step };
  setRangeSelection(step, step);
}

function onHeaderPointerMove(e) {
  if (!headerDragState) return;

  const song = getSelectedSong();
  if (!song) return;

  const step = getHeaderStepFromClientX(e.clientX, song.steps);
  if (step === null) return;

  headerDragState.current = step;
  setRangeSelection(headerDragState.anchor, headerDragState.current);
}

function onHeaderPointerUp() {
  if (!headerDragState) return;
  headerDragState = null;
  updateRangeMenuState();
}

function getHeaderStepFromClientX(clientX, steps) {
  const firstTick = rollHeader.querySelector(".tick");
  if (!firstTick) return null;

  const firstTickRect = firstTick.getBoundingClientRect();
  const tickWidth = firstTickRect.width;
  const step = Math.floor((clientX - firstTickRect.left) / tickWidth);

  if (step < 0) return 0;
  if (step >= steps) return steps - 1;
  return step;
}

function setRangeSelection(a, b) {
  const song = getSelectedSong();
  if (!song) return;

  const start = clamp(Math.min(a, b), 0, song.steps - 1);
  const end = clamp(Math.max(a, b), 0, song.steps - 1);
  selectedRange = { start, end };
  renderRoll();
  updateRangeMenuState();
}

function clearRangeSelection() {
  selectedRange = null;
  renderRoll();
  updateRangeMenuState();
}

function updateRangeMenuState() {
  const hasRange = Boolean(selectedRange);
  rangeMenu.classList.toggle("hidden", !hasRange);
  pasteRangeBtn.disabled = !hasRange || !rangeClipboard;

  if (!hasRange) {
    rangeInfo.textContent = "헤더를 드래그해 범위를 선택하세요.";
    return;
  }

  const length = selectedRange.end - selectedRange.start + 1;
  rangeInfo.textContent = `선택 범위: ${selectedRange.start + 1}~${selectedRange.end + 1} (${length}스텝)`;
}

function getRangeLength(range) {
  return range.end - range.start + 1;
}

function getStartedNotesInRange(song, range) {
  return song.notes.filter((n) => n.start >= range.start && n.start <= range.end);
}

function normalizeSongNotes(song) {
  song.notes = song.notes
    .filter((n) => n.start >= 0 && n.start < song.steps)
    .map((n) => ({ ...n, length: Math.min(Math.max(1, n.length), song.steps - n.start) }));
}

function onDoubleRange() {
  const song = getSelectedSong();
  if (!song || !selectedRange) return;

  const rangeLen = getRangeLength(selectedRange);
  const targetEnd = Math.min(song.steps - 1, selectedRange.start + (rangeLen * 2) - 1);
  const targetLen = targetEnd - selectedRange.start + 1;

  const inside = getStartedNotesInRange(song, selectedRange);
  const outside = song.notes.filter((n) => n.start < selectedRange.start || n.start > selectedRange.end);

  const stretched = inside.map((n) => {
    const relStart = n.start - selectedRange.start;
    const nextStart = selectedRange.start + (relStart * 2);
    return {
      ...n,
      start: nextStart,
      length: Math.max(1, n.length * 2)
    };
  }).filter((n) => n.start <= targetEnd);

  const shiftBy = targetLen - rangeLen;
  const shiftedOutside = outside.map((n) => {
    if (n.start > selectedRange.end) {
      return { ...n, start: n.start + shiftBy };
    }
    return n;
  });

  song.notes = [...stretched, ...shiftedOutside];
  normalizeSongNotes(song);

  selectedRange = { start: selectedRange.start, end: targetEnd };
  persistSongs();
  renderRoll();
  updateSummary();
  updateRangeMenuState();
}

function onHalfRange() {
  const song = getSelectedSong();
  if (!song || !selectedRange) return;

  const rangeLen = getRangeLength(selectedRange);
  const targetLen = Math.max(1, Math.floor(rangeLen / 2));
  const targetEnd = selectedRange.start + targetLen - 1;

  const inside = getStartedNotesInRange(song, selectedRange);
  const outside = song.notes.filter((n) => n.start < selectedRange.start || n.start > selectedRange.end);

  const compressed = inside.map((n) => {
    const relStart = n.start - selectedRange.start;
    return {
      ...n,
      start: selectedRange.start + Math.floor(relStart / 2),
      length: Math.max(1, Math.ceil(n.length / 2))
    };
  }).filter((n) => n.start <= targetEnd);

  const shiftBy = rangeLen - targetLen;
  const shiftedOutside = outside.map((n) => {
    if (n.start > selectedRange.end) {
      return { ...n, start: n.start - shiftBy };
    }
    return n;
  });

  song.notes = [...compressed, ...shiftedOutside];
  normalizeSongNotes(song);

  selectedRange = { start: selectedRange.start, end: targetEnd };
  persistSongs();
  renderRoll();
  updateSummary();
  updateRangeMenuState();
}

function onCopyRange() {
  const song = getSelectedSong();
  if (!song || !selectedRange) return;

  const rangeLen = getRangeLength(selectedRange);
  const inside = getStartedNotesInRange(song, selectedRange);
  rangeClipboard = {
    length: rangeLen,
    notes: inside.map((n) => ({
      ...n,
      start: n.start - selectedRange.start
    }))
  };
  updateRangeMenuState();
}

function onCutRange() {
  const song = getSelectedSong();
  if (!song || !selectedRange) return;

  onCopyRange();

  const rangeLen = getRangeLength(selectedRange);
  song.notes = song.notes
    .filter((n) => n.start < selectedRange.start || n.start > selectedRange.end)
    .map((n) => {
      if (n.start > selectedRange.end) {
        return { ...n, start: n.start - rangeLen };
      }
      return n;
    });

  normalizeSongNotes(song);
  clearRangeSelection();
  persistSongs();
  updateSummary();
}

function onPasteRange() {
  const song = getSelectedSong();
  if (!song || !selectedRange || !rangeClipboard) return;

  const anchor = selectedRange.start;
  const available = song.steps - anchor;
  if (available <= 0) return;

  const pasteLen = Math.min(rangeClipboard.length, available);
  const targetEnd = anchor + pasteLen - 1;

  const remaining = song.notes.filter((n) => n.start < anchor || n.start > targetEnd);
  const pasted = rangeClipboard.notes
    .filter((n) => n.start < pasteLen)
    .map((n) => ({
      ...n,
      id: crypto.randomUUID(),
      start: anchor + n.start
    }));

  song.notes = [...remaining, ...pasted];
  normalizeSongNotes(song);

  selectedRange = { start: anchor, end: targetEnd };
  persistSongs();
  renderRoll();
  updateSummary();
  updateRangeMenuState();
}

function onCellClick(e) {
  if (performance.now() < suppressCellClickUntil) {
    return;
  }

  const song = getSelectedSong();
  if (!song) return;

  const cell = e.currentTarget;
  const row = Number(cell.dataset.row);
  const step = Number(cell.dataset.step);

  if (findNote(song, row, step)) {
    return;
  }

  const maxLength = Math.max(1, song.steps - step);
  const length = Math.min(noteLength, maxLength);

  song.notes.push({
    id: crypto.randomUUID(),
    row,
    start: step,
    length
  });

  persistSongs();
  renderRoll();
  updateSummary();
}

function onNotePointerDown(e) {
  e.stopPropagation();
  e.preventDefault();
  suppressCellClickUntil = performance.now() + 220;

  const song = getSelectedSong();
  if (!song) return;

  const noteId = e.currentTarget.dataset.id;
  const note = song.notes.find((n) => n.id === noteId);
  if (!note) return;

  dragState = {
    noteId,
    row: note.row,
    start: note.start,
    originalLength: note.length,
    previewLength: note.length,
    moved: false
  };
}

function onGlobalPointerMove(e) {
  if (!dragState) return;
  const song = getSelectedSong();
  if (!song) return;

  const step = getStepFromClientX(e.clientX, song.steps);
  if (step === null) return;

  const clampedStep = Math.max(dragState.start, step);
  const nextLength = clamp(clampedStep - dragState.start + 1, 1, song.steps - dragState.start);

  if (nextLength !== dragState.previewLength) {
    dragState.previewLength = nextLength;
    dragState.moved = true;
    const noteEl = roll.querySelector(`.note[data-id="${dragState.noteId}"]`);
    if (noteEl) {
      noteEl.style.width = noteWidthFromLength(nextLength);
    }
  }
}

function onGlobalPointerUp() {
  if (!dragState) return;
  const song = getSelectedSong();
  if (!song) {
    dragState = null;
    return;
  }

  if (dragState.moved) {
    song.notes = song.notes.map((n) => n.id === dragState.noteId
      ? { ...n, length: dragState.previewLength }
      : n);
  } else {
    song.notes = song.notes.filter((n) => n.id !== dragState.noteId);
  }

  dragState = null;
  persistSongs();
  renderRoll();
  updateSummary();
}

function getStepFromClientX(clientX, steps) {
  const firstRow = roll.querySelector(".row");
  if (!firstRow) return null;
  const labelEl = firstRow.querySelector(".pitchLabel");
  const cellEl = firstRow.querySelector(".cell");
  if (!labelEl || !cellEl) return null;

  const rollRect = roll.getBoundingClientRect();
  const labelWidth = labelEl.getBoundingClientRect().width;
  const cellWidth = cellEl.getBoundingClientRect().width;
  const xInsideGrid = clientX - rollRect.left - labelWidth;
  const step = Math.floor(xInsideGrid / cellWidth);

  if (step < 0) return 0;
  if (step >= steps) return steps - 1;
  return step;
}

function noteWidthFromLength(length) {
  return `calc(${length} * (100% + 1px) - 2px)`;
}

function onNoteClick(e) {
  if (dragState) return;

  e.stopPropagation();
  const song = getSelectedSong();
  if (!song) return;

  const noteId = e.currentTarget.dataset.id;
  const mode = e.shiftKey ? "extend" : "delete";

  if (mode === "delete") {
    song.notes = song.notes.filter((n) => n.id !== noteId);
  } else {
    song.notes = song.notes.map((n) => {
      if (n.id !== noteId) return n;
      const maxLength = Math.max(1, song.steps - n.start);
      return { ...n, length: Math.min(maxLength, n.length + 1) };
    });
  }

  persistSongs();
  renderRoll();
  updateSummary();
}

function highlightPlayingStep(step) {
  clearPlayingHighlight();
  const song = getSelectedSong();
  if (!song) return;

  const activeIds = song.notes
    .filter((n) => step >= n.start && step < n.start + n.length)
    .map((n) => n.id);

  activeIds.forEach((id) => {
    const el = roll.querySelector(`.note[data-id="${id}"]`);
    if (el) el.classList.add("playing");
  });
}

function clearPlayingHighlight() {
  roll.querySelectorAll(".note.playing").forEach((el) => {
    el.classList.remove("playing");
  });
}

function updateSummary() {
  const song = getSelectedSong();
  if (!song) {
    songSummary.textContent = "곡이 없습니다.";
    return;
  }

  let stepUnitText = "1/4박";
  if (song.beatPerStep === 1) {
    stepUnitText = "1박";
  } else if (song.beatPerStep === 0.5) {
    stepUnitText = "1/2박";
  }
  songSummary.textContent = `${song.title} | ${song.steps}스텝 | 1스텝=${stepUnitText} | 노트 ${song.notes.length}개 | BPM ${song.tempo} | ${song.voice} | 서스테인 ${Math.round(sustainStrength * 100)}%`;
}

function getSelectedSong() {
  return songs.find((song) => song.id === selectedSongId) || null;
}

function findNote(song, row, step) {
  return song.notes.find((n) => n.row === row && step >= n.start && step < n.start + n.length) || null;
}

function createSong(title) {
  return {
    id: crypto.randomUUID(),
    title,
    tempo: 96,
    beatPerStep: 1,
    sustainStrength: 1,
    voice: "musicbox",
    steps: DEFAULT_STEPS,
    notes: [
      { id: crypto.randomUUID(), row: 14, start: 0, length: 4 },
      { id: crypto.randomUUID(), row: 12, start: 0, length: 4 },
      { id: crypto.randomUUID(), row: 10, start: 0, length: 4 },
      { id: crypto.randomUUID(), row: 12, start: 4, length: 2 },
      { id: crypto.randomUUID(), row: 10, start: 8, length: 2 }
    ]
  };
}

function loadSongs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [createSong("기본 오르골")];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [createSong("기본 오르골")];
    }
    return parsed;
  } catch {
    return [createSong("기본 오르골")];
  }
}

function persistSongs() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(songs));
}

function normalizeSongs(inputSongs) {
  return inputSongs.map((song) => ({
    ...song,
    tempo: clamp(Number(song.tempo) || 96, 40, 220),
    beatPerStep: normalizeBeatPerStep(Number(song.beatPerStep) || 1),
    sustainStrength: clamp(Number(song.sustainStrength) || 1, 0.5, 1.8),
    steps: clamp(Number(song.steps) || DEFAULT_STEPS, 8, 96),
    voice: resolveVoice(song.voice),
    notes: Array.isArray(song.notes)
      ? song.notes
        .map((n) => ({
          id: n.id || crypto.randomUUID(),
          row: clamp(Number(n.row) || 0, 0, PITCHES.length - 1),
          start: clamp(Number(n.start) || 0, 0, Math.max(0, (Number(song.steps) || DEFAULT_STEPS) - 1)),
          length: Math.max(1, Number(n.length) || 1)
        }))
      : []
  }));
}

function resolveVoice(voice) {
  if (voice in TIMBRE_PRESETS) return voice;
  if (voice in LEGACY_VOICE_MAP) return LEGACY_VOICE_MAP[voice];
  return "musicbox";
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeBeatPerStep(value) {
  if (value === 1 || value === 0.5 || value === 0.25) return value;
  if (value > 0.75) return 1;
  if (value > 0.35) return 0.5;
  return 0.25;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function createAudioEngine() {
  let audioCtx = null;
  let scheduler = null;
  let currentStep = 0;
  let activeVoices = [];
  let currentSustainStrength = sustainStrength;

  function ensureContext() {
    if (!audioCtx) {
      audioCtx = new AudioContext();
    }
  }

  function play(song, handlers) {
    ensureContext();
    stop();

    const secondsPerBeat = 60 / song.tempo;
    const secondsPerStep = secondsPerBeat * normalizeBeatPerStep(song.beatPerStep);
    currentStep = 0;

    scheduler = globalThis.setInterval(() => {
      if (!audioCtx) return;

      const notesToStart = song.notes.filter((n) => n.start === currentStep);
      notesToStart.forEach((note) => {
        const pitch = PITCHES[note.row];
        const freq = NOTE_FREQ[pitch];
        if (!freq) return;

        const duration = Math.max(0.09, secondsPerStep * note.length);
        const voiceName = resolveVoice(song.voice);
        const stopVoice = playSynthTone(audioCtx, {
          freq,
          voiceName,
          duration,
          stepSeconds: secondsPerStep,
          sustainStrength: currentSustainStrength
        });

        activeVoices.push(stopVoice);
      });

      if (handlers?.onStep) {
        handlers.onStep(currentStep);
      }

      currentStep += 1;
      if (currentStep >= song.steps) {
        stop(false);
        if (handlers?.onEnd) {
          handlers.onEnd();
        }
      }
    }, secondsPerStep * 1000);
  }

  function stop(clear = true) {
    if (scheduler) {
      globalThis.clearInterval(scheduler);
      scheduler = null;
    }

    activeVoices.forEach((stopVoice) => {
      try {
        stopVoice();
      } catch {
      }
    });
    activeVoices = [];

    if (clear) {
      currentStep = 0;
    }
  }

  function setSustainStrength(value) {
    currentSustainStrength = clamp(value, 0.5, 1.8);
  }

  return { play, stop, setSustainStrength };
}

function playSynthTone(audioCtx, params) {
  const { freq, duration, stepSeconds, voiceName, sustainStrength = 1 } = params;
  const preset = TIMBRE_PRESETS[voiceName] || TIMBRE_PRESETS.musicbox;
  const now = audioCtx.currentTime;
  const holdTime = duration + (stepSeconds * (preset.overlapSteps || 0.35) * sustainStrength);
  const releaseTime = Math.max(0.16, stepSeconds * (preset.releaseSteps || 0.6) * sustainStrength);
  const ampEndTime = now + holdTime + releaseTime;

  const amp = audioCtx.createGain();
  const highpass = audioCtx.createBiquadFilter();
  const lowpass = audioCtx.createBiquadFilter();

  highpass.type = "highpass";
  highpass.frequency.value = preset.highpass;
  lowpass.type = "lowpass";
  lowpass.frequency.value = preset.lowpass;

  amp.gain.setValueAtTime(0, now);
  const scaledSustain = preset.sustain * (0.85 + sustainStrength * 0.15);
  amp.gain.linearRampToValueAtTime(scaledSustain, now + preset.attack);
  amp.gain.setValueAtTime(scaledSustain, now + holdTime);
  amp.gain.exponentialRampToValueAtTime(0.0006, ampEndTime);

  amp.connect(highpass);
  highpass.connect(lowpass);
  lowpass.connect(audioCtx.destination);

  const oscillators = preset.partials.map((partial) => {
    const osc = audioCtx.createOscillator();
    const partialGain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq * partial.ratio;

    partialGain.gain.setValueAtTime(partial.gain, now);
    partialGain.gain.setValueAtTime(partial.gain * 0.72, now + holdTime * 0.55);
    partialGain.gain.exponentialRampToValueAtTime(0.0006, now + holdTime + (releaseTime * partial.decay * preset.tail));

    osc.connect(partialGain);
    partialGain.connect(amp);
    osc.start(now);
    osc.stop(ampEndTime + 0.08);
    return osc;
  });

  let noiseSource = null;
  if (preset.hitNoise > 0) {
    const noiseBuffer = audioCtx.createBuffer(1, Math.floor(audioCtx.sampleRate * 0.04), audioCtx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }

    const noiseGain = audioCtx.createGain();
    noiseGain.gain.value = preset.hitNoise;
    noiseGain.gain.exponentialRampToValueAtTime(0.0006, now + 0.035);

    noiseSource = audioCtx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.connect(noiseGain);
    noiseGain.connect(amp);
    noiseSource.start(now);
    noiseSource.stop(now + 0.04);
  }

  return () => {
    oscillators.forEach((osc) => {
      try {
        osc.stop();
      } catch {
      }
    });
    if (noiseSource) {
      try {
        noiseSource.stop();
      } catch {
      }
    }
  };
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register("sw.js");
  } catch {
  }
}
