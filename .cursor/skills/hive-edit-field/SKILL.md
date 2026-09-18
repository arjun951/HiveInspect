---
name: hive-edit-field
description: >-
  Hive inline field edits via PATCH /api/templates/:id/field. Use when
  making a new field editable (severity, answer type, etc.) or changing
  HomePage save/conflict/loader behavior.
---

# Hive edit a field

One API for all hierarchy edits. Do not add a new endpoint per field.

## Backend

`backend/src/controllers/templates.controller.js`:

- `ALLOWED_ENTITIES`: `template | section | item | comment`
- `ALLOWED_FIELDS` today: template/section/item `name`; comment `name`, `comment_text`

To expose another column (e.g. comment `severity`):

1. Add it to `ALLOWED_FIELDS.comment`
2. Validate (empty name rejected; `comment_text` may be empty; severity must be -1/0/1 or null)
3. `updateTemplateField` in `templates.service.js` already does `.update({ [field]: value })`

## Frontend

- `frontend/src/api/templateApi.js` — `updateField(templateId, entity, entityId, field, value)`
- `frontend/src/pages/HomePage/HomePage.jsx` — `editState`, `tryStartEdit`, `tryNavigate`, `handleSave`, `handleFieldUpdated`

Rules:

- One field in edit mode at a time. Switching fields or templates → conflict popup (discard or stay).
- Spread-and-override nested state; never rebuild an object from only the edited keys (keep `id`).
- Names cannot be empty. `comment_text` can.
- While `editState.saving` or duplicate/delete in flight, show `PageLoader` and block the UI.

Review-time edits (before confirm) live in `ReviewPage` / `SectionTree` / `CommentCard` and must also spread-and-override so `tempId` survives until confirm.
