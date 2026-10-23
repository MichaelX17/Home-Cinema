# Problems, Issues & Logic Errors - Home Cinema

Based on analysis of the codebase, the following issues, potential bugs, and areas for improvement have been identified:

---

## 1. Security & Path Traversal Concerns

### 1.1 Insufficient Path Validation in Video API
- **Location**: `src/app/api/videos/[name]/route.ts`
- **Issue**: The code checks `resolvedPath.startsWith(allowedBase)` but doesn't handle symlink attacks or case-insensitive filesystem issues on some platforms.
- **Risk**: Potential path traversal if symlinks are present in `../movies-files/`
- **Recommendation**: Also use `fs.realpathSync()` on both paths to resolve symlinks before comparison.

### 1.2 Unrestricted Media Directory Access
- **Location**: `src/app/api/media/route.ts`, `src/app/movies/[slug]/getMedia.ts`
- **Issue**: Reads any subdirectory under `../movies-files/` without validation of folder names.
- **Risk**: Could expose unintended directories if they exist.
- **Recommendation**: Sanitize/validate slug/folderName against a whitelist or regex pattern.

### 1.3 No File Type Validation on Read
- **Location**: Video streaming API
- **Issue**: Serves any file type based on extension/MIME mapping without checking if it's actually a safe media file.
- **Risk**: Could potentially serve non-media files if placed in media directories.
- **Recommendation**: Add allowlist validation beyond extension checking.

---

## 2. Logic Errors & Edge Cases

### 2.1 Inconsistent Slug vs folderName Usage
- **Location**: Throughout the app (MovieCard uses `item.folderName` as href, getMedia takes slug)
- **Issue**: URL path is based on folder name, but folder names may contain special chars despite sanitization. No URL encoding/decoding consistency issues in routing, but could be fragile.
- **Impact**: If folder name has characters that don't work well in URLs, navigation could break.
- **Recommendation**: Consider generating a stable slug separately from filesystem folder names.

### 2.2 Race Conditions in Upload Operations
- **Location**: `src/app/api/upload/route.ts` (chunked uploads)
- **Issue**: 
  - When chunkIndex === 0, it unlinks temp file but doesn't handle concurrent uploads of same file
  - No locking mechanism for concurrent chunk writes
  - Renaming temp file to final on last chunk could fail if file is in use
- **Risk**: Corrupted uploads or data loss with concurrent uploads
- **Recommendation**: Use unique temp file names per upload session (include upload ID).

### 2.3 Unsafe File Replacement in Edit Mode
- **Location**: Upload route - replaceMedia logic
- **Issue**: `removeExistingVideoFiles()` deletes all video files in directory when replacing a movie. If upload fails mid-way after deletion, directory is left without video file.
- **Risk**: Data loss if upload is interrupted.
- **Recommendation**: Write to temp location first, then atomic replace (rename) after successful upload.

### 2.4 Season Numbering Assumptions
- **Location**: `src/app/movies/[slug]/getMedia.ts` (line ~170-220), `src/app/api/media/route.ts`
- **Issue**: Seasons are sorted by folder name/alphanumeric, then numbered sequentially starting from index+1 in the UI. But actual season numbers from folder names might not match if folders are named differently.
- **Example**: Folders `season-10`, `season-2` sorted alphanumerically as `season-10`, `season-2` if using simple string compare? Wait - code does: sorts by nameA.localeCompare(nameB) then falls back to numeric extraction. But for "season-10" vs "season-2", localeCompare might not give numeric order correctly depending on locale. Also the season number shown is `index + 1` (position), not the extracted number from folder name.
- **Bug**: Season display number may not match actual season number in filesystem. E.g., folder `season-5` might become "Season 1" if it's first in array after sorting issues.
- **Recommendation**: Use the extracted numeric value from folder name as the season number, not array index.

### 2.5 Episode Ordering Fragility
- **Location**: SeriesView/getMedia - episode sorting
- **Issue**: Similar to seasons, episodes sorted alphanumerically then numerically extracted. But display uses `epIndex + 1` as episode number, not extracted number from filename. This can cause mismatch between filename (S01E05.mp4) and displayed "Episode 6" if ordering is wrong.
- **Recommendation**: Parse episode numbers from filenames when possible (common patterns: S01E01, 01, episode-01).

### 2.6 Missing Video File Fallback Logic
: - **Location**: `src/app/api/media/route.ts` (lines ~40-80)
- **Issue**: For movies, if no video file found (neither explicit video/movie nor fallback), item is filtered out (`return null`). But for series in the detail view, seasons/episodes are discovered separately. Inconsistent behavior.
- **Impact**: A series folder might appear in catalog if it has cover but no episodes? Let us look - in media API, when type is movie and no effectiveVideoFile, returns null. When type is series, it doesn't have the same check - it will proceed and build item with video undefined. That seems intentional.
- **Potential Issue**: Empty series (no season folders/episodes) will appear in catalog with `seasons: []`, `totalEpisodes: 0`. Clicking it leads to SeriesView showing empty seasons list - poor UX.

### 2.7 Cross-PC Upload Network Issues
- **Location**: `src/app/api/upload/route.ts`, `src/app/api/media/route.ts`
- **Issue**: Upload functionality works when running on the same PC but fails when accessed from another PC on the same local network. The upload content form gets cleaned up, preventing content upload from remote PCs.
- **Root Cause**: Likely due to file system paths being relative to the host PC, CORS configuration issues, or session management that doesn't properly handle cross-origin/local network access. File uploads may be attempting to write to host-specific paths or session storage that isn't shared across devices.
- **Impact**: Users cannot upload content from devices other than the host PC, limiting collaborative use and remote access within local networks.
- **Recommendation**: 
  1. Implement network-aware path resolution using absolute paths or network-shared storage
  2. Configure CORS to allow cross-origin requests from local network devices
  3. Use session tokens or server-side storage instead of client-side storage for upload sessions
  4. Add proper error handling for network-related upload failures with clear UI feedback

---
 
 ## 3. Error Handling & Robustness

### 3.1 Silent Failures in Metadata Parsing
- **Location**: `src/app/api/media/route.ts` (line ~60-70), `getMedia.ts` (line ~50-65)
- **Issue**: JSON parse errors are caught and silently set metadata = {} with only console.error. No user-facing indication that metadata is corrupted.
- **Impact**: User doesn't know why titles/descriptions are missing.
- **Recommendation**: Log more details, possibly include a flag in response indicating parse errors.

### 3.2 Unhandled Promise Rejections
- **Location**: `HomeClient.tsx` - `void loadMedia()` calls
- **Issue**: Using `void` operator discards promise rejections. Errors are caught inside loadMedia but also could happen in edge cases.
- **Note**: Actually loadMedia does catch errors and sets error state, so it's handled. But pattern is fine.

### 3.3 AbortController Not Fully Utilized
- **Location**: UploadModal chunk uploads
- **Issue**: `abortControllerRef` is created but there's no UI to cancel uploads, and cleanup only happens on unmount? Looking at UploadModal, no cancel button shown during upload. Also when closing modal during upload, does it abort? Let us look at close behavior - when closing, form resets but upload might be in progress; abortController is reset on new opens but not explicitly aborted on close.
- **Issue**: If user closes modal mid-upload, the fetch requests continue in background.
- **Recommendation**: Abort ongoing uploads when modal closes.

### 3.4 Missing Error Boundaries
- **Location**: React components
- **Issue**: No error boundaries implemented. If getMedia throws or component crashes, Next.js will show error page but no graceful fallback.
- **Impact**: Poor UX on corrupted media data.
- **Recommendation**: Add error boundaries around media views.

### 3.5 Filesystem Sync Operations Blocking Event Loop
- **Location**: All API routes use synchronous fs methods (`fs.readdirSync`, `fs.readFileSync`, `fs.statSync`, `fs.rmSync`, etc.)
- **Issue**: Synchronous I/O blocks Node.js event loop. With large media libraries (hundreds/thousands of files), this will cause performance degradation and timeouts.
- **Severity**: High for scalability
- **Recommendation**: Migrate to async fs/promises API (`fs.promises.*`) for all file operations.

---

## 4. Data Consistency & State Management

### 4.1 Stale State After Upload/Delete
- **Location**: HomeClient - after upload/delete calls `loadMedia()` which refetches. But catalog might show stale data if filesystem changes externally.
- **Issue**: Also no cache invalidation strategy. Next.js API routes with `force-dynamic` are fine, but client-side state could get out of sync.
- **Good**: Using `force-dynamic` and `revalidate: 0` on dynamic pages.

### 4.2 localStorage Keying by Title Only
- **Location**: VideoPlayer - uses `progress_${title}` and `volume_${title}` as keys
- **Issue**: If two different media have the same title, they'll share progress/volume. Also titles with special chars in localStorage keys could cause issues.
- **Bug**: Progress leakage between different movies with identical titles.
- **Recommendation**: Use a unique identifier (folderName/slug/id) instead of title.

### 4.3 Missing Type Safety
- **Location**: Many places use `any` type
- **Examples**: 
  - `metadata: any = {}` in getMedia.ts and media route
  - `media: any` in MovieView.tsx, SeriesView.tsx
  - Error handling uses `error: any` in HomeClient
- **Impact**: Reduces TypeScript benefits, harder to catch bugs at compile time.
- **Recommendation**: Define proper interfaces (MediaItem, Metadata, Season, Episode types) in types directory and use them consistently.

### 4.4 Incomplete Interface Definitions
- **Location**: `src/app/components/HomeClient.tsx` defines MediaItem interface (line ~15-30), but similar interfaces duplicated elsewhere (MovieCatalog, MovieCard, etc.)
- **Issue**: Type duplication leads to drift and inconsistency.
- **Recommendation**: Centralize shared types in `src/types/` directory.

---

## 5. Performance Issues

### 5.1 No Pagination/Virtualization for Large Libraries
- **Location**: MovieCatalog renders all items in grid
- **Issue**: If user has hundreds/thousands of media items, rendering all at once will cause performance issues (slow initial load, high memory).
- **Recommendation**: Implement pagination, infinite scroll, or virtualization (e.g., react-window).

### 5.2 Unoptimized Image Loading
- **Location**: MovieCard and detail views use Next.js Image component correctly with sizes/priority. Good.
- **Minor Issue**: Cover images served through API endpoint (`/api/videos/[name]`) - works but adds an extra API hop vs static serving. Also no image caching headers.
- **Recommendation**: Consider serving images with appropriate Cache-Control headers in the videos API.

### 5.3 Synchronous Filesystem Reads on Every Request
- **Location**: GET /api/media scans entire directory tree synchronously on each request
- **Issue**: Expensive for large libraries. No caching.
- **Recommendation**: Add in-memory caching with TTL, or watch filesystem for changes. Or cache computed results.

### 5.4 generateStaticParams Removed But No Alternative Caching
- **Location**: As noted in fix.md, removed generateStaticParams to allow dynamic content
- **Trade-off**: Loses build-time optimization. Every visit to media detail page does filesystem reads.
- **Recommendation**: Consider ISR (Incremental Static Regeneration) if content changes infrequently, or on-demand revalidation.

---

## 6. UX/UI Issues

### 6.1 No Loading States for Upload
- **Location**: UploadModal - shows progress bar but could be clearer
- **Issue**: During chunked uploads, progress is shown but no indication of which file is uploading when multiple files (series). Also totalBytes calculation includes all files but uploadedBytesTotal accumulates across all - that's correct but UX could be better.
- **Minor**: Upload can be slow with large files, no ETA shown.

### 6.2 Missing Confirmation on Destructive Actions
- **Location**: Delete operations - uses `window.confirm()` which is blocking and not styled
- **Issue**: Not consistent with modern UI (modal-based confirmation would match design system).
- **Recommendation**: Replace with custom confirmation dialog component.

### 6.3 No Feedback When Video Fails to Load
- **Location**: VideoPlayer
- **Issue**: If video source is broken/missing, HTML5 video shows default browser controls/errors with no custom error message.
- **Recommendation**: Add error state handling and user-friendly error display.

### 6.4 Inactive State Logic Could Be Improved
- **Location**: VideoPlayer - cursor/controls auto-hide
- **Issue**: Complex timer management. When switching episodes (src changes), timers might not clean up properly? Looking at the effect dependencies, they depend on isDesktop, isPlaying - seems okay but could have edge cases.
- **Minor**: On mobile, different behavior (no auto-hide) - correct.

### 6.5 Season/Episode Management in Edit Mode
- **Location**: UploadModal edit mode for series
- **Issue**: When editing a series, it pre-populates seasons from existing folders but doesn't allow adding/removing seasons or episodes via UI - only allows uploading new files. No way to manage existing episode files.
- **Limitation**: Edit is somewhat limited compared to full media management.

---

## 7. Code Quality & Maintainability

### 7.1 Code Duplication
- **Location**: Media scanning logic duplicated between `GET /api/media` and `getMedia()`
- **Issue**: Same logic for finding cover, video, parsing metadata appears in multiple places. Any change needs to be made in multiple locations.
- **Recommendation**: Extract shared utilities (e.g., `lib/media-scanner.ts`) for media discovery/parsing.

### 7.2 Dead/Commented Code Potential
- **Location**: Not obvious from analysis, but codebase looks clean overall.

### 7.3 Inconsistent Error Messages
- **Location**: API routes - mix of Spanish and English in some messages? Let us look:
  - HomeClient sets Spanish errors: "No se pudo cargar el catálogo. Recarga la página." (line ~HomeClient)
  - API returns English errors like "Folder name is required", "Media folder not found"
  - UI mixes languages (Spanish in some places, English in others)
- **Inconsistency**: Mixed localization. Project description says "Tu cine personal en casa" (Spanish) but UI text varies.
- **Recommendation**: Standardize on one language or implement i18n.

### 7.4 Missing Input Validation
- **Location**: Upload route - folderName sanitization exists but could be more robust
- **Issue**: No length limits on metadata fields (title, description, etc.). Could lead to very large JSON files or UI layout issues.
- **Recommendation**: Add validation constraints on input sizes.

---

## 8. Testing & Quality Assurance

### 8.1 No Test Files
- **Observation**: No `__tests__`, `*.test.*`, or `*.spec.*` files found in codebase.
- **Issue**: No automated tests for critical functionality (upload, streaming, media parsing).
- **Recommendation**: Add unit/integration tests for core logic, especially API routes and file handling.

### 8.2 No Type Checking in CI
- **Note**: `tsconfig.json` has strict mode enabled. But no pre-commit hooks or CI mentioned.
- **Recommendation**: Add type checking (`tsc --noEmit`) to build/lint process.

---

## Priority Recommendations

### Critical (Fix Soon)
1. **Migrate to async filesystem operations** (5.3, 3.5) - Prevents blocking and scalability issues
2. **Fix season/episode numbering logic** (2.4, 2.5) - Correctness bug affecting series display
3. **Atomic file operations in uploads** (2.3, 2.2) - Prevent data loss
4. **Improve path validation with realpath** (1.1) - Security hardening
5. **Fix localStorage keying** (4.2) - Prevents cross-contamination of progress

### High Priority
1. **Extract shared media scanning logic** (7.1) - Reduce duplication and maintenance burden
2. **Add proper TypeScript types** (4.3, 4.4) - Improve code quality and safety
3. **Handle upload cancellation on modal close** (3.3) - Resource cleanup
4. **Add better error handling/UI for failed operations** (3.4, 6.3)

### Medium/Low Priority
1. **Implement caching for media catalog** (5.3) - Performance improvement
2. **Replace window.confirm with custom modal** (6.2) - UX polish
3. **Add tests** (8.1) - Long-term maintainability
4. **Standardize localization** (7.3) - Consistency
