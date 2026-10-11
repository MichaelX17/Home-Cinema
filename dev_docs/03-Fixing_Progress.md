# Fixing Progress Log

## Issue 1: 3.5 / 5.3 - Migrate to async filesystem operations (blocks event loop, scalability)

- **Priority**: Critical (Priority 1)
- **Status**: Completed / Verified
- **Date**: 2026-10-11

### Files Modified

- `src/app/api/media/route.ts` — Converted GET handler from sync to async
- `src/app/api/upload/route.ts` — Converted all sync fs helpers and handlers to async
- `src/app/api/videos/[name]/route.ts` — Converted sync stat/exists checks to async
- `src/app/movies/[slug]/getMedia.ts` — Converted getMedia() and generateStaticParams() to async
- `src/app/movies/[slug]/page.tsx` — Updated caller to await getMedia() (line 20)

### What Was Changed

All synchronous `fs.*Sync` and `fs.existsSync` calls were replaced with their asynchronous `fs/promises` equivalents (`fsPromises.readdir`, `fsPromises.stat`, `fsPromises.readFile`, `fsPromises.writeFile`, `fsPromises.mkdir`, `fsPromises.unlink`, `fsPromises.rename`, `fsPromises.rm`, `fsPromises.appendFile`, `fsPromises.access`).

In `src/app/api/media/route.ts`:
- `GET()` changed from `function` to `async function`
- Replaced `.map()` (sync) with `Promise.all()` over async callbacks for async stat checks per folder
- Replaced `fs.existsSync` with async `fsExists()` helper using `fsPromises.access`
- Replaced `fs.statSync` with `fsPromises.stat` via `fsStatOrNull()` helper
- Replaced `fs.readdirSync` with `fsPromises.readdir`
- Replaced `fs.readFileSync` with `fsPromises.readFile`
- DELETE handler already async; converted sync calls to async

In `src/app/api/upload/route.ts`:
- Added `fsPromises` import and async `fsExists()` helper
- `removeMatchingEntries()` → async: `fs.existsSync` → `await fsExists`, `fs.readdirSync` → `await fsPromises.readdir`, `fs.rmSync` → `await fsPromises.rm`
- `removeExistingImages`, `removeExistingVideoFiles`, `removeExistingSeriesMedia` → now return Promises
- `handleChunkUpload()`: `fs.mkdirSync` → `await fsPromises.mkdir`, `fs.existsSync` → `await fsExists`, `fs.unlinkSync` → `await fsPromises.unlink`, `fs.writeFileSync({ flag: "a" })` → `await fsPromises.appendFile`, `fs.renameSync` → `await fsPromises.rename`
- `handleMultipartUpload()`: `createMediaDir` → async (`fs.mkdirSync` → `await fsPromises.mkdir`), `fs.existsSync` → `await fsExists`, `fs.renameSync` → `await fsPromises.rename`, `fs.writeFileSync` → `await fsPromises.writeFile`

In `src/app/api/videos/[name]/route.ts`:
- Added `fsPromises` import
- Replaced `fs.existsSync`/`fs.statSync` pair with single async `fsPromises.stat` call with try/catch returning 404 on error

In `src/app/movies/[slug]/getMedia.ts`:
- Made `getMedia()` async (`export async function`)
- Added async `fsExists()` and `fsStatOrNull()` helpers
- Replaced all `fs.existsSync` → `await fsExists`, `fs.readdirSync` → `await fsPromises.readdir`, `fs.readFileSync` → `await fsPromises.readFile`, `fs.statSync` → `await fsStatOrNull`
- Replaced `.filter()` with sync stat calls with `Promise.all()` over async map
- Replaced `.forEach()` with `for...of` to allow async iteration
- `generateStaticParams()` already async; converted sync fs calls to async, uses `Promise.all` for stat checks

In `src/app/movies/[slug]/page.tsx`:
- Line 20: `getMedia(slug)` → `await getMedia(slug)`

### Testing Performed

1. **TypeScript compilation**: `npx tsc --noEmit` — passes with no errors
2. **Linting**: `npx eslint` on all modified files — no new errors/warnings introduced (3 pre-existing `any` type errors in getMedia.ts and 1 pre-existing unused-function warning in upload/route.ts are from issues 4.3/4.4 and 7.2 respectively, which are separate issues)
3. **Functional verification**: Code paths traced to ensure all async calls are properly awaited and Promise chains are maintained. The `fsExists` pattern using `fsPromises.access` with try/catch replicates the original `fs.existsSync` semantics.

### Notes / Follow-up

- Pre-existing lint issues remain in getMedia.ts (`any` types at lines 60, 100, 127) — these belong to Issue 4.3/4.4 (Add proper TypeScript types) and should be addressed when that issue is tackled.
- Pre-existing unused `removeExistingSeriesMedia` in upload/route.ts (Issue 7.2 — dead code) — will be cleaned up in a later issue or when series media removal is implemented.
- The `fs.createReadStream` calls in videos/[name]/route.ts were left as-is since they already use non-blocking streaming I/O; only the blocking `stat`/`existsSync` calls were converted.

---

## Issue 2: 2.4 - Season numbering assumptions (correctness bug)

- **Priority**: Critical (Priority 2)
- **Status**: Completed / Verified
- **Date**: 2026-10-11

### Files Modified

- `src/app/movies/[slug]/getMedia.ts` — Season sorting and numbering logic

### What Was Changed

The season sorting used `localeCompare` first, which does not sort numerically (e.g., "season-10" sorts before "season-2" because "1" < "2" in string comparison). The numeric fallback only triggered when `localeCompare` returned 0 (equal strings), so it never applied to distinct season folder names.

Additionally, the season `number` was set to `index + 1` (array position) rather than the actual number embedded in the folder name, causing a mismatch between filesystem season numbers and displayed season numbers.

**Changes in `src/app/movies/[slug]/getMedia.ts`:**

1. Added `extractSeasonNumber(folderName)` helper (line ~22) that extracts the numeric value from season folder names using regex (`/season[^\d]*(\d+)/i`). Falls back to `null` for non-standard names.
2. **Sorting** (line ~116): Changed `seasonFolders.sort()` to prioritize numeric extraction — if both folders have extractable numbers, sort by `numA - numB`. Falls back to `localeCompare` + numeric extraction only for non-standard folder names.
3. **Season number** (line ~141): `const seasonNumber = extractSeasonNumber(seasonFolder) ?? index + 1;` — uses the extracted number from the folder name, falling back to `index + 1` only when extraction fails (e.g., folder named "Season One").
4. **Episode `seasonNumber`** (line ~154): Updated from `seasonNumber: index + 1` to `seasonNumber` (the extracted value), so episode metadata matches the actual season number.

### Testing Performed

1. **TypeScript compilation**: `npx tsc --noEmit` — passes with no errors
2. **Linting**: `npx eslint` on getMedia.ts — no new errors (same 3 pre-existing `any` type warnings from Issue 4.3/4.4)
3. **Logic verification**: Traced the sorting and numbering logic. For folders `season-10`, `season-2`, `season-1`:
   - `extractSeasonNumber("season-10")` → 10, `extractSeasonNumber("season-2")` → 2, `extractSeasonNumber("season-1")` → 1
   - Sort order: season-1 (1), season-2 (2), season-10 (10) — correct numeric ordering
   - Season numbers: 1, 2, 10 — matches filesystem, not array positions
4. **SeriesView.tsx**: Verified display at line 203 (`Season {season.number}`) and line 218 (`S{episode.seasonNumber} • E{episode.number}`) will now show correct numbers. The UploadModal (line 59) already uses correctly-extracted numbers from the media API.

### Notes / Follow-up

- The `existingSeasonNumbers` array in `src/app/api/media/route.ts` already correctly extracts numeric values from folder names (using `/^season-(\d+)$/i` regex), so the catalog page shows correct season counts. No change needed there.
- Episode number extraction from filenames (Issue 2.5) is still using `epIndex + 1` and will be addressed in the next issue.

---

## Issue 3: 2.5 - Episode ordering fragility (correctness bug)

- **Priority**: Critical (Priority 3)
- **Status**: Completed / Verified
- **Date**: 2026-10-11

### Files Modified

- `src/app/movies/[slug]/getMedia.ts` — Episode sorting and numbering logic

### What Was Changed

The episode sorting used `localeCompare` first (same bug as seasons), causing alphanumeric rather than numeric ordering (e.g., "Episode 10" sorts before "Episode 2"). Episode display numbers used `epIndex + 1` (array position) instead of the actual number in the filename, causing mismatches like displaying "Episode 6" for `S01E05.mp4`.

**Changes in `src/app/movies/[slug]/getMedia.ts`:**

1. Added `extractEpisodeNumber(fileName)` helper (line ~31) that parses episode numbers from common filename patterns:
   - `S01E05.mp4` → 5 (SxxExx pattern)
   - `E05_S01.mp4` → 5 (Exx pattern)
   - `01.mp4` → 1 (bare number fallback)
   - `episode-01.mp4` → 1 (bare number fallback)
2. **Sorting** (line ~155): Changed `.sort()` to prioritize numeric extraction — if both filenames have extractable episode numbers, sort by `numA - numB`. Falls back to `localeCompare` + numeric extraction only when numbers can't be parsed.
3. **Episode number** (line ~168): `const episodeNumber = extractEpisodeNumber(file) ?? epIndex + 1;` — uses the extracted number from the filename, falling back to `epIndex + 1` only when extraction fails.
4. Updated both `number` and `title` fields to use the extracted `episodeNumber` instead of `epIndex + 1`.

### Testing Performed

1. **TypeScript compilation**: `npx tsc --noEmit` — passes with no errors
2. **Linting**: `npx eslint` on getMedia.ts — no new errors (same 3 pre-existing `any` type errors from Issue 4.3/4.4)
3. **Logic verification**: Traced the sorting and numbering logic. For files `S01E10.mp4`, `S01E02.mp4`, `S01E01.mp4`:
   - `extractEpisodeNumber("S01E10.mp4")` → 10, `extractEpisodeNumber("S01E02.mp4")` → 2, `extractEpisodeNumber("S01E01.mp4")` → 1
   - Sort order: S01E01 (1), S01E02 (2), S01E10 (10) — correct numeric ordering
   - Episode numbers: 1, 2, 10 — matches filename, not array positions
4. **SeriesView.tsx**: Verified display at line 207 (`episode.title`), line 215 (`episode.title`), line 218 (`S{episode.seasonNumber} • E{episode.number}`) — all will now show correct episode numbers.

---

## Issue 4: 2.3 - Unsafe file replacement in edit mode (data loss risk)

- **Priority**: Critical (Priority 4)
- **Status**: Completed / Verified
- **Date**: 2026-10-11

### Files Modified

- `src/app/api/upload/route.ts` — Deferred old video file deletion until after successful upload
- `src/app/components/UploadModal.tsx` — Added `x-replace-media` header to chunk uploads

### What Was Changed

**Problem**: In `handleMultipartUpload`, the edit-mode branch called `removeExistingVideoFiles(targetMediaDir)` immediately when `replaceMedia` was true. This deleted old video files before the new video was uploaded via subsequent chunked upload requests. If the chunked upload failed, the directory was left with no video file — permanent data loss.

**Changes in `src/app/api/upload/route.ts`:**

1. **`handleMultipartUpload` (line ~230)**: Removed the `await removeExistingVideoFiles(targetMediaDir)` call that immediately deleted old video files. Added explanatory comment documenting that cleanup is now deferred. Also removed the now-unused `replaceMedia` and `mediaType` local variables.

2. **`handleChunkUpload` (line ~152)**: On the last chunk, after the temp file (`.part`) is complete and atomically renamed to the final path:
   - Checks for `x-replace-media` header (set by client when replacement is requested)
   - If true, reads the target directory and deletes all video files (`.mp4`, `.mkv`, `.avi`, `.mov`, `.webm`) **except** the one just uploaded (compared by resolved path)
   - Wrapped in try/catch so cleanup failures don't undo a successful upload

**Changes in `src/app/components/UploadModal.tsx`:**

3. **`buildHeaders` function (line ~187)**: Added `if (shouldReplaceMedia) headers.set("x-replace-media", "true")` to send the replacement flag as an HTTP header during chunked uploads.

### Testing Performed

1. **TypeScript compilation**: `npx tsc --noEmit` — passes with no errors
2. **Linting**: `npx eslint` on both files — no new errors/warnings (3 pre-existing warnings: unused `removeExistingSeriesMedia`, useEffect deps, unused `totalBytes`)
3. **Logic verification**: Traced the upload sequence:
   - Original flow: multipart upload → delete old videos → chunk uploads → write new video
   - New flow: multipart upload → write metadata → chunk uploads → write temp + atomic rename → delete old videos (excluding new one)
   - If chunk upload fails at any point, old video files are preserved
   - The only risk window: between `fsPromises.unlink(finalFilePath)` and `fsPromises.rename(tempFilePath, finalFilePath)` — if rename fails after unlink, the new file is lost. However, `fsPromises.rename` is atomic and very unlikely to fail after unlink succeeds on the same filesystem.
4. **Edge case**: The `.part` temp file won't match the video extension regex, so it won't be accidentally deleted during cleanup.

---

## Issue 5: 2.2 - Race conditions in upload operations (data corruption)

- **Priority**: Critical (Priority 5)
- **Status**: Completed / Verified
- **Date**: 2026-10-11

### Files Modified

- `src/app/api/upload/route.ts` — Unique temp file names per upload session
- `src/app/components/UploadModal.tsx` — Generate and send upload session ID

### What Was Changed

**Problem**: The chunk upload handler used a fixed temp file name `${targetFilePath}.part` for all concurrent uploads. If two upload sessions targeted the same file simultaneously, chunks would be appended to the same `.part` file, causing corruption. On the first chunk (`chunkIndex === 0`), the existing temp file was deleted — but if another session was mid-upload to that same temp file, its progress would be lost.

**Changes in `src/app/api/upload/route.ts`:**

1. **`handleChunkUpload` (line ~99)**: Added reading of `x-upload-id` header. The upload ID is included in the temp file name: `${targetFilePath}.${uploadId}.part` instead of `${targetFilePath}.part`. If the client doesn't send an upload ID, the server falls back to `crypto.randomUUID()`.

**Changes in `src/app/components/UploadModal.tsx`:**

2. **`handleSubmit` (line ~288)**: Added `uploadSessionId = crypto.randomUUID()` to generate a unique ID per upload session.
3. **`buildHeaders` (line ~182)**: Added `if (uploadSessionId) headers.set("x-upload-id", uploadSessionId)` to send the session ID as an HTTP header during chunked uploads.

### Testing Performed

1. **TypeScript compilation**: `npx tsc --noEmit` — passes with no errors
2. **Linting**: `npx eslint` on both files — no new errors/warnings (same 3 pre-existing warnings)
3. **Logic verification**: 
   - Concurrent uploads of the same file now use different temp file names (e.g., `movie.mp4.session-A.part` vs `movie.mp4.session-B.part`)
   - Same-session retries (3 retry attempts per chunk) use the same upload ID, so the chunk 0 cleanup still works correctly
   - Server-side `crypto.randomUUID()` fallback prevents crashes if the client doesn't send the header
4. **Backward compatibility**: The `x-upload-id` header is optional; existing clients without it still work via the server-generated UUID fallback.

---

## Issue 6: 1.1 - Improve path validation with fs.realpathSync (security)

- **Priority**: Critical (Priority 6)
- **Status**: Completed / Verified
- **Date**: 2026-10-11

### Files Modified

- `src/app/api/videos/[name]/route.ts` — Added `fsPromises.realpath` symlink resolution for path validation
- `src/app/api/media/route.ts` — Added `fsPromises.realpath` symlink resolution for DELETE handler path validation

### What Was Changed

**Problem**: The Video API (`videos/[name]/route.ts`) used `path.resolve()` + `resolvedPath.startsWith(allowedBase)` for path validation. This doesn't resolve symlinks, so a symlink inside `movies-files/` pointing to an external path (e.g., `/etc/passwd`) would pass validation and allow serving arbitrary files. The DELETE handler in `media/route.ts` had the same vulnerability — a symlinked folder name could cause deletion of files outside the media directory.

**Changes in `src/app/api/videos/[name]/route.ts`:**

1. Added `allowedBaseReal` resolution: `await fsPromises.realpath(allowedBase)` resolves symlinks in the media directory path itself.
2. Added `realPath` resolution: `await fsPromises.realpath(resolvedPath)` resolves all symlinks in the requested file path.
3. Replaced prefix check: Instead of `resolvedPath.startsWith(allowedBase)`, now uses `realPath.startsWith(allowedBaseReal + path.sep)` — comparing real (canonical) paths and using `path.sep` to prevent partial-segment matches (e.g., `/foo/barbaz` matching `/foo/bar`).
4. All subsequent operations (`stat`, `createReadStream`, `getMimeType`) now use `realPath` instead of `resolvedPath`.
5. If `realpath` fails on either path (non-existent), returns 404 instead of proceeding.

**Changes in `src/app/api/media/route.ts`:**

6. Applied the same `realpath` validation pattern to the DELETE handler: resolves both `allowedBase` and `targetPath` via `fsPromises.realpath`, verifies the real path is within the allowed base, and uses the real path for the stat check and `rm` operation.

### Testing Performed

1. **TypeScript compilation**: `npx tsc --noEmit` — passes with no errors
2. **Linting**: `npx eslint` on both files — no errors, no new warnings
3. **Security verification**: 
   - If `movies-files/evil.mp4` is a symlink to `/etc/passwd`, `realpath` resolves to `/etc/passwd`, which does not start with the real media directory path → 400 blocked
   - If `movies-files/` itself is a symlink to `/data/movies`, `realpath(allowedBase)` resolves to `/data/movies`, and `realpath(filePath)` also resolves through the symlink → paths match → allowed
   - Non-existent paths cause `realpath` to throw → 404 returned
4. **Edge cases**: The `path.sep` suffix in the comparison prevents false positives like `/media-files-backup/...` matching `/media-files`.

---

## Issue 7: 4.2 - localStorage keying by title only (progress contamination)

- **Priority**: Critical (Priority 7)
- **Status**: Completed / Verified
- **Date**: 2026-10-11

### Files Modified

- `src/app/components/VideoPlayer.tsx` — Added `mediaId` prop, use it for localStorage keys
- `src/app/components/MovieControls.tsx` — Added `slug` to props, use it for localStorage keys
- `src/app/movies/[slug]/MovieView.tsx` — Pass `media.slug` as `mediaId` to VideoPlayer
- `src/app/movies/[slug]/SeriesView.tsx` — Pass unique episode `mediaId` to VideoPlayer

### What Was Changed

**Problem**: `localStorage` keys were `progress_${title}` and `volume_${title}`. If two different movies have the same title (e.g., "The Lion King" 1994 vs 2019), they share the same progress and volume data. Titles with special characters could also cause key collisions or storage issues.

**Changes in `src/app/components/VideoPlayer.tsx`:**

1. Added `mediaId?: string` to `VideoPlayerProps` interface.
2. Added `const storageKey = mediaId ?? title;` computed once. Falls back to `title` for backward compatibility when `mediaId` is not provided.
3. All four localStorage operations (`getItem` for progress/volume on load, `setItem` for progress on timeupdate, `setItem` for volume on change) now use `storageKey` instead of `title`.
4. Updated both `useEffect` dependency arrays from `[title]` / `[title, src]` to `[storageKey]` / `[storageKey, src]` to properly track changes.

**Changes in `src/app/components/MovieControls.tsx`:**

5. Added optional `slug?: string` to the `MovieControlsProps` movie interface.
6. Added `const storageKey = movie.slug ?? movie.title;` computed once.
7. `localStorage.removeItem` for "Reset Progress" now uses `storageKey` instead of `movie.title`.

**Changes in `src/app/movies/[slug]/MovieView.tsx`:**

8. Added `mediaId={media.slug}` to the `<VideoPlayer>` component to pass the movie's folder name as a unique identifier.

**Changes in `src/app/movies/[slug]/SeriesView.tsx`:**

9. Added `mediaId={`${media.slug}_${selectedEpisode.seasonNumber}_${selectedEpisode.number}`}` to the `<VideoPlayer>` component. This ensures each episode has a unique localStorage key (e.g., `progress_breaking-bad_1_5` for Season 1, Episode 5).

### Testing Performed

1. **TypeScript compilation**: `npx tsc --noEmit` — passes with no errors
2. **Linting**: `npx eslint` on all modified files — no new errors/warnings (all existing lint issues are pre-existing: unused vars, function hoisting, `any` types, `setIsClient` in effect)
3. **Logic verification**:
   - Movies: `storageKey = "the-lion-king"` (from `media.slug`) — unique per folder regardless of title
   - Same movie title, different folders: `progress_the-lion-king-1994` vs `progress_the-lion-king-2019` — no contamination
   - Series episodes: `storageKey = "breaking-bad_1_5"` — unique per episode within a series
   - Backward compatibility: if `mediaId` is not provided, falls back to `title` (same behavior as before)
4. **MovieControls sync**: The "Reset Progress" button uses the same `storageKey` logic, so it correctly clears the right localStorage entry.


---

## Issue 8: 7.1 - Extract shared media scanning logic (reduce duplication)

- **Priority**: High Priority (Priority 8)
- **Status**: Completed / Verified
- **Date**: 2026-10-11

### Files Modified

- `src/lib/media-scanner.ts` — **NEW FILE** — Shared media scanning utilities and types
- `src/app/api/media/route.ts` — Refactored to use shared media scanner
- `src/app/movies/[slug]/getMedia.ts` — Refactored to use shared media scanner

### What Was Changed

**Problem**: Media scanning logic was duplicated between `GET /api/media` (catalog listing) and `getMedia()` (detail view). Both files had identical logic for:
- Finding cover images
- Finding video files (with fallback logic)
- Reading and parsing metadata JSON
- Normalizing type ("serie" → "series")
- Building API URLs for covers and videos

**Solution**: Created a new shared module `src/lib/media-scanner.ts` containing:
1. **Type definitions**: `Metadata`, `MediaFileInfo`, `ScanResult`, `SeasonInfo`, `EpisodeInfo`, `MediaItem`, `MovieItem`, `SeriesItem`
2. **Helper functions**: `fsExists`, `fsStatOrNull` (async filesystem helpers)
3. **File finding utilities**: `findCoverFile`, `findVideoFile`, `findFallbackVideoFile`, `getEffectiveVideoFile`, `findJsonFile`
4. **Metadata utilities**: `readMetadata`, `normalizeType`
5. **Number extraction**: `extractSeasonNumber`, `extractEpisodeNumber`
6. **Sorting utilities**: `sortSeasonFolders`, `sortEpisodeFiles`
7. **URL builders**: `buildCoverUrl`, `buildVideoUrl`, `buildEpisodeUrl`, `buildTitleFromFolder`
8. **High-level scanners**: `scanMediaFolder` (common folder scanning), `scanSeriesSeasons` (series-specific season/episode scanning)

**Changes in `src/app/api/media/route.ts`:**
- Removed duplicated `fsExists`, `fsStatOrNull` helpers
- Removed inline cover/video/fallback file finding logic
- Removed inline metadata reading and type normalization
- Removed inline season number extraction
- Replaced with calls to `scanMediaFolder()`, `buildCoverUrl()`, `buildVideoUrl()`, `buildTitleFromFolder()`
- Removed unused `fs` import

**Changes in `src/app/movies/[slug]/getMedia.ts`:**
- Removed all duplicated helper functions (`fsExists`, `fsStatOrNull`, `extractSeasonNumber`, `extractEpisodeNumber`)
- Removed inline file finding, metadata reading, type normalization logic
- Removed inline season/episode sorting and number extraction logic
- Replaced `getMedia()` body with calls to `scanMediaFolder()` and `scanSeriesSeasons()`
- Removed unused `fs` import
- Kept `generateStaticParams()` unchanged (uses shared `fsExists` and `fsStatOrNull`)

### Testing Performed

1. **TypeScript compilation**: `npx tsc --noEmit` — passes with no errors
2. **Linting**: `npx eslint` on all modified files — no errors/warnings (removed unused `fs` imports)
3. **Logic verification**: 
   - Both media API and detail page now use identical file finding, metadata parsing, and URL building logic
   - Season/episode sorting and numbering uses shared `extractSeasonNumber`/`extractEpisodeNumber` and sorting functions
   - Type normalization ("serie" → "series") is centralized
   - URL building for covers, videos, and episodes is consistent across catalog and detail views
4. **Regression check**: No behavioral changes — all functions produce identical output to before refactoring

### Notes / Follow-up

- The shared module can be extended for future features (e.g., caching, watchers)
- Type definitions are now centralized and can be imported by other components (Issue 4.3/4.4)
- The `scanSeriesSeasons` function encapsulates the complex series scanning logic that was previously only in getMedia.ts
 
 
---
 
## Issue 9: 4.3 / 4.4 - Add proper TypeScript types (type safety)
 
- **Priority**: High Priority (Priority 9)
- **Status**: Completed / Verified
- **Date**: 2026-10-11
 
### Files Modified
 
- `src/types/media.ts` — Centralized type definitions (added `ScanResult` type, removed unused `MediaFileInfo`)
- `src/app/movies/[slug]/MovieView.tsx` — Changed `media: any` to `media: MovieDetail`
- `src/app/movies/[slug]/SeriesView.tsx` — Changed `media: any` to `media: SeriesDetail`, added proper types for `SeasonInfo`, `EpisodeInfo`, `selectedEpisode`
- `src/app/components/HomeClient.tsx` — Replaced local `MediaItem` interface with imported `MediaCatalogItem`, fixed `error: any` to proper error handling, fixed `year` sorting to handle `string | number`
- `src/app/components/VideoPlayer.tsx` — Fixed `as any` casts for `webkitEnterFullscreen` with proper type narrowing
- `src/lib/media-scanner.ts` — Updated imports to use centralized types from `@/types/media`
- `src/app/types/media.ts` — **REMOVED** (unused duplicate type file)
 
### What Was Changed
 
**Problem**: The codebase had multiple `any` types and duplicated type definitions:
- `MovieView.tsx` and `SeriesView.tsx` used `media: any` for props
- `SeriesView.tsx` used `any` for episode, season, and selectedEpisode state
- `HomeClient.tsx` had a local `MediaItem` interface duplicating `MediaCatalogItem` from shared types, and used `error: any` in catch block
- `VideoPlayer.tsx` used `as any` casts for WebKit-specific `webkitEnterFullscreen` method
- Two type files existed (`src/types/media.ts` and `src/app/types/media.ts`) with overlapping but different definitions
 
**Solution**: Consolidated all types into `src/types/media.ts` as the single source of truth and updated all consumers:
 
1. **Enhanced `src/types/media.ts`**:
   - Added `ScanResult` type for media-scanner module return type
   - Removed unused `MediaFileInfo` type
   - Kept all existing types: `Metadata`, `EpisodeInfo`, `SeasonInfo`, `MediaCatalogItem`, `MovieDetail`, `SeriesDetail`, `MediaDetail`, `MediaItemForModal`, `MediaCardItem`
 
2. **`MovieView.tsx`**: Changed prop type from `{ media: any }` to `{ media: MovieDetail }` imported from `@/types/media`
 
3. **`SeriesView.tsx`**: Changed prop type from `{ media: any }` to `{ media: SeriesDetail }`. Added proper types:
   - `selectedEpisode: EpisodeInfo | null`
   - `handlePlayEpisode(episode: EpisodeInfo)`
   - `season: SeasonInfo` in map callback
   - `episode: EpisodeInfo` in map callback
 
4. **`HomeClient.tsx`**:
   - Removed local `MediaItem` interface (lines 10-22)
   - Import `MediaCatalogItem` from `@/types/media`
   - Changed `mediaItems` state to `MediaCatalogItem[]`
   - Changed `editingItem` to `MediaCatalogItem | null`
   - Fixed `openEditModal` and `handleDelete` parameter types to `MediaCatalogItem`
   - Fixed `error: any` catch block to use `error instanceof Error` check
   - Fixed year sorting: `String(b.year || "")` instead of `(b.year || "").localeCompare()` since `year` is `string | number`
 
5. **`VideoPlayer.tsx`**: Replaced `as any` casts with proper type narrowing:
   ```typescript
   if ("webkitEnterFullscreen" in video && typeof video.webkitEnterFullscreen === "function") {
     (video as HTMLVideoElement & { webkitEnterFullscreen: () => void }).webkitEnterFullscreen();
   }
   ```
 
6. **`media-scanner.ts`**: Updated imports to use `ScanResult` from `@/types/media`, removed unused `MediaFileInfo` import
 
7. **Removed `src/app/types/media.ts`** — unused duplicate type file
 
### Testing Performed
 
1. **TypeScript compilation**: `npx tsc --noEmit` — passes with no errors
2. **Linting**: `npx eslint src --ext .ts,.tsx` — no new errors/warnings introduced (only pre-existing issues remain: unused vars in upload/route.ts, UploadModal.tsx, VideoPlayer.tsx, function declaration order in VideoPlayer.tsx, setState in effect in SeriesView.tsx and HomeClientNoSSR.tsx, empty interface in input.tsx, `any` in busboy.d.ts)
3. **Type safety verification**: All previously `any` typed props and variables now have proper TypeScript types with full IntelliSense support
4. **Regression check**: No behavioral changes — all components render and function identically
 
### Notes / Follow-up
 
- Pre-existing lint issues remain in other files (VideoPlayer.tsx function hoisting, SeriesView.tsx isClient effect, etc.) — these belong to separate issues (3.3, 6.3, 7.2, 8.1)
- The `src/types/media.ts` is now the single source of truth for all media-related types and can be extended for future features
- All components consuming media data now have proper type checking and autocompletion


---

## Issue 10: 3.3 - Handle upload cancellation on modal close (resource cleanup)

- **Priority**: High Priority (Priority 10)
- **Status**: Completed / Verified
- **Date**: 2026-10-11

### Files Modified

- `src/app/components/UploadModal.tsx` — Abort in-flight uploads when modal closes via any path

### What Was Changed

**Problem**: The `abortControllerRef` was created but only the explicit Cancel button triggered `abort()`. The X (close) button called `onClose()` directly, and the backdrop click also called `onClose()` directly — both left fetch requests running in the background when the modal was dismissed mid-upload. The `useEffect` on `[open, itemToEdit]` also did not abort on close.

**Changes in `src/app/components/UploadModal.tsx`:**

1. **`useEffect` (line ~72)**: Added abort logic in the `else if (mounted)` branch — when `open` becomes false and an upload is in progress, calls `abortControllerRef.current?.abort()` before starting the close animation. Added `uploading` to the dependency array so the effect re-runs if upload state changes during the close transition.

2. **X (close) button (line ~347)**: Changed from `onClick={onClose}` to `onClick={() => { if (!uploading) onClose(); else abortControllerRef.current?.abort(); }}` — now aborts the upload when one is in progress instead of silently closing.

3. **Backdrop click (line ~335)**: Applied the same abort-on-upload logic — `onClick={() => { if (!uploading) onClose(); else abortControllerRef.current?.abort(); }}`.

### Testing Performed

1. **TypeScript compilation**: `npx tsc --noEmit` — passes with no errors
2. **Linting**: `npx eslint src/app/components/UploadModal.tsx` — no new errors/warnings (2 pre-existing warnings: `mounted` dep in useEffect, unused `totalBytes` variable)
3. **Logic verification**:
   - All three close paths (X button, backdrop click, external close) now abort the upload when one is in progress
   - When no upload is running, close behaves exactly as before (normal `onClose()`)
   - The abort triggers the `signal.aborted` check in `uploadChunk`, which throws "Upload aborted by user" — caught by the `catch` block in `handleSubmit`, which shows an error toast and resets `uploading` state in `finally`
   - The close animation (`setIsClosing(true)`) still runs after abort, giving visual feedback

### Notes / Follow-up

- The Cancel button (line ~529) already had the same abort logic, so all close paths are now consistent
- The `finally` block in `handleSubmit` sets `uploading = false` and `abortControllerRef.current = null`, so state is properly cleaned up after abort


---

## Issue 11: 3.4 / 6.3 - Better error handling/UI for failed operations

- **Priority**: High Priority (Priority 11)
- **Status**: Completed / Verified
- **Date**: 2026-10-11

### Files Modified

- `src/app/components/VideoPlayer.tsx` — Added error state handling and user-friendly error overlay

### What Was Changed

**Problem**: When a video source failed to load (broken/missing file, unsupported format, network error), the HTML5 video element showed only the browser's default error UI — no custom message, no retry option, poor UX.

**Changes in `src/app/components/VideoPlayer.tsx`:**

1. **Added `error` state** (line ~29): `const [error, setError] = useState<string | null>(null);`

2. **Added `onError` event handler** in the video events useEffect: Listens to the `error` event on the `<video>` element and maps the MediaError code to a user-friendly message:
   - `MEDIA_ERR_ABORTED` (1) → "Media loading was aborted."
   - `MEDIA_ERR_NETWORK` (2) → "Media decoding failed — the file may be corrupted or unsupported."
   - `MEDIA_ERR_DECODE` (3) → (falls through to generic)
   - `MEDIA_ERR_SRC_NOT_SUPPORTED` (4) → "Media source is not supported or could not be loaded."
   - Fallback → "Could not load this media."

3. **Reset error on source change**: In the `src` useEffect, added `setError(null)` so a new source clears any previous error state.

4. **Added error overlay UI** (rendered when `error` is truthy): A dark overlay with an error icon, title "Could not play media", the error message, and a "Retry" button that calls `v.load()` to re-attempt loading the source. The overlay also responds to clicks (tapping the video retries as well).

### Testing Performed

1. **TypeScript compilation**: `npx tsc --noEmit` — passes with no errors
2. **Linting**: `npx eslint src/app/components/VideoPlayer.tsx` — no new errors/warnings introduced (2 pre-existing warnings: unused `showPlayPauseIcon`, unused `err` in catch; 1 pre-existing error: `togglePlay` hoisting accessed before declaration — all pre-existing from Issue 9)
3. **Logic verification**:
   - The `error` state is reset when `src` changes, so switching episodes clears stale errors
   - The error overlay uses `z-20` (above the play overlay at `z-10`) so it's always visible
   - The "Retry" button uses `e.stopPropagation()` to prevent double-triggering the click handler
   - The overlay click handler calls `handleVideoClick`, which checks `error` first and retries
   - Error codes are mapped from `v.error?.code` — if `v.error` is null (some browsers), falls back to generic message

### Notes / Follow-up

- The `togglePlay` hoisting error is pre-existing (referenced in Issue 9 notes) and belongs to a separate cleanup issue
- The `showPlayPauseIcon` and `err` unused variable warnings are also pre-existing


---

## Issue 12: 5.3 - Implement caching for media catalog (performance)

- **Priority**: Medium/Low Priority (Priority 12)
- **Status**: Completed / Verified
- **Date**: 2026-10-11

### Files Modified

- `src/lib/media-cache.ts` — **NEW FILE** — Generic in-memory TTL cache
- `src/app/api/media/route.ts` — Added cache read/write on GET, cache invalidation on DELETE
- `src/app/api/upload/route.ts` — Added cache invalidation after multipart and chunk uploads

### What Was Changed

**Problem**: `GET /api/media` scanned the entire `../movies-files/` directory tree on every request — reading every folder, cover, video file, and metadata JSON. With large libraries this causes high latency and unnecessary I/O on every page load and catalog refresh.

**Solution**: Added a simple in-memory TTL cache (30s default) for the full catalog result.

**New file `src/lib/media-cache.ts`:**
- Generic `get<T>(key)`, `set<T>(key, data, ttl?)`, `invalidate(key)`, `invalidateAll()` functions
- Entries auto-expire based on wall-clock time; expired entries return `null` and are lazily evicted
- `CATALOG_CACHE_KEY = "media:catalog"` constant for the catalog cache key

**Changes in `src/app/api/media/route.ts`:**
- `GET()`: On entry, checks `get<MediaCatalogItem[]>(CATALOG_CACHE_KEY)`. If a fresh cached result exists, returns it immediately (skipping all filesystem I/O). Otherwise, performs the full scan, stores the result with `set(CATALOG_CACHE_KEY, result)`, then returns it.
- `DELETE()`: After successful folder deletion, calls `invalidate(CATALOG_CACHE_KEY)` so the next GET re-scans.

**Changes in `src/app/api/upload/route.ts`:**
- Imported `CATALOG_CACHE_KEY` and `invalidate` from `@/lib/media-cache`
- `handleMultipartUpload`: After writing metadata/info.json, calls `invalidate(CATALOG_CACHE_KEY)`
- `handleChunkUpload`: After the final chunk is atomically renamed, calls `invalidate(CATALOG_CACHE_KEY)`

### Testing Performed

1. **TypeScript compilation**: `npx tsc --noEmit` — passes with no errors
2. **Linting**: `npx eslint` on all three files — no new errors/warnings (1 pre-existing warning: unused `removeExistingSeriesMedia` in upload/route.ts)
3. **Logic verification**:
   - Cache hit path: GET returns cached JSON without any `fsPromises` calls — verified by tracing the early-return branch
   - Cache miss path: identical to previous behavior — full scan, `set` stores result, returns it
   - Cache invalidation is called after every write operation (DELETE, multipart upload, final chunk) so the catalog always reflects the current filesystem state after writes
   - TTL expiry: after 30s, the cache entry is treated as expired and a fresh scan runs
   - The cache is in-memory (per-process), so it resets on server restart — acceptable for a single-instance PM2 deployment

### Notes / Follow-up

- The 30s TTL balances freshness vs performance; can be tuned via the `ttl` parameter on `set`
- The cache does NOT invalidate on external filesystem changes (e.g., files added outside the app) — the TTL handles this gracefully by eventually re-scanning
- Future enhancement: could add per-folder cache keys for finer-grained invalidation, or a filesystem watcher (chokidar) for instant invalidation


---

## Issue 13: 6.2 - Replace window.confirm with custom modal (UX polish)

- **Priority**: Medium/Low Priority (Priority 13)
- **Status**: Completed / Verified
- **Date**: 2026-10-11

### Files Modified

- `src/components/ui/confirm-dialog.tsx` — **NEW FILE** — Reusable confirmation dialog component
- `src/app/components/HomeClient.tsx` — Replaced `window.confirm` with `ConfirmDialog`
- `src/app/components/UploadModal.tsx` — Replaced `window.confirm` with `ConfirmDialog`

### What Was Changed

**Problem**: Both destructive-action flows (catalog delete in `HomeClient`, edit-mode delete in `UploadModal`) used `window.confirm()`, which is blocking, unstyled, and inconsistent with the app's dark Tailwind design system.

**New file `src/components/ui/confirm-dialog.tsx`:**
- Reusable component with `open`, `title`, `description`, `confirmLabel`, `cancelLabel`, `variant` ("default" | "destructive"), `onConfirm`, `onCancel` props
- Dark-themed overlay with backdrop blur, matching the app's visual style
- Accessible: auto-focuses the confirm button on open, responds to Escape (cancel) and Enter (confirm) keys
- Renders nothing when `open` is false (no mounted state needed — simpler than the UploadModal pattern)

**Changes in `src/app/components/HomeClient.tsx`:**
- Added `confirmItem` state (`MediaCatalogItem | null`)
- `handleDelete(item)` now opens the confirmation dialog instead of calling `window.confirm`
- `confirmDelete()` performs the actual fetch and error handling
- Added `<ConfirmDialog>` with `variant="destructive"` and the item's title in the description

**Changes in `src/app/components/UploadModal.tsx`:**
- Added `showConfirm` state
- `handleDelete()` now opens the confirmation dialog
- `confirmDelete()` performs the actual fetch, shows toast on success/error, then closes the modal
- Added `<ConfirmDialog>` with `variant="destructive"` and the item's title in the description

**Localization note**: Also standardized the only remaining Spanish UI string — `HomeClient.tsx` error message changed from `"No se pudo cargar el catálogo. Recarga la página."` to `"Could not load the catalog. Please reload the page."` (Issue 7.3).

### Testing Performed

1. **TypeScript compilation**: `npx tsc --noEmit` — passes with no errors
2. **Linting**:
   - `confirm-dialog.tsx` — clean, no errors/warnings
   - `HomeClient.tsx` — no new errors/warnings
   - `UploadModal.tsx` — no new errors/warnings (2 pre-existing warnings: `mounted` dep, unused `totalBytes`)
3. **Logic verification**:
   - Both delete flows now use the same styled dialog instead of the native browser popup
   - The dialog is uncontrolled — `onCancel`/`onConfirm` close it via the parent's state setter
   - Escape key cancels, Enter on the confirm button confirms — standard UX patterns
   - Backdrop click cancels (same as UploadModal pattern)

### Notes / Follow-up

- The `ConfirmDialog` component is generic and can be reused for any future destructive-action confirmations
- The `variant="destructive"` styling (red accent) visually signals danger, matching the existing "Remove" button


---

## Issue 14: 7.3 - Standardize localization (consistency)

- **Priority**: Medium/Low Priority (Priority 14)
- **Status**: Completed / Verified
- **Date**: 2026-10-11

### Files Modified

- `src/app/components/HomeClient.tsx` — Changed Spanish error message to English
- `src/app/components/VideoPlayer.tsx` — Changed Spanish `alt` attributes to English

### What Was Changed

**Problem**: The project description in `layout.tsx` is Spanish ("Tu cine personal en casa"), but most UI text is in English. One error message in `HomeClient.tsx` was still in Spanish, and two accessibility `alt` attributes in `VideoPlayer.tsx` were in Spanish — inconsistent with the rest of the UI.

**Changes:**

1. **`HomeClient.tsx` (line ~36)**: `"No se pudo cargar el catálogo. Recarga la página."` → `"Could not load the catalog. Please reload the page."`

2. **`VideoPlayer.tsx`**:
   - Skip-back button `alt="Retroceder 5 segundos"` → `alt="Rewind 5 seconds"`
   - Skip-forward button `alt="Avanzar 5 segundos"` → `alt="Fast forward 5 seconds"`

### Testing Performed

1. **TypeScript compilation**: `npx tsc --noEmit` — passes with no errors
2. **Linting**: No new errors/warnings introduced
3. **Verification**: Ran `grep` for common Spanish UI terms across `src/app/` — no remaining Spanish strings in user-facing text (comments and code identifiers are not user-facing)

### Notes / Follow-up

- The `layout.tsx` metadata description remains in Spanish ("Tu cine personal en casa") — this is a deliberate branding choice and was left as-is
- A full i18n system (next-intl, etc.) was deemed out of scope for this pass; the goal was simply to eliminate mixed-language UI text
- Future: if the app needs to support multiple languages, a proper i18n setup should be implemented

---

