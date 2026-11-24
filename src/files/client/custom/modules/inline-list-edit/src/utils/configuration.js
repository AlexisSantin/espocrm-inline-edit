/************************************************************************
 * This file is part of Inline List Edit for EspoCRM.
 *
 * Copyright (C) 2026 Alexis SANTIN
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 ************************************************************************/

/**
 * Keeps previous installations enabled until an administrator explicitly
 * limits the extension to selected entities.
 */
function isInlineEditEntityAvailable(
    metadata,
    entityType,
    isAdministration
) {
    const defs =
        metadata?.get(['scopes', entityType]) || {};

    if (
        !defs.entity ||
        defs.disabled ||
        entityType === 'Settings' ||
        metadata?.get(['clientDefs', entityType, 'editDisabled'])
    ) {
        return false;
    }

    if (defs.object) {
        return true;
    }

    if (!isAdministration) {
        return false;
    }

    return Boolean(
        metadata?.get([
            'clientDefs',
            entityType,
            'recordViews',
            'edit',
        ])
    );
}

export default function isInlineEditEnabledForEntity(
    config,
    entityType,
    metadata,
    isAdministration = false
) {
    if (
        !isInlineEditEntityAvailable(
            metadata,
            entityType,
            isAdministration
        ) ||
        config.get('inlineListEditEnabled') === false ||
        (isAdministration &&
            config.get('inlineListEditAdminEnabled') === false)
    ) {
        return false;
    }

    if (isAdministration) {
        return true;
    }

    if (config.get('inlineListEditAllEntities') !== false) {
        return true;
    }

    const entityList =
        config.get('inlineListEditEntityList');

    return Array.isArray(entityList) &&
        entityList.includes(entityType);
}
