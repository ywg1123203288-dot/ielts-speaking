# IELTS Speaking Practice

An IELTS speaking practice web app built with Next.js, Supabase, and AI/audio APIs. The project focuses on managing speaking topics and question cards, recording answers, transcribing audio, translating transcripts, and generating reference audio for practice.

## Features

- User registration and login with Supabase Auth
- Invite-code based access flow
- IELTS Part 1 / Part 2 / Part 3 topic and card management
- Question CRUD and reorder APIs
- Audio upload and storage with Cloudflare R2 / S3
- Speech-to-text transcription with Deepgram
- Chinese translation with DeepL
- Text-to-speech audio generation with Edge TTS
- User data isolation through authenticated API routes

## Tech Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase
- PostgreSQL
- Drizzle ORM
- Next.js API Routes
- Cloudflare R2 / S3
- Deepgram API
- DeepL API
- Edge TTS
- pnpm

## Project Structure

```text
src/
├── app/
│   ├── api/                 # API routes for auth, topics, cards, questions, audio, transcription, translation, TTS
│   ├── cards/               # Card detail pages
│   ├── topics/              # Topic pages
│   ├── login/               # Login page
│   └── register/            # Register page
├── components/ui/           # shadcn/ui components
├── lib/                     # Auth and shared utilities
└── storage/database/        # Supabase client and Drizzle schema
```

## Local Development

Install dependencies:

```bash
pnpm install
```

Create `.env.local` from `.env.example` and configure the required keys:

```bash
cp .env.example .env.local
```

Start the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build

```bash
pnpm build
pnpm start
```

## Notes

This repository is used as a portfolio project to demonstrate a small full-stack AI application: frontend pages, authenticated API routes, database schema, file storage, and third-party AI/audio API integration.
