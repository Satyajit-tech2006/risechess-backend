import { PrismaClient, Role, Permission } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding demo academy, coaches, students, and batches...');

  // 1. Academy
  const academy = await prisma.academy.upsert({
    where: { slug: 'risechess-central' },
    update: {},
    create: {
      name: 'RiseChess Central Academy',
      slug: 'risechess-central',
    },
  });

  const salt = await bcrypt.genSalt(10);
  const adminPassword = await bcrypt.hash('Admin@123', salt);
  const defaultPassword = await bcrypt.hash('StudyChess@123', salt);

  // 2. Admin
  await prisma.user.upsert({
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
      passwordHash: adminPassword,
      role: Role.ADMIN,
      permissions: Object.values(Permission),
      status: 'ACTIVE',
    },
  });

  // 3. Demo Tags
  const tagNames = ['Beginner', 'Intermediate', 'Advanced', 'Tactics Elite', 'Endgame Masters'];
  const createdTags: Record<string, string> = {};

  for (const name of tagNames) {
    const tag = await prisma.tag.upsert({
      where: {
        academyId_name: {
          academyId: academy.id,
          name,
        },
      },
      update: {},
      create: {
        academyId: academy.id,
        name,
      },
    });
    createdTags[name] = tag.id;
  }

  // 4. Five Demo Coaches
  const coachData = [
    {
      username: 'demo_coach_1',
      firstName: 'Magnus',
      lastName: 'Carlsen',
      email: 'demo_coach_1@risechess.internal',
      permissions: [Permission.TAKE_CLASS, Permission.MANAGE_STUDENTS, Permission.MANAGE_BATCHES, Permission.CREATE_ASSIGNMENTS, Permission.EVALUATE_ASSIGNMENTS],
    },
    {
      username: 'demo_coach_2',
      firstName: 'Hikaru',
      lastName: 'Nakamura',
      email: 'demo_coach_2@risechess.internal',
      permissions: [Permission.TAKE_CLASS, Permission.CREATE_ASSIGNMENTS, Permission.EVALUATE_ASSIGNMENTS],
    },
    {
      username: 'demo_coach_3',
      firstName: 'Viswanathan',
      lastName: 'Anand',
      email: 'demo_coach_3@risechess.internal',
      permissions: [Permission.TAKE_CLASS, Permission.MANAGE_PGN, Permission.VIEW_REPORTS],
    },
    {
      username: 'demo_coach_4',
      firstName: 'Judit',
      lastName: 'Polgar',
      email: 'demo_coach_4@risechess.internal',
      permissions: [Permission.TAKE_CLASS, Permission.MANAGE_STUDENTS, Permission.CREATE_ASSIGNMENTS],
    },
    {
      username: 'demo_coach_5',
      firstName: 'Garry',
      lastName: 'Kasparov',
      email: 'demo_coach_5@risechess.internal',
      permissions: [Permission.TAKE_CLASS, Permission.MANAGE_BATCHES, Permission.VIEW_REPORTS, Permission.MANAGE_PGN],
    },
  ];

  const createdCoaches = [];
  for (const c of coachData) {
    const coach = await prisma.user.upsert({
      where: {
        academyId_username: {
          academyId: academy.id,
          username: c.username,
        },
      },
      update: {
        permissions: c.permissions,
      },
      create: {
        academyId: academy.id,
        username: c.username,
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        passwordHash: defaultPassword,
        role: Role.COACH,
        permissions: c.permissions,
        status: 'ACTIVE',
      },
    });
    createdCoaches.push(coach);
  }

  // 5. Fifteen Demo Students
  const studentNames = [
    { first: 'Gukesh', last: 'Dommaraju' },
    { first: 'Praggnanandhaa', last: 'Rameshbabu' },
    { first: 'Arjun', last: 'Erigaisi' },
    { first: 'Vidit', last: 'Gujrathi' },
    { first: 'Nihal', last: 'Sarin' },
    { first: 'Raunak', last: 'Sadhwani' },
    { first: 'Alireza', last: 'Firouzja' },
    { first: 'Nodirbek', last: 'Abdusattorov' },
    { first: 'Vincent', last: 'Keymer' },
    { first: 'Wei', last: 'Yi' },
    { first: 'Javokhir', last: 'Sindarov' },
    { first: 'Hans', last: 'Niemann' },
    { first: 'Rameshbabu', last: 'Vaishali' },
    { first: 'Divya', last: 'Deshmukh' },
    { first: 'Vantika', last: 'Agrawal' },
  ];

  const createdStudents = [];
  for (let i = 1; i <= 15; i++) {
    const username = `demo_student_${i}`;
    const namePair = studentNames[i - 1];
    const assignedTagName = tagNames[(i - 1) % tagNames.length];
    const classesLeft = (i * 3) % 24;

    const student = await prisma.user.upsert({
      where: {
        academyId_username: {
          academyId: academy.id,
          username,
        },
      },
      update: {},
      create: {
        academyId: academy.id,
        username,
        firstName: namePair.first,
        lastName: namePair.last,
        email: `${username}@risechess.internal`,
        passwordHash: defaultPassword,
        role: Role.STUDENT,
        permissions: [],
        status: 'ACTIVE',
        classesLeft,
        gender: i % 3 === 0 ? 'Female' : 'Male',
        contactNo: `+9198765432${i < 10 ? '0' + i : i}`,
      },
    });

    createdStudents.push(student);

    // Link tag
    const tagId = createdTags[assignedTagName];
    if (tagId) {
      await prisma.userTag.upsert({
        where: {
          userId_tagId: {
            userId: student.id,
            tagId,
          },
        },
        update: {},
        create: {
          userId: student.id,
          tagId,
        },
      });
    }
  }

  // 6. Demo Batches
  const batchDefinitions = [
    { name: 'Grandmaster Tactics', coachId: createdCoaches[0].id, students: createdStudents.slice(0, 5) },
    { name: 'Endgame Mastery', coachId: createdCoaches[1].id, students: createdStudents.slice(5, 10) },
    { name: 'Positional Chess Elite', coachId: createdCoaches[2].id, students: createdStudents.slice(10, 15) },
  ];

  for (const b of batchDefinitions) {
    const existingBatch = await prisma.batch.findFirst({
      where: { academyId: academy.id, name: b.name },
    });

    const batch = existingBatch
      ? existingBatch
      : await prisma.batch.create({
          data: {
            academyId: academy.id,
            name: b.name,
            coachId: b.coachId,
          },
        });

    for (const student of b.students) {
      await prisma.batchStudent.upsert({
        where: {
          batchId_studentId: {
            batchId: batch.id,
            studentId: student.id,
          },
        },
        update: {},
        create: {
          batchId: batch.id,
          studentId: student.id,
        },
      });
    }
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });