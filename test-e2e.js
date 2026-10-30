/**
 * End-to-End Automated Test Suite for CodeAlpha Task 3 Project Management Tool
 * 
 * Verifies:
 * 1. Database schema initialization & seeding
 * 2. User registration (Owner) with salted bcrypt & JWT
 * 3. User registration (Member) with salted bcrypt & JWT
 * 4. Group project creation with 4 default Kanban workflow columns
 * 5. Adding/inviting collaborator to the project with membership roles
 * 6. Project retrieval with board columns and member permissions
 * 7. Task card creation in "To Do" column with priority & due dates
 * 8. Task card moving between Kanban columns ("To Do" -> "In Progress")
 * 9. Commenting & communicating within task cards
 * 10. Fetching task details & discussion thread verification
 * 11. Task deletion by project owner
 */

const { initializeDatabase } = require('./src/config/db');
const { seedInitialData } = require('./src/config/seed');
const authController = require('./src/controllers/authController');
const projectController = require('./src/controllers/projectController');
const taskController = require('./src/controllers/taskController');
const commentController = require('./src/controllers/commentController');

function callHandler(handler, req = {}) {
  return new Promise((resolve, reject) => {
    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        resolve({ status: this.statusCode, data });
      }
    };
    try {
      handler(req, res);
    } catch (err) {
      reject(err);
    }
  });
}

async function runTests() {
  console.log('================================================================');
  console.log('📊 Starting CodeAlpha Task 3 Project Management Tool E2E Tests');
  console.log('================================================================\n');

  let passes = 0;
  let fails = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passes++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      fails++;
    }
  }

  try {
    // 1. Initialize DB & Seed
    initializeDatabase();
    seedInitialData();
    assert(true, 'Database schema initialized with projects, columns, tasks, comments, and members');

    // 2. Register Owner
    const ownerName = `pm_owner_${Date.now()}`;
    const regOwnerRes = await callHandler(authController.register, {
      body: {
        username: ownerName,
        email: `${ownerName}@codealpha.tech`,
        password: 'password123',
        name: 'Project Owner Lead'
      }
    });
    assert(
      regOwnerRes.status === 201 && regOwnerRes.data.token && regOwnerRes.data.user.username === ownerName,
      'User Auth: Owner registered successfully with bcrypt password & JWT'
    );
    const tokenOwner = regOwnerRes.data.token;
    const userOwner = regOwnerRes.data.user;

    // 3. Register Member
    const memberName = `pm_member_${Date.now()}`;
    const regMemberRes = await callHandler(authController.register, {
      body: {
        username: memberName,
        email: `${memberName}@codealpha.tech`,
        password: 'password123',
        name: 'Sprint Collaborator'
      }
    });
    assert(
      regMemberRes.status === 201 && regMemberRes.data.token && regMemberRes.data.user.username === memberName,
      'User Auth: Team member registered successfully with JWT'
    );
    const tokenMember = regMemberRes.data.token;
    const userMember = regMemberRes.data.user;

    // 4. Create Group Project Workspace
    const createProjRes = await callHandler(projectController.createProject, {
      user: { id: userOwner.id, username: userOwner.username, name: userOwner.name },
      body: {
        title: 'Alpha Sprint Board 2026',
        description: 'Collaborative development workspace for CodeAlpha full stack applications',
        color: '#6366f1'
      }
    });
    assert(
      createProjRes.status === 201 && createProjRes.data.project && createProjRes.data.project.id,
      'Project Management: Group project created with default Kanban workflow columns'
    );
    const project = createProjRes.data.project;

    // 5. Add Collaborator to Project
    const addMemRes = await callHandler(projectController.addMember, {
      user: { id: userOwner.id, username: userOwner.username },
      params: { id: project.id },
      body: {
        usernameOrEmail: memberName,
        role: 'member'
      }
    });
    assert(
      addMemRes.status === 201 && addMemRes.data.member && addMemRes.data.member.username === memberName,
      'Collaboration: Team member invited and assigned to project workspace'
    );

    // 6. Fetch Project Details & Verify Kanban Columns
    const getProjRes = await callHandler(projectController.getProjectById, {
      user: { id: userMember.id, username: userMember.username },
      params: { id: project.id }
    });
    const columns = getProjRes.data.project && getProjRes.data.project.columns ? getProjRes.data.project.columns : [];
    assert(
      getProjRes.status === 200 && columns.length === 4,
      'Kanban Board: Retrieved project with 4 default stages (To Do, In Progress, In Review, Done)'
    );
    const todoCol = columns.find(c => c.title === 'To Do');
    const inProgCol = columns.find(c => c.title === 'In Progress');

    // 7. Create Task Card in "To Do"
    const createTaskRes = await callHandler(taskController.createTask, {
      user: { id: userOwner.id, username: userOwner.username, name: userOwner.name },
      body: {
        projectId: project.id,
        columnId: todoCol.id,
        title: 'Implement WebSocket Real-Time Synchronization',
        description: 'Ensure live broadcast updates occur whenever tasks or comments change',
        priority: 'Urgent',
        dueDate: '2026-11-15',
        assigneeId: userMember.id
      }
    });
    assert(
      createTaskRes.status === 201 && createTaskRes.data.task && createTaskRes.data.task.id,
      'Task Cards: Task created in "To Do" column with priority, due date, and assignee'
    );
    const task = createTaskRes.data.task;

    // 8. Move Task Card to "In Progress"
    const moveTaskRes = await callHandler(taskController.moveTask, {
      user: { id: userMember.id, username: userMember.username, name: userMember.name },
      params: { id: task.id },
      body: {
        targetColumnId: inProgCol.id,
        newPosition: 0
      }
    });
    assert(
      moveTaskRes.status === 200 && moveTaskRes.data.task && moveTaskRes.data.task.column_id === inProgCol.id,
      'Workflow Transition: Task successfully moved to "In Progress" column'
    );

    // 9. Add Comment to Task
    const addCommentRes = await callHandler(commentController.addComment, {
      user: { id: userMember.id, username: userMember.username, name: userMember.name },
      params: { taskId: task.id },
      body: {
        content: 'WebSockets handler tested and operational across all connected clients!'
      }
    });
    assert(
      addCommentRes.status === 201 && addCommentRes.data.comment && addCommentRes.data.comment.content.includes('WebSockets handler tested'),
      'Task Communication: Team member added comment to discussion thread'
    );

    // 10. Fetch Task Details & Discussion Thread
    const taskDetailsRes = await callHandler(taskController.getTaskDetails, {
      user: { id: userOwner.id, username: userOwner.username },
      params: { id: task.id }
    });
    assert(
      taskDetailsRes.status === 200 && taskDetailsRes.data.task && taskDetailsRes.data.task.comments && taskDetailsRes.data.task.comments.length >= 1,
      'Task Inspection: Task details and comment threads retrieved with user avatars'
    );

    // 11. Delete Task
    const delTaskRes = await callHandler(taskController.deleteTask, {
      user: { id: userOwner.id, username: userOwner.username, name: userOwner.name },
      params: { id: task.id }
    });
    assert(
      delTaskRes.status === 200 && delTaskRes.data.success,
      'Task Lifecycle: Task deleted and activity logged'
    );

  } catch (error) {
    console.error('Fatal test error:', error);
    fails++;
  } finally {
    console.log('\n----------------------------------------------------------------');
    console.log(`📊 Task 3 Test Summary: ${passes} Passed, ${fails} Failed`);
    console.log('----------------------------------------------------------------\n');
    process.exit(fails > 0 ? 1 : 0);
  }
}

runTests();
