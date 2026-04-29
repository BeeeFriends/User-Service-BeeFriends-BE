import { PrismaClient } from '@prisma/user-client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const adapter = new PrismaPg({
  connectionString: process.env.USER_DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

const SEEDER = 'seeder';

const campusSeeds = [
  {
    CampusName: 'BINUS @Kemanggisan',
    CampusAddress:
      'Jl. K. H. Syahdan No. 9, Kemanggisan, Palmerah, Jakarta Barat 11480',
    aliases: ['Bina Nusantara Kemanggisan'],
  },
  {
    CampusName: 'Anggrek Campus - BINUS @Kemanggisan',
    CampusAddress:
      'Jl. Kebon Jeruk Raya No. 27, Kebon Jeruk, Jakarta Barat 11530',
    aliases: ['Bina Nusantara Anggrek'],
  },
  {
    CampusName: 'Kijang Campus - BINUS @Kemanggisan',
    CampusAddress:
      'Jl. Kemanggisan Ilir III No. 45, Kemanggisan, Palmerah, Jakarta Barat 11480',
  },
  {
    CampusName: 'Syahdan Campus - BINUS @Kemanggisan',
    CampusAddress:
      'Jl. K. H. Syahdan No. 9, Kemanggisan, Palmerah, Jakarta Barat 11480',
  },
  {
    CampusName: 'BINUS @Alam Sutera',
    CampusAddress:
      'Jl. Alam Sutera Boulevard No. 1, Alam Sutera, Serpong, Tangerang 15325',
    aliases: ['Bina Nusantara Alam Sutera'],
  },
  {
    CampusName: 'BINUS @Bekasi',
    CampusAddress:
      'Jl. Lingkar Bulevar Blok WA No. 1, Summarecon Bekasi, Marga Mulya, Medan Satria, Bekasi 17142',
  },
  {
    CampusName: 'BINUS @Bandung - Paskal Campus',
    CampusAddress:
      'Jl. Pasirkaliki No. 25-27, Paskal Hyper Square, Bandung 40181',
    aliases: ['BINUS @Bandung'],
  },
  {
    CampusName: 'BINUS @Bandung - Dago Campus',
    CampusAddress: 'Jl. Ir. H. Juanda, Dago, Bandung',
  },
  {
    CampusName: 'BINUS @Malang',
    CampusAddress:
      'Araya Mansion No. 8-22, Pandanwangi, Blimbing, Malang 65154',
  },
  {
    CampusName: 'BINUS @Semarang',
    CampusAddress: 'Jl. Pemuda No. 142, Semarang 50132',
  },
  {
    CampusName: 'BINUS @Medan',
    CampusAddress: 'Medan, Sumatera Utara',
  },
  {
    CampusName: 'JWC Campus - BINUS @Senayan',
    CampusAddress: 'Jl. Hang Lekir I No. 6, Senayan, Jakarta',
  },
  {
    CampusName: 'FX Campus - BINUS @Senayan',
    CampusAddress: 'fX Sudirman, Jl. Jenderal Sudirman, Senayan, Jakarta',
  },
  {
    CampusName: 'BASE Campus',
    CampusAddress: 'Alam Sutera, Tangerang',
    aliases: ['BINUS ASO School of Engineering'],
  },
];

const departmentSeeds = [
  'Accounting',
  'Architecture',
  'Artificial Intelligence',
  'Automotive and Robotics Engineering',
  'Biotechnology',
  'Business Analytics',
  'Business Creation',
  'Business Engineering',
  'Business Hotel Management',
  'Business Information Technology',
  'Business Management',
  'Chinese - Global Business Chinese',
  'Civil Engineering',
  'Communication - Marketing Communication',
  'Computer Engineering',
  'Computer Science',
  'Computer Science - Global Class',
  'Computer Science - Software Engineering',
  'Computer Science & Mathematics',
  'Computer Science & Statistics',
  'Creative Communication',
  'Creativepreneurship',
  'Cyber Security',
  'Data Science',
  'Digital Business',
  'Digital Business Innovation',
  'Digital Communication',
  'Digital Media Communication',
  'Digital Psychology',
  'English - Creative Digital English',
  'Entrepreneurship - Business Creation',
  'Event & Travel Business',
  'Fashion',
  'Film',
  'Finance',
  'Food Technology',
  'Game Application & Technology',
  'Global Business Marketing',
  'Hotel Management',
  'Industrial Engineering',
  'Information Systems',
  'Interactive Design and Technology',
  'Interior Design',
  'International Business Management',
  'International Business Management - Global Class',
  'International Relations',
  'International Relations - Global Class',
  'International Trade',
  'Japanese Popular Culture',
  'Law - Business Law',
  'Management',
  'Master of Information Systems Management',
  'Master of Information Technology',
  'Master of Management',
  'Primary Teacher Education',
  'Product Design Engineering',
  'Program Profesi Insinyur',
  'Psychology',
  'Public Relations',
  'Taxation',
  'Visual Communication Design',
  'Visual Communication Design - Animation',
  'Visual Communication Design - Creative Advertising',
  'Visual Communication Design - New Media',
];

const hobbySeeds = [
  'Anime',
  'Art',
  'Badminton',
  'Basketball',
  'Board Games',
  'Books',
  'Coding',
  'Coffee',
  'Cooking',
  'Dance',
  'Design',
  'Esports',
  'Fitness',
  'Football',
  'Gaming',
  'K-Pop',
  'Movies',
  'Music',
  'Photography',
  'Reading',
  'Running',
  'Sports',
  'Traveling',
  'Volunteering',
  'Writing',
];

const normalizeName = (value: string) => value.trim().toLowerCase();

async function seedCampuses(now: Date) {
  const existingCampuses = await prisma.msCampus.findMany({
    select: {
      CampusID: true,
      CampusName: true,
      CampusAddress: true,
      Stsrc: true,
    },
  });
  const matchedCampusIds = new Set<number>();

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const campus of campusSeeds) {
    const aliases = [campus.CampusName, ...(campus.aliases ?? [])].map(
      normalizeName,
    );
    const existingCampus = existingCampuses.find(
      (item) =>
        !matchedCampusIds.has(item.CampusID) &&
        aliases.includes(normalizeName(item.CampusName)),
    );

    if (!existingCampus) {
      await prisma.msCampus.create({
        data: {
          CampusName: campus.CampusName,
          CampusAddress: campus.CampusAddress,
          Stsrc: 'A',
          CreatedAt: now,
          CreatedBy: SEEDER,
        },
      });
      created += 1;
      continue;
    }

    matchedCampusIds.add(existingCampus.CampusID);
    const shouldUpdate =
      existingCampus.CampusName !== campus.CampusName ||
      existingCampus.CampusAddress !== campus.CampusAddress ||
      existingCampus.Stsrc !== 'A';

    if (!shouldUpdate) {
      skipped += 1;
      continue;
    }

    await prisma.msCampus.update({
      where: { CampusID: existingCampus.CampusID },
      data: {
        CampusName: campus.CampusName,
        CampusAddress: campus.CampusAddress,
        Stsrc: 'A',
        UpdatedAt: now,
        UpdatedBy: SEEDER,
      },
    });
    updated += 1;
  }

  console.log(
    `Campuses seeded. Created: ${created}, updated: ${updated}, skipped: ${skipped}.`,
  );
}

async function seedDepartments(now: Date) {
  const existingDepartments = await prisma.msDepartment.findMany({
    select: { DepartmentName: true },
  });
  const existingNames = new Set(
    existingDepartments.map((department) =>
      normalizeName(department.DepartmentName),
    ),
  );
  const missingDepartments = departmentSeeds.filter(
    (departmentName) => !existingNames.has(normalizeName(departmentName)),
  );

  if (missingDepartments.length > 0) {
    await prisma.msDepartment.createMany({
      data: missingDepartments.map((DepartmentName) => ({
        DepartmentName,
        Stsrc: 'A',
        CreatedAt: now,
        CreatedBy: SEEDER,
      })),
    });
  }

  console.log(
    `Departments seeded. Created: ${missingDepartments.length}, skipped: ${departmentSeeds.length - missingDepartments.length}.`,
  );
}

async function seedHobbies(now: Date) {
  const existingHobbies = await prisma.msHobby.findMany({
    select: { HobbyName: true },
  });
  const existingNames = new Set(
    existingHobbies.map((hobby) => normalizeName(hobby.HobbyName)),
  );
  const missingHobbies = hobbySeeds.filter(
    (hobbyName) => !existingNames.has(normalizeName(hobbyName)),
  );

  if (missingHobbies.length > 0) {
    await prisma.msHobby.createMany({
      data: missingHobbies.map((HobbyName) => ({
        HobbyName,
        Stsrc: 'A',
        CreatedAt: now,
        CreatedBy: SEEDER,
      })),
    });
  }

  console.log(
    `Hobbies seeded. Created: ${missingHobbies.length}, skipped: ${hobbySeeds.length - missingHobbies.length}.`,
  );
}

async function main() {
  const now = new Date();

  await seedCampuses(now);
  await seedDepartments(now);
  await seedHobbies(now);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
