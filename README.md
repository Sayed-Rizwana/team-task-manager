# Team Task Manager

Team Task Manager is a full-stack web application for managing projects, members, and tasks with role-based access for admins and members. The codebase is now organized cleanly under a single `app/` folder so the backend and frontend are easier to maintain and deploy.

## Tech Stack

- Backend: Node.js + Express
- Database: MongoDB + Mongoose
- Authentication: JWT + bcrypt
- Frontend: React + Vite + CSS
- Deployment: Railway

## Folder Structure

```text
Teamtaskmanager/
|-- app/
|   |-- backend/
|   |   |-- server.js
|   |   `-- src/
|   |       |-- config/
|   |       |-- controllers/
|   |       |-- middleware/
|   |       |-- models/
|   |       |-- routes/
|   |       `-- utils/
|   `-- frontend/
|       |-- index.html
|       |-- src/
|       |-- dist/
|       `-- assets/
|           `-- css/
|-- .env.example
|-- package.json
|-- railway.json
`-- README.md
```

## Features

- User signup and login with hashed passwords
- JWT-protected routes
- Admin-only project creation
- Add and remove members from projects
- Admin-only task creation and assignment
- Member task status updates
- Dashboard metrics for total, completed, pending, in-progress, and overdue tasks
- React single-page frontend served by the Express backend

## User Roles

- Admin: create projects, add or remove members, create and assign tasks, view all tasks, and delete tasks
- Member: view assigned projects, view assigned tasks, and update task status

## Environment Variables

Create a `.env` file in the project root based on [.env.example](/abs/path/c:/Users/rizwa/OneDrive/Documents/Desktop/Teamtaskmanager/.env.example).

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secure_secret
```

## Local Development

1. Run `npm install`
2. Create `.env`
3. Run `npm run client:dev` for the React frontend
4. Run `npm run dev` for the API server
5. Open `http://localhost:5173`

## API Endpoints

### Auth

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Projects

- `POST /api/projects`
- `GET /api/projects`
- `GET /api/projects/:id`
- `POST /api/projects/:id/add-member`
- `POST /api/projects/:id/remove-member`

### Tasks

- `POST /api/tasks`
- `GET /api/tasks`
- `PUT /api/tasks/:id`
- `DELETE /api/tasks/:id`

### Dashboard

- `GET /api/dashboard`

### Users

- `GET /api/users`

This endpoint is admin-only and is used by the frontend when adding project members or assigning tasks.

## Frontend Routes

- `/`
- `/dashboard`
- `/projects`
- `/tasks`

The frontend stores the JWT token in `localStorage`, calls the API with `fetch`, and is bundled into `app/frontend/dist` for production.

## Railway Deployment

1. Push the repository to GitHub.
2. Create a new Railway project from the repo.
3. Add Railway variables:
   - `MONGO_URI`
   - `JWT_SECRET`
   - `PORT` optional
4. Railway will run `npm start`.
5. Verify `/health` after deploy.

## Important Paths

- Backend entry: [app/backend/server.js](/abs/path/c:/Users/rizwa/OneDrive/Documents/Desktop/Teamtaskmanager/app/backend/server.js)
- Backend source: [app/backend/src](/abs/path/c:/Users/rizwa/OneDrive/Documents/Desktop/Teamtaskmanager/app/backend/src)
- Frontend app: [app/frontend](/abs/path/c:/Users/rizwa/OneDrive/Documents/Desktop/Teamtaskmanager/app/frontend)
