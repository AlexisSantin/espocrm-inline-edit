export const areValuesEqual = (left, right) => {
    if (Object.is(left, right)) {
        return true;
    }

    if (
        left instanceof Date &&
        right instanceof Date
    ) {
        return left.getTime() === right.getTime();
    }

    if (Array.isArray(left) || Array.isArray(right)) {
        return (
            Array.isArray(left) &&
            Array.isArray(right) &&
            left.length === right.length &&
            left.every((item, index) =>
                areValuesEqual(item, right[index])
            )
        );
    }

    if (
        !left ||
        !right ||
        typeof left !== 'object' ||
        typeof right !== 'object'
    ) {
        return false;
    }

    const leftKeyList = Object.keys(left);
    const rightKeyList = Object.keys(right);

    return (
        leftKeyList.length === rightKeyList.length &&
        leftKeyList.every(key =>
            Object.prototype.hasOwnProperty.call(
                right,
                key
            ) &&
            areValuesEqual(left[key], right[key])
        )
    );
};

/**
 * Compares the complete record snapshot captured by EspoCRM when inline edit
 * opened. This includes composite and relation fields that update more than
 * one model attribute.
 */
export const hasInlineEditChanges = view => {
    const initial = view.initialAttributes || {};
    const current = view.model?.attributes || {};
    const attributeSet = new Set([
        ...Object.keys(initial),
        ...Object.keys(current),
    ]);

    return Array.from(attributeSet).some(attribute =>
        !areValuesEqual(
            initial[attribute],
            current[attribute]
        )
    );
};

/**
 * Reads the current editor, then either invokes EspoCRM's native save or
 * closes silently when the record is unchanged.
 */
export default function saveInlineEditIfChanged(
    view,
    saveCallback
) {
    view.fetchToModel?.();

    if (!hasInlineEditChanges(view)) {
        return view.inlineEditClose();
    }

    return saveCallback();
}
