# Resume Analysis Output Rules

Use these rules whenever a resume PDF is parsed and summarized for the interview assistant.

## Language And Tone

- Write in clear English unless the resume is mostly Vietnamese; if it is mostly Vietnamese, write the summary in Vietnamese.
- Keep wording concise, neutral, and easy to scan.
- Do not copy long sections from the resume into the summary.
- Do not invent roles, technologies, seniority, metrics, employers, schools, or dates.

## Parsed Resume Text

`parsedResumeText` must be a cleaned, readable version of the resume text.

- Preserve meaningful section boundaries with line breaks.
- Remove repeated headers, page numbers, broken hyphenation, control characters, and obvious PDF extraction artifacts.
- Keep original facts, names, dates, contacts, job titles, project names, education, certifications, and skills.
- Do not translate, embellish, summarize, or rewrite facts into claims not present in the original.
- Use plain text only. Do not return Markdown tables or HTML.

Recommended section style:

```text
Name / Contact
...

Summary
...

Skills
...

Experience
...

Projects
...

Education
...
```

Only include sections that are supported by the resume.

## Summary

`summary` must be a short human summary, not a full resume rewrite.

- 2 to 4 sentences.
- Maximum 90 words.
- Mention likely role direction, strongest technical stack/domain, and one concrete project or experience signal when available.
- Avoid bullet lists unless the resume is too fragmented for sentences.
- Avoid buzzwords without evidence.

## Arrays

- `skills`: 5 to 14 concrete skills or tools explicitly present in the resume.
- `roleSignals`: 2 to 8 interview-relevant signals such as Backend, Frontend, Full-stack, Data, DevOps, Mobile, AI integration, REST APIs, Authentication.
- `senioritySignals`: 0 to 6 evidence-backed signals such as internship, production deployment, team leadership, ownership, mentoring, architecture, testing, or operations.
- `projectHighlights`: 0 to 6 concise project or work highlights. Each item should be one sentence fragment.
- `warnings`: include only real issues that affect reliability, such as scanned PDF, very sparse content, broken extraction, missing dates, unclear role, or insufficient project detail.

## JSON Contract

Return JSON only with exactly these keys:

```json
{
  "parsedResumeText": "plain text",
  "summary": "2-4 sentence summary",
  "skills": [],
  "roleSignals": [],
  "senioritySignals": [],
  "projectHighlights": [],
  "warnings": []
}
```
