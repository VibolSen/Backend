# School Management System - Backend

This directory contains the backend for the School Management System. It's a Node.js application built with Express, TypeScript, and Prisma, using a MongoDB database.

## Features

- RESTful API for managing students, teachers, courses, assignments, and more.
- User authentication and authorization with JSON Web Tokens (JWT).
- Data modeling and access with Prisma ORM.
- API documentation with Swagger.

## Technologies Used

- **Node.js**: JavaScript runtime environment.
- **Express**: Web framework for Node.js.
- **TypeScript**: Superset of JavaScript for type safety.
- **Prisma**: Next-generation ORM for Node.js and TypeScript.
- **MongoDB**: NoSQL database.
- **JWT**: For handling user authentication.
- **Swagger**: For API documentation.
- **ts-node**: For running TypeScript files directly.
- **nodemon**: For automatic server restarts during development.

## Getting Started

### Prerequisites

- Node.js (v18 or later recommended)
- npm
- MongoDB (running instance, either locally or on a cloud service)

### Installation & Setup

1.  **Clone the repository** (if not already done).

2.  **Navigate to the backend directory:**
    ```bash
    cd SchoolManagementSystem/Backend
    ```

3.  **Install dependencies:**
    ```bash
    npm install
    ```

4.  **Configure environment variables:**
    Create a `.env` file in the `Backend` directory and add the following, replacing the placeholder with your actual MongoDB connection string:
    ```env
    DATABASE_URL="mongodb+srv://<user>:<password>@<cluster-url>/<database-name>?retryWrites=true&w=majority"
    JWT_SECRET="your-super-secret-key"
    FRONTEND_URL="http://localhost:3000"
    ```

5.  **Generate Prisma Client:**
    It's a good practice to regenerate the Prisma client after installation or schema changes.
    ```bash
    npx prisma generate
    ```

### Available Scripts

- **To run the server in development mode (with auto-reloading):**
  ```bash
  npm run dev
  ```
  The server will be available at `http://localhost:5000`.

- **To compile TypeScript to JavaScript:**
  ```bash
  npm run build
  ```
  This will create a `dist` directory with the compiled code.

- **To start the server in production mode (after building):**
  ```bash
  npm start
  ```

- **To seed the database (if a seed script is configured):**
  ```bash
  npm run seed
  ```

## API Documentation

Once the server is running, you can access the Swagger API documentation at:
`http://localhost:5000/api-docs`

This provides a detailed list of all available endpoints, their parameters, and expected responses.
