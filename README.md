# Inline List Edit for EspoCRM

Inline List Edit adds fast, focused field editing directly to EspoCRM record
list views. It keeps EspoCRM's native navigation, validation and permissions
while reducing the need to open a full record form for small updates.

Current version: **0.1.2**. See the [release notes and download](https://github.com/AlexisSantin/espocrm-inline-edit/releases/tag/v0.1.2).

## Features

### Edit from a list view

- Hovering an editable cell displays a subtle outline and an edit button.
- Clicking the edit button opens the field editor.
- Clicking unused space inside a cell also opens the editor.
- Clicking existing content keeps EspoCRM's native behavior. Links still open
  their record, email links remain email links, and other native actions keep
  priority.
- Only one field can be edited at a time.

### Focused editing workflow

- While a field is open, edit buttons and hover outlines are hidden from the
  other cells.
- Clicking outside the editor validates and saves the current value.
- The same click does not immediately open another editor. Click the next cell
  again when ready to edit it.
- The blue check button validates and saves.
- The cancel button discards the current change.
- Opening and closing a field without changing its value does not send an
  unnecessary save request or display a misleading “Saved” notification.

### Adaptive editors

Editors are measured from their content and allowed to extend beyond narrow
table columns without changing the row height.

The sizing logic handles:

- short and long text;
- text areas and descriptions;
- names and other composite fields;
- enums and multi-enums;
- checkboxes;
- email addresses;
- phone numbers;
- links and parent links;
- link-multiple fields;
- Teams and Assigned Users;
- autocomplete results and relation selectors.

Dropdowns account for their longest available option, not only the currently
selected value. Relation selectors also account for selected and suggested
record names. Editors remain constrained to the available viewport.

### Pipeline-aware updates

When a Pipeline is changed inline, the extension mirrors EspoCRM's full edit
form and assigns the first valid stage of the new pipeline. This prevents a
stage from the previous pipeline being submitted with the new pipeline.

### EspoCRM-native behavior

Inline List Edit uses EspoCRM's native field views and save flow. This means
that required fields, field validators, relation selectors, custom field
views and server-side business rules continue to apply.

## Permissions and ACL

The extension does not grant additional access.

Before displaying an edit control, it checks:

- whether the user can edit the entity type;
- whether the user can edit the specific record;
- field-level forbidden lists from the user's role;
- read-only and disabled fields;
- locked records.

Every update is then sent through EspoCRM's native record API. Server-side ACL,
field validation and business rules remain authoritative even if a frontend
request is crafted manually.

## Administration

After installation, open:

**Administration → Customization → Inline List Edit**

The page provides three settings:

- **Enable inline list editing** — global on/off switch.
- **Enable for all entities** — enables the extension for every compatible
  entity.
- **Enabled entities** — when the previous option is disabled, selects exactly
  which entities can use inline editing.

The entity selector lists enabled EspoCRM object entities and supports both
standard and custom entities.

The extension is enabled for all compatible entities after a first
installation. Administrators can immediately restrict it to a selected list.

The settings are stored under these EspoCRM configuration keys:

| Setting | Key | Default |
| --- | --- | --- |
| Enable inline list editing | `inlineListEditEnabled` | `true` |
| Enable for all entities | `inlineListEditAllEntities` | `true` |
| Enabled entities | `inlineListEditEntityList` | `[]` |

`inlineListEditEntityList` is used only when
`inlineListEditAllEntities` is disabled. Selection-mode lists are left
unchanged; inline editing is attached to record list views.

## Installation

1. Download `inline-list-edit-0.1.2.zip` from the
   [v0.1.2 GitHub release](https://github.com/AlexisSantin/espocrm-inline-edit/releases/tag/v0.1.2),
   or choose the asset from the [latest release](https://github.com/AlexisSantin/espocrm-inline-edit/releases/latest).
2. In EspoCRM, open **Administration → Extensions**.
3. Upload the ZIP file.
4. Install the extension.
5. Reload EspoCRM in the browser.
6. Configure the enabled entities under
   **Administration → Customization → Inline List Edit**.

Do not unzip the package before uploading it to EspoCRM.

### Upgrade

Download the newer ZIP and install it from **Administration → Extensions**.
Existing Inline List Edit settings are preserved.

### Uninstall

Uninstall the extension from **Administration → Extensions**. The extension's
three configuration keys are removed. CRM records are not modified or deleted.

## Requirements and compatibility

- EspoCRM `>= 9.3.0`.
- PHP `>= 8.3`.
- A browser supported by the installed EspoCRM version. This project does not
  maintain a separate browser support matrix.

The installable manifest declares the EspoCRM and PHP requirements above.
Version 0.1.2 has been developed and tested against EspoCRM 10.0.3.

Because the extension integrates with native frontend field views, test it on
a staging instance before upgrading EspoCRM to a new major version.

## Usage

In a record list view, hover an editable cell and use its pencil control, or
click unused space inside the cell. Native links and other controls retain
their normal EspoCRM behavior.

| Action | Result |
| --- | --- |
| Hover an editable cell | Shows a subtle border and edit button |
| Click the edit button | Opens inline editing |
| Click empty cell space | Opens inline editing |
| Click native linked content | Keeps the original EspoCRM action |
| Click the blue check | Validates and saves |
| Click cancel | Discards the current change |
| Click outside after a change | Validates and saves, then closes |
| Click outside without a change | Closes without saving |
| Click another cell while editing | Saves the current field only |
| Click that other cell again | Opens its editor |

## Troubleshooting

### The edit button is not displayed

Check that:

- Inline List Edit is enabled globally;
- the entity is enabled in the extension settings;
- the user's role grants edit access to the entity, record and field;
- the record is not locked;
- the field is not read-only.

### A value is rejected

The extension deliberately keeps EspoCRM validation. Try the same value in the
full edit form and inspect EspoCRM logs if the server rejects it:

```text
data/logs/
```

### Changes are not visible after installation

Reload the browser without cache. Depending on the browser, use
`Ctrl+Shift+R` or `Ctrl+F5`.

## Repository structure

This repository is based on the official
[EspoCRM extension template](https://github.com/espocrm/ext-template).
The development tooling is intentionally kept in the repository; it is not
included in the installable ZIP.

Important paths:

```text
src/                 Extension source code
src/files/           Files installed into EspoCRM
src/scripts/         Install and uninstall scripts
src/tests/           JavaScript behavior tests
extension.json       Extension metadata used by the build
package.json         Node.js scripts and package version
build/               Generated ZIP packages, ignored by Git
site/                Local EspoCRM development instance, ignored by Git
compose.yaml         Local MariaDB and EspoCRM development services
```

The installable package contains:

```text
LICENSE
manifest.json
files/
scripts/
tests/
```

## Development

### Prerequisites

- Node.js 18 or newer
- npm 8 or newer
- PHP 8.3 or newer
- Composer
- Docker with Docker Compose

### Local setup

```bash
npm install
cp config-default.json config.json
docker compose up -d db
npm run all
docker compose up -d web
```

EspoCRM is then available at `http://localhost:8080`.

The default Docker credentials are intended for local development only.

### Daily workflow

Develop only in `src`. Never edit the generated `site` copy directly.

```bash
# Copy source changes into the local EspoCRM instance.
npm run sync

# Run this as well when metadata changes.
npm run clear-cache

# Run the JavaScript behavior tests (21 regression tests in v0.1.2).
npm test

# Build the installable package.
npm run extension
```

The generated package is written to `build/`.

For PHP static analysis after the local EspoCRM site and Composer dependencies
have been prepared, run:

```bash
npm run sa
```

The committed behavior coverage is currently in `src/tests/`; the repository
does not include product-specific PHP unit or integration test cases.

## Contributing

Issues and pull requests are welcome.

When contributing:

1. Keep changes in `src`.
2. Preserve EspoCRM's native interactions where possible.
3. Respect frontend and server-side ACL.
4. Inspect the implementation in the supported EspoCRM version before
   overriding a field or record view.
5. Add or update tests for behavior changes.
6. Run `npm test` and build the extension with `npm run extension` before
   opening a pull request.

## Releasing

The package version is read from `package.json`. The active
`.github/workflows/release.yml` workflow runs when a matching `v*` tag is
pushed. It installs the pinned dependencies, runs `npm test`, builds the
installable ZIP, verifies that the tag matches `package.json`, and creates a
published GitHub Release with the ZIP attached and a SHA-256 checksum.

For a release:

1. Update `package.json`, `CHANGELOG.md` and the supported-version notes in
   this README.
2. Run `npm test` and `npm run extension` locally if desired.
3. Commit and push the changes to the default branch.
4. Create and push the matching `v<version>` tag:

   ```bash
   git tag v<version>
   git push origin v<version>
   ```

5. Monitor the **Actions** run. When it succeeds, the **Releases** page
   contains `inline-list-edit-<version>.zip` for download.

The [v0.1.2 release](https://github.com/AlexisSantin/espocrm-inline-edit/releases/tag/v0.1.2)
already includes its downloadable ZIP asset.

## Support

Use [GitHub Issues](https://github.com/AlexisSantin/espocrm-inline-edit/issues)
for reproducible bugs and feature requests. When reporting a problem, include:

- the Inline List Edit version;
- the EspoCRM version;
- the browser;
- the field type;
- reproduction steps;
- relevant browser-console or EspoCRM log messages.

## License

Inline List Edit is free software licensed under the
[GNU General Public License v3.0 or later](LICENSE).

## Author

Created by Alex Santin.
