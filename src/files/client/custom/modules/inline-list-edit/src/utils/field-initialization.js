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
 * Schedules inline-list initialization independently of a field's
 * `afterRender` implementation. Some native EspoCRM fields, including
 * linkMultiple/Teams, don't call BaseFieldView.afterRender.
 */
export default function scheduleFieldInitialization(view) {
    if (
        !view.options?.inlineListEditEnabled ||
        view._inlineListEditInitializationQueued
    ) {
        return false;
    }

    view._inlineListEditInitializationQueued = true;

    view.once('after:render', () => {
        view._inlineListEditInitialized = true;
        view.initInlineEdit();
    });

    return true;
}
