/**
 * PulseBoard UI Rendering & DOM Management
 */

const UI = (() => {

  function escapeHTML(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'fa-circle-info';
    if (type === 'success') icon = 'fa-circle-check';
    if (type === 'error') icon = 'fa-triangle-exclamation';

    toast.innerHTML = `<i class="fa-solid ${icon}"></i><span>${escapeHTML(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease-out';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  function renderSidebarProjects(projects, currentProjectId) {
    const container = document.getElementById('sidebar-projects-list');
    if (!container) return;

    if (!projects || projects.length === 0) {
      container.innerHTML = `<div style="font-size:0.8rem; color:var(--text-dim); padding:6px 10px;">No projects yet.</div>`;
      return;
    }

    container.innerHTML = projects.map((p) => {
      const isActive = p.id === currentProjectId;
      return `
        <div class="project-nav-item ${isActive ? 'active' : ''}" data-project-id="${p.id}">
          <span class="project-dot" style="background: ${p.color || '#6366f1'};"></span>
          <span>${escapeHTML(p.title)}</span>
        </div>
      `;
    }).join('');
  }

  function renderSidebarMembers(members) {
    const container = document.getElementById('sidebar-members-list');
    if (!container) return;

    if (!members || members.length === 0) {
      container.innerHTML = `<div style="font-size:0.8rem; color:var(--text-dim); padding:6px 10px;">No collaborators.</div>`;
      return;
    }

    container.innerHTML = members.map((m) => {
      return `
        <div class="member-pill">
          <img src="${escapeHTML(m.avatar || 'https://api.dicebear.com/7.x/initials/svg?seed=' + m.username)}" class="avatar-sm" alt="${escapeHTML(m.name)}">
          <span>${escapeHTML(m.name)}</span>
          <span class="member-role-badge">${m.role}</span>
        </div>
      `;
    }).join('');
  }

  function renderSidebarUser(user) {
    const container = document.getElementById('sidebar-user-section');
    if (!container) return;

    if (user) {
      container.innerHTML = `
        <div class="user-card">
          <div class="user-card-info">
            <img src="${escapeHTML(user.avatar || 'https://api.dicebear.com/7.x/initials/svg?seed=' + user.username)}" class="avatar-sm" alt="${escapeHTML(user.name)}">
            <div class="user-card-names">
              <strong>${escapeHTML(user.name)}</strong>
              <span>@${escapeHTML(user.username)}</span>
            </div>
          </div>
          <button class="btn-icon-logout" id="logout-btn" title="Sign out">
            <i class="fa-solid fa-arrow-right-from-bracket"></i>
          </button>
        </div>
      `;
    } else {
      container.innerHTML = `
        <button class="btn btn-primary btn-block" id="open-auth-btn">
          <i class="fa-solid fa-arrow-right-to-bracket"></i>
          <span>Sign In / Register</span>
        </button>
      `;
    }
  }

  function renderKanbanBoard(project, filters) {
    const container = document.getElementById('kanban-board');
    if (!container) return;

    if (!project || !project.columns) {
      container.innerHTML = `
        <div class="board-loading">
          <div class="spinner"></div>
          <p>Loading project workspace...</p>
        </div>
      `;
      return;
    }

    // Set header info
    document.getElementById('current-project-title').textContent = project.title;
    document.getElementById('current-project-desc').textContent = project.description || 'Collaborative Kanban workspace';
    document.getElementById('project-color-pill').style.background = project.color || '#6366f1';

    const columns = project.columns;

    container.innerHTML = columns.map((col, colIdx) => {
      // Filter tasks
      let filteredTasks = col.tasks || [];
      if (filters.search) {
        const q = filters.search.toLowerCase();
        filteredTasks = filteredTasks.filter((t) =>
          t.title.toLowerCase().includes(q) || (t.description && t.description.toLowerCase().includes(q))
        );
      }
      if (filters.priority) {
        filteredTasks = filteredTasks.filter((t) => t.priority === filters.priority);
      }

      const prevColId = colIdx > 0 ? columns[colIdx - 1].id : null;
      const nextColId = colIdx < columns.length - 1 ? columns[colIdx + 1].id : null;

      const tasksHTML = filteredTasks.map((t) => {
        const priorityClass = (t.priority || 'medium').toLowerCase();
        const assigneeAvatar = t.assignee_avatar
          ? `<img src="${escapeHTML(t.assignee_avatar)}" class="task-assignee-avatar" title="Assigned to ${escapeHTML(t.assignee_name || 'User')}" alt="Assignee">`
          : `<span style="font-size:0.75rem; color:var(--text-dim);"><i class="fa-regular fa-user"></i></span>`;

        const dueDateHTML = t.due_date
          ? `<span class="task-due-date"><i class="fa-regular fa-calendar"></i> ${escapeHTML(t.due_date)}</span>`
          : '';

        const commentsHTML = `<span class="task-comments-count"><i class="fa-regular fa-comment"></i> ${t.comments_count || 0}</span>`;

        const moveLeftBtn = prevColId
          ? `<button class="btn-move-col" data-action="move-task" data-task-id="${t.id}" data-target-col="${prevColId}" title="Move back">← Move</button>`
          : '';

        const moveRightBtn = nextColId
          ? `<button class="btn-move-col" data-action="move-task" data-task-id="${t.id}" data-target-col="${nextColId}" title="Move forward">Move →</button>`
          : '';

        return `
          <div class="task-card" data-task-id="${t.id}">
            <div class="task-card-header">
              <span class="priority-pill ${priorityClass}">${escapeHTML(t.priority || 'Medium')}</span>
              ${assigneeAvatar}
            </div>
            <div class="task-card-title">${escapeHTML(t.title)}</div>
            ${t.description ? `<div class="task-card-desc">${escapeHTML(t.description)}</div>` : ''}
            <div class="task-card-footer">
              <div class="task-footer-left">
                ${dueDateHTML}
                ${commentsHTML}
              </div>
            </div>
            <div class="task-move-controls" onclick="event.stopPropagation()">
              ${moveLeftBtn}
              ${moveRightBtn}
            </div>
          </div>
        `;
      }).join('');

      return `
        <div class="kanban-column" data-column-id="${col.id}">
          <div class="column-header">
            <div class="column-header-left">
              <span class="column-title">${escapeHTML(col.title)}</span>
              <span class="column-count-badge">${filteredTasks.length}</span>
            </div>
            <button class="column-add-task-btn" data-action="quick-add-task" data-column-id="${col.id}" title="Add task to ${escapeHTML(col.title)}">
              <i class="fa-solid fa-plus"></i>
            </button>
          </div>
          <div class="task-cards-list" data-column-id="${col.id}">
            ${tasksHTML || '<div style="font-size:0.8rem; color:var(--text-dim); text-align:center; padding:20px 0;">No tasks</div>'}
          </div>
        </div>
      `;
    }).join('');
  }

  function renderActivities(activities) {
    const container = document.getElementById('activity-stream');
    if (!container) return;

    if (!activities || activities.length === 0) {
      container.innerHTML = `<div style="font-size:0.8rem; color:var(--text-dim); text-align:center;">No recent activity.</div>`;
      return;
    }

    container.innerHTML = activities.map((a) => {
      const time = new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return `
        <div class="activity-item">
          <img src="${escapeHTML(a.user_avatar || 'https://api.dicebear.com/7.x/initials/svg?seed=U')}" alt="User">
          <div class="activity-item-content">
            <strong>${escapeHTML(a.user_name || 'Someone')}</strong> ${escapeHTML(a.action)}
            <div class="activity-item-time">${time}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderTaskDetailsModal(task) {
    document.getElementById('detail-task-title').textContent = task.title;
    document.getElementById('detail-task-desc').textContent = task.description || 'No detailed description provided.';
    document.getElementById('detail-creator-name').textContent = task.creator_name || 'Team member';
    document.getElementById('detail-due-date').textContent = task.due_date || 'No due date set';
    document.getElementById('detail-column-badge').textContent = task.column_title || 'Board';

    const prioBadge = document.getElementById('detail-priority-badge');
    const prio = (task.priority || 'medium').toLowerCase();
    prioBadge.className = `priority-pill ${prio}`;
    prioBadge.textContent = task.priority || 'Medium';

    const assigneeAvatar = document.getElementById('detail-assignee-avatar');
    const assigneeName = document.getElementById('detail-assignee-name');
    if (task.assignee_id && task.assignee_name) {
      assigneeAvatar.src = task.assignee_avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${task.assignee_username}`;
      assigneeAvatar.style.display = 'block';
      assigneeName.textContent = task.assignee_name;
    } else {
      assigneeAvatar.style.display = 'none';
      assigneeName.textContent = 'Unassigned';
    }

    // Render comments
    const commentsStream = document.getElementById('task-comments-stream');
    const comments = task.comments || [];
    if (comments.length === 0) {
      commentsStream.innerHTML = `<div style="font-size:0.82rem; color:var(--text-dim); text-align:center; padding:12px 0;">No comments yet. Start the team discussion!</div>`;
    } else {
      commentsStream.innerHTML = comments.map((c) => {
        const time = new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return `
          <div class="comment-bubble">
            <div class="comment-header">
              <div class="comment-user">
                <img src="${escapeHTML(c.avatar || 'https://api.dicebear.com/7.x/initials/svg?seed=' + c.username)}" alt="${escapeHTML(c.name)}">
                <span>${escapeHTML(c.name)}</span>
              </div>
              <span class="comment-date">${time}</span>
            </div>
            <div class="comment-content">${escapeHTML(c.content)}</div>
          </div>
        `;
      }).join('');
    }

    document.getElementById('task-details-modal').style.display = 'flex';
  }

  return {
    escapeHTML,
    showToast,
    renderSidebarProjects,
    renderSidebarMembers,
    renderSidebarUser,
    renderKanbanBoard,
    renderActivities,
    renderTaskDetailsModal
  };
})();
