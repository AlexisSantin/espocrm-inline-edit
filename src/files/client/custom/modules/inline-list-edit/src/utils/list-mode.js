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
 * Remembers whether EspoCRM rendered a field as `list` or `listLink`.
 * The exact mode must be restored to preserve native links after editing.
 */
export const rememberListMode = view => {
    if (view.isListMode()) {
        view._inlineListEditReadMode = view.mode;
    }

    return view._inlineListEditReadMode || view.MODE_LIST;
};

/**
 * Runs EspoCRM's native inline-close workflow while redirecting its hard-coded
 * `detail` destination to the original list mode.
 */
export const closeInListMode = async (view, closeCallback) => {
    const hadOwnSetDetailMode =
        Object.prototype.hasOwnProperty.call(
            view,
            'setDetailMode'
        );
    const ownSetDetailMode = view.setDetailMode;
    const readMode = rememberListMode(view);

    view.setDetailMode = () => view.setMode(readMode);

    try {
        return await closeCallback();
    } finally {
        if (hadOwnSetDetailMode) {
            view.setDetailMode = ownSetDetailMode;
        } else {
            delete view.setDetailMode;
        }
    }
};
