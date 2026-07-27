const RELATION_TYPE_LIST = [
    'link',
    'linkMultiple',
    'linkParent',
];

const bindOnce = (element, eventName, listener) => {
    const marker =
        `inlineListEdit${eventName[0].toUpperCase()}` +
        eventName.slice(1);

    if (element.dataset[marker]) {
        return;
    }

    element.dataset[marker] = 'true';
    element.addEventListener(eventName, listener);
};

/**
 * EspoCRM omits relation actions when a field starts in list mode. Bind the
 * native view methods to the controls that exist after switching to edit mode.
 *
 * Direct DOM listeners are used because the edit controls are rendered after
 * EspoCRM's delegated-event initialization has already completed.
 */
export default function bindRelationEditActions(view, editor) {
    if (!RELATION_TYPE_LIST.includes(view.type)) {
        return false;
    }

    editor.querySelectorAll(
        '[data-action="selectLink"]'
    ).forEach(element => {
        bindOnce(element, 'click', event => {
            event.preventDefault();
            event.stopPropagation();
            view.actionSelect();
        });
    });

    editor.querySelectorAll(
        '[data-action="clearLink"]'
    ).forEach(element => {
        bindOnce(element, 'click', event => {
            event.preventDefault();
            event.stopPropagation();

            if (view.type === 'link') {
                view.clearLink();
            } else if (view.type === 'linkMultiple') {
                view.actionDeleteLink(
                    element.dataset.id
                );
            } else {
                view.actionClearLink();
            }
        });
    });

    if (view.type === 'linkParent') {
        const typeSelect = editor.querySelector(
            `select[data-name="${view.typeName}"]`
        );

        if (typeSelect) {
            bindOnce(typeSelect, 'change', () => {
                view.foreignScope = typeSelect.value;
                view.$elementName?.val('');
                view.$elementId?.val('');
            });
        }
    }

    return true;
}
