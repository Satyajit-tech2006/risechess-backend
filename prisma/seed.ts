import { PrismaClient, Role, Permission } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial data...');

  // 1. Create Default Academy
  const academy = await prisma.academy.upsert({
    where: { slug: 'risechess-central' },
    update: {},
    create: {
      name: 'RiseChess Central Academy',
      slug: 'risechess-central',
    },
  });

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Admin@123', salt);

  // 2. Create Initial Admin User
  const admin = await prisma.user.upsert({
    where: {
      academyId_username: {
        academyId: academy.id,
        username: 'admin',
      },
    },
    update: {},
    create: {
      academyId: academy.id,
      username: 'admin',
      firstName: 'Chief',
      lastName: 'Admin',
      email: 'admin@risechess.internal',
      passwordHash,
      role: Role.ADMIN,
      permissions: Object.values(Permission),
      status: 'ACTIVE',
    },
  });

  console.log(`Database seeded successfully!`);
  console.log(`Academy ID: ${academy.id}`);
  console.log(`Admin user: ${admin.username} / Admin@123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });