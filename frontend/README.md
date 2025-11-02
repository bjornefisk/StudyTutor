# Tutor Frontend (Next.js)

## Getting Started

```bash
cd frontend
npm install
npm run dev
```

The app will be available at http://localhost:3000. Ensure the FastAPI backend is running on http://localhost:8000 or update `NEXT_PUBLIC_API_URL` in `.env.local`.

## Production Build

```bash
npm run build
npm start
```

## Environment Variables

Copy `.env.example` to `.env.local` and adjust values as needed.

## Document uploads and gallery

- Upload from chat: Use the paperclip icon next to the message send button to pick PDF, DOCX, MD, or TXT files. After a successful upload, ingestion is triggered automatically.
- Documents view: Open the "Documents" tab in the left sidebar to see a grid of your uploaded files with a type banner, file name, size, and date added.
- Manual ingestion: If needed, you can also use the dedicated upload/ingest panel components or call the backend `/ingest` endpoint.
