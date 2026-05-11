# BeeFriends User Service

User, authentication, profile, master data, and media storage service for BeeFriends.

---

## Features

- **Auth** - register/login with Binusian email, password, and Firebase ID token flow
- **Profile** - current user profile, public user lookup, and profile updates
- **Photos** - profile photo, gallery photo, and chat attachment upload endpoints
- **Master Data** - campus, major, and hobby APIs for registration and matching filters
- **Storage Proxy** - serves uploaded files from configured storage provider
- **Pub/Sub Events** - publishes user, campus, major, and hobby sync events for other services
- **Swagger** - API documentation for local and deployed environments

---

## Tech Stack

| Layer | Stack |
| ----- | ----- |
| Runtime | Node.js, NestJS, TypeScript |
| Database | PostgreSQL, Prisma |
| Auth | JWT, Passport, Firebase Admin |
| Storage | S3-compatible storage or Google Cloud Storage |
| Contracts | `@beefriends/shared-kernel` |

---

## API

| Environment | Base URL |
| ----------- | -------- |
| Production Gateway | `https://beefriends-be.drian.my.id/v1/user` |
| Local | `http://localhost:3001/v1/user` |

Swagger docs:

```txt
http://localhost:3001/v1/user/docs
```

Main routes:

| Area | Routes |
| ---- | ------ |
| Auth | `/auth/register`, `/auth/login`, `/auth/firebase-login` |
| Users | `/users/me`, `/users/me/photos`, `/users/me/chat-attachments`, `/users/:id` |
| Master Data | `/campus`, `/majors`, `/hobbies` |
| Storage | `/storage/*` |

---

## Architecture

```txt
BeeFriends Mobile
  -> API Gateway
    -> User Service
      -> PostgreSQL
      -> Firebase Admin
      -> Object Storage
      -> Redis Streams / Pub/Sub
```

The service publishes sync events that the Match Chat service consumes to keep match profile data fresh.

---

## Environment Variables

```env
PORT=3001
API_PREFIX=v1/user
API_DOCS_PATH=v1/user/docs
CORS_ORIGINS=*

USER_DATABASE_URL=
REDIS_URL=
REDIS_STREAM_MAXLEN=10000
JWT_SECRET=

FIREBASE_WEB_API_KEY=
FIREBASE_SERVICE_ACCOUNT_JSON=
FIREBASE_SERVICE_ACCOUNT_PATH=
GOOGLE_APPLICATION_CREDENTIALS=
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

Storage can be configured with one of these provider groups:

```env
RAILWAY_STORAGE_BUCKET=
RAILWAY_STORAGE_ENDPOINT=
RAILWAY_STORAGE_ACCESS_KEY_ID=
RAILWAY_STORAGE_SECRET_ACCESS_KEY=
RAILWAY_STORAGE_REGION=
STORAGE_PUBLIC_URL=
```

or:

```env
S3_BUCKET=
AWS_S3_ENDPOINT=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
```

or Google/Firebase storage values:

```env
GOOGLE_CLOUD_STORAGE_BUCKET=
GCS_BUCKET_NAME=
FIREBASE_STORAGE_BUCKET=
GOOGLE_CLOUD_STORAGE_PUBLIC_URL=
```

---

## Getting Started

```bash
npm install
npm run prisma:generate
npm run prisma:push
npm run prisma:seed
npm run start:dev
```

---

## Scripts

| Command | Description |
| ------- | ----------- |
| `npm run start:dev` | Start service in watch mode |
| `npm run build` | Compile NestJS app |
| `npm run start:prod` | Run compiled app |
| `npm run lint` | Run ESLint with fixes |
| `npm run test` | Run unit tests |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate` | Run local Prisma migration |
| `npm run prisma:push` | Push schema to database |
| `npm run prisma:seed` | Seed master data |
