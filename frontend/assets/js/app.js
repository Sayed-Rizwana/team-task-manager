const API_BASE = '/api';
const AUTH_STORAGE_KEY = 'team-task-manager-token';
const USER_STORAGE_KEY = 'team-task-manager-user';

const state = {
  token: localStorage.getItem(AUTH_STORAGE_KEY),
  user: JSON.parse(localStorage.getItem(USER_STORAGE_KEY) || 'null'),
  projects: [],
  tasks: [],
  users: [],
  activeProjectId: null,
  editingTaskId: null
};

document.addEventListener('DOMContentLoaded', async () => {
  const page = document.body.dataset.page;

  if (page === 'auth') {
    initAuthPage();
    if (state.token) {
      window.location.href = '/dashboard.html';
    }
    return;
  }

  await ensureAuthenticated();
  decorateSharedLayout();
  bindGlobalUI();

  if (page === 'dashboard') {
    await initDashboardPage();
  }

  if (page === 'projects') {
    await initProjectsPage();
  }

  if (page === 'tasks') {
    await initTasksPage();
  }
});

function initAuthPage() {
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const tabs = document.querySelectorAll('[data-auth-tab]');

  tabs.forEach((button) => {
    button.addEventListener('click', () => {
      const loginActive = button.dataset.authTab === 'login';
      tabs.forEach((tab) => tab.classList.toggle('active', tab === button));
      loginForm.classList.toggle('is-hidden', !loginActive);
      signupForm.classList.toggle('is-hidden', loginActive);
      setMessage('auth-message', '');
    });
  });

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = {
      email: document.getElementById('login-email').value.trim(),
      password: document.getElementById('login-password').value
    };

    const data = await request('/auth/login', 'POST', payload, false, 'auth-message');
    if (!data) {
      return;
    }

    saveSession(data);
    window.location.href = '/dashboard.html';
  });

  signupForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = {
      name: document.getElementById('signup-name').value.trim(),
      email: document.getElementById('signup-email').value.trim(),
      password: document.getElementById('signup-password').value,
      role: document.getElementById('signup-role').value
    };

    const data = await request('/auth/signup', 'POST', payload, false, 'auth-message');
    if (!data) {
      return;
    }

    saveSession(data);
    window.location.href = '/dashboard.html';
  });
}

async function ensureAuthenticated() {
  if (!state.token) {
    redirectToLogin();
    return;
  }

  const response = await request('/auth/me', 'GET', null, true);
  if (!response) {
    clearSession();
    redirectToLogin();
    return;
  }

  state.user = response.user;
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(state.user));
}

function decorateSharedLayout() {
  const nameTargets = document.querySelectorAll('#current-user-name');
  const roleTargets = document.querySelectorAll('#current-user-role');

  nameTargets.forEach((node) => {
    node.textContent = state.user.name;
  });

  roleTargets.forEach((node) => {
    node.textContent = state.user.role;
  });
}

function bindGlobalUI() {
  const logoutButton = document.getElementById('logout-button');
  if (logoutButton) {
    logoutButton.addEventListener('click', () => {
      clearSession();
      redirectToLogin();
    });
  }

  document.querySelectorAll('[data-close-modal]').forEach((button) => {
    button.addEventListener('click', () => {
      closeModal(button.dataset.closeModal);
    });
  });

  window.addEventListener('click', (event) => {
    const modal = event.target.closest('.modal');
    if (modal && event.target === modal) {
      closeModal(modal.id);
    }
  });
}

async function initDashboardPage() {
  const [statsData, tasksData] = await Promise.all([
    request('/dashboard', 'GET'),
    request('/tasks', 'GET')
  ]);

  if (!statsData || !tasksData) {
    return;
  }

  const { stats } = statsData;
  state.tasks = tasksData.tasks;

  document.getElementById('total-projects').textContent = stats.totalProjects;
  document.getElementById('total-tasks').textContent = stats.totalTasks;
  document.getElementById('completed-tasks').textContent = stats.completedTasks;
  document.getElementById('pending-tasks').textContent = stats.pendingTasks;
  document.getElementById('in-progress-tasks').textContent = stats.inProgressTasks;
  document.getElementById('overdue-tasks').textContent = stats.overdueTasks;

  const recentTasks = state.tasks.slice(0, 5);
  document.getElementById('recent-tasks').innerHTML = recentTasks.length
    ? recentTasks.map(renderTaskSummary).join('')
    : '<div class="empty-state">No tasks yet.</div>';

  document.getElementById('dashboard-role-message').innerHTML = state.user.role === 'admin'
    ? '<p>You have admin access. Create projects, manage members, assign tasks, and review all delivery activity.</p>'
    : '<p>You have member access. Review your projects and keep task statuses up to date as work moves forward.</p>';
}

async function initProjectsPage() {
  toggleAdminOnly('new-project-button');
  await loadProjects();

  const newProjectButton = document.getElementById('new-project-button');
  if (newProjectButton) {
    newProjectButton.addEventListener('click', () => openModal('project-modal'));
  }

  document.getElementById('project-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = {
      name: document.getElementById('project-name').value.trim(),
      description: document.getElementById('project-description').value.trim()
    };

    const data = await request('/projects', 'POST', payload);
    if (!data) {
      return;
    }

    closeModal('project-modal');
    event.target.reset();
    await loadProjects();
  });

  document.getElementById('add-member-button').addEventListener('click', async () => {
    const selectedUserId = document.getElementById('member-user-select').value;
    if (!selectedUserId || !state.activeProjectId) {
      return;
    }

    const data = await request(`/projects/${state.activeProjectId}/add-member`, 'POST', { userId: selectedUserId });
    if (!data) {
      return;
    }

    await loadProjects();
    await populateMemberModal(state.activeProjectId);
  });
}

async function initTasksPage() {
  toggleAdminOnly('new-task-button');
  await loadProjects();
  await loadTasks();

  document.getElementById('new-task-button').addEventListener('click', async () => {
    state.editingTaskId = null;
    document.getElementById('task-modal-title').textContent = 'Create Task';
    document.getElementById('task-form').reset();
    await populateTaskInputs();
    openModal('task-modal');
  });

  document.getElementById('task-project-filter').addEventListener('change', loadTasks);
  document.getElementById('task-status-filter').addEventListener('change', loadTasks);

  document.getElementById('task-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = state.user.role === 'admin' || !state.editingTaskId
      ? {
          title: document.getElementById('task-title').value.trim(),
          description: document.getElementById('task-description').value.trim(),
          projectId: document.getElementById('task-project-input').value,
          assignedTo: document.getElementById('task-assignee-input').value || null,
          status: document.getElementById('task-status-input').value,
          deadline: document.getElementById('task-deadline-input').value || null
        }
      : {
          status: document.getElementById('task-status-input').value
        };

    const path = state.editingTaskId ? `/tasks/${state.editingTaskId}` : '/tasks';
    const method = state.editingTaskId ? 'PUT' : 'POST';
    const data = await request(path, method, payload);
    if (!data) {
      return;
    }

    closeModal('task-modal');
    state.editingTaskId = null;
    await loadTasks();
  });
}

async function loadProjects() {
  const data = await request('/projects', 'GET');
  if (!data) {
    return;
  }

  state.projects = data.projects;

  if (document.body.dataset.page === 'projects') {
    renderProjects();
  }

  populateProjectSelects();
}

async function loadTasks() {
  const query = new URLSearchParams();
  const projectFilter = document.getElementById('task-project-filter');
  const statusFilter = document.getElementById('task-status-filter');

  if (projectFilter && projectFilter.value) {
    query.set('projectId', projectFilter.value);
  }

  if (statusFilter && statusFilter.value) {
    query.set('status', statusFilter.value);
  }

  const suffix = query.toString() ? `?${query.toString()}` : '';
  const data = await request(`/tasks${suffix}`, 'GET');
  if (!data) {
    return;
  }

  state.tasks = data.tasks;

  if (document.body.dataset.page === 'tasks') {
    renderTasks();
  }
}

function renderProjects() {
  const container = document.getElementById('projects-grid');

  if (!state.projects.length) {
    container.innerHTML = '<div class="card empty-state">No projects available yet.</div>';
    return;
  }

  container.innerHTML = state.projects.map((project) => `
    <article class="project-item">
      <h3>${escapeHtml(project.name)}</h3>
      <p class="muted">${escapeHtml(project.description || 'No description provided.')}</p>
      <div class="project-meta">
        <span>Owner: ${escapeHtml(project.createdBy.name)}</span>
        <span>Members: ${project.members.length}</span>
      </div>
      <div class="project-actions">
        <button class="button button-secondary" type="button" onclick="window.app.openProjectMembers('${project._id}')">View Members</button>
      </div>
    </article>
  `).join('');
}

function renderTasks() {
  const container = document.getElementById('tasks-list');

  if (!state.tasks.length) {
    container.innerHTML = '<div class="card empty-state">No tasks match the current filters.</div>';
    return;
  }

  container.innerHTML = state.tasks.map((task) => {
    const overdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== 'completed';
    const canEdit = state.user.role === 'admin' || task.assignedTo?._id === state.user._id;
    const canDelete = state.user.role === 'admin';

    return `
      <article class="task-item">
        <div class="section-heading">
          <div>
            <h3>${escapeHtml(task.title)}</h3>
            <p class="muted">${escapeHtml(task.description || 'No description provided.')}</p>
          </div>
          <span class="status-badge ${statusClass(task.status)}">${formatStatus(task.status)}</span>
        </div>
        <div class="task-meta">
          <span>Project: ${escapeHtml(task.projectId?.name || 'Unknown')}</span>
          <span>Assigned: ${escapeHtml(task.assignedTo?.name || 'Unassigned')}</span>
          <span>Deadline: ${task.deadline ? formatDate(task.deadline) : 'None'}</span>
          ${overdue ? '<span class="status-overdue">Overdue</span>' : ''}
        </div>
        <div class="task-actions">
          ${canEdit ? `<button class="button button-secondary" type="button" onclick="window.app.editTask('${task._id}')">${state.user.role === 'admin' ? 'Edit Task' : 'Update Status'}</button>` : ''}
          ${canDelete ? `<button class="button button-danger" type="button" onclick="window.app.deleteTask('${task._id}')">Delete</button>` : ''}
        </div>
      </article>
    `;
  }).join('');
}

function populateProjectSelects() {
  const projectFilter = document.getElementById('task-project-filter');
  const taskProjectInput = document.getElementById('task-project-input');

  if (projectFilter) {
    projectFilter.innerHTML = '<option value="">All Projects</option>' + state.projects
      .map((project) => `<option value="${project._id}">${escapeHtml(project.name)}</option>`)
      .join('');
  }

  if (taskProjectInput) {
    taskProjectInput.innerHTML = '<option value="">Select Project</option>' + state.projects
      .map((project) => `<option value="${project._id}">${escapeHtml(project.name)}</option>`)
      .join('');
  }
}

async function populateTaskInputs(task = null) {
  const assigneeSelect = document.getElementById('task-assignee-input');
  const projectSelect = document.getElementById('task-project-input');

  populateProjectSelects();

  if (state.user.role === 'admin') {
    const usersResponse = await request('/users', 'GET');
    state.users = usersResponse ? usersResponse.users : [];
  } else {
    const userMap = new Map();
    state.projects.forEach((project) => {
      project.members.forEach((member) => userMap.set(member._id, member));
    });
    state.users = Array.from(userMap.values());
  }

  assigneeSelect.innerHTML = '<option value="">Unassigned</option>' + state.users
    .map((user) => `<option value="${user._id}">${escapeHtml(user.name)} (${escapeHtml(user.role)})</option>`)
    .join('');

  if (task) {
    document.getElementById('task-title').value = task.title;
    document.getElementById('task-description').value = task.description || '';
    projectSelect.value = task.projectId?._id || task.projectId || '';
    assigneeSelect.value = task.assignedTo?._id || '';
    document.getElementById('task-status-input').value = task.status;
    document.getElementById('task-deadline-input').value = task.deadline ? new Date(task.deadline).toISOString().slice(0, 10) : '';

    if (state.user.role !== 'admin') {
      document.getElementById('task-title').disabled = true;
      document.getElementById('task-description').disabled = true;
      document.getElementById('task-project-input').disabled = true;
      document.getElementById('task-assignee-input').disabled = true;
      document.getElementById('task-deadline-input').disabled = true;
    }
  } else {
    document.getElementById('task-title').disabled = false;
    document.getElementById('task-description').disabled = false;
    document.getElementById('task-project-input').disabled = false;
    document.getElementById('task-assignee-input').disabled = false;
    document.getElementById('task-deadline-input').disabled = false;
  }
}

async function openProjectMembers(projectId) {
  state.activeProjectId = projectId;
  await populateMemberModal(projectId);
  openModal('member-modal');
}

async function populateMemberModal(projectId) {
  const project = state.projects.find((item) => item._id === projectId);
  if (!project) {
    return;
  }

  if (state.user.role === 'admin') {
    const usersResponse = await request('/users', 'GET');
    state.users = usersResponse ? usersResponse.users : [];
  }

  const selectableUsers = state.users.filter(
    (user) => !project.members.some((member) => member._id === user._id)
  );

  const select = document.getElementById('member-user-select');
  const currentMembers = document.getElementById('current-members');
  const addButton = document.getElementById('add-member-button');
  const isAdmin = state.user.role === 'admin';

  select.disabled = !isAdmin;
  addButton.classList.toggle('is-hidden', !isAdmin);

  select.innerHTML = selectableUsers.length
    ? selectableUsers.map((user) => `<option value="${user._id}">${escapeHtml(user.name)} (${escapeHtml(user.email)})</option>`).join('')
    : '<option value="">No available users</option>';

  currentMembers.innerHTML = project.members.map((member) => `
    <div class="member-row task-item">
      <div>
        <strong>${escapeHtml(member.name)}</strong>
        <div class="muted">${escapeHtml(member.email)} - ${escapeHtml(member.role)}</div>
      </div>
      ${state.user.role === 'admin' && member._id !== project.createdBy._id
        ? `<button class="button button-danger" type="button" onclick="window.app.removeMember('${project._id}', '${member._id}')">Remove</button>`
        : ''
      }
    </div>
  `).join('');
}

async function editTask(taskId) {
  const task = state.tasks.find((item) => item._id === taskId);
  if (!task) {
    return;
  }

  state.editingTaskId = taskId;
  document.getElementById('task-modal-title').textContent = state.user.role === 'admin' ? 'Edit Task' : 'Update Task Status';
  await populateTaskInputs(task);
  openModal('task-modal');
}

async function deleteTask(taskId) {
  if (!window.confirm('Delete this task?')) {
    return;
  }

  const data = await request(`/tasks/${taskId}`, 'DELETE');
  if (!data) {
    return;
  }

  await loadTasks();
}

async function removeMember(projectId, userId) {
  const data = await request(`/projects/${projectId}/remove-member`, 'POST', { userId });
  if (!data) {
    return;
  }

  await loadProjects();
  await populateMemberModal(projectId);
}

async function request(path, method = 'GET', body = null, silentAuthFailure = false, messageId = null) {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(state.token ? { Authorization: `Bearer ${state.token}` } : {})
      },
      body: body ? JSON.stringify(body) : null
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401 && !silentAuthFailure) {
        clearSession();
        redirectToLogin();
      }

      if (messageId) {
        setMessage(messageId, data.message || 'Request failed');
      } else {
        window.alert(data.message || 'Request failed');
      }
      return null;
    }

    if (messageId) {
      setMessage(messageId, '');
    }

    return data;
  } catch (error) {
    if (messageId) {
      setMessage(messageId, 'Unable to reach the server');
    } else {
      window.alert('Unable to reach the server');
    }
    return null;
  }
}

function saveSession(data) {
  state.token = data.token;
  state.user = data.user;
  localStorage.setItem(AUTH_STORAGE_KEY, data.token);
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
}

function clearSession() {
  state.token = null;
  state.user = null;
  localStorage.removeItem(AUTH_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
}

function redirectToLogin() {
  window.location.href = '/';
}

function toggleAdminOnly(elementId) {
  const element = document.getElementById(elementId);
  if (!element) {
    return;
  }

  element.classList.toggle('is-hidden', state.user.role !== 'admin');
}

function openModal(id) {
  document.getElementById(id).classList.remove('is-hidden');
}

function closeModal(id) {
  document.getElementById(id).classList.add('is-hidden');
}

function renderTaskSummary(task) {
  return `
    <div class="task-item">
      <div class="section-heading">
        <div>
          <h3>${escapeHtml(task.title)}</h3>
          <p class="muted">${escapeHtml(task.projectId?.name || 'Unknown project')}</p>
        </div>
        <span class="status-badge ${statusClass(task.status)}">${formatStatus(task.status)}</span>
      </div>
    </div>
  `;
}

function statusClass(status) {
  return `status-${status}`;
}

function formatStatus(status) {
  if (status === 'in-progress') {
    return 'In Progress';
  }
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatDate(value) {
  return new Date(value).toLocaleDateString();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function setMessage(elementId, message) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = message;
  }
}

window.app = {
  openProjectMembers,
  editTask,
  deleteTask,
  removeMember
};
