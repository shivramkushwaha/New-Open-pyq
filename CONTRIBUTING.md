# Contributing to OPEN-PYQ

Thanks for helping build a free, question-focused learning environment. Contributions should improve question accuracy, syllabus mapping, accessibility, or the learner's ability to solve independently.

## Question quality rules

1. Do not submit fabricated questions as official PYQs.
2. Include the official source or clearly mark the record as demonstration/unverified.
3. Verify the question statement, options, marks, year/session, and answer key against a reliable source.
4. Map each question to a topic in the official syllabus. If unsure, mark the mapping as proposed rather than verified.
5. Hints should scaffold reasoning in stages. Do not place a complete worked solution in a hint field.
6. Keep concept notes short and directly useful for the specific question.
7. Respect copyright and source terms. Add only material that the project has permission to redistribute; otherwise store permitted metadata and link to the source.

## Before submitting

- Validate JSON syntax.
- Ensure IDs are unique and stable.
- Use existing subject/topic names or explain a proposed new mapping.
- Mark data provenance and verification status honestly.
- Test the interface at mobile/tablet and desktop widths.
- Do not add tracking, progress pressure, timers, XP, or leaderboards without a project decision.

## Suggested question record

```json
{
  "id": "gate-cs-year-session-q-number",
  "examId": "gate",
  "paperId": "CS",
  "year": 2026,
  "subjectId": "Algorithms",
  "topicIds": ["Sorting"],
  "questionType": "MCQ",
  "marks": 1,
  "status": "unverified",
  "sourceTitle": "Official paper title",
  "sourceUrl": "https://example.invalid/replace-with-real-source",
  "text": "Question statement",
  "options": ["Option A", "Option B"],
  "answerKey": "Option B",
  "answerKeyStatus": "unverified",
  "hints": ["First reasoning nudge", "Second reasoning nudge"],
  "concept": "A concise concept checkpoint.",
  "guidance": ["Identify the given information", "Choose a relevant principle"],
  "syllabusMappingStatus": "proposed"
}
```

The URL above is a schema placeholder, not a source. Replace it with a real, checked source before using the record.
