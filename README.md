# Team Task Manager

Team Task Manager is a production-ready full-stack web application where admins can create projects, manage members, assign tasks, and monitor team progress, while members can review their assigned work and update task status.

## Tech Stack

- Backend: Node.js, Express
- Database: MongoDB with Mongoose
- Authentication: JWT and bcrypt
- Frontend: HTML, CSS, JavaScript
- Deployment: Railway-ready

## Folder Structure

```text
team-task-manager/
|-- backend/
|   |-- server.js
|   `-- src/
|       |-- config/
|       |   `-- db.js
|       |-- controllers/
|       |   |-- authController.js
|       |   |-- dashboardController.js
|       |   |-- projectController.js
|       |   |-- taskController.js
|       |   `-- userController.js
|       |-- middleware/
|       |   |-- authMiddleware.js
|       |   `-- errorMiddleware.js
|       |-- models/
|       |   |-- Project.js
|       |   |-- Task.js
|       |   `-- User.js
|       |-- routes/
|       |   |-- authRoutes.js
|       |   |-- dashboardRoutes.js
|       |   |-- projectRoutes.js
|       |   |-- taskRoutes.js
|       |   `-- userRoutes.js
|       `-- utils/
|           |-- asyncHandler.js
|           |-- httpErrors.js
|           `-- validators.js
|-- frontend/
|   |-- index.html
|   |-- dashboard.html
|   |-- projects.html
|   |-- tasks.html
|   `-- assets/
|       |-- css/
|       |   `-- styles.css
|       `-- js/
|           `-- app.js
|-- .env.example
|-- package.json
`-- README.md
```

## Features

### Authentication

- `POST /signup`
- `POST /login`
- JWT-based protected routes
- Password hashing with bcrypt

### Project Management

- Create project
- Get all projects
- Add members to project
- Remove members from project

### Task Management

- Create task
- Get tasks
- Update task
- Delete task
- Link tasks to projects

### Dashboard

- Total projects
- Total tasks
- Completed tasks
- Pending tasks
- In-progress tasks
- Overdue tasks

### Role-Based Access

- Admins can create projects, manage members, assign tasks, and delete tasks
- Members can view their projects and update the status of assigned tasks

## Environment Variables

Create a `.env` file in the project root using `.env.example`.

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secure_secret
```

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` from `.env.example` and set `MONGO_URI` and `JWT_SECRET`.

3. Start the app:

```bash
npm run dev
```

4. Open:

```text
http://localhost:5000
```

The Express server serves both the API and the frontend pages.

## API Endpoints

### Auth

- `POST /signup`
- `POST /login`
- `GET /me`
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Projects

- `POST /projects`
- `GET /projects`
- `GET /projects/:id`
- `POST /projects/:id/add-member`
- `POST /projects/:id/remove-member`
- `POST /api/projects`
- `GET /api/projects`

### Tasks

- `POST /tasks`
- `GET /tasks`
- `PUT /tasks/:id`
- `DELETE /tasks/:id`
- `POST /api/tasks`
- `GET /api/tasks`
- `PUT /api/tasks/:id`
- `DELETE /api/tasks/:id`

### Dashboard

- `GET /dashboard`
- `GET /api/dashboard`

## Frontend Pages

- `/` for login and signup
- `/dashboard.html`
- `/projects.html`
- `/tasks.html`

The frontend stores the JWT token in `localStorage` and calls the backend with `fetch`.

## Railway Deployment

1. Push the project to GitHub.
2. In Railway, click `New Project` and select `Deploy from GitHub repo`.
3. Choose `Sayed-Rizwana/team-task-manager`.
4. Railway should detect the Node app automatically. This repo also includes [railway.json](/abs/path/c:/Users/rizwa/OneDrive/Documents/Desktop/Teamtaskmanager/railway.json) to define:
   - `startCommand`: `npm start`
   - `healthcheckPath`: `/health`
5. Set these Railway environment variables:
   - `MONGO_URI`
   - `JWT_SECRET`
   - `PORT` is optional because Railway injects it automatically
6. Railway will run:

```bash
npm install
npm start
```

7. After deploy, open the generated Railway URL.
8. If you use MongoDB Atlas, make sure Atlas allows Railway to connect:
   - In Atlas Network Access, allow `0.0.0.0/0` for a quick deploy, or restrict to your preferred ranges later
   - Make sure your Atlas database user has read/write access to the target database

## Railway Checklist

- GitHub repo connected
- `MONGO_URI` added in Railway Variables
- `JWT_SECRET` added in Railway Variables
- Deploy succeeds
- `/health` returns `200`
- App opens from the Railway public domain

## Notes

- The frontend and backend are deployed together from a single Node service.
- MongoDB Atlas works well for `MONGO_URI`.
- Admin-only user listing is exposed internally at `GET /api/users` to support member assignment in the UI.
