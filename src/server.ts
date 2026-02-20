import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import studentRoutes from './routes/studentRoutes';
import teacherRoutes from './routes/teacherRoutes';
import facultyRoutes from './routes/facultyRoutes';
import departmentRoutes from './routes/departmentRoutes';
import courseRoutes from './routes/courseRoutes';
import { getCourseAnalytics } from './controllers/courseController';
import groupRoutes from './routes/groupRoutes';
import assignmentRoutes from './routes/assignmentRoutes';
import examRoutes from './routes/examRoutes';
import attendanceRoutes from './routes/attendanceRoutes';
import scheduleRoutes from './routes/scheduleRoutes';
import submissionRoutes from './routes/submissionRoutes';
import utilRoutes from './routes/utilRoutes';
import libraryRoutes from './routes/libraryRoutes';
import announcementRoutes from './routes/announcementRoutes';
import financialRoutes from './routes/financialRoutes';
import careerRoutes from './routes/careerRoutes';
import authRoutes from './routes/authRoutes';
import roomRoutes from './routes/roomRoutes';
import userRoutes from './routes/userRoutes';
// ... (other imports)

// ... (other imports)
// ... (other imports)
import { getMe } from './controllers/authController';
import enrollmentRoutes from './routes/enrollmentRoutes';
import { authenticateToken } from './middleware/auth';
import dashboardRoutes from './routes/dashboardRoutes';
import profileRoutes from './routes/profileRoutes'; // Added this
import examSubmissionRoutes from './routes/examSubmissionRoutes';
import gradebookRoutes from './routes/gradebookRoutes';
import certificateRoutes from './routes/certificateRoutes';
import hrRoutes from './routes/hrRoutes';
import careersRoutes from './routes/careersRoutes';
import notificationRoutes from './routes/notificationRoutes';
import leaveRoutes from './routes/leaveRoutes';
import prisma from './prisma';
import { startCronJobs } from './services/cronService';



// Environment variables are loaded via import 'dotenv/config' at the top

const app = express();
const PORT = process.env.PORT || 5000;

// CORS Configuration - Allow Frontend to access Backend
app.use(cors({
  origin: (origin, callback) => callback(null, true), // Allow all origins (including mobile apps/tunnels)
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Custom Request Logger Middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Swagger Configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'School Management System API',
      version: '1.0.0',
      description: 'API Documentation for School Management System',
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
      },
    ],
  },
  apis: ['./src/routes/*.ts'], // Path to the API docs
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// API Routes
app.use('/api/students', studentRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/faculties', facultyRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/utils', utilRoutes);
app.use('/api/library', libraryRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/financial', financialRoutes);
app.use('/api/career', careerRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/dashboards', dashboardRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/profile', profileRoutes);

// Direct routes for /api/me (avoids double-namespace issue)
app.get('/api/me', authenticateToken, getMe);
app.get('/api/me/schedules', authenticateToken, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const schedules = await prisma.schedule.findMany({
      where: {
        OR: [
          { assignedToTeacherId: userId },
          { assignedToGroup: { students: { some: { id: userId } } } }
        ]
      },
      include: {
        assignedToGroup: { select: { name: true } },
        assignedToTeacher: { select: { firstName: true, lastName: true } },
        sessions: true
      },
      orderBy: { startDate: 'asc' }
    });
    res.json(schedules);
  } catch (err) {
    console.error('Failed to fetch user schedules:', err);
    res.status(500).json({ error: 'Failed to fetch schedules' });
  }
});
app.use('/api/exam-submissions', examSubmissionRoutes);
app.use('/api/gradebook', gradebookRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/hr', hrRoutes);
app.use('/api/careers', careersRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/leaves', leaveRoutes);
app.get('/api/course-analytics', getCourseAnalytics);

app.get('/', (req, res) => {
  res.send('School Management System Backend is running');
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is healthy' });
});

// Catch-all 404 Handler
app.use((req, res) => {
  console.warn(`[404 Not Found] - ${req.method} ${req.url}`);
  res.status(404).json({ error: "Route not found", path: req.url });
});

// Global Error Handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error(`[500 Server Error] - ${req.method} ${req.url}`);
  console.error(err.stack);
  res.status(500).json({ error: "Internal Server Error", message: err.message });
});

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Swagger Docs available at http://localhost:${PORT}/api-docs`);
  
  // Start Background Jobs
  startCronJobs();
  // Server updated to include Leave Management routes (restored includes)
});
