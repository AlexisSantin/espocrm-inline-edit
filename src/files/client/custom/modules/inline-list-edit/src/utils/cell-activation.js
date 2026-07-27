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
