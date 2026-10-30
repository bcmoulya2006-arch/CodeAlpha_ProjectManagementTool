# PulseBoard — Collaborative Project Management Tool
### CodeAlpha Full Stack Web Development Internship — Task 3

PulseBoard is a modern, full-stack collaborative project management platform built to satisfy **Task 3 of the CodeAlpha Internship guidelines**. Inspired by Trello and Asana, it features interactive Kanban workflow boards, task card drag/move workflows, team member collaboration roles, task discussion comments, and real-time synchronisation across clients powered by WebSockets.

---

## 🌟 Key Features

### 1. Group Projects & Workspace Management
- **Create Multiple Projects**: Each project gets its own customizable board workspace, theme color, and description.
- **Collaborator Management**: Invite team members by username or email with configurable roles (`Owner`, `Admin`, `Member`).
- **Sidebar Project Switcher**: Easily switch between all your active group projects.

### 2. Kanban Workflow Boards & Task Cards
- **Dynamic Kanban Columns**: Default 4-stage workflow: **To Do**, **In Progress**, **In Review**, and **Done** with live task counters.
- **Rich Task Cards**:
  - Title, detailed markdown/text description, priority pills (**Urgent**, **High**, **Medium**, **Low**), due dates, and assignee avatars.
  - Interactive **Move** controls (`← Move`, `Move →`) that immediately transition tasks across columns.
  - Filter tasks in real-time by search keywords or priority levels.

### 3. Task Discussion & Comments
- **In-Depth Task Modal**: Click any card to inspect full requirements, due dates, assignee details, and audit history.
- **Real-Time Comment Threads**: Team members can communicate directly on task cards. Comments display author avatars and timestamps.

### 4. Real-Time WebSockets Engine (Bonus Feature)
- Powered by high-performance `ws` WebSocket server.
- Whenever any team member creates a task, moves a card, adds a comment, or joins a project, the event is immediately broadcast to all connected clients without requiring page reloads!
- Live connection pulse indicator in the sidebar.

---

## 🛠️ Tech Stack

- **Frontend**: Vanilla HTML5, Responsive CSS3 (Glassmorphism dark theme, Plus Jakarta Sans), Vanilla ES6+ JavaScript.
- **Backend**: Node.js & Express.js REST API.
- **Real-Time Sync**: Native `ws` WebSocket server.
- **Database**: Zero-config SQLite via `node:sqlite` (`DatabaseSync`) with enforced foreign keys.
- **Authentication**: Salted `bcryptjs` password hashing and signed JSON Web Tokens (JWT).

---

## 📁 Project Structure

```
CodeAlpha_ProjectManagementTool/
├── package.json               # Manifest & dependencies
├── server.js                  # Express & WebSocket HTTP server entrypoint
├── test-e2e.js                # 11-point automated verification suite
├── README.md                  # Comprehensive documentation
├── .gitignore                 # Standard ignore rules
├── projects.db                # SQLite database
├── src/
│   ├── config/
│   │   ├── db.js              # SQLite schema, tables & indexes
│   │   ├── seed.js            # Initial demo seed data generator
│   │   └── websocket.js       # Real-time WebSocket broadcast server
│   ├── middleware/
│   │   └── auth.js            # JWT verification & session guards
│   ├── controllers/
│   │   ├── authController.js  # Registration, login & user listings
│   │   ├── projectController.js # Workspace creation, membership & boards
│   │   ├── taskController.js  # Task cards CRUD, column moves & details
│   │   └── commentController.js # Task discussion comments
│   └── routes/
│       ├── authRoutes.js      # /api/auth routes
│       ├── projectRoutes.js   # /api/projects routes
│       ├── taskRoutes.js      # /api/tasks routes
│       └── commentRoutes.js   # /api/comments routes
└── public/                    # Frontend assets
    ├── index.html             # Kanban layout & interactive modals
    ├── css/
    │   └── styles.css         # Modern dark Kanban theme & responsive grid
    └── js/
        ├── api.js             # REST API client
        ├── ws.js              # Real-time WebSocket connection manager
        ├── state.js           # Central state store
        ├── ui.js              # DOM rendering, cards & toast notifications
        └── app.js             # Event wiring & lifecycle bootstrap
```

---

## 🚀 Getting Started

1. **Clone or navigate to the project directory**:
   ```bash
   git clone https://github.com/bcmoulya2006-arch/CodeAlpha_ProjectManagementTool.git
   cd CodeAlpha_ProjectManagementTool
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the server**:
   ```bash
   npm start
   ```

4. **Open in browser**:
   Navigate to:
   ```
   http://localhost:5001
   ```

---

## 👥 Demo Accounts (Pre-Seeded)

| Username | Password | Role / Details |
| :--- | :--- | :--- |
| `manish_lead` | `password123` | Project Owner & Tech Lead |
| `alex_frontend` | `password123` | Admin & UI Designer |
| `sarah_backend` | `password123` | Member & Systems Architect |

*(You can also use the quick-switch buttons in the left sidebar or sign up with any new account.)*

---

## 🧪 Running Automated Tests

```bash
node test-e2e.js
```

---

## 📄 License
MIT License. Built for the CodeAlpha Full Stack Web Development Internship.
