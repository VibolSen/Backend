import dotenv from 'dotenv';
import path from 'path';

// Load .env explicitly from the current workspace
dotenv.config({ path: path.join(process.cwd(), '.env') });

import { PrismaClient } from '@prisma/client';

console.log('DEBUG: CWD is', process.cwd());
console.log('DEBUG: DATABASE_URL is', process.env.DATABASE_URL ? 'Defined' : 'UNDEFINED');

const prisma = new PrismaClient();

export default prisma;
