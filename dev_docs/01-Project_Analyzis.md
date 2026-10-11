# Project Analysis: Home Cinema

## Overview

**Home Cinema** is a modern web application for managing and streaming a personal movie and series collection. Built with Next.js 16 (App Router), React 19, TypeScript, and Tailwind CSS, it provides an elegant dark-themed interface for browsing media, uploading content, and streaming videos with features like playback progress tracking and series episode management.

---

## Project Metadata

- **Name**: home-cinema
- **Version**: 0.1.0
- **Private**: true
- **Framework**: Next.js 16.1.1 (App Router)
- **Runtime**: Node.js (Next.js API routes with Node runtime)
- **Language**: TypeScript ^5
- **UI**: Tailwind CSS v4, Radix UI primitives
- **Package Manager**: pnpm (lockfile present, pnpm-workspace.yaml exists)

---

## Dependencies

### Production Dependencies
| Package | Version | Purpose |
|---|---|---|
| next | 16.1.1 | React framework with App Router |
| react | 19.2.3 | UI library |
| react-dom | 19.2.3 | React DOM renderer |
| typescript | ^5 | Type safety |
| tailwindcss | ^4 | Utility-first CSS |
| @radix-ui/react-aspect-ratio | ^1.1.8 | Aspect ratio container |
| @radix-ui/react-select | ^2.2.6 | Dropdown select component |
| @radix-ui/react-slot | ^1.2.4 | Polymorphic slot component |
| class-variance-authority | ^0.7.1 | Component variant management |
| clsx | ^2.1.1 | Conditional className utility |
| tailwind-merge | ^3.4.0 | Merge Tailwind CSS classes |
| tailwindcss-animate | ^1.0.7 | Animation utilities |
| lucide-react | ^0.562.0 | Icon library |
| busboy | ^1.6.0 | Multipart/form-data parser |
| tw-animate-css | ^1.4.0 | Additional CSS animations |

### Dev Dependencies
| Package | Version | Purpose |
|---|---|---|
| @tailwindcss/postcss | ^4 | Tailwind CSS PostCSS plugin |
| @types/node | ^20 | Node.js type definitions |
| @types/react | ^19 | React type definitions |
| @types/react-dom | ^19 | React DOM type definitions |
| eslint | ^9 | Linting tool |
| eslint-config-next | 16.1.1 | Next.js ESLint configuration |

---

## Project Structure

```
Home-Cinema/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # API routes
│   │   │   ├── media/          # Media catalog management (GET, DELETE)
│   │   │   ├── upload/         # File upload handling (chunked + multipart)
│   │   │   └── videos/         # Video/image streaming
│   │   ├── components/         # Page-specific components
│   │   ├── movies/[slug]/      # Dynamic media detail pages
│   │   ├── layout.tsx          # Root layout with ToastProvider
│   │   ├── page.tsx            # Home page
│   │   └── globals.css         # Global styles & theme
│   ├── components/
│   │   └── ui/                 # Reusable UI components (shadcn/ui style)
│   ├── lib/
│   │   └── utils.ts            # Utility functions (cn helper)
│   └── types/                  # TypeScript type definitions
├── public/                     # Static assets
├── next.config.ts              # Next.js configuration
├── tailwind.config.ts          # Tailwind CSS configuration
├── tsconfig.json               # TypeScript configuration
├── ecosystem.config.js         # PM2 process management
├── start-app.sh                # Deployment startup script
└── package.json                # Project scripts & dependencies
```

---

## Core Features

### 1. Media Catalog Management
- **Automatic Scanning**: API scans media directories to discover movies and series
- **File Format Support**: MP4, MKV, AVI, MOV, WebM for videos; JPG, JPEG, PNG, WebP for covers
- **Metadata Support**: Reads JSON metadata files (`info.json` or other `.json`) for title, year, description, genre, director, actors, rating
- **CRUD Operations**: Browse, upload, edit, and delete media items via API

### 2. Content Types
- **Movies**: Single video file with cover image and metadata
- **Series**: Organized by season folders (`season-1`, `season-2`, etc.) with multiple episode videos
- **Smart Type Detection**: Automatically distinguishes movies vs series based on metadata (`type` field; normalizes "serie" → "series")

### 3. Video Streaming
- **Range-Request Support**: Implements HTTP 206 Partial Content for seeking and streaming large files
- **Streaming API**: Serves videos with proper MIME types and range headers
- **Security**: Path validation to prevent directory traversal attacks
- **Multiple Formats**: Supports MP4, WebM, MOV, MKV, AVI, OGG

### 4. Upload System
- **Chunked Uploads**: Large files split into 10MB chunks with resume capability and retry logic (up to 3 attempts)
- **Multipart Uploads**: Standard form uploads for covers, metadata, and smaller files
- **Series Upload**: Upload multiple episodes organized by season folders
- **Edit Mode**: Update existing media (rename folders, replace media, update metadata/covers)
- **Smart File Handling**: Sanitizes filenames, manages folder structures, handles replacement logic

### 5. User Interface
- **Dark Theme**: Custom dark cinema-optimized theme with gradient backgrounds and glow effects
- **Responsive Design**: Mobile-first approach; works on desktop, tablet, and mobile
- **Home Page**: Catalog view with filtering (All/Movies/Series), sorting (A-Z/Z-A/Newest/Oldest), and media count statistics
- **Media Cards**: Hover effects, play overlay, edit/delete actions, cover images
- **Movie Detail Page**: Video player, metadata sidebar (genre, year, duration, rating, director, cast), synopsis
- **Series Detail Page**: Episode browser organized by seasons, select episode to play
- **Custom Video Player**: Full-featured HTML5 video player with:
  - Playback controls (play/pause, seek, volume)
  - Keyboard shortcuts (Space, Arrow keys, F for fullscreen)
  - Fullscreen support
  - Progress persistence (localStorage per title)
  - Volume persistence (localStorage per title)
  - Double-click to fullscreen, single-click to play/pause
  - Auto-hide controls and cursor during playback
  - Episode switching (resets player state)
- **Upload Modal**: Form-based interface for creating/editing media with validation
- **Toast Notifications**: User feedback for actions

---

## Configuration

### Environment
- **Working Directory**: `/home/miguel/Desktop/Local-Apps/Home-Cinema` (as per start-app.sh/ecosystem)
- **Media Storage**: `../movies-files/` (relative to project root; stores all media content)
- **Allowed Dev Origins**: localhost, 127.0.0.1, 192.168.0.102, 192.168.*.* (for network access)
- **Server Actions Origins**: 192.168.0.102:3000, localhost:3000

### Next.js Config (`next.config.ts`)
```typescript
basePath: "" (root deployment)
experimental.serverActions.allowedOrigins configured for network access
allowedDevOrigins for development on local network
```

### Styling
- **Tailwind CSS v4** with PostCSS
- **CSS Variables** for theming (HSL/OKLCH color tokens)
- **Dark mode** configured (`darkMode: "class"`)
- **Custom animations** via tailwindcss-animate and tw-animate-css
- **shadcn/ui** component pattern with aliases (`@/components`, `@/lib/utils`, etc.)

---

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/media` | GET | Returns all media items from `../movies-files/`. Scans folders, extracts metadata, finds covers/videos, identifies series seasons. |
| `/api/media` | DELETE | Deletes a media folder by `folderName` query parameter. |
| `/api/upload` | POST | Handles file uploads. Detects chunked uploads (via `x-file-name`, `x-chunk-index`, `x-total-chunks` headers) or multipart form data. Supports create/edit modes, media type specification, series season uploads. |
| `/api/videos/[name]` | GET | Streams video/image files with range request support for partial content. Includes path traversal protection. |

---

## Media Directory Structure

The app expects media in `../movies-files/` relative to the app directory:

**For Movies:**
```
movies-files/
└── Movie-Title/
    ├── cover.jpg (or poster.jpg)
    ├── movie.mp4 (or video.mp4, or any video file)
    └── info.json (optional metadata)
```

**For Series:**
```
movies-files/
└── Series-Title/
    ├── cover.jpg
    ├── info.json (optional, with type: "series" or "serie")
    ├── season-1/
    │   ├── episode-01.mp4
    │   └── episode-02.mp4
    └── season-2/
        └── episode-01.mp4
```

---

## Deployment

- **PM2 Configuration**: `ecosystem.config.js` manages two apps:
  1. `movies-app` - This Next.js app (runs on port 3000 via start-app.sh)
  2. `files-app` - External LANshare app (runs on port 3001)
- **Startup Script** (`start-app.sh`): 
  - Uses fnm (Fast Node Manager) to set up Node environment
  - Switches to `production` branch
  - Runs `pnpm run build` if needed (in full script)
  - Runs `pnpm run start` on port 3000

---

## Key Implementation Details

### Routing
- Uses Next.js App Router with dynamic segments: `movies/[slug]`
- `generateStaticParams` was removed (as noted in fix.md) to allow runtime discovery of new content without rebuilding
- Pages use `export const dynamic = "force-dynamic"` and `revalidate = 0` for dynamic content
- Client components isolated with `HomeClientNoSSR.tsx` to avoid hydration issues

### State Management
- React hooks (useState, useEffect) for local component state
- No global state library (Redux, Zustand, etc.) - simple prop drilling
- localStorage for persisting video progress and volume

### Data Flow
1. Home page loads media via `GET /api/media`
2. API scans filesystem under `../movies-files/` and returns structured MediaItem objects
3. User clicks media card → navigates to `/movies/[slug]`
4. Detail page calls `getMedia(slug)` server-side to read filesystem and parse metadata/episodes
5. Renders MovieView or SeriesView based on type
6. Upload creates/updates via `/api/upload`, then refreshes catalog

### Error Handling
- API routes return structured JSON errors with appropriate HTTP status codes
- Upload has retry logic (3 attempts) for chunked uploads
- Client shows error messages in UI with toast notifications
- AbortController used to cancel in-flight requests on unmount

---

## Security Considerations
- Path traversal protection in video streaming (`resolvedPath.startsWith(allowedBase)`)
- Filename sanitization in uploads (removes dangerous chars, normalizes paths)
- Folder name validation
- File type checking for uploads (MIME type validation)
- No direct filesystem access from client - all via API routes

---

## Notable Files

- **`src/app/api/upload/route.ts`**: Complex upload logic handling both chunked (for large videos) and multipart uploads, with edit/create modes and series support
- **`src/app/api/videos/[name]/route.ts`**: Custom range request implementation for video streaming
- **`src/app/movies/[slug]/getMedia.ts`**: Server-side media parsing logic (shared between page and potentially other usages)
- **`src/app/components/VideoPlayer.tsx`**: Sophisticated custom video player with full interaction handling
- **`src/app/components/UploadModal.tsx`**: Feature-rich upload/edit modal with validation and progress tracking
- **`fix.md`**: Documents recent refactoring to consolidate to single Next.js process

---

## Development Scripts

```json
{
  "dev": "next dev",      // Development server with hot reload
  "build": "next build",  // Production build
  "start": "next start",  // Start production server
  "lint": "eslint"        // Lint codebase
}
```

---

## Technical Stack Summary

| Category | Technology |
|---|---|
| Framework | Next.js 16.1.1 (App Router) |
| UI Library | React 19.2.3 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 |
| UI Components | Radix UI (AspectRatio, Select, Slot) + Custom |
| Icons | Lucide React |
| Upload Handling | Busboy (multipart parsing) |
| Utilities | clsx, tailwind-merge, class-variance-authority |
| Process Management | PM2 (ecosystem.config.js) |
| Package Manager | pnpm |
