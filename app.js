/**
 * 작업 관리 앱 — app.js
 * 로컬 스토리지를 통해 데이터를 유지합니다.
 */

'use strict';

// ─── 상태 ────────────────────────────────────────────────
const STORAGE_KEY = 'task-manager-tasks';

/** @type {{ id: string, text: string, completed: boolean, createdAt: number }[]} */
let tasks = loadFromStorage();
let currentFilter = 'all';

// ─── DOM 참조 ─────────────────────────────────────────────
const taskForm           = document.getElementById('task-form');
const taskInput          = document.getElementById('task-input');
const inputHint          = document.getElementById('input-hint');
const taskList           = document.getElementById('task-list');
const emptyState         = document.getElementById('empty-state');
const clearCompletedBtn  = document.getElementById('clear-completed-btn');
const countTotal         = document.getElementById('count-total');
const countActive        = document.getElementById('count-active');
const countDone          = document.getElementById('count-done');
const filterButtons      = document.querySelectorAll('.btn-filter');
const themeToggleBtn     = document.getElementById('theme-toggle');

// ─── 초기화 ───────────────────────────────────────────────
render();updateThemeButton();
// ─── 이벤트 리스너 ────────────────────────────────────────
taskForm.addEventListener('submit', handleAddTask);
clearCompletedBtn.addEventListener('click', handleClearCompleted);
themeToggleBtn.addEventListener('click', toggleTheme);

// 시스템 다크 모드 변경 감지
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  if (!localStorage.getItem('theme')) {
    document.documentElement.dataset.theme = e.matches ? 'dark' : 'light';
    updateThemeButton();
  }
});

filterButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    currentFilter = btn.dataset.filter;
    filterButtons.forEach((b) => {
      b.classList.toggle('active', b === btn);
      b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
    });
    render();
  });
});

// ─── 핸들러 ──────────────────────────────────────────────

/**
 * 새 작업 추가
 * @param {SubmitEvent} e
 */
function handleAddTask(e) {
  e.preventDefault();
  const text = taskInput.value.trim();

  if (!text) {
    taskInput.value = '';
    showHint('작업 내용을 입력해 주세요.');
    taskInput.focus();
    return;
  }

  if (text.length > 200) {
    showHint('200자 이하로 입력해 주세요.');
    return;
  }

  clearHint();
  addTask(text);
  taskInput.value = '';
  taskInput.focus();
}

/**
 * 완료 상태 토글
 * @param {string} id
 */
function handleToggle(id) {
  tasks = tasks.map((t) =>
    t.id === id ? { ...t, completed: !t.completed } : t
  );
  saveToStorage();
  render();
}

/**
 * 단일 작업 삭제
 * @param {string} id
 */
function handleDelete(id) {
  tasks = tasks.filter((t) => t.id !== id);
  saveToStorage();
  render();
}

/**
 * 완료된 작업 전체 삭제
 */
function handleClearCompleted() {
  tasks = tasks.filter((t) => !t.completed);
  saveToStorage();
  render();
}

// ─── 상태 변경 ────────────────────────────────────────────

/**
 * @param {string} text
 */
function addTask(text) {
  const newTask = {
    id: crypto.randomUUID(),
    text,
    completed: false,
    createdAt: Date.now(),
  };
  tasks = [newTask, ...tasks];
  saveToStorage();
  render();
}

// ─── 렌더링 ───────────────────────────────────────────────

function render() {
  const filtered = getFilteredTasks();

  // 목록 비우기
  taskList.innerHTML = '';

  if (filtered.length === 0) {
    emptyState.hidden = false;
  } else {
    emptyState.hidden = true;
    const fragment = document.createDocumentFragment();
    filtered.forEach((task) => fragment.appendChild(createTaskItem(task)));
    taskList.appendChild(fragment);
  }

  updateStats();

  // '완료 항목 삭제' 버튼 표시 여부
  const hasCompleted = tasks.some((t) => t.completed);
  clearCompletedBtn.hidden = !hasCompleted;
}

/**
 * 작업 항목 <li> 요소 생성
 * @param {{ id: string, text: string, completed: boolean }} task
 * @returns {HTMLLIElement}
 */
function createTaskItem(task) {
  const li = document.createElement('li');
  li.className = 'task-item' + (task.completed ? ' completed' : '');
  li.dataset.id = task.id;

  // 체크박스
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'task-checkbox';
  checkbox.checked = task.completed;
  checkbox.id = `task-cb-${task.id}`;
  checkbox.setAttribute('aria-label', `완료 표시: ${escapeHtml(task.text)}`);
  checkbox.addEventListener('change', () => handleToggle(task.id));

  // 레이블
  const label = document.createElement('label');
  label.className = 'task-label';
  label.htmlFor = `task-cb-${task.id}`;
  label.textContent = task.text;

  // 삭제 버튼
  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.className = 'btn btn-delete';
  deleteBtn.setAttribute('aria-label', `삭제: ${escapeHtml(task.text)}`);
  deleteBtn.innerHTML = `
    <svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24"
         fill="none" stroke="currentColor" stroke-width="2.2"
         stroke-linecap="round" stroke-linejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4h6v2"/>
    </svg>`;
  deleteBtn.addEventListener('click', () => handleDelete(task.id));

  li.append(checkbox, label, deleteBtn);
  return li;
}

/**
 * 통계 카운터 업데이트
 */
function updateStats() {
  const total     = tasks.length;
  const doneCount = tasks.filter((t) => t.completed).length;
  const active    = total - doneCount;

  countTotal.textContent  = total;
  countActive.textContent = active;
  countDone.textContent   = doneCount;
}

// ─── 필터 ─────────────────────────────────────────────────

function getFilteredTasks() {
  switch (currentFilter) {
    case 'active':    return tasks.filter((t) => !t.completed);
    case 'completed': return tasks.filter((t) => t.completed);
    default:          return tasks;
  }
}
// ─── 테마 ──────────────────────────────────────────

function toggleTheme() {
  const isDark = document.documentElement.dataset.theme === 'dark';
  const next = isDark ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  localStorage.setItem('theme', next);
  updateThemeButton();
}

function updateThemeButton() {
  const isDark = document.documentElement.dataset.theme === 'dark';
  themeToggleBtn.setAttribute('aria-label', isDark ? '라이트 모드로 전환' : '다크 모드로 전환');
}
// ─── 스토리지 ─────────────────────────────────────────────

function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    // 스토리지 용량 초과 등의 오류는 조용히 무시
  }
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // 각 항목의 유효성 검증
    return parsed.filter(
      (t) =>
        t &&
        typeof t.id === 'string' &&
        typeof t.text === 'string' &&
        typeof t.completed === 'boolean'
    );
  } catch {
    return [];
  }
}

// ─── 유틸리티 ─────────────────────────────────────────────

/**
 * XSS 방지용 HTML 이스케이프 (aria-label 등 문자열 속성에 사용)
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** @param {string} msg */
function showHint(msg) {
  inputHint.textContent = msg;
  taskInput.setAttribute('aria-invalid', 'true');
}

function clearHint() {
  inputHint.textContent = '';
  taskInput.removeAttribute('aria-invalid');
}