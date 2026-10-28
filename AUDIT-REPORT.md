# OPEN-PYQ Generator PDF — Initial Code/Plan Audit

## Scope

This is a review of the supplied 73-page `OPEN-PYQ Web Application Generator.pdf` and the starter replacement implementation in this folder. The PDF is a conversation transcript with successive code revisions, not a clean source-code repository. PDF line wrapping and clipping make some code snippets incomplete, so a definitive source-level audit of the original generated app requires the original `.html`, `.css`, `.js`, and `.json` files.

## Findings in the PDF and plan

### 1. Multiple successive implementations are presented
The transcript builds the app in stages and repeatedly replaces files. Copying only selected snippets or mixing stages can leave mismatched HTML IDs, handlers, state fields, or CSS. **Fix in this MVP:** a single consistent HTML shell and one app controller are included together.

### 2. The data source is not proven official
The sample dataset uses GATE paper/year/subject/topic metadata, but the PDF itself does not establish that its sample question statements or answer keys are verified official PYQs. **Fix in this MVP:** sample records are labelled `demonstration`, and the interface explicitly warns users not to treat them as official questions.

### 3. The syllabus needs a real mapping source
The plan mentions syllabus placeholders, but a placeholder does not provide a complete, verified official syllabus. **Fix in this MVP:** `data/syllabus.json` states that it is a placeholder; official syllabus ingestion/mapping remains a milestone.

### 4. Local JSON loading requires a local server
The implementation pattern uses `fetch()` to load JSON. Browsers commonly block this when a page is opened directly from `file://`. **Fix in this MVP:** README instructs users to run a local HTTP server.

### 5. The code shown in the PDF is vulnerable to copy/paste truncation
In extracted PDF text, several JavaScript/template-string lines appear cut off (for example profile rendering and generated markup), and snippets are visually wrapped across lines. This may be PDF extraction/rendering loss rather than the original code, so it is a **verification warning**, not proof every original line is invalid. **Fix in this MVP:** complete source files are supplied directly, outside the PDF transcript.

### 6. User-specific defaults should not be hardcoded
The transcript's later sample includes a personal display name and target label in initial state. A public app should not ship with a specific user's identity as a default. **Fix in this MVP:** default display name is `Learner` and can be changed in the environment dialog.

### 7. “Offline” needs qualification
A page that loads question JSON with `fetch()` must be served locally; third-party CDNs would also require network access. **Fix in this MVP:** the app has no third-party runtime dependencies; it still needs a local HTTP server to load JSON. Full offline/PWA caching is not yet implemented.

### 8. Answer verification and provenance need explicit fields
The PDF proposes answer-key validation, but the data should distinguish unknown, proposed, and verified answers. **Fix in this MVP:** sample status is visible and README recommends source/provenance and verification fields for production data.

## Implemented in this starter

- Modular HTML/CSS/JavaScript/JSON files
- Exam/paper selection stored in `localStorage`
- Combined search/year/subject/topic filters
- Progressive hints, short concept note, illustration text, problem-solving guidance, and separate answer-key reveal
- Bookmarks stored locally
- Print selection with optional answer keys and hints
- Responsive layout and print CSS
- Safe HTML escaping for content rendered into the DOM

## Known limitations / not yet audited against real data

- No backend, authentication, cross-device sync, or AI API
- No real official GATE PYQ set included
- Syllabus map is only a placeholder
- No automated test suite yet; this initial build is checked for JavaScript syntax and JSON validity only
- No KaTeX integration yet; math-heavy source content needs a tested math-rendering pass
- The print builder selects the checked set from the current paper; test its selection behavior on the target browser before relying on it for a large document
