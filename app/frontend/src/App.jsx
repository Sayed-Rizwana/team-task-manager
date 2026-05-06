import { useEffect, useMemo, useState } from 'react';
import {
  Link,
  Navigate,
  NavLink,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate
} from 'react-router-dom';
import { apiRequest } from './lib/api';
import {
  AUTH_STORAGE_KEY,
  clearSession,
  readStoredUser,
  saveSession
} from './lib/session';

const emptyTaskForm = {
  title: '',
  description: '',
  projectId: '',
  assignedTo: '',
  status: 'pending',
  deadline: ''
};

const emptyProjectForm = {
  name: '',
  description: ''
};

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem(AUTH_STORAGE_KEY));
  const [user, setUser] = useState(readStoredUser);
  const [isInitializing, setIsInitializing] = useState(Boolean(localStorage.getItem(AUTH_STORAGE_KEY)));

  useEffect(() => {
    let isMounted = true;

    async function validateSession() {
      if (!token) {
        if (isMounted) {
          setUser(null);
          setIsInitializing(false);
        }
        return;
      }

      try {
        const data = await apiRequest('/auth/me', { token });
        if (!isMounted) {
          return;
        }
        setUser(data.user);
      } catch (error) {
        if (!isMounted) {
          return;
        }
        clearSession();
        setToken(null);
        setUser(null);
      } finally {
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    }

    validateSession();

    return () => {
      isMounted = false;
    };
  }, [token]);

  function handleAuthSuccess(data) {
    saveSession(data.token, data.user);
    setToken(data.token);
    setUser(data.user);
  }

  function handleLogout() {
    clearSession();
    setToken(null);
    setUser(null);
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          token && user && !isInitializing ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <AuthPage onAuthSuccess={handleAuthSuccess} />
          )
        }
      />
      <Route
        element={
          <ProtectedLayout
            isInitializing={isInitializing}
            token={token}
            user={user}
            onLogout={handleLogout}
          />
        }
      >
        <Route path="/dashboard" element={<DashboardPage token={token} user={user} />} />
        <Route path="/projects" element={<ProjectsPage token={token} user={user} />} />
        <Route path="/tasks" element={<TasksPage token={token} user={user} />} />
      </Route>
      <Route path="/dashboard.html" element={<Navigate to="/dashboard" replace />} />
      <Route path="/projects.html" element={<Navigate to="/projects" replace />} />
      <Route path="/tasks.html" element={<Navigate to="/tasks" replace />} />
      <Route path="*" element={<Navigate to={token ? '/dashboard' : '/'} replace />} />
    </Routes>
  );
}

function ProtectedLayout({ isInitializing, token, user, onLogout }) {
  if (isInitializing) {
    return (
      <main className="shell shell-auth">
        <div className="card empty-state">Loading your workspace...</div>
      </main>
    );
  }

  if (!token || !user) {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">Team Task Manager</p>
          <PageTitle />
        </div>
        <div className="topbar-actions">
          <div className="user-chip">
            <span>{user.name}</span>
            <span className="role-pill">{user.role}</span>
          </div>
          <button className="button button-secondary" type="button" onClick={onLogout}>
            Logout
          </button>
        </div>
      </header>

      <nav className="nav-bar">
        <NavItem to="/dashboard">Dashboard</NavItem>
        <NavItem to="/projects">Projects</NavItem>
        <NavItem to="/tasks">Tasks</NavItem>
      </nav>

      <Outlet />
    </>
  );
}

function PageTitle() {
  const location = useLocation();
  const titleByPath = {
    '/dashboard': 'Dashboard',
    '/projects': 'Projects',
    '/tasks': 'Tasks'
  };

  return <h1 className="page-title">{titleByPath[location.pathname] || 'Dashboard'}</h1>;
}

function NavItem({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
    >
      {children}
    </NavLink>
  );
}

function AuthPage({ onAuthSuccess }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('login');
  const [message, setMessage] = useState('Use an admin account to create projects and assign tasks.');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'member'
  });

  async function handleSubmit(path, payload) {
    try {
      const data = await apiRequest(path, { method: 'POST', body: payload });
      onAuthSuccess(data);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <main className="shell shell-auth">
      <section className="auth-panel">
        <div className="brand-block">
          <p className="eyebrow">Team Task Manager</p>
          <h1>Manage projects, assignments, and delivery in one place.</h1>
          <p className="lede">
            Sign in to continue or create an account to start organizing work across your team.
          </p>
        </div>

        <div className="card auth-card">
          <div className="tabs">
            <button
              className={`tab-button${activeTab === 'login' ? ' active' : ''}`}
              type="button"
              onClick={() => {
                setActiveTab('login');
                setMessage('');
              }}
            >
              Login
            </button>
            <button
              className={`tab-button${activeTab === 'signup' ? ' active' : ''}`}
              type="button"
              onClick={() => {
                setActiveTab('signup');
                setMessage('');
              }}
            >
              Sign Up
            </button>
          </div>

          {activeTab === 'login' ? (
            <form
              className="auth-form"
              onSubmit={(event) => {
                event.preventDefault();
                handleSubmit('/auth/login', loginForm);
              }}
            >
              <label>
                <span>Email</span>
                <input
                  type="email"
                  value={loginForm.email}
                  placeholder="you@example.com"
                  required
                  onChange={(event) =>
                    setLoginForm((current) => ({ ...current, email: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>Password</span>
                <input
                  type="password"
                  value={loginForm.password}
                  placeholder="Enter your password"
                  required
                  onChange={(event) =>
                    setLoginForm((current) => ({ ...current, password: event.target.value }))
                  }
                />
              </label>
              <button className="button button-primary" type="submit">
                Login
              </button>
            </form>
          ) : (
            <form
              className="auth-form"
              onSubmit={(event) => {
                event.preventDefault();
                handleSubmit('/auth/signup', signupForm);
              }}
            >
              <label>
                <span>Full name</span>
                <input
                  type="text"
                  value={signupForm.name}
                  placeholder="Your name"
                  required
                  onChange={(event) =>
                    setSignupForm((current) => ({ ...current, name: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>Email</span>
                <input
                  type="email"
                  value={signupForm.email}
                  placeholder="you@example.com"
                  required
                  onChange={(event) =>
                    setSignupForm((current) => ({ ...current, email: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>Password</span>
                <input
                  type="password"
                  value={signupForm.password}
                  placeholder="Minimum 6 characters"
                  required
                  onChange={(event) =>
                    setSignupForm((current) => ({ ...current, password: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>Role</span>
                <select
                  value={signupForm.role}
                  onChange={(event) =>
                    setSignupForm((current) => ({ ...current, role: event.target.value }))
                  }
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
              <button className="button button-primary" type="submit">
                Create account
              </button>
            </form>
          )}

          <p className="form-message" aria-live="polite">
            {message}
          </p>
        </div>
      </section>
    </main>
  );
}

function DashboardPage({ token, user }) {
  const [stats, setStats] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      try {
        const [statsData, tasksData] = await Promise.all([
          apiRequest('/dashboard', { token }),
          apiRequest('/tasks', { token })
        ]);

        if (!isMounted) {
          return;
        }

        setStats(statsData.stats);
        setTasks(tasksData.tasks);
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message);
        }
      }
    }

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [token]);

  if (error) {
    return <PageError message={error} />;
  }

  if (!stats) {
    return <PageLoading />;
  }

  const recentTasks = tasks.slice(0, 5);

  return (
    <main className="shell">
      <section className="summary-grid">
        <StatCard label="Total Projects" value={stats.totalProjects} />
        <StatCard label="Total Tasks" value={stats.totalTasks} />
        <StatCard label="Completed" value={stats.completedTasks} />
        <StatCard label="Pending" value={stats.pendingTasks} />
        <StatCard label="In Progress" value={stats.inProgressTasks} />
        <StatCard label="Overdue" value={stats.overdueTasks} alert />
      </section>

      <section className="content-grid">
        <article className="card">
          <div className="section-heading">
            <h2>Recent Tasks</h2>
            <Link className="text-link" to="/tasks">
              Open tasks
            </Link>
          </div>
          <div className="stack-list">
            {recentTasks.length ? (
              recentTasks.map((task) => <TaskSummaryCard key={task._id} task={task} />)
            ) : (
              <div className="empty-state">No tasks yet.</div>
            )}
          </div>
        </article>

        <article className="card">
          <div className="section-heading">
            <h2>Your Access</h2>
          </div>
          <div className="info-panel">
            {user.role === 'admin' ? (
              <p>
                You have admin access. Create projects, manage members, assign tasks, and review
                all delivery activity.
              </p>
            ) : (
              <p>
                You have member access. Review your projects and keep task statuses up to date as
                work moves forward.
              </p>
            )}
          </div>
        </article>
      </section>
    </main>
  );
}

function ProjectsPage({ token, user }) {
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [isProjectModalOpen, setProjectModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectForm, setProjectForm] = useState(emptyProjectForm);
  const [error, setError] = useState('');

  async function loadProjects() {
    const data = await apiRequest('/projects', { token });
    setProjects(data.projects);
    return data.projects;
  }

  useEffect(() => {
    loadProjects().catch((loadError) => setError(loadError.message));
  }, [token]);

  async function openMembers(project) {
    setSelectedProject(project);
    if (user.role === 'admin') {
      try {
        const data = await apiRequest('/users', { token });
        setUsers(data.users);
      } catch (loadError) {
        setError(loadError.message);
      }
    }
  }

  async function handleCreateProject(event) {
    event.preventDefault();
    try {
      await apiRequest('/projects', {
        method: 'POST',
        token,
        body: projectForm
      });
      setProjectForm(emptyProjectForm);
      setProjectModalOpen(false);
      await loadProjects();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function handleAddMember(userId) {
    if (!selectedProject || !userId) {
      return;
    }

    try {
      await apiRequest(`/projects/${selectedProject._id}/add-member`, {
        method: 'POST',
        token,
        body: { userId }
      });
      const refreshedProjects = await loadProjects();
      const updated = refreshedProjects.find((project) => project._id === selectedProject._id);
      setSelectedProject(updated || null);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function handleRemoveMember(userId) {
    if (!selectedProject) {
      return;
    }

    try {
      await apiRequest(`/projects/${selectedProject._id}/remove-member`, {
        method: 'POST',
        token,
        body: { userId }
      });
      const refreshedProjects = await loadProjects();
      const updated = refreshedProjects.find((project) => project._id === selectedProject._id);
      setSelectedProject(updated || null);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  const selectableUsers = useMemo(() => {
    if (!selectedProject) {
      return [];
    }

    return users.filter(
      (item) => !selectedProject.members.some((member) => member._id === item._id)
    );
  }, [selectedProject, users]);

  const selectedProjectForModal =
    selectedProject && projects.find((project) => project._id === selectedProject._id);

  if (error && !projects.length) {
    return <PageError message={error} />;
  }

  return (
    <>
      <main className="shell">
        <section className="card section-toolbar">
          <div>
            <h2>Project Workspace</h2>
            <p className="muted">
              Admins can create projects and manage members. Members can review their assigned
              projects.
            </p>
          </div>
          {user.role === 'admin' ? (
            <button
              className="button button-primary"
              type="button"
              onClick={() => setProjectModalOpen(true)}
            >
              New Project
            </button>
          ) : null}
        </section>

        {error ? <p className="form-message">{error}</p> : null}

        <section className="project-grid">
          {projects.length ? (
            projects.map((project) => (
              <article key={project._id} className="project-item">
                <h3>{project.name}</h3>
                <p className="muted">{project.description || 'No description provided.'}</p>
                <div className="project-meta">
                  <span>Owner: {project.createdBy.name}</span>
                  <span>Members: {project.members.length}</span>
                </div>
                <div className="project-actions">
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={() => openMembers(project)}
                  >
                    View Members
                  </button>
                </div>
              </article>
            ))
          ) : (
            <div className="card empty-state">No projects available yet.</div>
          )}
        </section>
      </main>

      {isProjectModalOpen ? (
        <Modal title="Create Project" onClose={() => setProjectModalOpen(false)}>
          <form className="modal-form" onSubmit={handleCreateProject}>
            <label>
              <span>Project name</span>
              <input
                type="text"
                value={projectForm.name}
                required
                onChange={(event) =>
                  setProjectForm((current) => ({ ...current, name: event.target.value }))
                }
              />
            </label>
            <label>
              <span>Description</span>
              <textarea
                rows="4"
                placeholder="Short project summary"
                value={projectForm.description}
                onChange={(event) =>
                  setProjectForm((current) => ({ ...current, description: event.target.value }))
                }
              />
            </label>
            <button className="button button-primary" type="submit">
              Save Project
            </button>
          </form>
        </Modal>
      ) : null}

      {selectedProjectForModal ? (
        <MemberModal
          project={selectedProjectForModal}
          selectableUsers={selectableUsers}
          isAdmin={user.role === 'admin'}
          onAddMember={handleAddMember}
          onRemoveMember={handleRemoveMember}
          onClose={() => setSelectedProject(null)}
        />
      ) : null}
    </>
  );
}

function TasksPage({ token, user }) {
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({ projectId: '', status: '' });
  const [isTaskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskForm, setTaskForm] = useState(emptyTaskForm);
  const [error, setError] = useState('');

  useEffect(() => {
    apiRequest('/projects', { token })
      .then((data) => setProjects(data.projects))
      .catch((loadError) => setError(loadError.message));
  }, [token]);

  useEffect(() => {
    const query = new URLSearchParams();
    if (filters.projectId) {
      query.set('projectId', filters.projectId);
    }
    if (filters.status) {
      query.set('status', filters.status);
    }

    const suffix = query.toString() ? `?${query.toString()}` : '';
    apiRequest(`/tasks${suffix}`, { token })
      .then((data) => setTasks(data.tasks))
      .catch((loadError) => setError(loadError.message));
  }, [filters, token]);

  async function loadUsersForTaskModal() {
    if (user.role === 'admin') {
      const data = await apiRequest('/users', { token });
      setUsers(data.users);
      return data.users;
    }

    const memberMap = new Map();
    projects.forEach((project) => {
      project.members.forEach((member) => {
        memberMap.set(member._id, member);
      });
    });
    const memberUsers = Array.from(memberMap.values());
    setUsers(memberUsers);
    return memberUsers;
  }

  async function openCreateTaskModal() {
    try {
      await loadUsersForTaskModal();
      setEditingTask(null);
      setTaskForm(emptyTaskForm);
      setTaskModalOpen(true);
    } catch (loadError) {
      setError(loadError.message);
    }
  }

  async function openEditTaskModal(task) {
    try {
      await loadUsersForTaskModal();
      setEditingTask(task);
      setTaskForm({
        title: task.title,
        description: task.description || '',
        projectId: task.projectId?._id || '',
        assignedTo: task.assignedTo?._id || '',
        status: task.status,
        deadline: task.deadline ? new Date(task.deadline).toISOString().slice(0, 10) : ''
      });
      setTaskModalOpen(true);
    } catch (loadError) {
      setError(loadError.message);
    }
  }

  async function reloadTasks(currentFilters = filters) {
    const query = new URLSearchParams();
    if (currentFilters.projectId) {
      query.set('projectId', currentFilters.projectId);
    }
    if (currentFilters.status) {
      query.set('status', currentFilters.status);
    }
    const suffix = query.toString() ? `?${query.toString()}` : '';
    const data = await apiRequest(`/tasks${suffix}`, { token });
    setTasks(data.tasks);
  }

  async function handleSaveTask(event) {
    event.preventDefault();

    const path = editingTask ? `/tasks/${editingTask._id}` : '/tasks';
    const method = editingTask ? 'PUT' : 'POST';
    const body =
      user.role === 'admin' || !editingTask
        ? {
            title: taskForm.title.trim(),
            description: taskForm.description.trim(),
            projectId: taskForm.projectId,
            assignedTo: taskForm.assignedTo || null,
            status: taskForm.status,
            deadline: taskForm.deadline || null
          }
        : { status: taskForm.status };

    try {
      await apiRequest(path, { method, token, body });
      setTaskModalOpen(false);
      setEditingTask(null);
      setTaskForm(emptyTaskForm);
      await reloadTasks();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function handleDeleteTask(taskId) {
    if (!window.confirm('Delete this task?')) {
      return;
    }

    try {
      await apiRequest(`/tasks/${taskId}`, { method: 'DELETE', token });
      await reloadTasks();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  const canEditTask = (task) => user.role === 'admin' || task.assignedTo?._id === user._id;
  const availableAssignees = useMemo(() => {
    if (!taskForm.projectId) {
      return users;
    }

    const activeProject = projects.find((project) => project._id === taskForm.projectId);
    if (!activeProject) {
      return users;
    }

    return users.filter((item) => activeProject.members.some((member) => member._id === item._id));
  }, [projects, taskForm.projectId, users]);

  if (error && !projects.length && !tasks.length) {
    return <PageError message={error} />;
  }

  return (
    <>
      <main className="shell">
        <section className="card section-toolbar">
          <div>
            <h2>Task Board</h2>
            <p className="muted">
              Admins can create and assign tasks. Members can update the status of their work.
            </p>
          </div>
          {user.role === 'admin' ? (
            <button className="button button-primary" type="button" onClick={openCreateTaskModal}>
              New Task
            </button>
          ) : null}
        </section>

        <section className="card filter-bar">
          <label>
            <span>Project</span>
            <select
              value={filters.projectId}
              onChange={(event) =>
                setFilters((current) => ({ ...current, projectId: event.target.value }))
              }
            >
              <option value="">All Projects</option>
              {projects.map((project) => (
                <option key={project._id} value={project._id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Status</span>
            <select
              value={filters.status}
              onChange={(event) =>
                setFilters((current) => ({ ...current, status: event.target.value }))
              }
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </label>
        </section>

        {error ? <p className="form-message">{error}</p> : null}

        <section className="stack-list">
          {tasks.length ? (
            tasks.map((task) => {
              const overdue =
                task.deadline &&
                new Date(task.deadline) < new Date() &&
                task.status !== 'completed';

              return (
                <article key={task._id} className="task-item">
                  <div className="section-heading">
                    <div>
                      <h3>{task.title}</h3>
                      <p className="muted">{task.description || 'No description provided.'}</p>
                    </div>
                    <span className={`status-badge ${statusClass(task.status)}`}>
                      {formatStatus(task.status)}
                    </span>
                  </div>
                  <div className="task-meta">
                    <span>Project: {task.projectId?.name || 'Unknown'}</span>
                    <span>Assigned: {task.assignedTo?.name || 'Unassigned'}</span>
                    <span>Deadline: {task.deadline ? formatDate(task.deadline) : 'None'}</span>
                    {overdue ? <span className="status-overdue">Overdue</span> : null}
                  </div>
                  <div className="task-actions">
                    {canEditTask(task) ? (
                      <button
                        className="button button-secondary"
                        type="button"
                        onClick={() => openEditTaskModal(task)}
                      >
                        {user.role === 'admin' ? 'Edit Task' : 'Update Status'}
                      </button>
                    ) : null}
                    {user.role === 'admin' ? (
                      <button
                        className="button button-danger"
                        type="button"
                        onClick={() => handleDeleteTask(task._id)}
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })
          ) : (
            <div className="card empty-state">No tasks match the current filters.</div>
          )}
        </section>
      </main>

      {isTaskModalOpen ? (
        <Modal
          title={user.role === 'admin' ? (editingTask ? 'Edit Task' : 'Create Task') : 'Update Task Status'}
          onClose={() => {
            setTaskModalOpen(false);
            setEditingTask(null);
            setTaskForm(emptyTaskForm);
          }}
        >
          <form className="modal-form" onSubmit={handleSaveTask}>
            <label>
              <span>Title</span>
              <input
                type="text"
                value={taskForm.title}
                required
                disabled={user.role !== 'admin' && Boolean(editingTask)}
                onChange={(event) =>
                  setTaskForm((current) => ({ ...current, title: event.target.value }))
                }
              />
            </label>
            <label>
              <span>Description</span>
              <textarea
                rows="4"
                value={taskForm.description}
                disabled={user.role !== 'admin' && Boolean(editingTask)}
                onChange={(event) =>
                  setTaskForm((current) => ({ ...current, description: event.target.value }))
                }
              />
            </label>
            <label>
              <span>Project</span>
              <select
                value={taskForm.projectId}
                required
                disabled={user.role !== 'admin' && Boolean(editingTask)}
                onChange={(event) =>
                  setTaskForm((current) => ({
                    ...current,
                    projectId: event.target.value,
                    assignedTo: ''
                  }))
                }
              >
                <option value="">Select Project</option>
                {projects.map((project) => (
                  <option key={project._id} value={project._id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Assign to</span>
              <select
                value={taskForm.assignedTo}
                disabled={user.role !== 'admin' && Boolean(editingTask)}
                onChange={(event) =>
                  setTaskForm((current) => ({ ...current, assignedTo: event.target.value }))
                }
              >
                <option value="">Unassigned</option>
                {availableAssignees.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.name} ({item.role})
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Status</span>
              <select
                value={taskForm.status}
                onChange={(event) =>
                  setTaskForm((current) => ({ ...current, status: event.target.value }))
                }
              >
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </label>
            <label>
              <span>Deadline</span>
              <input
                type="date"
                value={taskForm.deadline}
                disabled={user.role !== 'admin' && Boolean(editingTask)}
                onChange={(event) =>
                  setTaskForm((current) => ({ ...current, deadline: event.target.value }))
                }
              />
            </label>
            <button className="button button-primary" type="submit">
              Save Task
            </button>
          </form>
        </Modal>
      ) : null}
    </>
  );
}

function MemberModal({ project, selectableUsers, isAdmin, onAddMember, onRemoveMember, onClose }) {
  const [selectedUserId, setSelectedUserId] = useState(selectableUsers[0]?._id || '');

  useEffect(() => {
    setSelectedUserId(selectableUsers[0]?._id || '');
  }, [selectableUsers]);

  return (
    <Modal title="Manage Members" onClose={onClose}>
      <div className="modal-form">
        <label>
          <span>Select user</span>
          <select
            value={selectedUserId}
            disabled={!isAdmin}
            onChange={(event) => setSelectedUserId(event.target.value)}
          >
            {selectableUsers.length ? (
              selectableUsers.map((user) => (
                <option key={user._id} value={user._id}>
                  {user.name} ({user.email})
                </option>
              ))
            ) : (
              <option value="">No available users</option>
            )}
          </select>
        </label>
        {isAdmin ? (
          <button
            className="button button-primary"
            type="button"
            onClick={() => onAddMember(selectedUserId)}
          >
            Add to Project
          </button>
        ) : null}
        <div className="stack-list">
          {project.members.map((member) => (
            <div key={member._id} className="member-row task-item">
              <div>
                <strong>{member.name}</strong>
                <div className="muted">
                  {member.email} - {member.role}
                </div>
              </div>
              {isAdmin && member._id !== project.createdBy._id ? (
                <button
                  className="button button-danger"
                  type="button"
                  onClick={() => onRemoveMember(member._id)}
                >
                  Remove
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="icon-button" type="button" onClick={onClose}>
            x
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function StatCard({ label, value, alert = false }) {
  return (
    <article className={`card stat-card${alert ? ' stat-alert' : ''}`}>
      <p>{label}</p>
      <strong>{value}</strong>
    </article>
  );
}

function TaskSummaryCard({ task }) {
  return (
    <div className="task-item">
      <div className="section-heading">
        <div>
          <h3>{task.title}</h3>
          <p className="muted">{task.projectId?.name || 'Unknown project'}</p>
        </div>
        <span className={`status-badge ${statusClass(task.status)}`}>
          {formatStatus(task.status)}
        </span>
      </div>
    </div>
  );
}

function PageLoading() {
  return (
    <main className="shell">
      <div className="card empty-state">Loading...</div>
    </main>
  );
}

function PageError({ message }) {
  return (
    <main className="shell">
      <div className="card empty-state">{message}</div>
    </main>
  );
}

function statusClass(status) {
  return `status-${status}`;
}

function formatStatus(status) {
  return status === 'in-progress'
    ? 'In Progress'
    : status.charAt(0).toUpperCase() + status.slice(1);
}

function formatDate(value) {
  return new Date(value).toLocaleDateString();
}
