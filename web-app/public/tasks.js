/* StartShield — Task Dashboard */

// ── Storage helpers ────────────────────────────────────────
function getStorageValue(key, fallback = '') {
    try {
        const v = localStorage.getItem(key);
        return v === null ? fallback : v;
    } catch { return fallback; }
}
function setStorageValue(key, value) {
    try { localStorage.setItem(key, String(value)); return true; }
    catch { return false; }
}
function getIntFromStorage(key, fallback) {
    const n = parseInt(getStorageValue(key, String(fallback)), 10);
    return Number.isNaN(n) ? fallback : n;
}
function getJsonFromStorage(key, fallback) {
    try {
        const raw = getStorageValue(key, '');
        return raw ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
}

// ── Toast ──────────────────────────────────────────────────
let toastTimer = null;
function showToast(msg, duration = 2600) {
    const el = document.getElementById('app-toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.add('hidden'), duration);
}

// ── Theme ──────────────────────────────────────────────────
function loadTheme() {
    const t = getStorageValue('theme', 'light');
    if (t === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
}
loadTheme();

// ── Date display ───────────────────────────────────────────
function formatDate(d) {
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

document.getElementById('today-date').textContent = formatDate(new Date());

// ── Stat tiles ─────────────────────────────────────────────
const streak = getIntFromStorage('currentStreak', 0);
const level  = getIntFromStorage('userLevel', 1);

document.getElementById('dash-streak').textContent = streak;
document.getElementById('dash-level').textContent  = level;

// Sessions this week
const sessions = getJsonFromStorage('sessionLog', []);
const now      = new Date();
const weekAgo  = new Date(now - 7 * 24 * 60 * 60 * 1000);
const weekCount = sessions.filter(s => new Date(s.date) >= weekAgo).length;
document.getElementById('dash-week-sessions').textContent = weekCount;

// Focus time today (sum of durations for today's sessions)
const todayStr = now.toDateString();
const todayMins = sessions
    .filter(s => new Date(s.date).toDateString() === todayStr)
    .reduce((sum, s) => sum + (s.durationMins || 0), 0);
document.getElementById('dash-focus-time').textContent =
    todayMins >= 60
        ? `${Math.round(todayMins / 60 * 10) / 10}h`
        : `${todayMins} min`;

// ── Task list ──────────────────────────────────────────────
let tasks = getJsonFromStorage('dashboardTasks', []);

function saveTasks() {
    setStorageValue('dashboardTasks', JSON.stringify(tasks));
}

function renderTasks() {
    const list  = document.getElementById('task-list');
    const empty = document.getElementById('task-empty');
    list.innerHTML = '';

    if (tasks.length === 0) {
        empty.classList.remove('hidden');
        return;
    }
    empty.classList.add('hidden');

    tasks.forEach((task, idx) => {
        const li = document.createElement('li');
        li.className = `task-row${task.done ? ' task-done' : ''}`;

        const check = document.createElement('button');
        check.type = 'button';
        check.className = `task-check${task.done ? ' checked' : ''}`;
        check.setAttribute('aria-label', task.done ? 'Mark incomplete' : 'Mark complete');
        check.setAttribute('aria-pressed', String(task.done));
        check.addEventListener('click', () => toggleTask(idx));

        const title = document.createElement('span');
        title.className = 'task-title';
        title.textContent = task.title;

        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'task-delete';
        del.setAttribute('aria-label', `Delete task: ${task.title}`);
        del.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
        del.addEventListener('click', () => deleteTask(idx));

        li.append(check, title, del);
        list.appendChild(li);
    });
}

function toggleTask(idx) {
    tasks[idx].done = !tasks[idx].done;
    saveTasks();
    renderTasks();
}

function deleteTask(idx) {
    tasks.splice(idx, 1);
    saveTasks();
    renderTasks();
}

function showAddTask() {
    const form = document.getElementById('add-task-form');
    form.classList.remove('hidden');
    document.getElementById('new-task-input').focus();
    document.getElementById('add-task-btn').style.display = 'none';
}

function hideAddTask() {
    document.getElementById('add-task-form').classList.add('hidden');
    document.getElementById('new-task-input').value = '';
    document.getElementById('add-task-btn').style.display = '';
}

function addTask(e) {
    e.preventDefault();
    const input = document.getElementById('new-task-input');
    const title = input.value.trim();
    if (!title) return;
    tasks.push({ title, done: false, created: new Date().toISOString() });
    saveTasks();
    renderTasks();
    hideAddTask();
    showToast('Task added.');
}

renderTasks();

// ── Heatmap ────────────────────────────────────────────────
function buildHeatmap() {
    const grid = document.getElementById('heatmap-grid');
    if (!grid) return;

    // Build date → session count map
    const countMap = {};
    sessions.forEach(s => {
        const d = new Date(s.date).toDateString();
        countMap[d] = (countMap[d] || 0) + 1;
    });

    // 56 cells: 8 weeks × 7 days, oldest first
    const cells = [];
    for (let i = 55; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        cells.push(d);
    }

    grid.innerHTML = '';
    cells.forEach(d => {
        const count = countMap[d.toDateString()] || 0;
        const level = count === 0 ? 0 : count === 1 ? 1 : count <= 3 ? 2 : 3;
        const cell  = document.createElement('div');
        cell.className = 'heatmap-cell';
        cell.setAttribute('data-level', level);
        const label = `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: ${count} session${count !== 1 ? 's' : ''}`;
        cell.setAttribute('title', label);
        cell.setAttribute('aria-label', label);
        grid.appendChild(cell);
    });
}

buildHeatmap();

// ── Recent sessions ────────────────────────────────────────
function renderRecentSessions() {
    const list  = document.getElementById('recent-list');
    const empty = document.getElementById('recent-empty');
    if (!list) return;

    const recent = [...sessions].reverse().slice(0, 5);

    if (recent.length === 0) {
        list.innerHTML = '';
        empty.classList.remove('hidden');
        return;
    }
    empty.classList.add('hidden');
    list.innerHTML = '';

    recent.forEach(s => {
        const li  = document.createElement('li');
        li.className = 'recent-row';

        const title = document.createElement('span');
        title.className = 'recent-task';
        title.textContent = s.task || 'Untitled session';

        const meta = document.createElement('div');
        meta.className = 'recent-meta';

        const dur = document.createElement('span');
        dur.className = 'recent-duration';
        dur.textContent = `${s.durationMins || 25} min`;

        const date = document.createElement('span');
        date.className = 'recent-date';
        date.textContent = new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        meta.append(dur, date);
        li.append(title, meta);
        list.appendChild(li);
    });
}

renderRecentSessions();
