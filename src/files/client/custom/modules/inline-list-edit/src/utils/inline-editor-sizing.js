const ACTION_AREA_WIDTH = 78;
const CONTROL_HORIZONTAL_PADDING = 24;
const INTERNAL_BUTTON_WIDTH = 34;
const SELECT_CHROME_WIDTH = 44;

export const clamp = (value, minimum, maximum) =>
    Math.max(minimum, Math.min(maximum, value));

export const calculateSimpleWidth = textWidth =>
    Math.ceil(clamp(textWidth + 118, 220, 360));

export const calculateSelectWidth = (textWidth, isMultiple = false) =>
    Math.ceil(clamp(
        textWidth + (isMultiple ? 164 : 152),
        isMultiple ? 220 : 180,
        480
    ));

export const calculateRelationWidth = ({
    inputTextWidth,
    inputPaddingWidth = CONTROL_HORIZONTAL_PADDING,
    selectedTextWidth,
    scopeSelectWidth = 0,
    buttonCount = 0,
    buttonWidth,
    minimumWidth = 180,
}) => {
    const inputRowWidth =
        inputTextWidth +
        inputPaddingWidth +
        scopeSelectWidth +
        (buttonWidth ?? buttonCount * INTERNAL_BUTTON_WIDTH);
    const selectedRowWidth =
        selectedTextWidth ?
            selectedTextWidth + 36 :
            0;

    return Math.ceil(clamp(
        Math.max(inputRowWidth, selectedRowWidth) + ACTION_AREA_WIDTH,
        minimumWidth,
        520
    ));
};

export const calculateAutocompleteWidth = ({
    suggestionTextWidth,
    inputWidth,
    viewportWidth,
}) => Math.ceil(clamp(
    suggestionTextWidth + CONTROL_HORIZONTAL_PADDING,
    inputWidth,
    Math.min(520, viewportWidth - 24)
));

export const calculateContactWidth = ({
    contentWidth,
    isPhone,
}) => Math.ceil(clamp(
    contentWidth + ACTION_AREA_WIDTH,
    isPhone ? 340 : 280,
    isPhone ? 600 : 560
));

/**
 * Measures the content of EspoCRM's native field editors.
 *
 * Widths include the fixed space reserved for the extension's save and cancel
 * actions. Multi-value controls are sized for their longest item and can wrap
 * vertically instead of growing indefinitely.
 */
export default class InlineEditorSizing {

    constructor() {
        this.measurementContext =
            document.createElement('canvas').getContext('2d');
    }

    measureText(control, text) {
        text = String(text || '').trim();

        if (!text) {
            return 0;
        }

        const style = window.getComputedStyle(control);
        const fontSize = parseFloat(style.fontSize) || 14;
        const estimatedWidth = text.length * fontSize * 0.52;

        if (!this.measurementContext) {
            return estimatedWidth;
        }

        if (style.font) {
            this.measurementContext.font = style.font;
        }

        return Math.max(
            this.measurementContext.measureText(text).width,
            estimatedWidth
        );
    }

    isVisible(element) {
        if (
            element.classList.contains('hidden') ||
            element.getAttribute('aria-hidden') === 'true'
        ) {
            return false;
        }

        const style = window.getComputedStyle(element);

        return style.display !== 'none' && style.visibility !== 'hidden';
    }

    getElementTextWidth(control, element) {
        return this.measureText(
            control,
            element.textContent || element.label || ''
        );
    }

    getInputTextWidth(input) {
        return this.measureText(
            input,
            input.value ||
            input.placeholder ||
            input.getAttribute('aria-label') ||
            ''
        );
    }

    getHorizontalPadding(element, fallback = CONTROL_HORIZONTAL_PADDING) {
        const style = window.getComputedStyle(element);
        const padding =
            (parseFloat(style.paddingLeft) || 0) +
            (parseFloat(style.paddingRight) || 0);

        return Math.max(fallback, padding);
    }

    getRenderedWidth(element, fallback) {
        const width =
            element.getBoundingClientRect?.().width || 0;

        return width > 0 ? width : fallback;
    }

    getSelectTextWidth(select, styleControl = select) {
        return Array.from(select.options || []).reduce(
            (maximum, option) => Math.max(
                maximum,
                this.getElementTextWidth(styleControl, option)
            ),
            0
        );
    }

    getSelectizeWidth(editor) {
        const selectizeControl =
            editor.querySelector('.selectize-control');

        if (!selectizeControl) {
            return null;
        }

        const sourceList = Array.from(
            editor.querySelectorAll(
                'select.selectized, input.selectized'
            )
        );
        const optionList = sourceList.flatMap(source =>
            Object.values(source.selectize?.options || {})
        );
        const optionTextList = [
            ...sourceList.flatMap(source =>
                Array.from(source.options || []).map(option =>
                    option.textContent || option.label || ''
                )
            ),
            ...optionList.map(option =>
                option.text ||
                option.label ||
                option.name ||
                option.value ||
                ''
            ),
            ...Array.from(
                editor.querySelectorAll('.selectize-dropdown .option')
            ).map(option => option.textContent || ''),
            ...Array.from(
                editor.querySelectorAll(
                    '.selectize-input .item'
                )
            ).map(option => option.textContent || ''),
        ];
        const styleControl =
            editor.querySelector('.selectize-input') ||
            selectizeControl;
        const textWidth = optionTextList.reduce(
            (maximum, text) => Math.max(
                maximum,
                this.measureText(styleControl, text)
            ),
            0
        );
        const isMultiple = sourceList.some(source =>
            source.tagName === 'INPUT' ||
            source.multiple ||
            source.selectize?.settings?.mode === 'multi'
        );

        return calculateSelectWidth(textWidth, isMultiple);
    }

    getRelationWidth(editor) {
        const input = editor.querySelector('input.main-element');
        const selector = editor.querySelector(
            '[data-action="selectLink"]'
        );

        if (!input || !selector) {
            return null;
        }

        const buttonList = Array.from(
            editor.querySelectorAll(
                'button[data-action="selectLink"], ' +
                'button[data-action="createLink"], ' +
                'button[data-action="clearLink"]'
            )
        ).filter(button => this.isVisible(button));
        const buttonWidth = buttonList.reduce(
            (total, button) =>
                total +
                this.getRenderedWidth(
                    button,
                    INTERNAL_BUTTON_WIDTH
                ),
            0
        );
        const selectedTextWidth = Array.from(
            editor.querySelectorAll('.link-container .text')
        ).reduce(
            (maximum, element) => Math.max(
                maximum,
                this.getElementTextWidth(input, element) +
                Array.from(
                    element.querySelectorAll?.('img.avatar') || []
                ).reduce(
                    (total, avatar) =>
                        total +
                        this.getRenderedWidth(avatar, 18) +
                        6,
                    0
                )
            ),
            0
        );
        const scopeSelect = editor.querySelector(
            '.input-group-link-parent select'
        );
        const scopeSelectWidth = scopeSelect ?
            this.getSelectTextWidth(scopeSelect, input) +
                SELECT_CHROME_WIDTH :
            0;
        const hasAvatar = Boolean(
            editor.querySelector(
                '.avatar-in-input, .link-container img.avatar'
            )
        );

        return calculateRelationWidth({
            inputTextWidth: this.getInputTextWidth(input),
            inputPaddingWidth: this.getHorizontalPadding(input),
            selectedTextWidth,
            scopeSelectWidth,
            buttonWidth,
            minimumWidth: hasAvatar ? 280 : 180,
        });
    }

    isRelationEditor(editor) {
        return Boolean(
            editor.querySelector('input.main-element') &&
            editor.querySelector('[data-action="selectLink"]')
        );
    }

    getChecklistWidth(editor) {
        const itemList = Array.from(
            editor.querySelectorAll('.checklist-item-container')
        );

        if (!itemList.length) {
            return null;
        }

        const control =
            itemList[0].querySelector('input') ||
            itemList[0];
        const labelWidth = itemList.reduce(
            (maximum, item) => Math.max(
                maximum,
                this.getElementTextWidth(
                    control,
                    item.querySelector('.checklist-label') || item
                )
            ),
            0
        );

        return Math.ceil(clamp(
            labelWidth + 116,
            180,
            480
        ));
    }

    getContactWidth(editor) {
        const emailBlockList = Array.from(
            editor.querySelectorAll('.email-address-block')
        );
        const phoneBlockList = Array.from(
            editor.querySelectorAll('.phone-number-block')
        );
        const blockList = emailBlockList.length ?
            emailBlockList :
            phoneBlockList;

        if (!blockList.length) {
            return null;
        }

        const isPhone = Boolean(phoneBlockList.length);
        const blockWidth = blockList.reduce((maximum, block) => {
            const input = block.querySelector(
                'input.email-address, input.phone-number'
            );

            if (!input) {
                return maximum;
            }

            const buttonCount = Array.from(
                block.querySelectorAll('button')
            ).filter(button => this.isVisible(button)).length;
            const typeSelect = isPhone ?
                block.querySelector('select') :
                null;
            const typeWidth = typeSelect ?
                this.getSelectTextWidth(typeSelect, input) +
                    SELECT_CHROME_WIDTH :
                0;
            const phonePrefixWidth = isPhone ? 40 : 0;
            const width =
                this.getInputTextWidth(input) +
                CONTROL_HORIZONTAL_PADDING +
                typeWidth +
                phonePrefixWidth +
                buttonCount * INTERNAL_BUTTON_WIDTH;

            return Math.max(maximum, width);
        }, 0);

        return calculateContactWidth({
            contentWidth: blockWidth,
            isPhone,
        });
    }

    getArrayWidth(editor) {
        const container = editor.querySelector(
            '.array-control-container'
        );

        if (!container) {
            return null;
        }

        const input = container.querySelector('input.main-element');
        const styleControl = input || container;
        const selectedTextWidth = Array.from(
            editor.querySelectorAll('.link-container .text')
        ).reduce(
            (maximum, element) => Math.max(
                maximum,
                this.getElementTextWidth(styleControl, element)
            ),
            0
        );
        const inputWidth = input ?
            this.getInputTextWidth(input) +
                CONTROL_HORIZONTAL_PADDING :
            0;
        const buttonCount = Array.from(
            container.querySelectorAll('button')
        ).filter(button => this.isVisible(button)).length;

        return Math.ceil(clamp(
            Math.max(
                selectedTextWidth + (selectedTextWidth ? 36 : 0),
                inputWidth + buttonCount * INTERNAL_BUTTON_WIDTH
            ) + ACTION_AREA_WIDTH,
            180,
            520
        ));
    }

    getPersonNameWidth(editor) {
        const salutation = editor.querySelector(
            'select[data-name^="salutation"]'
        );
        const firstName = editor.querySelector(
            'input[data-name^="first"]'
        );
        const lastName = editor.querySelector(
            'input[data-name^="last"]'
        );

        if (!salutation || !firstName || !lastName) {
            return null;
        }

        return Math.ceil(clamp(
            this.getGridRowContentWidth(editor) +
                ACTION_AREA_WIDTH,
            460,
            640
        ));
    }

    getGenericControlWidth(control) {
        if (control.tagName === 'SELECT') {
            return this.getSelectTextWidth(control) +
                SELECT_CHROME_WIDTH;
        }

        if (control.tagName === 'TEXTAREA') {
            return 360;
        }

        if (control.getAttribute('contenteditable') === 'true') {
            return 400;
        }

        if (control.tagName === 'INPUT') {
            if (['checkbox', 'radio'].includes(control.type)) {
                return 26;
            }

            if (control.type === 'file') {
                return 120;
            }

            return this.getInputTextWidth(control) +
                CONTROL_HORIZONTAL_PADDING;
        }

        return 0;
    }

    getGridRowContentWidth(editor) {
        return Array.from(editor.querySelectorAll('.row')).reduce(
            (maximum, row) => {
                const columnList = Array.from(row.children).filter(
                    column => /(?:^|\s)col-(?:xs|sm)-\d+/.test(
                        column.className
                    )
                );
                const rowWidth = columnList.reduce(
                    (requiredWidth, column) => {
                        const match = column.className.match(
                            /(?:^|\s)col-(?:xs|sm)-(\d+)/
                        );

                        if (!match) {
                            return requiredWidth;
                        }

                        const ratio = Number(match[1]) / 12;
                        const controlWidth = Array.from(
                            column.querySelectorAll(
                                'input:not([type="hidden"]), ' +
                                'select, textarea, [contenteditable="true"]'
                            )
                        ).filter(control => this.isVisible(control))
                            .reduce(
                                (total, control) =>
                                    total +
                                    this.getGenericControlWidth(control),
                                0
                            );

                        return Math.max(
                            requiredWidth,
                            controlWidth / ratio
                        );
                    },
                    0
                );

                return Math.max(maximum, rowWidth);
            },
            0
        );
    }

    getDesiredPopoverWidth(editor) {
        const renderedControlList = Array.from(
            editor.querySelectorAll(
                'input:not([type="hidden"]), select, textarea, ' +
                'button, .input-group-addon, [contenteditable="true"]'
            )
        );
        const visibleControlList = renderedControlList.filter(control =>
            this.isVisible(control) &&
            !control.classList.contains('selectized')
        );
        const fieldControlList = visibleControlList.filter(control =>
            ['INPUT', 'SELECT', 'TEXTAREA'].includes(control.tagName) ||
            control.getAttribute('contenteditable') === 'true'
        );
        const buttonList = visibleControlList.filter(control =>
            control.tagName === 'BUTTON'
        );
        const addonList = visibleControlList.filter(control =>
            control.classList.contains('input-group-addon')
        );
        const accessoryCount = buttonList.length + addonList.length;
        const isCompactChoice =
            fieldControlList.length === 1 &&
            fieldControlList[0].tagName === 'INPUT' &&
            ['checkbox', 'radio'].includes(
                    fieldControlList[0].type?.toLowerCase()
                ) &&
            accessoryCount === 0;

        if (isCompactChoice) {
            return 112;
        }

        const specializedWidth =
            this.getRelationWidth(editor) ??
            this.getChecklistWidth(editor) ??
            this.getContactWidth(editor) ??
            this.getArrayWidth(editor) ??
            this.getPersonNameWidth(editor) ??
            this.getSelectizeWidth(editor);

        if (specializedWidth !== null) {
            return specializedWidth;
        }

        if (
            fieldControlList.length === 1 &&
            fieldControlList[0].tagName === 'SELECT' &&
            accessoryCount === 0
        ) {
            const select = fieldControlList[0];

            return calculateSelectWidth(
                this.getSelectTextWidth(select),
                Boolean(select.multiple)
            );
        }

        if (
            fieldControlList.length === 1 &&
            fieldControlList[0].tagName === 'INPUT' &&
            accessoryCount === 0
        ) {
            return calculateSimpleWidth(
                this.getInputTextWidth(fieldControlList[0])
            );
        }

        const summedContentWidth = fieldControlList.reduce(
            (total, control) =>
                total + this.getGenericControlWidth(control),
            0
        );
        const contentWidth = Math.max(
            summedContentWidth,
            this.getGridRowContentWidth(editor)
        );
        const addonWidth = addonList.reduce(
            (total, addon) =>
                total +
                Math.max(
                    INTERNAL_BUTTON_WIDTH,
                    this.getElementTextWidth(addon, addon) + 20
                ),
            0
        );
        const desiredWidth =
            contentWidth +
            buttonList.length * INTERNAL_BUTTON_WIDTH +
            addonWidth +
            ACTION_AREA_WIDTH;
        const containsLargeEditor = Boolean(
            editor.querySelector(
                'textarea, [contenteditable="true"]'
            )
        );

        return Math.ceil(clamp(
            desiredWidth,
            containsLargeEditor ? 440 : 220,
            containsLargeEditor ? 640 : 600
        ));
    }

    getAutocompleteLayout(input, container) {
        const suggestionTextWidth = Array.from(
            container.querySelectorAll('.autocomplete-suggestion')
        ).reduce(
            (maximum, suggestion) => Math.max(
                maximum,
                this.getElementTextWidth(input, suggestion)
            ),
            0
        );
        const inputRect = input.getBoundingClientRect();
        const width = calculateAutocompleteWidth({
            suggestionTextWidth,
            inputWidth: inputRect.width,
            viewportWidth: window.innerWidth,
        });
        const alignEnd =
            inputRect.left + width > window.innerWidth - 12;
        const left = alignEnd ?
            Math.max(12, inputRect.right - width) :
            inputRect.left;

        return {
            left: Math.floor(left + window.scrollX),
            width,
        };
    }
}
