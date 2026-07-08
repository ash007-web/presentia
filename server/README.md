# Presentia Backend

This is the backend for the Presentia Presentation Management System. It uses Node.js, Express, and MongoDB.

## Folder Structure

- `src/config/`: Configuration files (e.g., environment variables, database configuration).
- `src/controllers/`: Request handlers for the API endpoints.
- `src/middleware/`: Express middleware (e.g., authentication, error handling).
- `src/models/`: Mongoose schema definitions for MongoDB.
- `src/routes/`: Route definitions linking endpoints to controllers.
- `src/services/`: Business logic and database interactions.
- `src/utils/`: Utility functions and helpers.
- `src/validators/`: Request validation logic.
- `src/app.js`: Express application setup and middleware configuration.
- `src/server.js`: Entry point to start the server.

## Installation

1. Navigate to the `server` directory:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

## Running the Backend

- Development mode (with auto-reload):
  ```bash
  npm run dev
  ```
- Production mode:
  ```bash
  npm start
  ```
