# Changelog

All notable changes to Inline List Edit are documented in this file.

The project follows [Semantic Versioning](https://semver.org/).

## [0.1.2] - 2026-07-27

### Added

- Per-entity activation settings under Administration → Customization.
- Adaptive sizing for text, enum, multi-enum, relation, email, phone, boolean
  and composite field editors.
- Empty-cell activation while preserving native links and controls.
- Pipeline-aware updates that select a valid stage when the pipeline changes.
- ACL checks for entity, record and field edit permissions.

### Changed

- Only one inline editor can be open at a time.
- Clicking outside saves the active field without immediately opening another.
- Other cell actions and hover outlines are hidden during an active edit.
- Update and cancel actions use a compact, consistent layout.
- Editors use floating layouts when narrow columns cannot contain them.

### Fixed

- Dropdowns and relation selectors being clipped by a single-row list.
- Names, Assigned Users, Teams and long enum values being truncated.
- Email and phone editors losing their save and cancel actions after adding
  another value.
- Unchanged fields producing unnecessary save requests.
- Long-text cells not opening from their empty area.
- Pipeline changes failing `pipelineStage.valid` backend validation.

[0.1.2]: https://github.com/AlexisSantin/espocrm-inline-edit/releases/tag/v0.1.2
