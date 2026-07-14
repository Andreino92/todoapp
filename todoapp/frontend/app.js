const API_URL = '/api/tasks';

const form = document.getElementById('task-form');
const titleInput = document.getElementById('title');
const descInput = document.getElementById('description');
const filterInput = document.getElementById('filter');
const list = document.getElementById('task-list');
const emptyMsg = document.getElementById('empty-msg');

let tasks = []; // cache local para filtrar en tiempo real sin golpear la API en cada tecla

async function loadTasks() {
  const res = await fetch(API_URL);
  tasks = await res.json();
  render(tasks);
}

function render(items) {
  list.innerHTML = '';
  emptyMsg.style.display = items.length === 0 ? 'block' : 'none';

  items.forEach(task => {
    const li = document.createElement('li');
    li.className = 'task-item' + (task.completed ? ' completed' : '');

    li.innerHTML = `
      <div class="task-info">
        <div class="task-title">${escapeHtml(task.title)}</div>
        ${task.description ? `<div class="task-desc">${escapeHtml(task.description)}</div>` : ''}
      </div>
      <button class="btn-toggle" data-id="${task.id}">${task.completed ? 'Deshacer' : 'Listo'}</button>
      <button class="btn-edit" data-id="${task.id}">Editar</button>
      <button class="btn-delete" data-id="${task.id}">Eliminar</button>
    `;
    list.appendChild(li);
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Crear tarea
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = titleInput.value.trim();
  const description = descInput.value.trim();
  if (!title) return;

  await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, description, completed: false })
  });

  titleInput.value = '';
  descInput.value = '';
  await loadTasks();
});

// Delegación de eventos para toggle / editar / eliminar
list.addEventListener('click', async (e) => {
  const id = e.target.getAttribute('data-id');
  if (!id) return;

  if (e.target.classList.contains('btn-toggle')) {
    await fetch(`${API_URL}/${id}/toggle`, { method: 'PATCH' });
    await loadTasks();
  }

  if (e.target.classList.contains('btn-delete')) {
    if (confirm('¿Eliminar esta tarea?')) {
      await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      await loadTasks();
    }
  }

  if (e.target.classList.contains('btn-edit')) {
    const task = tasks.find(t => t.id == id);
    const newTitle = prompt('Nuevo título:', task.title);
    if (newTitle === null) return;
    const newDesc = prompt('Nueva descripción:', task.description || '');

    await fetch(`${API_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle, description: newDesc, completed: task.completed })
    });
    await loadTasks();
  }
});

// Filtro en tiempo real (sobre la lista ya cargada en memoria)
filterInput.addEventListener('input', () => {
  const term = filterInput.value.toLowerCase();
  const filtered = tasks.filter(t =>
    t.title.toLowerCase().includes(term) ||
    (t.description || '').toLowerCase().includes(term)
  );
  render(filtered);
});

loadTasks();
