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
