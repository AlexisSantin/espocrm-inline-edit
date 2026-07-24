import BaseFieldView from 'views/fields/base';

/**
 * Enables EspoCRM's native field inline-edit mode in record lists.
 *
 * The list still uses the standard EspoCRM field views. Switching them from
 * `list` to `detail` mode makes the native pencil, validation and PATCH save
 * workflow available without duplicating field-specific editors.
 */
export default class ListInlineEditSetupHandler {

    constructor(view) {
        this.view = view;
    }

    process() {
        const entityType = this.view.entityType || this.view.scope;

        if (
            !entityType ||
            this.view.selectable ||
            this.view._inlineListEditEnabled ||
            !this.view.getAcl().checkScope(entityType, 'edit')
        ) {
            return;
        }

        this.view._inlineListEditEnabled = true;

        this.fixNativeFieldInlineEdit();
        this.overrideLayoutConversion();
        this.overrideRowLayoutPreparation();
    }

    /**
     * EspoCRM field views normally live inside a detail `.cell`, so the native
     * implementation uses the field element's parent as its action container.
     * A list field is mounted on the `td.cell` itself. Returning that element
     * keeps edit, save and cancel actions inside their own table cell.
     */
    fixNativeFieldInlineEdit() {
        const prototype = BaseFieldView.prototype;

        if (prototype._inlineListEditCellLookupFixed) {
            return;
        }

        const getCell = prototype.get$cell;
        const initInlineEdit = prototype.initInlineEdit;
        const addInlineEditLinks = prototype.addInlineEditLinks;
        const removeInlineEditLinks = prototype.removeInlineEditLinks;
        const getDesiredPopoverWidth = editor => {
            const controlList = Array.from(
                editor.querySelectorAll(
                    'input:not([type="hidden"]), select, textarea, ' +
                    'button, [contenteditable="true"]'
                )
            ).filter(control => {
                if (control.classList.contains('hidden')) {
                    return false;
                }

                return !(
                    control.tagName === 'SELECT' &&
                    control.classList.contains('selectized')
                );
            });

            if (
                editor.querySelector('textarea, [contenteditable="true"]') ||
                controlList.length >= 3
            ) {
                return 480;
            }

            if (controlList.length === 2) {
                return 400;
            }

            return 320;
        };

        prototype.get$cell = function () {
            if (this.$el?.is('td.cell')) {
                return this.$el;
            }

            return getCell.call(this);
        };

        prototype.initInlineEdit = function () {
            if (!this.$el?.is('td.cell')) {
                return initInlineEdit.call(this);
            }

            const renderEditLink = () => {
                const cell = this.$el.get(0);

                if (
                    !cell ||
                    !this.isDetailMode() ||
                    this.disabled ||
                    this.readOnly ||
                    cell.querySelector(':scope > .inline-edit-link')
                ) {
                    return;
                }

                const label = this.translate('Edit');
                const edit = document.createElement('a');
                const icon = document.createElement('span');

                edit.role = 'button';
                edit.tabIndex = 0;
                edit.title = label;
                edit.setAttribute('aria-label', label);
                edit.classList.add('inline-edit-link');

                icon.classList.add('fas', 'fa-pencil-alt', 'fa-sm');
                edit.append(icon);

                edit.addEventListener('click', event => {
                    event.preventDefault();
                    event.stopPropagation();
                    this.inlineEdit();
                });

                cell.prepend(edit);
            };

            renderEditLink();
            this.on('after:render', renderEditLink);
        };

        prototype.addInlineEditLinks = function () {
            if (!this.$el?.is('td.cell')) {
                return addInlineEditLinks.call(this);
            }

            const cell = this.$el.get(0);

            if (!cell) {
                return addInlineEditLinks.call(this);
            }

            const editor = document.createElement('div');

            editor.classList.add('inline-list-edit-editor');

            while (cell.firstChild) {
                editor.append(cell.firstChild);
            }

            const cellRect = cell.getBoundingClientRect();
            const desiredPopoverWidth = getDesiredPopoverWidth(editor);

            if (cellRect.width < desiredPopoverWidth) {
                const availableWidthAtStart =
                    window.innerWidth - cellRect.left - 12;
                const availableWidthAtEnd =
                    (cellRect.right ?? cellRect.left + cellRect.width) - 12;
                const alignEnd =
                    availableWidthAtStart < desiredPopoverWidth &&
                    availableWidthAtEnd > availableWidthAtStart;
                const availableWidth = alignEnd ?
                    availableWidthAtEnd :
                    availableWidthAtStart;
                const popoverWidth = Math.max(
                    cellRect.width,
                    Math.min(desiredPopoverWidth, availableWidth)
                );

                editor.classList.add('inline-list-edit-editor--popover');
                cell.classList.add('inline-list-edit-popover');

                if (alignEnd) {
                    editor.classList.add(
                        'inline-list-edit-editor--align-end'
                    );
                    cell.classList.add(
                        'inline-list-edit-popover--align-end'
                    );
                }

                cell.style.setProperty(
                    '--inline-list-edit-popover-width',
                    `${Math.floor(popoverWidth)}px`
                );
            }

            cell.append(editor);
            cell.classList.add('inline-list-edit-active');

            addInlineEditLinks.call(this);
        };

        prototype.removeInlineEditLinks = function () {
            removeInlineEditLinks.call(this);

            if (this.$el?.is('td.cell')) {
                const cell = this.$el.get(0);

                this.$el.removeClass(
                    'inline-list-edit-active inline-list-edit-popover ' +
                    'inline-list-edit-popover--align-end'
                );
                cell?.style.removeProperty('--inline-list-edit-popover-width');
            }
        };

        prototype._inlineListEditCellLookupFixed = true;
    }

    overrideLayoutConversion() {
        const convertLayout = this.view._convertLayout.bind(this.view);

        this.view._convertLayout = (listLayout, model) => {
            const internalLayout = convertLayout(listLayout, model);

            this.enableNativeInlineEdit(internalLayout);

            return internalLayout;
        };
    }

    overrideRowLayoutPreparation() {
        const prepareInternalLayout =
            this.view.prepareInternalLayout.bind(this.view);

        this.view.prepareInternalLayout = (internalLayout, model) => {
            prepareInternalLayout(internalLayout, model);
            this.applyEditAccess(internalLayout, model);
        };
    }

    enableNativeInlineEdit(internalLayout) {
        if (!Array.isArray(internalLayout)) {
            return;
        }

        internalLayout.forEach(item => {
            if (!this.getFieldName(item)) {
                return;
            }

            item.options.mode = 'detail';
        });
    }

    applyEditAccess(internalLayout, model) {
        if (!Array.isArray(internalLayout) || !model) {
            return;
        }

        const entityType = model.entityType || this.view.entityType;
        const forbiddenFieldList =
            this.view.getAcl().getScopeForbiddenFieldList(entityType, 'edit');
        const recordIsEditable =
            !this.view.editDisabled &&
            !model.attributes.isLocked &&
            this.view.getAcl().checkModel(model, 'edit');

        internalLayout.forEach(item => {
            const fieldName = this.getFieldName(item);

            if (!fieldName) {
                return;
            }

            if (
                !recordIsEditable ||
                forbiddenFieldList.includes(fieldName)
            ) {
                item.options.readOnly = true;
            }
        });
    }

    getFieldName(item) {
        const fieldName = item?.options?.defs?.name;

        if (
            !fieldName ||
            fieldName.startsWith('r-') ||
            item.columnName === 'buttons'
        ) {
            return null;
        }

        return fieldName;
    }
}
