# OPEN-PYQ — Question Lab MVP

> Less theory. More thinking. More problem-solving.

OPEN-PYQ is a question-focused, gaming-inspired open-source learning interface. It is designed around opening individual questions, using concise concept checkpoints and progressive hints, and checking an answer key only after trying independently.

## What's included in this first runnable build

- Responsive dashboard and question explorer
- Persistent local exam/paper selection and display name
- Search plus combined year, subject, and topic filters
- Question terminal with progressive hints, concept checkpoint, illustration text, problem-solving recipe, and answer-key reveal
- Local bookmarks
- Print builder with optional hints and answer keys; browser print dialog can save to PDF
- JSON-driven content split into exams, papers, syllabus mapping, and questions
- No paid API, account, build step, or backend required

## Important data status

The included question records are **demonstration examples**, not verified official GATE PYQs. The included syllabus mapping is a placeholder. Do not label these as official exam questions. Before publishing real questions, add provenance (official source URL/document, paper/year/session/question number), verify wording and answer keys, and map each record to the relevant official syllabus.

## Run locally

Because the app loads JSON using `fetch()`, open it through a local HTTP server rather than by double-clicking `index.html`.

1. Extract the ZIP or open this folder in a code editor.
2. Start a local server in the `open-pyq` folder. For example, if Python is available: `python -m http.server 8000`.
3. Open `http://localhost:8000` in your browser.
4. On first launch, choose the available GATE paper (currently CS) and save.

On an Android tablet, use a browser-based editor/preview that can serve a project folder, or upload the folder to a free static host when ready. Avoid editing the same file in multiple editors at once.

## Folder structure

```text
open-pyq/
├── index.html
├── css/
│   └── styles.css
├── js/
│   └── app.js
├── data/
│   ├── exams.json
│   ├── papers.json
│   ├── syllabus.json
│   └── questions.json
├── README.md
├── CONTRIBUTING.md
└── AUDIT-REPORT.md
```

No `ai-pipeline/extraction/` directory is included.

## Data record essentials

Every question should have a unique `id`, `examId`, `paperId`, `year`, `subjectId`, `topicIds`, `questionType`, `marks`, `text`, `status`, and `answerKey` (when verified). Optional fields include `title`, `options`, `concept`, `hints`, `guidance`, `illustration`, and `relatedTopicIds`.

Recommended future fields for trustworthy source tracking:

- `sourceTitle`
- `sourceUrl` or `sourceDocument`
- `paperSession`
- `questionNumber`
- `answerKeyStatus`: `unverified`, `community-reviewed`, or `verified`
- `syllabusMappingStatus`: `unmapped`, `proposed`, or `verified`

## Current boundaries

- Frontend-only: preferences and bookmarks live in this browser's `localStorage`; there is no account sync.
- No live AI integration is included. Free AI tools can assist development/content review, but any generated hints or answer keys require human verification before publication.
- Full solutions are intentionally not provided.
- Exam progress, schedules, goals, XP, leaderboards, and compulsory timers are intentionally out of scope.
- Only GATE CS is marked available in this starter. Other paper/exam records are planned placeholders, not implemented environments.

## Next milestones

1. Test all views and interactions on the target tablet and a desktop browser.
2. Replace demonstration questions with sourced and reviewed GATE CS questions.
3. Build a syllabus browser from the official syllabus, then link question records to stable subject/topic IDs.
4. Add a data validator and contributor review workflow.
5. Improve print selection UX and add accessible math rendering when verified math-heavy content is added.
6. Deploy the static app only after checking data provenance and licensing.
