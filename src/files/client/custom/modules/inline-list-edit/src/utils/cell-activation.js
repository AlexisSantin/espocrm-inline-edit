const TEXT_NODE = 3;

const pointIsInside = (rect, x, y) =>
    x >= rect.left &&
    x <= rect.right &&
    y >= rect.top &&
    y <= rect.bottom;

/**
 * Direct text nodes target their parent cell in click events. Measuring them
 * prevents a click on visible text from being mistaken for empty cell space.
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

    return Array.from(cell.childNodes || []).some(node => {
        if (
            node.nodeType !== TEXT_NODE ||
            !node.textContent?.trim()
        ) {
            return false;
        }

        const range = createRange();

        range.selectNodeContents(node);

        return Array.from(range.getClientRects()).some(rect =>
            pointIsInside(
                rect,
                event.clientX,
                event.clientY
            )
        );
    });
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
        event.target !== cell ||
        view._isInlineEditMode ||
        view.isEditMode() ||
        !view.isReadMode() ||
        view.disabled ||
        view.readOnly
    ) {
        return false;
    }

    return !isDirectTextClick(
        cell,
        event,
        createRange
    );
}
