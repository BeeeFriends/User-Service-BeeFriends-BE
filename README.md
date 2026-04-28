# BeeFriends User Service

Standalone NestJS service for BeeFriends user identity and profile data.

## Scope

- Firebase-backed auth verification
- Binusian user profile
- Campus master data
- Major master data
- Hobby master data
- Profile photo and gallery metadata

Shared API contracts and DTOs come from `@beefriends/shared-kernel`.

## Structure

```txt
src/              NestJS source and internal helpers
prisma/           User-service Prisma schema and seed
```

## Setup

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

## Run

```bash
npm run start:dev
```

Service runs on:

```txt
http://localhost:3001
```

Swagger:

```txt
http://localhost:3001/api/docs
```

## Build

```bash
npm run build
npm run start:prod
```
