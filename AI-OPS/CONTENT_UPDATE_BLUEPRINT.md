# Mamio Content Update Blueprint

## Core Judgment

Mamio cannot rely on a tiny hand-written question bank. A serious IELTS product needs a repeatable content supply chain: topic discovery, original item generation, validation, review, and publishing.

The product should not scrape or redistribute official IELTS/Cambridge/British Council practice tests. Those materials are protected by copyright and are best treated as external reference recommendations, not as an ingestion source. Mamio should generate original IELTS-style practice from public-domain, permissively licensed, or self-authored topic seeds.

## User Problem

Learners churn when they see the same reading passages, listening scenes, or writing prompts repeatedly. Repetition is useful for SRS vocabulary, but harmful for exam practice once the user remembers the answer.

## Proposed Solution

Build a content pipeline with four stages:

1. Source seeds from safe public sources.
2. Generate original IELTS-style drafts from those seeds.
3. Validate schema, answer coverage, difficulty balance, and duplication.
4. Publish approved items into `src/data/ielts/`.

## Source Policy

Allowed:

- Public topic feeds used only as inspiration, not copied as passages.
- Open-license summaries with attribution retained in draft metadata.
- User-authored or AI-authored original passages and questions.
- Internal performance data such as weak modules and failed questions.

Avoid:

- Copying official IELTS, Cambridge, British Council, IDP, or paid course passages/questions.
- Scraping sites whose terms prohibit automated access or redistribution.
- Publishing generated content without schema and answer validation.

## Minimum Viable Pipeline

- `npm run content:seed` fetches public topic seeds and saves a dated draft file.
- `npm run content:generate` uses AI to turn seeds into original draft reading/listening items.
- `npm run content:validate` checks production content shape and minimum bank size.
- A human or agent reviews draft JSON before moving it into `src/data/ielts/`.

## Product Targets

Short term:

- Reading: 30 passages, balanced easy/medium/hard.
- Listening: 24 scenes, at least 6 per IELTS section.
- Writing: 40 prompts, balanced Task 1 and Task 2.
- Speaking: 80 Part 1 topics, 50 Part 2 cue cards, 50 Part 3 discussion sets.

Medium term:

- Server-side content tables with status: `draft`, `approved`, `retired`.
- Admin review UI for approving generated questions.
- Weekly auto-generation job that never publishes directly.
- Deduplication by topic, passage title, and semantic fingerprint.

## Acceptance Criteria

- New content can be generated without directly editing production data files.
- Every generated item includes source metadata and an originality warning.
- Validation fails if required fields, answers, or minimum content counts are missing.
- Publishing remains explicit and reviewable.

## Risks

- Copyright risk if official test content is copied.
- Quality risk if AI-generated answers do not match the passage.
- Trust risk if wrong answers enter production.
- Cost risk if generation runs too often or without quota controls.

## Next Implementation Steps

1. Add seed fetcher and content validator.
2. Add AI draft generator that writes to `AI-OPS/content-drafts/`.
3. Add admin-only review workflow.
4. Move static banks toward server-loaded content once review and backup are stable.
