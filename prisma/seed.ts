
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // Hash passwords
  const defaultPassword = await bcrypt.hash('password123', 10);
  const vibolPassword = await bcrypt.hash('Vibol2020', 10); // Hash for the new admin

  // Create Users
  const admin = await prisma.user.upsert({
    where: { email: 'vibolsen2002@gmail.com' },
    update: {},
    create: {
      email: 'vibolsen2002@gmail.com',
      firstName: 'Vibol',
      lastName: 'Sen',
      password: vibolPassword,
      role: Role.ADMIN,
    },
  });

  const teacher = await prisma.user.upsert({
    where: { email: 'teacher@step.com' },
    update: {},
    create: {
      email: 'teacher@step.com',
      firstName: 'Teacher',
      lastName: 'User',
      password: defaultPassword,
      role: Role.TEACHER,
    },
  });

  const student = await prisma.user.upsert({
    where: { email: 'student@step.com' },
    update: {},
    create: {
      email: 'student@step.com',
      firstName: 'Student',
      lastName: 'User',
      password: defaultPassword,
      role: Role.STUDENT,
    },
  });

  console.log(`Upserted users:`, { admin, teacher, student });

  // Create Department
  const department = await prisma.department.upsert({
    where: { name: 'Computer Science' },
    update: {},
    create: {
      name: 'Computer Science',
    },
  });

  console.log(`Upserted department:`, department);

  // Create Courses
  const course1 = await prisma.course.upsert({
    where: { name: 'Introduction to Programming' },
    update: { code: 'CS101' },
    create: {
      name: 'Introduction to Programming',
      code: 'CS101',
      leadById: teacher.id,
      courseDepartments: {
        create: {
          departmentId: department.id,
        },
      },
    },
  });

  const course2 = await prisma.course.upsert({
    where: { name: 'Data Structures and Algorithms' },
    update: { code: 'CS102' },
    create: {
      name: 'Data Structures and Algorithms',
      code: 'CS102',
      leadById: teacher.id,
      courseDepartments: {
        create: {
          departmentId: department.id,
        },
      },
    },
  });

  console.log(`Created courses:`, { course1, course2 });

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
