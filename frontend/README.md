# HHS Frontend

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env.local`:
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api
```

## Run

Development:
```bash
npm run dev
```

Production build:
```bash
npm run build
npm start
```

## Deploy (Vercel)

1. Connect repository to Vercel
2. Set environment variable: `NEXT_PUBLIC_API_BASE_URL`
3. Deploy: `vercel --prod`
