import { PrismaClient } from '@prisma/user-client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const adapter = new PrismaPg({
  connectionString: process.env.USER_DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

async function main() {
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
        {
          CampusName: 'Bina Nusantara Anggrek',
          CampusAddress: 'Jl. Kebon Jeruk Raya No.27, Jakarta Barat',
          Stsrc: 'A',
          CreatedAt: new Date(),
          CreatedBy: 'seeder',
        },
        {
          CampusName: 'Bina Nusantara Kemanggisan',
          CampusAddress: 'Jl. K.H. Syahdan No.9, Jakarta Barat',
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

  const deptCount = await prisma.msDepartment.count();
  if (deptCount === 0) {
    await prisma.msDepartment.createMany({
      data: [
        {
          DepartmentName: 'Computer Science',
          Stsrc: 'A',
          CreatedAt: new Date(),
          CreatedBy: 'seeder',
        },
        {
          DepartmentName: 'Information Systems',
          Stsrc: 'A',
          CreatedAt: new Date(),
          CreatedBy: 'seeder',
        },
        {
          DepartmentName: 'Accounting',
          Stsrc: 'A',
          CreatedAt: new Date(),
          CreatedBy: 'seeder',
        },
        {
          DepartmentName: 'Business Management',
          Stsrc: 'A',
          CreatedAt: new Date(),
          CreatedBy: 'seeder',
        },
        {
          DepartmentName: 'Visual Communication Design',
          Stsrc: 'A',
          CreatedAt: new Date(),
          CreatedBy: 'seeder',
        },
      ],
    });
    console.log('Majors seeded.');
  } else {
    console.log('Majors already exist, skipping.');
  }

  const hobbyCount = await prisma.msHobby.count();
  if (hobbyCount === 0) {
    await prisma.msHobby.createMany({
      data: [
        {
          HobbyName: 'Gaming',
          Stsrc: 'A',
          CreatedAt: new Date(),
          CreatedBy: 'seeder',
        },
        {
          HobbyName: 'Music',
          Stsrc: 'A',
          CreatedAt: new Date(),
          CreatedBy: 'seeder',
        },
        {
          HobbyName: 'Sports',
          Stsrc: 'A',
          CreatedAt: new Date(),
          CreatedBy: 'seeder',
        },
        {
          HobbyName: 'Movies',
          Stsrc: 'A',
          CreatedAt: new Date(),
          CreatedBy: 'seeder',
        },
        {
          HobbyName: 'Reading',
          Stsrc: 'A',
          CreatedAt: new Date(),
          CreatedBy: 'seeder',
        },
      ],
    });
    console.log('Hobbies seeded.');
  } else {
    console.log('Hobbies already exist, skipping.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
