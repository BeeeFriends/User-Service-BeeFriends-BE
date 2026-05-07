import { PrismaClient } from '@prisma/user-client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Client } from 'pg';
import type {
  CampusEventPayload,
  DepartmentEventPayload,
  HobbyEventPayload,
  UserEventPayload,
} from '@beefriends/shared-kernel';
import 'dotenv/config';

const adapter = new PrismaPg({
  connectionString: process.env.USER_DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

const SEEDER = 'seeder';
const PUBSUB_CHANNELS = {
  CAMPUS_EVENTS: 'campus_events',
  DEPARTMENT_EVENTS: 'department_events',
  HOBBY_EVENTS: 'hobby_events',
  USER_EVENTS: 'user_events',
} as const;

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

async function createPubSubClient() {
  if (!process.env.PUBSUB_DATABASE_URL) {
    console.warn('PUBSUB_DATABASE_URL is not set; skipping pubsub seed sync.');
    return null;
  }

  const client = new Client({
    connectionString: process.env.PUBSUB_DATABASE_URL,
  });

  try {
    await client.connect();
    await ensurePubSubTables(client);
    return client;
  } catch (error) {
    console.warn(
      `Could not connect to pubsub database; skipping pubsub seed sync: ${
        (error as Error).message
      }`,
    );
    await client.end().catch(() => undefined);
    return null;
  }
}

async function ensurePubSubTables(client: Client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS pubsub_events (
      id BIGSERIAL PRIMARY KEY,
      channel TEXT NOT NULL,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_pubsub_events_channel_id
    ON pubsub_events (channel, id)
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS pubsub_offsets (
      consumer_id TEXT NOT NULL,
      channel TEXT NOT NULL,
      last_event_id BIGINT NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (consumer_id, channel)
    )
  `);
}

async function publishPubSub(
  client: Client,
  channel: string,
  payload: unknown,
) {
  const event = await client.query<{ id: string }>(
    `
      INSERT INTO pubsub_events (channel, payload)
      VALUES ($1, $2::jsonb)
      RETURNING id
    `,
    [channel, JSON.stringify(payload)],
  );

  await client.query('SELECT pg_notify($1, $2)', [
    channel,
    JSON.stringify({ eventId: event.rows[0].id }),
  ]);
}

async function syncCampusesToPubSub(client: Client) {
  const campuses = await prisma.msCampus.findMany({
    where: { Stsrc: 'A' },
    orderBy: { CampusID: 'asc' },
  });

  for (const campus of campuses) {
    const payload = {
      type: 'campus.synced',
      campus: {
        id: campus.CampusID,
        name: campus.CampusName,
        address: campus.CampusAddress,
      },
      timestamp: new Date().toISOString(),
    } satisfies CampusEventPayload;

    await publishPubSub(client, PUBSUB_CHANNELS.CAMPUS_EVENTS, payload);
  }

  console.log(`Published ${campuses.length} campuses to pubsub.`);
}

async function syncDepartmentsToPubSub(client: Client) {
  const departments = await prisma.msDepartment.findMany({
    where: { Stsrc: 'A' },
    orderBy: { DepartmentID: 'asc' },
  });

  for (const department of departments) {
    const payload = {
      type: 'department.synced',
      department: {
        id: department.DepartmentID,
        name: department.DepartmentName,
      },
      timestamp: new Date().toISOString(),
    } satisfies DepartmentEventPayload;

    await publishPubSub(client, PUBSUB_CHANNELS.DEPARTMENT_EVENTS, payload);
  }

  console.log(`Published ${departments.length} departments to pubsub.`);
}

async function syncHobbiesToPubSub(client: Client) {
  const hobbies = await prisma.msHobby.findMany({
    where: { Stsrc: 'A' },
    orderBy: { HobbyID: 'asc' },
  });

  for (const hobby of hobbies) {
    const payload = {
      type: 'hobby.synced',
      hobby: {
        id: hobby.HobbyID,
        name: hobby.HobbyName,
      },
      timestamp: new Date().toISOString(),
    } satisfies HobbyEventPayload;

    await publishPubSub(client, PUBSUB_CHANNELS.HOBBY_EVENTS, payload);
  }

  console.log(`Published ${hobbies.length} hobbies to pubsub.`);
}

async function syncUsersToPubSub(client: Client) {
  const users = await prisma.msUser.findMany({
    where: { Stsrc: 'A' },
    include: {
      campus: true,
      department: true,
      hobbies: {
        where: { Stsrc: 'A' },
        include: { hobby: true },
        orderBy: { UserHobbyID: 'asc' },
      },
      photos: {
        where: { Stsrc: 'A' },
        orderBy: { SortOrder: 'asc' },
      },
    },
    orderBy: { UserID: 'asc' },
  });

  for (const user of users) {
    const payload = {
      type: 'user.synced',
      user: {
        id: user.UserID,
        displayName: user.Username,
        binusianEmail: user.Email,
        phoneNumber: user.PhoneNumber,
        gender: user.Gender,
        age: user.Age,
        binusianYear: user.CodeYear,
        description: user.Description,
        profilePhotoUrl: user.ProfilePhotoUrl,
        campusId: user.CampusID,
        campusName: user.campus.CampusName,
        campusAddress: user.campus.CampusAddress,
        majorId: user.DepartmentID,
        majorName: user.department.DepartmentName,
        hobbies: user.hobbies.map((userHobby) => ({
          id: userHobby.hobby.HobbyID,
          name: userHobby.hobby.HobbyName,
        })),
        photos: user.photos.map((photo) => ({
          id: photo.UserPhotoID,
          url: photo.PhotoUrl,
          sortOrder: photo.SortOrder,
          isProfile: photo.IsProfile,
        })),
      },
      timestamp: new Date().toISOString(),
    } satisfies UserEventPayload;

    await publishPubSub(client, PUBSUB_CHANNELS.USER_EVENTS, payload);
  }

  console.log(`Published ${users.length} users to pubsub.`);
}

async function syncSeedsToPubSub() {
  const pubSubClient = await createPubSubClient();
  if (!pubSubClient) return;

  try {
    await syncCampusesToPubSub(pubSubClient);
    await syncDepartmentsToPubSub(pubSubClient);
    await syncHobbiesToPubSub(pubSubClient);
    await syncUsersToPubSub(pubSubClient);
  } finally {
    await pubSubClient.end();
  }
}

async function main() {
  const now = new Date();

  await seedCampuses(now);
  await seedDepartments(now);
  await seedHobbies(now);
  await syncSeedsToPubSub();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
