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

const TEXT_NODE = 3;
const NATIVE_CONTROL_SELECTOR = [
    'a',
    'button',
    'input',
    'select',
    'textarea',
    'iframe',
    '[contenteditable="true"]',
    '[data-action]',
    '[role="button"]',
].join(', ');

const pointIsInside = (rect, x, y) =>
    x >= rect.left &&
    x <= rect.right &&
    y >= rect.top &&
    y <= rect.bottom;

/**
 * Measuring all descendant text nodes prevents a click on visible content
 * from being mistaken for empty cell space. This is needed for long-text
 * fields, whose read template fills the cell with nested block containers.
 */
export const isDirectTextClick = (
    cell,
    event,
    createRange = () => document.createRange()
) => {
    if (
        !Number.isFinite(event.clientX) ||
        !Number.isFinite(event.clientY)
    ) {
        return false;
    }

    const containsPointedText = node => {
        if (
            node.nodeType === TEXT_NODE &&
            node.textContent?.trim()
        ) {
            const range = createRange();

            range.selectNodeContents(node);

            return Array.from(range.getClientRects()).some(rect =>
                pointIsInside(
                    rect,
                    event.clientX,
                    event.clientY
                )
            );
        }

        return Array.from(node.childNodes || []).some(
            containsPointedText
        );
    };

    return Array.from(cell.childNodes || []).some(
        containsPointedText
    );
};

const isNativeControlClick = (cell, target) => {
    const control = target?.closest?.(NATIVE_CONTROL_SELECTOR);

    return Boolean(
        control &&
        (control === cell || cell.contains?.(control))
    );
};

/**
 * Only the unoccupied background of an editable cell activates inline edit.
 * Descendants keep their native EspoCRM behavior.
 */
export default function shouldActivateCell(
    view,
    event,
    cell,
    createRange
) {
    if (
        event.defaultPrevented ||
        (event.button ?? 0) !== 0 ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        view._isInlineEditMode ||
        view.isEditMode() ||
        !view.isReadMode() ||
        view.disabled ||
        view.readOnly
    ) {
        return false;
    }

    if (
        event.target !== cell &&
        !cell.contains?.(event.target)
    ) {
        return false;
    }

    if (isNativeControlClick(cell, event.target)) {
        return false;
    }

    return !isDirectTextClick(
        cell,
        event,
        createRange
    );
}
