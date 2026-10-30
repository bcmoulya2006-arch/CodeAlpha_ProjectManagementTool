/**
 * PulseBoard Application Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

async function initApp() {
  setupEventListeners();
  setupRealtimeListeners();
  Realtime.connect();

  const token = API.getToken();
  if (token) {
    try {
      const res = await API.getMe();
      if (res.success && res.user) {
        State.setState({ currentUser: res.user });
      }
    } catch (e) {
      API.setToken(null);
      State.setState({ currentUser: null });
    }
  }

  UI.renderSidebarUser(State.getState().currentUser);

  // If user is logged in, load projects and users
  if (State.getState().currentUser) {
    await loadInitialData();
  } else {
    // Open auth modal or prompt
    UI.renderSidebarProjects([], null);
    UI.showToast('Welcome to PulseBoard! Log in to access project boards.', 'info');
    document.getElementById('auth-modal').style.display = 'flex';
  }
}

async function loadInitialData() {
  try {
    const [projRes, usersRes] = await Promise.all([
      API.getProjects(),
      API.getAllUsers()
    ]);

    const projects = projRes.projects || [];
    State.setState({
      projects,
      usersList: usersRes.users || []
    });

    if (projects.length > 0) {
      await loadProject(projects[0].id);
    }
  } catch (err) {
    console.error('Error loading initial projects:', err);
  }
}

async function loadProject(projectId) {
  try {
    const res = await API.getProjectById(projectId);
    if (res.success && res.project) {
      State.setState({ currentProject: res.project });
      UI.renderSidebarProjects(State.getState().projects, res.project.id);
      UI.renderSidebarMembers(res.project.members || []);
      UI.renderActivities(res.project.activities || []);
      renderBoard();
    }
  } catch (err) {
    UI.showToast(err.message || 'Failed to load project board.', 'error');
  }
}

function renderBoard() {
  const { currentProject, filterSearch, filterPriority } = State.getState();
  UI.renderKanbanBoard(currentProject, {
    search: filterSearch,
    priority: filterPriority
  });
}

/**
 * Setup Realtime WebSocket event listeners
 */
function setupRealtimeListeners() {
  Realtime.on('TASK_CREATED', (payload) => {
    const { currentProject, currentUser } = State.getState();
    if (currentProject && currentProject.id === payload.projectId) {
      // Find column and add task
      const col = currentProject.columns.find((c) => c.id === payload.columnId);
      if (col) {
        col.tasks.unshift(payload.task);
        renderBoard();
      }
      if (!currentUser || currentUser.id !== payload.user?.id) {
        UI.showToast(`${payload.user?.name || 'A teammate'} added task "${payload.task.title}"`, 'info');
      }
    }
  });

  Realtime.on('TASK_MOVED', (payload) => {
    const { currentProject, currentUser } = State.getState();
    if (currentProject && currentProject.id === payload.projectId) {
      // Remove from source col and add to target col
      const fromCol = currentProject.columns.find((c) => c.id === payload.fromColumnId);
      const toCol = currentProject.columns.find((c) => c.id === payload.toColumnId);

      if (fromCol && toCol) {
        fromCol.tasks = fromCol.tasks.filter((t) => t.id !== payload.taskId);
        toCol.tasks.push(payload.task);
        renderBoard();
      }

      if (!currentUser || currentUser.id !== payload.user?.id) {
        UI.showToast(`${payload.user?.name || 'A teammate'} moved task to ${toCol?.title || 'column'}`, 'info');
      }
    }
  });

  Realtime.on('TASK_DELETED', (payload) => {
    const { currentProject } = State.getState();
    if (currentProject && currentProject.id === payload.projectId) {
      const col = currentProject.columns.find((c) => c.id === payload.columnId);
      if (col) {
        col.tasks = col.tasks.filter((t) => t.id !== payload.taskId);
        renderBoard();
      }
    }
  });

  Realtime.on('COMMENT_ADDED', (payload) => {
    const { currentProject, selectedTask } = State.getState();
    if (currentProject && currentProject.id === payload.projectId) {
      // Increment task comments count
      for (const col of currentProject.columns) {
        const t = col.tasks.find((x) => x.id === payload.taskId);
        if (t) {
          t.comments_count = (t.comments_count || 0) + 1;
          break;
        }
      }
      renderBoard();

      // If details modal is open for this task, append comment
      if (selectedTask && selectedTask.id === payload.taskId) {
        selectedTask.comments = selectedTask.comments || [];
        selectedTask.comments.push(payload.comment);
        UI.renderTaskDetailsModal(selectedTask);
      }
    }
  });

  Realtime.on('MEMBER_ADDED', (payload) => {
    const { currentProject } = State.getState();
    if (currentProject && currentProject.id === payload.projectId) {
      currentProject.members = currentProject.members || [];
      currentProject.members.push(payload.member);
      UI.renderSidebarMembers(currentProject.members);
      UI.showToast(`${payload.member.name} joined the project board!`, 'success');
    }
  });
}

/**
 * Setup Event Listeners
 */
function setupEventListeners() {
  // Click on project in sidebar
  document.addEventListener('click', async (e) => {
    const projectItem = e.target.closest('[data-project-id]');
    if (projectItem) {
      const id = parseInt(projectItem.dataset.projectId, 10);
      if (id) loadProject(id);
      return;
    }

    // Move task button
    const moveBtn = e.target.closest('[data-action="move-task"]');
    if (moveBtn) {
      e.stopPropagation();
      const taskId = moveBtn.dataset.taskId;
      const targetColId = moveBtn.dataset.targetCol;
      handleMoveTask(taskId, targetColId);
      return;
    }

    // Quick add task button on column header
    const quickAddBtn = e.target.closest('[data-action="quick-add-task"]');
    if (quickAddBtn) {
      const colId = quickAddBtn.dataset.columnId;
      openNewTaskModal(colId);
      return;
    }

    // Open task card details
    const taskCard = e.target.closest('.task-card');
    if (taskCard) {
      const taskId = taskCard.dataset.taskId;
      openTaskDetails(taskId);
      return;
    }

    // Quick demo user button
    const demoBtn = e.target.closest('.demo-user-btn');
    if (demoBtn) {
      const username = demoBtn.dataset.user;
      handleDemoLogin(username);
      return;
    }
  });

  // Top nav controls
  const searchInput = document.getElementById('task-filter-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      State.setState({ filterSearch: e.target.value.trim() });
      renderBoard();
    });
  }

  const prioFilter = document.getElementById('priority-filter');
  if (prioFilter) {
    prioFilter.addEventListener('change', (e) => {
      State.setState({ filterPriority: e.target.value });
      renderBoard();
    });
  }

  // Activity Drawer Toggle
  const toggleActivityBtn = document.getElementById('toggle-activity-sidebar-btn');
  const closeActivityBtn = document.getElementById('close-activity-drawer');
  const activityDrawer = document.getElementById('activity-drawer');

  if (toggleActivityBtn && activityDrawer) {
    toggleActivityBtn.addEventListener('click', () => {
      activityDrawer.classList.toggle('open');
    });
  }
  if (closeActivityBtn && activityDrawer) {
    closeActivityBtn.addEventListener('click', () => {
      activityDrawer.classList.remove('open');
    });
  }

  // Modals Openers & Closers
  document.getElementById('open-new-project-btn')?.addEventListener('click', () => {
    document.getElementById('new-project-modal').style.display = 'flex';
  });
  document.getElementById('new-project-close')?.addEventListener('click', () => {
    document.getElementById('new-project-modal').style.display = 'none';
  });

  document.getElementById('open-new-task-btn')?.addEventListener('click', () => {
    openNewTaskModal();
  });
  document.getElementById('new-task-close')?.addEventListener('click', () => {
    document.getElementById('new-task-modal').style.display = 'none';
  });

  document.getElementById('open-invite-member-btn')?.addEventListener('click', () => {
    document.getElementById('invite-modal').style.display = 'flex';
  });
  document.getElementById('invite-modal-close')?.addEventListener('click', () => {
    document.getElementById('invite-modal').style.display = 'none';
  });

  document.getElementById('task-details-close')?.addEventListener('click', () => {
    document.getElementById('task-details-modal').style.display = 'none';
    State.setState({ selectedTask: null });
  });

  document.getElementById('open-auth-btn')?.addEventListener('click', () => {
    document.getElementById('auth-modal').style.display = 'flex';
  });
  document.getElementById('auth-modal-close')?.addEventListener('click', () => {
    document.getElementById('auth-modal').style.display = 'none';
  });

  document.getElementById('logout-btn')?.addEventListener('click', handleLogout);

  // Auth tabs switch
  const tabLogin = document.getElementById('tab-auth-login');
  const tabRegister = document.getElementById('tab-auth-register');
  const formLogin = document.getElementById('login-form');
  const formRegister = document.getElementById('register-form');

  if (tabLogin && tabRegister) {
    tabLogin.addEventListener('click', () => {
      tabLogin.classList.add('active');
      tabRegister.classList.remove('active');
      formLogin.style.display = 'flex';
      formRegister.style.display = 'none';
    });
    tabRegister.addEventListener('click', () => {
      tabRegister.classList.add('active');
      tabLogin.classList.remove('active');
      formLogin.style.display = 'none';
      formRegister.style.display = 'flex';
    });
  }

  // Form Submissions
  formLogin?.addEventListener('submit', handleLogin);
  formRegister?.addEventListener('submit', handleRegister);
  document.getElementById('new-project-form')?.addEventListener('submit', handleCreateProject);
  document.getElementById('new-task-form')?.addEventListener('submit', handleCreateTask);
  document.getElementById('invite-member-form')?.addEventListener('submit', handleInviteMember);
  document.getElementById('add-comment-form')?.addEventListener('submit', handleAddComment);
  document.getElementById('delete-task-btn')?.addEventListener('click', handleDeleteCurrentTask);
}

/**
 * Handle Task Move
 */
async function handleMoveTask(taskId, targetColumnId) {
  try {
    const res = await API.moveTask(taskId, { targetColumnId: parseInt(targetColumnId, 10) });
    if (res.success) {
      UI.showToast(res.message, 'success');
    }
  } catch (err) {
    UI.showToast(err.message || 'Error moving task.', 'error');
  }
}

/**
 * Open Task Details Modal
 */
async function openTaskDetails(taskId) {
  try {
    const res = await API.getTaskDetails(taskId);
    if (res.success && res.task) {
      State.setState({ selectedTask: res.task });
      UI.renderTaskDetailsModal(res.task);
    }
  } catch (err) {
    UI.showToast(err.message || 'Failed to open task details.', 'error');
  }
}

/**
 * Open New Task Modal & Populate Options
 */
function openNewTaskModal(preselectColId = null) {
  const { currentProject, usersList } = State.getState();
  if (!currentProject) return;

  const colSelect = document.getElementById('task-column-select');
  colSelect.innerHTML = currentProject.columns.map((c) => {
    const selected = preselectColId && String(c.id) === String(preselectColId) ? 'selected' : '';
    return `<option value="${c.id}" ${selected}>${UI.escapeHTML(c.title)}</option>`;
  }).join('');

  const assigneeSelect = document.getElementById('task-assignee-select');
  assigneeSelect.innerHTML = `
    <option value="">Unassigned</option>
    ${usersList.map((u) => `<option value="${u.id}">${UI.escapeHTML(u.name)} (@${UI.escapeHTML(u.username)})</option>`).join('')}
  `;

  document.getElementById('task-title-input').value = '';
  document.getElementById('task-desc-input').value = '';
  document.getElementById('task-due-date-input').value = '';
  document.getElementById('new-task-error').style.display = 'none';

  document.getElementById('new-task-modal').style.display = 'flex';
}

/**
 * Create Task Handler
 */
async function handleCreateTask(e) {
  e.preventDefault();
  const { currentProject } = State.getState();
  if (!currentProject) return;

  const title = document.getElementById('task-title-input').value.trim();
  const columnId = parseInt(document.getElementById('task-column-select').value, 10);
  const priority = document.getElementById('task-priority-select').value;
  const dueDate = document.getElementById('task-due-date-input').value;
  const assigneeId = document.getElementById('task-assignee-select').value || null;
  const description = document.getElementById('task-desc-input').value.trim();

  try {
    const res = await API.createTask({
      projectId: currentProject.id,
      columnId,
      title,
      description,
      priority,
      dueDate,
      assigneeId: assigneeId ? parseInt(assigneeId, 10) : null
    });

    if (res.success) {
      document.getElementById('new-task-modal').style.display = 'none';
      UI.showToast('Task card created!', 'success');
    }
  } catch (err) {
    const errEl = document.getElementById('new-task-error');
    errEl.textContent = err.message || 'Error creating task.';
    errEl.style.display = 'block';
  }
}

/**
 * Create Project Handler
 */
async function handleCreateProject(e) {
  e.preventDefault();
  const title = document.getElementById('project-title-input').value.trim();
  const description = document.getElementById('project-desc-input').value.trim();
  const colorInput = document.querySelector('input[name="project-color"]:checked');
  const color = colorInput ? colorInput.value : '#6366f1';

  try {
    const res = await API.createProject({ title, description, color });
    if (res.success && res.project) {
      document.getElementById('new-project-modal').style.display = 'none';
      UI.showToast(`Workspace "${res.project.title}" created!`, 'success');

      // Reload project list and navigate to new project
      const projRes = await API.getProjects();
      State.setState({ projects: projRes.projects || [] });
      await loadProject(res.project.id);
    }
  } catch (err) {
    const errEl = document.getElementById('new-project-error');
    errEl.textContent = err.message || 'Error creating project.';
    errEl.style.display = 'block';
  }
}

/**
 * Add Comment Handler
 */
async function handleAddComment(e) {
  e.preventDefault();
  const { selectedTask } = State.getState();
  if (!selectedTask) return;

  const input = document.getElementById('new-comment-input');
  const content = input.value.trim();
  if (!content) return;

  try {
    const res = await API.addComment(selectedTask.id, content);
    if (res.success) {
      input.value = '';
    }
  } catch (err) {
    UI.showToast(err.message || 'Error posting comment.', 'error');
  }
}

/**
 * Delete Current Task
 */
async function handleDeleteCurrentTask() {
  const { selectedTask } = State.getState();
  if (!selectedTask) return;

  if (!confirm(`Delete task "${selectedTask.title}"?`)) return;

  try {
    const res = await API.deleteTask(selectedTask.id);
    if (res.success) {
      document.getElementById('task-details-modal').style.display = 'none';
      State.setState({ selectedTask: null });
      UI.showToast('Task deleted.', 'info');
    }
  } catch (err) {
    UI.showToast(err.message || 'Error deleting task.', 'error');
  }
}

/**
 * Invite Member Handler
 */
async function handleInviteMember(e) {
  e.preventDefault();
  const { currentProject } = State.getState();
  if (!currentProject) return;

  const usernameOrEmail = document.getElementById('invite-user-input').value.trim();
  const role = document.getElementById('invite-role-select').value;

  try {
    const res = await API.addMember(currentProject.id, { usernameOrEmail, role });
    if (res.success) {
      document.getElementById('invite-modal').style.display = 'none';
      document.getElementById('invite-user-input').value = '';
      UI.showToast(res.message, 'success');
    }
  } catch (err) {
    const errEl = document.getElementById('invite-error');
    errEl.textContent = err.message || 'Failed to add member.';
    errEl.style.display = 'block';
  }
}

/**
 * Authentication Handlers
 */
async function handleLogin(e) {
  e.preventDefault();
  const usernameOrEmail = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;

  try {
    const res = await API.login({ usernameOrEmail, password });
    if (res.success && res.token) {
      API.setToken(res.token);
      State.setState({ currentUser: res.user });
      document.getElementById('auth-modal').style.display = 'none';
      UI.renderSidebarUser(res.user);
      UI.showToast(`Welcome back, ${res.user.name}!`, 'success');
      await loadInitialData();
    }
  } catch (err) {
    const errEl = document.getElementById('login-error');
    errEl.textContent = err.message || 'Login failed.';
    errEl.style.display = 'block';
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById('register-name').value.trim();
  const username = document.getElementById('register-username').value.trim();
  const email = document.getElementById('register-email').value.trim();
  const password = document.getElementById('register-password').value;

  try {
    const res = await API.register({ name, username, email, password });
    if (res.success && res.token) {
      API.setToken(res.token);
      State.setState({ currentUser: res.user });
      document.getElementById('auth-modal').style.display = 'none';
      UI.renderSidebarUser(res.user);
      UI.showToast(`Account created! Welcome, ${res.user.name}.`, 'success');
      await loadInitialData();
    }
  } catch (err) {
    const errEl = document.getElementById('register-error');
    errEl.textContent = err.message || 'Registration failed.';
    errEl.style.display = 'block';
  }
}

async function handleDemoLogin(username) {
  try {
    const res = await API.login({ usernameOrEmail: username, password: 'password123' });
    if (res.success && res.token) {
      API.setToken(res.token);
      State.setState({ currentUser: res.user });
      document.getElementById('auth-modal').style.display = 'none';
      UI.renderSidebarUser(res.user);
      UI.showToast(`Switched user: ${res.user.name}`, 'success');
      await loadInitialData();
    }
  } catch (err) {
    UI.showToast('Demo login error: ' + err.message, 'error');
  }
}

function handleLogout() {
  API.setToken(null);
  State.setState({ currentUser: null, currentProject: null, projects: [] });
  UI.renderSidebarUser(null);
  UI.renderSidebarProjects([], null);
  UI.renderSidebarMembers([]);
  UI.showToast('Logged out.', 'info');
  document.getElementById('auth-modal').style.display = 'flex';
}
