# Changelog

All notable changes to Inline List Edit are documented in this file.

The project follows [Semantic Versioning](https://semver.org/).

## [0.2.0] - 2026-11-20

### Added

- Keyboard activation of the edit button with Enter or Space.
- Continuous integration running the JavaScript tests on Node.js 18 and 22.

### Changed

- Opening another field while an editor is open now saves the active field
  instead of discarding its pending change.
- Edit buttons hidden during an active edit are removed from the tab order.

### Fixed

- Fields with the `inlineEditDisabled` parameter could be edited inline.
- Dynamic logic `readOnly` and `readOnlySaved` rules were ignored in lists;
  dynamic `required` rules were not applied to inline editors. The
  attributes these rules read are loaded with the list even when they are
  not displayed as columns.
- Entities with `editDisabled` client definitions could be edited inline.

## [0.1.3] - 2026-08-27

### Added

- An Administration setting to enable inline editing in Administration lists,
  disabled by default.

### Changed

- Release packaging and documentation now include the Administration setting.

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

[0.2.0]: https://github.com/AlexisSantin/espocrm-inline-edit/releases/tag/v0.2.0
[0.1.3]: https://github.com/AlexisSantin/espocrm-inline-edit/releases/tag/v0.1.3
[0.1.2]: https://github.com/AlexisSantin/espocrm-inline-edit/releases/tag/v0.1.2
