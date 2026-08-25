import BaseFieldView from 'views/fields/base';
import $ from 'jquery';
import InlineEditorSizing from
    'inline-list-edit:utils/inline-editor-sizing';
import isInlineEditEnabledForEntity from
    'inline-list-edit:utils/configuration';
import InlineEditCoordinator from
    'inline-list-edit:utils/inline-edit-coordinator';
import {
    closeInListMode,
    rememberListMode,
} from 'inline-list-edit:utils/list-mode';
import shouldActivateCell from
    'inline-list-edit:utils/cell-activation';
import bindRelationEditActions from
    'inline-list-edit:utils/relation-edit-actions';
import scheduleFieldInitialization from
    'inline-list-edit:utils/field-initialization';
import saveInlineEditIfChanged from
    'inline-list-edit:utils/field-change';

/**
 * Enables EspoCRM's native field inline-edit mode in record lists.
 *
 * Fields keep their native `list` or `listLink` rendering. Only the temporary
 * edit mode, validation and PATCH save workflow are reused.
 */
export default class ListInlineEditSetupHandler {

    constructor(view) {
        this.view = view;
    }

    process() {
        const entityType = this.view.entityType || this.view.scope;
        const currentUrl = this.view.getRouter()?.getCurrentUrl?.() || '';
        const isAdministration = currentUrl.startsWith('#Admin/');

        if (
            !entityType ||
            this.view.selectable ||
            this.view._inlineListEditEnabled ||
            !isInlineEditEnabledForEntity(
                this.view.getConfig(),
                entityType,
                this.view.getMetadata(),
                isAdministration
            ) ||
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
        const setupFinal = prototype.setupFinal;
        const initInlineEdit = prototype.initInlineEdit;
        const inlineEdit = prototype.inlineEdit;
        const inlineEditClose = prototype.inlineEditClose;
        const inlineEditSave = prototype.inlineEditSave;
        const addInlineEditLinks = prototype.addInlineEditLinks;
        const removeInlineEditLinks = prototype.removeInlineEditLinks;
        const sizing = new InlineEditorSizing();
        const coordinator = new InlineEditCoordinator();

        const portalSelectizeDropdowns = view => {
            const editor = view.$el?.find?.(
                '.inline-list-edit-editor'
            )?.get?.(0);

            if (!editor) {
                return;
            }

            const dropdownList = [];

            editor.querySelectorAll('.selectize-control').forEach(control => {
                const select = control.previousElementSibling;
                const selectize = select?.selectize;
                const dropdown = selectize?.$dropdown?.get?.(0);

                if (!selectize || !dropdown) {
                    return;
                }

                if (dropdown.parentElement !== document.body) {
                    document.body.append(dropdown);
                }

                dropdown.classList.add('inline-list-edit-dropdown');
                selectize.settings.dropdownParent = 'body';

                const positionDropdown = selectize.positionDropdown;

                selectize.positionDropdown = function (...args) {
                    const result = positionDropdown.apply(this, args);
                    const width = control.getBoundingClientRect().width;

                    dropdown.style.setProperty(
                        '--inline-list-edit-dropdown-min-width',
                        `${width}px`
                    );

                    return result;
                };

                selectize.positionDropdown();
                dropdownList.push(dropdown);
            });

            view._inlineListEditDropdownList = dropdownList;
        };

        const removePortaledSelectizeDropdowns = view => {
            const dropdownList = view._inlineListEditDropdownList || [];

            dropdownList.forEach(dropdown => {
                dropdown.classList.remove('inline-list-edit-dropdown');
                dropdown.remove();
            });

            view._inlineListEditDropdownList = [];
        };

        prototype.get$cell = function () {
            if (this.$el?.is('td.cell')) {
                return this.$el;
            }

            return getCell.call(this);
        };

        prototype.inlineEdit = function () {
            if (!this.$el?.is('td.cell')) {
                return inlineEdit.call(this);
            }

            rememberListMode(this);

            return coordinator.open(
                this,
                async () => {
                    await inlineEdit.call(this);
                    portalSelectizeDropdowns(this);
                }
            );
        };

        prototype.inlineEditClose = async function (...args) {
            const result =
                this.$el?.is('td.cell') &&
                this.options?.inlineListEditEnabled ?
                    await closeInListMode(
                        this,
                        () => inlineEditClose.apply(this, args)
                    ) :
                    await inlineEditClose.apply(this, args);

            coordinator.release(this);

            return result;
        };

        prototype.inlineEditSave = function (...args) {
            if (
                !this.$el?.is('td.cell') ||
                !this.options?.inlineListEditEnabled
            ) {
                return inlineEditSave.apply(this, args);
            }

            return saveInlineEditIfChanged(
                this,
                () => inlineEditSave.apply(this, args)
            );
        };

        prototype.setupFinal = function (...args) {
            const result = setupFinal.apply(this, args);

            scheduleFieldInitialization(this);

            return result;
        };

        prototype.initInlineEdit = function () {
            if (!this.$el?.is('td.cell')) {
                return initInlineEdit.call(this);
            }

            const restoreInlineControls = () => {
                const cell = this.$el.get(0);

                if (!cell) {
                    return;
                }

                if (
                    this._inlineListEditActivationCell !== cell
                ) {
                    this._inlineListEditActivationCell
                        ?.removeEventListener(
                            'click',
                            this._inlineListEditActivationHandler
                        );

                    this._inlineListEditActivationHandler = event => {
                        if (
                            !shouldActivateCell(
                                this,
                                event,
                                cell
                            )
                        ) {
                            return;
                        }

                        event.preventDefault();
                        event.stopPropagation();
                        this.inlineEdit();
                    };
                    this._inlineListEditActivationCell = cell;

                    cell.addEventListener(
                        'click',
                        this._inlineListEditActivationHandler
                    );
                }

                cell.classList.toggle(
                    'inline-list-edit-cell-enabled',
                    this.isReadMode() &&
                        !this.disabled &&
                        !this.readOnly
                );

                if (this._isInlineEditMode && this.isEditMode()) {
                    if (
                        !cell.querySelector(
                            ':scope > .inline-save-link'
                        )
                    ) {
                        this.addInlineEditLinks();
                    }

                    return;
                }

                if (
                    !this.isReadMode() ||
                    this.disabled ||
                    this.readOnly
                ) {
                    return;
                }

                const existingEdit = cell.querySelector(
                    ':scope > .inline-edit-link'
                );

                if (existingEdit) {
                    existingEdit.classList.remove('hidden');

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

            this._inlineListEditRestoreControls =
                restoreInlineControls;
            restoreInlineControls();
            this.on('after:render', restoreInlineControls);
            this.once('remove', () => {
                this._inlineListEditActivationCell
                    ?.removeEventListener(
                        'click',
                        this._inlineListEditActivationHandler
                    );
                coordinator.release(this);
                    removePortaledSelectizeDropdowns(this);
            });
        };

        prototype.addInlineEditLinks = function () {
            if (!this.$el?.is('td.cell')) {
                return addInlineEditLinks.call(this);
            }

            const cell = this.$el.get(0);

            if (!cell) {
                return addInlineEditLinks.call(this);
            }

            if (
                cell.querySelector(':scope > .inline-save-link') &&
                cell.querySelector(':scope > .inline-cancel-link')
            ) {
                return;
            }

            this._inlineListEditContentObserver?.disconnect();
            this._inlineListEditAutocompleteObserver?.disconnect();

            const editor = document.createElement('div');

            editor.classList.add('inline-list-edit-editor');

            while (cell.firstChild) {
                editor.append(cell.firstChild);
            }

            cell.append(editor);
            cell.classList.add('inline-list-edit-active');

            const updatePopoverWidth = () => {
                const cellRect = cell.getBoundingClientRect();
                const desiredPopoverWidth =
                    sizing.getDesiredPopoverWidth(editor);
                const requiresFloatingLayout =
                    sizing.isRelationEditor(editor);

                editor.classList.remove(
                    'inline-list-edit-editor--popover',
                    'inline-list-edit-editor--align-end'
                );
                cell.classList.remove(
                    'inline-list-edit-popover',
                    'inline-list-edit-popover--align-end'
                );
                cell.style.removeProperty(
                    '--inline-list-edit-popover-width'
                );

                if (
                    cellRect.width >= desiredPopoverWidth &&
                    !requiresFloatingLayout
                ) {
                    return;
                }

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
            };

            updatePopoverWidth();

            addInlineEditLinks.call(this);
            bindRelationEditActions(this, editor);

            const relationInput =
                editor.querySelector('input.main-element');
            this._inlineListEditContentObserver =
                new MutationObserver(updatePopoverWidth);
            this._inlineListEditContentObserver.observe(
                editor,
                {
                    childList: true,
                    characterData: true,
                    subtree: true,
                }
            );

            if (relationInput) {
                const autocomplete =
                    $(relationInput).data('autocomplete');
                const autocompleteContainer =
                    autocomplete?.$container?.get(0);

                if (autocompleteContainer) {
                    const updateAutocompleteWidth = () => {
                        const {left, width} =
                            sizing.getAutocompleteLayout(
                                relationInput,
                                autocompleteContainer
                            );

                        autocompleteContainer.classList.add(
                            'inline-list-edit-autocomplete'
                        );
                        autocompleteContainer.style.setProperty(
                            '--inline-list-edit-autocomplete-width',
                            `${width}px`
                        );
                        autocompleteContainer.style.left =
                            `${left}px`;
                    };

                    this._inlineListEditAutocompleteObserver =
                        new MutationObserver(updateAutocompleteWidth);
                    this._inlineListEditAutocompleteObserver.observe(
                        autocompleteContainer,
                        {
                            childList: true,
                            characterData: true,
                            subtree: true,
                        }
                    );
                }
            }
        };

        prototype.removeInlineEditLinks = function () {
            this._inlineListEditContentObserver?.disconnect();
            this._inlineListEditAutocompleteObserver?.disconnect();
            this._inlineListEditContentObserver = null;
            this._inlineListEditAutocompleteObserver = null;

            removeInlineEditLinks.call(this);
            removePortaledSelectizeDropdowns(this);

            if (this.$el?.is('td.cell')) {
                const cell = this.$el.get(0);

                this.$el.removeClass(
                    'inline-list-edit-active inline-list-edit-popover ' +
                    'inline-list-edit-popover--align-end'
                );
                cell?.style.removeProperty('--inline-list-edit-popover-width');
                this._inlineListEditRestoreControls?.();
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

            item.options.inlineListEditEnabled = true;
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
