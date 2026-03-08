import { PrismaClient } from '@prisma/user-client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const adapter = new PrismaPg({
  connectionString: process.env.USER_DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  // Campus
  const campusCount = await prisma.msCampus.count();
  if (campusCount === 0) {
    await prisma.msCampus.createMany({
      data: [
        {
          CampusName: 'Bina Nusantara Alam Sutera',
          CampusAddress: 'Jl. Jalur Sutera Barat No.21, Alam Sutera, Tangerang',
          Stsrc: 'A',
          CreatedAt: new Date(),
          CreatedBy: 'seeder',
        },
      ],
    });
    console.log('Campus seeded.');
  } else {
    console.log('Campus already exists, skipping.');
  }

  // Departments
  const deptCount = await prisma.msDepartment.count();
  if (deptCount === 0) {
    await prisma.msDepartment.createMany({
      data: [
        { DepartmentName: 'Computer Science', Stsrc: 'A', CreatedAt: new Date(), CreatedBy: 'seeder' },
        { DepartmentName: 'Accounting', Stsrc: 'A', CreatedAt: new Date(), CreatedBy: 'seeder' },
        { DepartmentName: 'Information System', Stsrc: 'A', CreatedAt: new Date(), CreatedBy: 'seeder' },
      ],
    });
    console.log('Departments seeded.');
  } else {
    console.log('Departments already exist, skipping.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
