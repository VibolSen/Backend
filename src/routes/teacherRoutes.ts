import { Router } from 'express';
import { getTeachers, createTeacher, getTeacherById, updateTeacher, deleteTeacher, getTeacherCourses, getMyStudents, getMyGroups, getGroupStudents, getGroupAttendance, submitGroupAttendance } from '../controllers/teacherController';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Teachers
 *   description: Teacher management API
 */

/**
 * @swagger
 * /api/teachers:
 *   get:
 *     summary: Get all teachers
 *     tags: [Teachers]
 *     responses:
 *       200:
 *         description: List of teachers
 */
router.get('/my-courses', getTeacherCourses);
router.get('/my-students', getMyStudents);
router.get('/my-groups', getMyGroups);
router.get('/groups/:groupId/students', getGroupStudents);
router.get('/groups/:groupId/attendance', getGroupAttendance);
router.post('/groups/:groupId/attendance', submitGroupAttendance);
router.get('/', getTeachers);

/**
 * @swagger
 * /api/teachers:
 *   post:
 *     summary: Create a new teacher
 *     tags: [Teachers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - lastName
 *               - email
 *               - password
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Teacher created
 */
router.post('/', createTeacher);

/**
 * @swagger
 * /api/teachers/{id}:
 *   get:
 *     summary: Get a teacher by ID
 *     tags: [Teachers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Teacher details
 */
router.get('/:id', getTeacherById);

/**
 * @swagger
 * /api/teachers/{id}:
 *   put:
 *     summary: Update a teacher
 *     tags: [Teachers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Teacher updated
 */
router.put('/:id', updateTeacher);

/**
 * @swagger
 * /api/teachers/{id}:
 *   delete:
 *     summary: Delete a teacher
 *     tags: [Teachers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Teacher deleted
 */
router.delete('/:id', deleteTeacher);

export default router;
