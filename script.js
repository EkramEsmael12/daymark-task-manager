const STORAGE_KEY = 'daymark-tasks-v1';
const form = document.querySelector('#task-form');
const input = document.querySelector('#task-input');
const priority = document.querySelector('#priority');
const dueDate = document.querySelector('#due-date');
const list = document.querySelector('#task-list');
let tasks = loadTasks();
let filter = 'all';
let searchTerm = '';
let prioritySort = false;

const today = new Date();
today.setHours(0, 0, 0, 0);
const todayKey = toDateKey(today);
dueDate.min = todayKey;
document.querySelector('#today-short').textContent = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(today);
document.querySelector('#heading-date').textContent = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(today).toUpperCase();

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function loadTasks() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(value)) return [];

    return value
      .filter(task => task && typeof task.text === 'string')
      .map(task => ({
        id: task.id || crypto.randomUUID(),
        text: task.text,
        done: Boolean(task.done),
        priority: ['high', 'normal', 'low'].includes(task.priority) ? task.priority : 'normal',
        dueDate: typeof task.dueDate === 'string' ? task.dueDate : ''
      }));
  } catch {
    return [];
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function dateLabel(key) {
  if (!key) return '';

  const [year, month, day] = key.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  if (key === todayKey) return 'Today';
  if (key < todayKey) return 'Overdue';

  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
}

function priorityRank(value) {
  return value === 'high' ? 0 : value === 'normal' ? 1 : 2;
}

function getVisibleTasks() {
  let visible = tasks.filter(task => {
    if (filter === 'done' && !task.done) return false;
    if (filter === 'today' && (task.done || task.dueDate !== todayKey)) return false;
    if (filter === 'upcoming' && (task.done || !task.dueDate || task.dueDate <= todayKey)) return false;
    if (filter === 'all' && task.done) return false;

    return !searchTerm || task.text.toLowerCase().includes(searchTerm);
  });

  if (prioritySort) {
    visible = [...visible].sort((a, b) =>
      priorityRank(a.priority) - priorityRank(b.priority) ||
      (a.dueDate || '9999').localeCompare(b.dueDate || '9999')
    );
  }

  return visible;
}

function render() {
  const completed = tasks.filter(task => task.done).length;
  const open = tasks.length - completed;
  const todayCount = tasks.filter(task => !task.done && task.dueDate === todayKey).length;
  const upcomingCount = tasks.filter(task => !task.done && task.dueDate && task.dueDate > todayKey).length;

  document.querySelector('#count-all').textContent = open;
  document.querySelector('#count-today').textContent = todayCount;
  document.querySelector('#count-upcoming').textContent = upcomingCount;
  document.querySelector('#count-done').textContent = completed;

  const percent = tasks.length ? Math.round(completed / tasks.length * 100) : 0;
  document.querySelector('#focus-percent').textContent = `${percent}%`;
  document.querySelector('#focus-caption').textContent =
    `${completed} of ${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'}`;
  document.querySelector('#progress-bar').style.width = `${percent}%`;
  document.querySelector('#focus-message').textContent =
    percent === 100 && tasks.length
      ? 'You made room for what matters.'
      : open
        ? 'A good day starts with one thing.'
        : 'Add a task to get your day moving.';

  const viewNames = {
    all: 'All tasks',
    today: 'Today',
    upcoming: 'Upcoming',
    done: 'Completed'
  };
  const viewSubs = {
    all: 'A clear plan makes space for good work.',
    today: 'The things you want to move forward today.',
    upcoming: 'A little planning makes tomorrow easier.',
    done: 'Look at everything you’ve already finished.'
  };

  document.querySelector('#breadcrumb-view').textContent = viewNames[filter];
  document.querySelector('#view-title').firstChild.textContent = viewNames[filter];
  document.querySelector('#heading-sub').textContent = viewSubs[filter];
  document.querySelectorAll('.nav-item').forEach(button => {
    button.classList.toggle('active', button.dataset.filter === filter);
  });

  const visible = getVisibleTasks();
  document.querySelector('#visible-count').textContent = visible.length;
  document.querySelector('#footer-count').textContent =
    `${visible.length} ${visible.length === 1 ? 'task' : 'tasks'}`;
  list.replaceChildren();

  const empty = document.querySelector('#empty');
  empty.hidden = visible.length > 0;

  const emptyMessages = {
    all: ['Nothing on your list yet', 'Add your first task above. You’ve got this.'],
    today: ['Your day is wide open', 'Add a task with today’s date to plan your day.'],
    upcoming: ['Nothing scheduled ahead', 'Add a future due date to see it here.'],
    done: ['Nothing completed yet', 'Finished tasks will find a home here.']
  };

  const [emptyTitle, emptyCopy] = searchTerm
    ? ['No matching tasks', 'Try another search or clear the search field.']
    : emptyMessages[filter];

  document.querySelector('#empty-title').textContent = emptyTitle;
  document.querySelector('#empty-copy').textContent = emptyCopy;

  for (const task of visible) {
    const row = document.createElement('li');
    row.className = `task-row${task.done ? ' done' : ''}`;

    const check = document.createElement('input');
    check.type = 'checkbox';
    check.className = 'task-check';
    check.checked = task.done;
    check.setAttribute('aria-label', `${task.done ? 'Reopen' : 'Complete'}: ${task.text}`);
    check.addEventListener('change', () => {
      task.done = check.checked;
      save();
      render();
    });

    const copy = document.createElement('span');
    copy.className = 'task-copy';
    copy.textContent = task.text;
    row.append(check, copy);

    const meta = document.createElement('span');
    meta.className = 'task-meta';

    if (task.dueDate) {
      const date = document.createElement('span');
      date.className = `due${!task.done && task.dueDate < todayKey ? ' overdue' : ''}`;
      date.textContent = `◷ ${dateLabel(task.dueDate)}`;
      meta.append(date);
    }

    if (task.priority !== 'normal') {
      const badge = document.createElement('span');
      badge.className = `priority ${task.priority}`;
      badge.textContent = task.priority === 'high' ? 'High' : 'Low';
      meta.append(badge);
    }

    row.append(meta);

    const remove = document.createElement('button');
    remove.className = 'delete';
    remove.type = 'button';
    remove.textContent = '×';
    remove.setAttribute('aria-label', `Delete ${task.text}`);
    remove.addEventListener('click', () => {
      tasks = tasks.filter(item => item.id !== task.id);
      save();
      render();
    });

    row.append(remove);
    list.append(row);
  }
}

form.addEventListener('submit', event => {
  event.preventDefault();

  const text = input.value.trim();
  if (!text) {
    input.focus();
    return;
  }

  tasks.unshift({
    id: crypto.randomUUID(),
    text,
    priority: priority.value,
    dueDate: dueDate.value,
    done: false
  });

  save();
  form.reset();
  input.focus();
  render();
});

document.querySelectorAll('.nav-item').forEach(button => {
  button.addEventListener('click', () => {
    filter = button.dataset.filter;
    render();
  });
});

document.querySelector('#search').addEventListener('input', event => {
  searchTerm = event.target.value.trim().toLowerCase();
  render();
});

document.querySelector('#sort-button').addEventListener('click', event => {
  prioritySort = !prioritySort;
  event.currentTarget.classList.toggle('sorted', prioritySort);
  event.currentTarget.setAttribute(
    'aria-label',
    prioritySort ? 'Return to original task order' : 'Sort tasks by priority'
  );
  render();
});

document.querySelector('#clear-done').addEventListener('click', () => {
  tasks = tasks.filter(task => !task.done);
  save();
  render();
});

document.querySelector('#empty-add').addEventListener('click', () => input.focus());

render();
