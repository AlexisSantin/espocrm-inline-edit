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
