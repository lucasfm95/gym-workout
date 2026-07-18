/* =============================================
   GymTracker — app.js
   ============================================= */

'use strict';

// ── Storage keys ────────────────────────────────────────────────────────────
const KEY_WORKOUTS = 'gymtracker_workouts_v1';
const KEY_SESSIONS = 'gymtracker_sessions_v1';

// ── State ────────────────────────────────────────────────────────────────────
let workouts        = [];   // [{ id, name, exercises: [{ id, name, sets, reps, observation }] }]
let sessions        = {};   // { workoutId: Set<exerciseId> }
let activeWorkoutId = null;

// Modal editing context
let editingWorkoutId  = null;
let editingExerciseId = null;
let pendingDeleteFn   = null;

// ── Utils ────────────────────────────────────────────────────────────────────
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str ?? '');
  return div.innerHTML;
}

// ── Persistence ──────────────────────────────────────────────────────────────
function saveWorkouts() {
  try { localStorage.setItem(KEY_WORKOUTS, JSON.stringify(workouts)); } catch {}
}

function saveSessions() {
  try {
    const plain = {};
    for (const [k, v] of Object.entries(sessions)) plain[k] = [...v];
    localStorage.setItem(KEY_SESSIONS, JSON.stringify(plain));
  } catch {}
}

function loadData() {
  try {
    const raw = localStorage.getItem(KEY_WORKOUTS);
    workouts = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(workouts)) workouts = [];
  } catch { workouts = []; }

  try {
    const raw = localStorage.getItem(KEY_SESSIONS);
    const obj = raw ? JSON.parse(raw) : {};
    sessions = {};
    for (const [k, v] of Object.entries(obj)) {
      sessions[k] = new Set(Array.isArray(v) ? v : []);
    }
  } catch { sessions = {}; }
}

// ── Navigation ───────────────────────────────────────────────────────────────
function switchView(view) {
  document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.bottom-nav__item').forEach(el => el.classList.remove('active'));

  document.getElementById(`view-${view}`).classList.add('active');
  document.querySelector(`[data-view="${view}"]`).classList.add('active');

  const fab = document.getElementById('fab-add-workout');
  fab.style.display = view === 'gerenciar' ? 'flex' : 'none';

  if (view === 'treinar')   renderTreinar();
  if (view === 'gerenciar') renderGerenciar();
}

// ── Render: TREINAR ──────────────────────────────────────────────────────────
function renderTreinar() {
  const chipsEl    = document.getElementById('workout-chips');
  const listEl     = document.getElementById('exercise-list');
  const emptyEl    = document.getElementById('treinar-empty');
  const contentEl  = document.getElementById('treinar-content');
  const progressEl = document.getElementById('progress-section');

  chipsEl.innerHTML = '';
  listEl.innerHTML  = '';

  if (workouts.length === 0) {
    emptyEl.style.display   = 'block';
    contentEl.style.display = 'none';
    return;
  }

  emptyEl.style.display   = 'none';
  contentEl.style.display = 'block';

  // Ensure a valid active workout
  if (!activeWorkoutId || !workouts.find(w => w.id === activeWorkoutId)) {
    activeWorkoutId = workouts[0].id;
  }

  // ── Chips ────────────────────────────────────────────────────────────────
  workouts.forEach(w => {
    const session   = sessions[w.id] || new Set();
    const done      = w.exercises.filter(e => session.has(e.id)).length;
    const total     = w.exercises.length;
    const allDone   = total > 0 && done === total;

    const chip = document.createElement('button');
    chip.className = `workout-chip${w.id === activeWorkoutId ? ' active' : ''}`;
    chip.setAttribute('aria-pressed', String(w.id === activeWorkoutId));

    chip.innerHTML = `<span>${escapeHtml(w.name)}</span>`
      + (total > 0
        ? `<span class="workout-chip__badge${allDone ? ' done' : ''}">${done}/${total}</span>`
        : '');

    chip.addEventListener('click', () => {
      activeWorkoutId = w.id;
      renderTreinar();
    });
    chipsEl.appendChild(chip);
  });

  // ── Active workout ────────────────────────────────────────────────────────
  const workout = workouts.find(w => w.id === activeWorkoutId);
  if (!workout) return;

  const session   = sessions[workout.id] || new Set();
  const done      = workout.exercises.filter(e => session.has(e.id)).length;
  const total     = workout.exercises.length;
  const allDone   = total > 0 && done === total;
  const pct       = total > 0 ? Math.round((done / total) * 100) : 0;

  // Progress bar
  if (total > 0) {
    progressEl.style.display = 'block';
    document.getElementById('progress-label').textContent =
      `${done} / ${total} exercício${total !== 1 ? 's' : ''}`;
    const fill = document.getElementById('progress-fill');
    fill.style.width = `${pct}%`;
    fill.className = `progress-fill${allDone ? ' complete' : ''}`;
  } else {
    progressEl.style.display = 'none';
  }

  // Completion banner
  if (allDone) {
    const banner = document.createElement('div');
    banner.className = 'workout-complete-banner';
    banner.innerHTML = `
      <span class="workout-complete-banner__emoji">🎉</span>
      <p class="workout-complete-banner__title">Treino Concluído!</p>
      <p class="workout-complete-banner__sub">Parabéns! Todos os exercícios foram realizados.</p>
    `;
    listEl.appendChild(banner);
  }

  // Exercises
  if (workout.exercises.length === 0) {
    const msg = document.createElement('div');
    msg.className = 'exercise-empty';
    msg.innerHTML = `
      <span class="material-icons-round">add_task</span>
      <p>Este treino ainda não tem exercícios.</p>
      <p style="margin-top:6px">Vá em <strong>Gerenciar</strong> para adicioná-los.</p>
    `;
    listEl.appendChild(msg);
    return;
  }

  workout.exercises.forEach(ex => {
    const isDone = session.has(ex.id);
    const card   = document.createElement('div');
    card.className = `exercise-card${isDone ? ' done' : ''}`;
    card.setAttribute('role', 'checkbox');
    card.setAttribute('aria-checked', String(isDone));
    card.setAttribute('tabindex', '0');

    card.innerHTML = `
      <div class="exercise-card__check">
        <span class="material-icons-round">check</span>
      </div>
      <div class="exercise-card__content">
        <p class="exercise-card__name">${escapeHtml(ex.name)}</p>
        <div class="exercise-card__meta">
          <span class="exercise-card__badge">${ex.sets} série${ex.sets > 1 ? 's' : ''} × ${escapeHtml(ex.reps)} rep${ex.reps !== '1' ? 's' : ''}</span>
        </div>
        ${ex.observation ? `<p class="exercise-card__obs">${escapeHtml(ex.observation)}</p>` : ''}
      </div>
    `;

    const toggle = () => toggleExercise(workout.id, ex.id);
    card.addEventListener('click', toggle);
    card.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); } });

    listEl.appendChild(card);
  });
}

function toggleExercise(workoutId, exerciseId) {
  if (!sessions[workoutId]) sessions[workoutId] = new Set();

  if (sessions[workoutId].has(exerciseId)) {
    sessions[workoutId].delete(exerciseId);
  } else {
    sessions[workoutId].add(exerciseId);
    if (navigator.vibrate) navigator.vibrate(25);
  }

  saveSessions();
  renderTreinar();
}

function resetSession() {
  if (!activeWorkoutId) return;
  sessions[activeWorkoutId] = new Set();
  saveSessions();
  renderTreinar();
  showSnackbar('Treino reiniciado');
}

// ── Render: GERENCIAR ─────────────────────────────────────────────────────────
function renderGerenciar() {
  const listEl  = document.getElementById('workout-list');
  const emptyEl = document.getElementById('gerenciar-empty');
  listEl.innerHTML = '';

  if (workouts.length === 0) {
    emptyEl.style.display = 'block';
    return;
  }
  emptyEl.style.display = 'none';

  workouts.forEach(workout => {
    const card = document.createElement('div');
    card.className = 'workout-card';
    card.dataset.id = workout.id;

    const count = workout.exercises.length;

    card.innerHTML = `
      <div class="workout-card__header">
        <div class="workout-card__header-left">
          <span class="material-icons-round workout-card__chevron">expand_more</span>
          <div class="workout-card__info">
            <span class="workout-card__name">${escapeHtml(workout.name)}</span>
            <span class="workout-card__count">${count} exercício${count !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <div class="workout-card__actions">
          <button class="icon-btn" data-action="edit-workout" data-id="${workout.id}" title="Editar treino" aria-label="Editar treino">
            <span class="material-icons-round">edit</span>
          </button>
          <button class="icon-btn danger" data-action="delete-workout" data-id="${workout.id}" title="Excluir treino" aria-label="Excluir treino">
            <span class="material-icons-round">delete_outline</span>
          </button>
        </div>
      </div>
      <div class="workout-card__body">
        ${workout.exercises.map(ex => `
          <div class="exercise-row">
            <div class="exercise-row__dot"></div>
            <div class="exercise-row__info">
              <p class="exercise-row__name">${escapeHtml(ex.name)}</p>
              <p class="exercise-row__meta">${ex.sets} séries × ${escapeHtml(ex.reps)} reps${ex.observation ? ' · ' + escapeHtml(ex.observation) : ''}</p>
            </div>
            <div class="exercise-row__actions">
              <button class="icon-btn" data-action="edit-exercise" data-workout-id="${workout.id}" data-exercise-id="${ex.id}" title="Editar exercício" aria-label="Editar exercício">
                <span class="material-icons-round">edit</span>
              </button>
              <button class="icon-btn danger" data-action="delete-exercise" data-workout-id="${workout.id}" data-exercise-id="${ex.id}" title="Excluir exercício" aria-label="Excluir exercício">
                <span class="material-icons-round">delete_outline</span>
              </button>
            </div>
          </div>
        `).join('')}
        <button class="add-exercise-btn" data-action="add-exercise" data-workout-id="${workout.id}">
          <span class="material-icons-round">add</span>
          Adicionar Exercício
        </button>
      </div>
    `;

    // Toggle accordion on header-left click
    card.querySelector('.workout-card__header-left').addEventListener('click', () => {
      card.classList.toggle('open');
    });

    // Action buttons
    card.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        handleAction(btn.dataset, workout);
      });
    });

    listEl.appendChild(card);
  });
}

function handleAction(dataset, workout) {
  const { action, id, workoutId, exerciseId } = dataset;

  if (action === 'edit-workout') {
    openEditWorkoutModal(id);

  } else if (action === 'delete-workout') {
    openConfirm(
      `Excluir o treino "${workout.name}"? Todos os ${workout.exercises.length} exercícios serão removidos.`,
      () => deleteWorkout(workout.id)
    );

  } else if (action === 'add-exercise') {
    openAddExerciseModal(workoutId);

  } else if (action === 'edit-exercise') {
    openEditExerciseModal(workoutId, exerciseId);

  } else if (action === 'delete-exercise') {
    const ex = workout.exercises.find(e => e.id === exerciseId);
    if (ex) openConfirm(
      `Excluir o exercício "${ex.name}"?`,
      () => deleteExercise(workoutId, exerciseId)
    );
  }
}

// ── CRUD ──────────────────────────────────────────────────────────────────────
function addWorkout(name) {
  const w = { id: genId(), name: name.trim(), exercises: [] };
  workouts.push(w);
  saveWorkouts();
  return w;
}

function updateWorkout(id, name) {
  const w = workouts.find(x => x.id === id);
  if (w) { w.name = name.trim(); saveWorkouts(); }
}

function deleteWorkout(id) {
  workouts = workouts.filter(w => w.id !== id);
  delete sessions[id];
  if (activeWorkoutId === id) activeWorkoutId = workouts[0]?.id ?? null;
  saveWorkouts();
  saveSessions();
  renderGerenciar();
  showSnackbar('Treino excluído');
}

function addExercise(workoutId, data) {
  const w = workouts.find(x => x.id === workoutId);
  if (!w) return;
  w.exercises.push({ id: genId(), ...sanitizeExercise(data) });
  saveWorkouts();
}

function updateExercise(workoutId, exerciseId, data) {
  const w  = workouts.find(x => x.id === workoutId);
  const ex = w?.exercises.find(e => e.id === exerciseId);
  if (!ex) return;
  Object.assign(ex, sanitizeExercise(data));
  saveWorkouts();
}

function deleteExercise(workoutId, exerciseId) {
  const w = workouts.find(x => x.id === workoutId);
  if (!w) return;
  w.exercises = w.exercises.filter(e => e.id !== exerciseId);
  sessions[workoutId]?.delete(exerciseId);
  saveWorkouts();
  saveSessions();
  renderGerenciar();
  showSnackbar('Exercício excluído');
}

function sanitizeExercise(data) {
  return {
    name:        data.name.trim(),
    sets:        parseInt(data.sets, 10) || 1,
    reps:        String(data.reps).trim(),
    observation: data.observation.trim(),
  };
}

// ── Modals ────────────────────────────────────────────────────────────────────

// iOS Safari: overflow:hidden on body doesn't prevent scroll.
// The position:fixed trick is the reliable solution.
let _scrollY = 0;

function openModal(id) {
  _scrollY = window.pageYOffset;
  document.body.style.position = 'fixed';
  document.body.style.top      = `-${_scrollY}px`;
  document.body.style.width    = '100%';
  document.getElementById(id).classList.add('open');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  document.body.style.position = '';
  document.body.style.top      = '';
  document.body.style.width    = '';
  window.scrollTo(0, _scrollY);
}

function openAddWorkoutModal() {
  editingWorkoutId = null;
  document.getElementById('modal-workout-title').textContent = 'Novo Treino';
  document.getElementById('workout-name-input').value = '';
  clearInvalid('workout-name-input');
  openModal('modal-workout');
  requestAnimationFrame(() => document.getElementById('workout-name-input').focus());
}

function openEditWorkoutModal(id) {
  const w = workouts.find(x => x.id === id);
  if (!w) return;
  editingWorkoutId = id;
  document.getElementById('modal-workout-title').textContent = 'Editar Treino';
  document.getElementById('workout-name-input').value = w.name;
  clearInvalid('workout-name-input');
  openModal('modal-workout');
  requestAnimationFrame(() => document.getElementById('workout-name-input').focus());
}

function openAddExerciseModal(workoutId) {
  editingWorkoutId  = workoutId;
  editingExerciseId = null;
  document.getElementById('modal-exercise-title').textContent = 'Novo Exercício';
  ['exercise-name-input', 'exercise-sets-input', 'exercise-reps-input', 'exercise-obs-input']
    .forEach(id => { document.getElementById(id).value = ''; clearInvalid(id); });
  openModal('modal-exercise');
  requestAnimationFrame(() => document.getElementById('exercise-name-input').focus());
}

function openEditExerciseModal(workoutId, exerciseId) {
  const w  = workouts.find(x => x.id === workoutId);
  const ex = w?.exercises.find(e => e.id === exerciseId);
  if (!ex) return;
  editingWorkoutId  = workoutId;
  editingExerciseId = exerciseId;
  document.getElementById('modal-exercise-title').textContent = 'Editar Exercício';
  document.getElementById('exercise-name-input').value = ex.name;
  document.getElementById('exercise-sets-input').value = ex.sets;
  document.getElementById('exercise-reps-input').value = ex.reps;
  document.getElementById('exercise-obs-input').value  = ex.observation;
  ['exercise-name-input','exercise-sets-input','exercise-reps-input'].forEach(clearInvalid);
  openModal('modal-exercise');
  requestAnimationFrame(() => document.getElementById('exercise-name-input').focus());
}

function openConfirm(text, onConfirm) {
  document.getElementById('modal-confirm-text').textContent = text;
  pendingDeleteFn = onConfirm;
  openModal('modal-confirm');
}

// ── Save handlers ─────────────────────────────────────────────────────────────
function handleSaveWorkout() {
  const nameEl = document.getElementById('workout-name-input');
  const name   = nameEl.value.trim();

  if (!name) { markInvalid(nameEl); return; }

  if (editingWorkoutId) {
    updateWorkout(editingWorkoutId, name);
    showSnackbar('Treino atualizado');
  } else {
    addWorkout(name);
    showSnackbar('Treino criado com sucesso!');
  }
  closeModal('modal-workout');
  renderGerenciar();
}

function handleSaveExercise() {
  const nameEl = document.getElementById('exercise-name-input');
  const setsEl = document.getElementById('exercise-sets-input');
  const repsEl = document.getElementById('exercise-reps-input');
  const obsEl  = document.getElementById('exercise-obs-input');

  const name = nameEl.value.trim();
  const sets = setsEl.value.trim();
  const reps = repsEl.value.trim();
  const obs  = obsEl.value.trim();

  let valid = true;
  if (!name) { markInvalid(nameEl); valid = false; }
  if (!sets || parseInt(sets, 10) < 1) { markInvalid(setsEl); valid = false; }
  if (!reps) { markInvalid(repsEl); valid = false; }
  if (!valid) return;

  if (editingExerciseId) {
    updateExercise(editingWorkoutId, editingExerciseId, { name, sets, reps, observation: obs });
    showSnackbar('Exercício atualizado');
  } else {
    addExercise(editingWorkoutId, { name, sets, reps, observation: obs });
    showSnackbar('Exercício adicionado!');
  }
  closeModal('modal-exercise');
  renderGerenciar();
}

// ── Validation helpers ────────────────────────────────────────────────────────
function markInvalid(el) {
  if (typeof el === 'string') el = document.getElementById(el);
  el.classList.add('invalid');
  el.focus();
  el.addEventListener('input', () => el.classList.remove('invalid'), { once: true });
}

function clearInvalid(id) {
  document.getElementById(id)?.classList.remove('invalid');
}

// ── Snackbar ──────────────────────────────────────────────────────────────────
let snackTimer;
function showSnackbar(msg) {
  const el = document.getElementById('snackbar');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(snackTimer);
  snackTimer = setTimeout(() => el.classList.remove('show'), 3000);
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  renderTreinar();

  // Bottom navigation
  document.querySelectorAll('.bottom-nav__item').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  // Go-to-gerenciar shortcut (empty state button)
  document.getElementById('btn-go-gerenciar').addEventListener('click', () => switchView('gerenciar'));

  // FAB
  document.getElementById('fab-add-workout').addEventListener('click', openAddWorkoutModal);

  // Reset session
  document.getElementById('btn-reset-session').addEventListener('click', resetSession);

  // ── Workout modal ─────────────────────────────────────────────────────────
  document.getElementById('btn-save-workout').addEventListener('click', handleSaveWorkout);
  document.getElementById('btn-cancel-workout').addEventListener('click', () => closeModal('modal-workout'));
  document.getElementById('workout-name-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleSaveWorkout();
  });

  // ── Exercise modal ────────────────────────────────────────────────────────
  document.getElementById('btn-save-exercise').addEventListener('click', handleSaveExercise);
  document.getElementById('btn-cancel-exercise').addEventListener('click', () => closeModal('modal-exercise'));
  document.getElementById('exercise-obs-input').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveExercise(); }
  });

  // ── Confirm modal ─────────────────────────────────────────────────────────
  document.getElementById('btn-confirm-delete').addEventListener('click', () => {
    if (pendingDeleteFn) pendingDeleteFn();
    pendingDeleteFn = null;
    closeModal('modal-confirm');
  });
  document.getElementById('btn-cancel-confirm').addEventListener('click', () => {
    pendingDeleteFn = null;
    closeModal('modal-confirm');
  });

  // ── Close on overlay tap ──────────────────────────────────────────────────
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) {
        closeModal(overlay.id);
        pendingDeleteFn = null;
      }
    });
  });

  // ── Keyboard: Escape closes modals ────────────────────────────────────────
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.open').forEach(o => {
        closeModal(o.id);
      });
      pendingDeleteFn = null;
    }
  });

  // ── iOS: adjust modal height when virtual keyboard opens ─────────────────
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
      const open = document.querySelector('.modal-overlay.open .modal');
      if (!open) return;
      // Shrink modal max-height to fit above the keyboard
      open.style.maxHeight = `${window.visualViewport.height * 0.92}px`;
    });
  }
});
