import assert from 'node:assert/strict';
import test from 'node:test';

import {
    calculateAutocompleteWidth,
    calculateContactWidth,
    calculateRelationWidth,
    calculateSelectWidth,
    calculateSimpleWidth,
    clamp,
} from '../files/client/custom/modules/inline-list-edit/src/utils/inline-editor-sizing.js';
import InlineEditorSizing from
    '../files/client/custom/modules/inline-list-edit/src/utils/inline-editor-sizing.js';
import isInlineEditEnabledForEntity from
    '../files/client/custom/modules/inline-list-edit/src/utils/configuration.js';
import InlineEditCoordinator from
    '../files/client/custom/modules/inline-list-edit/src/utils/inline-edit-coordinator.js';
import {
    closeInListMode,
    rememberListMode,
} from '../files/client/custom/modules/inline-list-edit/src/utils/list-mode.js';
import shouldActivateCell, {
    isDirectTextClick,
} from '../files/client/custom/modules/inline-list-edit/src/utils/cell-activation.js';
import bindRelationEditActions from
    '../files/client/custom/modules/inline-list-edit/src/utils/relation-edit-actions.js';
import scheduleFieldInitialization from
    '../files/client/custom/modules/inline-list-edit/src/utils/field-initialization.js';
import saveInlineEditIfChanged, {
    hasInlineEditChanges,
    synchronizePipelineStage,
} from '../files/client/custom/modules/inline-list-edit/src/utils/field-change.js';

globalThis.document = {
    createElement: () => ({
        getContext: () => ({
            font: '',
            measureText: text => ({width: String(text).length * 10}),
        }),
    }),
};
globalThis.window = {
    getComputedStyle: () => ({
        display: 'block',
        font: '14px Inter',
        fontSize: '14px',
        visibility: 'visible',
    }),
    innerWidth: 1200,
    scrollX: 0,
};

const createClassList = (...nameList) => ({
    contains: name => nameList.includes(name),
});

test('clamp keeps a value inside its permitted range', () => {
    assert.equal(clamp(80, 100, 200), 100);
    assert.equal(clamp(150, 100, 200), 150);
    assert.equal(clamp(240, 100, 200), 200);
});

test('inline editing restores Espo listLink mode and its native record link', async () => {
    const view = {
        MODE_LIST: 'list',
        mode: 'listLink',
        isListMode: () =>
            ['list', 'listLink'].includes(view.mode),
        setDetailMode: async () => {
            view.mode = 'detail';
        },
        setMode: async mode => {
            view.mode = mode;
        },
    };

    assert.equal(rememberListMode(view), 'listLink');

    view.mode = 'edit';

    await closeInListMode(
        view,
        () => view.setDetailMode()
    );

    assert.equal(view.mode, 'listLink');
    assert.equal(
        Object.prototype.hasOwnProperty.call(
            view,
            'setDetailMode'
        ),
        true
    );
});

test('only empty cell space activates editing while native content stays untouched', () => {
    const textNode = {
        childNodes: [],
        nodeType: 3,
        textContent: 'Prospect numéro 1',
    };
    const textContainer = {
        childNodes: [textNode],
        nodeType: 1,
    };
    const cell = {
        childNodes: [textContainer],
        contains: target => [
            textContainer,
            textNode,
            link,
        ].includes(target),
    };
    const link = {
        closest: () => link,
    };
    const view = {
        _isInlineEditMode: false,
        disabled: false,
        isEditMode: () => false,
        isReadMode: () => true,
        readOnly: false,
    };
    const createRange = () => ({
        getClientRects: () => [{
            bottom: 28,
            left: 10,
            right: 130,
            top: 8,
        }],
        selectNodeContents: () => {},
    });
    const click = {
        altKey: false,
        button: 0,
        clientX: 170,
        clientY: 18,
        ctrlKey: false,
        defaultPrevented: false,
        metaKey: false,
        shiftKey: false,
        target: cell,
    };

    assert.equal(
        shouldActivateCell(view, click, cell, createRange),
        true
    );
    assert.equal(
        isDirectTextClick(
            cell,
            {...click, clientX: 50},
            createRange
        ),
        true
    );
    assert.equal(
        shouldActivateCell(
            view,
            {...click, clientX: 50},
            cell,
            createRange
        ),
        false
    );
    assert.equal(
        shouldActivateCell(
            view,
            {...click, target: textContainer},
            cell,
            createRange
        ),
        true
    );
    assert.equal(
        shouldActivateCell(
            view,
            {
                ...click,
                clientX: 50,
                target: textContainer,
            },
            cell,
            createRange
        ),
        false
    );
    assert.equal(
        shouldActivateCell(
            view,
            {...click, target: link},
            cell,
            createRange
        ),
        false
    );
    assert.equal(
        shouldActivateCell(
            view,
            {...click, ctrlKey: true},
            cell,
            createRange
        ),
        false
    );
});

test('rendered relation controls call native selection and clear methods', () => {
    const createControl = dataset => {
        const listenerHash = {};

        return {
            dataset: {...dataset},
            listenerHash,
            addEventListener: (eventName, listener) => {
                listenerHash[eventName] = listener;
            },
        };
    };
    const trigger = (control, eventName) => {
        const event = {
            preventDefaultCount: 0,
            stopPropagationCount: 0,
            preventDefault() {
                this.preventDefaultCount++;
            },
            stopPropagation() {
                this.stopPropagationCount++;
            },
        };

        control.listenerHash[eventName](event);

        return event;
    };
    const selectButton = createControl({
        action: 'selectLink',
    });
    const clearButton = createControl({
        action: 'clearLink',
        id: 'team-id',
    });
    const editor = {
        querySelector: () => null,
        querySelectorAll: selector =>
            selector.includes('selectLink') ?
                [selectButton] :
                [clearButton],
    };
    const teamsView = {
        actionSelectCount: 0,
        type: 'linkMultiple',
        actionDeleteLink: id => {
            teamsView.deletedId = id;
        },
        actionSelect: () => {
            teamsView.actionSelectCount++;
        },
    };

    assert.equal(
        bindRelationEditActions(teamsView, editor),
        true
    );

    const selectEvent = trigger(selectButton, 'click');
    const clearEvent = trigger(clearButton, 'click');

    assert.equal(teamsView.actionSelectCount, 1);
    assert.equal(teamsView.deletedId, 'team-id');
    assert.equal(selectEvent.preventDefaultCount, 1);
    assert.equal(selectEvent.stopPropagationCount, 1);
    assert.equal(clearEvent.preventDefaultCount, 1);
    assert.equal(clearEvent.stopPropagationCount, 1);

    bindRelationEditActions(teamsView, editor);

    assert.equal(
        selectButton.dataset.inlineListEditClick,
        'true'
    );
});

test('Teams initializes even when its afterRender does not call the base view', () => {
    let afterRenderCallback;
    const teamsView = {
        initInlineEditCount: 0,
        options: {inlineListEditEnabled: true},
        initInlineEdit() {
            this.initInlineEditCount++;
        },
        once(eventName, callback) {
            if (eventName === 'after:render') {
                afterRenderCallback = callback;
            }
        },
    };

    assert.equal(
        scheduleFieldInitialization(teamsView),
        true
    );
    assert.equal(
        scheduleFieldInitialization(teamsView),
        false
    );
    assert.equal(teamsView.initInlineEditCount, 0);

    afterRenderCallback();

    assert.equal(teamsView.initInlineEditCount, 1);
    assert.equal(
        teamsView._inlineListEditInitialized,
        true
    );
});

test('unchanged fields close silently without invoking a save', async () => {
    const initialAttributes = {
        name: 'Prospect',
        status: 'New',
        teamsIds: ['team-1'],
        teamsNames: {
            'team-1': 'Équipe de Nogent',
        },
    };
    const view = {
        closeCount: 0,
        fetchCount: 0,
        initialAttributes,
        model: {
            attributes: structuredClone(initialAttributes),
        },
        fetchToModel() {
            this.fetchCount++;
        },
        inlineEditClose() {
            this.closeCount++;

            return Promise.resolve();
        },
    };
    let saveCount = 0;

    assert.equal(hasInlineEditChanges(view), false);

    await saveInlineEditIfChanged(view, () => {
        saveCount++;
    });

    assert.equal(view.fetchCount, 1);
    assert.equal(view.closeCount, 1);
    assert.equal(saveCount, 0);

    view.model.attributes.teamsIds = [
        'team-1',
        'team-2',
    ];

    assert.equal(hasInlineEditChanges(view), true);

    saveInlineEditIfChanged(view, () => {
        saveCount++;
    });

    assert.equal(view.fetchCount, 2);
    assert.equal(view.closeCount, 1);
    assert.equal(saveCount, 1);
});

test('pipeline changes select the first valid stage before saving', () => {
    const eventList = [];
    const listenerHash = {};
    const view = {
        initialAttributes: {
            pipelineId: 'pipeline-old',
            pipelineName: 'Ancien pipeline',
            pipelineStageId: 'stage-old',
            pipelineStageName: 'Ancienne étape',
        },
        model: {
            attributes: {
                pipelineId: 'pipeline-old',
                pipelineName: 'Ancien pipeline',
                pipelineStageId: 'stage-old',
                pipelineStageName: 'Ancienne étape',
            },
            setMultiple(attributes) {
                Object.assign(this.attributes, attributes);
            },
            once(eventName, callback) {
                listenerHash[eventName] = callback;
            },
            trigger(eventName) {
                eventList.push(eventName);
            },
        },
        name: 'pipeline',
        pipelines: [{
            id: 'pipeline-new',
            stages: [{
                id: 'stage-new',
                name: 'Nouvelle étape',
            }],
        }],
        fetchToModel() {
            this.model.setMultiple({
                pipelineId: 'pipeline-new',
                pipelineName: 'Nouveau pipeline',
            });
        },
    };
    let saveCount = 0;

    saveInlineEditIfChanged(view, () => saveCount++);

    assert.equal(saveCount, 1);
    assert.equal(
        view.model.attributes.pipelineStageId,
        'stage-new'
    );
    assert.equal(
        view.model.attributes.pipelineStageName,
        'Nouvelle étape'
    );
    assert.deepEqual(eventList, []);

    listenerHash.sync();

    assert.deepEqual(eventList, ['pipeline-changed']);
    assert.equal(synchronizePipelineStage({
        ...view,
        name: 'status',
    }), false);
});

test('text fields grow with their content without becoming oversized', () => {
    assert.equal(calculateSimpleWidth(20), 220);
    assert.equal(calculateSimpleWidth(150), 268);
    assert.equal(calculateSimpleWidth(400), 360);
});

test('single enums reserve room for their longest option and arrow', () => {
    assert.equal(calculateSelectWidth(120), 272);
    assert.equal(calculateSelectWidth(500), 480);
});

test('multi-enums reserve additional room for removable value tags', () => {
    assert.equal(calculateSelectWidth(120, true), 284);
    assert.equal(calculateSelectWidth(10, true), 220);
});

test('relations use the widest selected or searchable value', () => {
    assert.equal(calculateRelationWidth({
        inputTextWidth: 70,
        selectedTextWidth: 130,
        buttonCount: 1,
    }), 244);

    assert.equal(calculateRelationWidth({
        inputTextWidth: 90,
        selectedTextWidth: 50,
        scopeSelectWidth: 100,
        buttonCount: 2,
    }), 360);

    assert.equal(calculateRelationWidth({
        inputTextWidth: 30,
        inputPaddingWidth: 43,
        selectedTextWidth: 0,
        buttonWidth: 72,
        minimumWidth: 280,
    }), 280);
});

test('relation selectors always use a floating editor to preserve row height', () => {
    const sizing = new InlineEditorSizing();
    const input = {};
    const selectButton = {};
    const relationEditor = {
        querySelector: selector => {
            if (selector === 'input.main-element') {
                return input;
            }

            if (selector === '[data-action="selectLink"]') {
                return selectButton;
            }

            return null;
        },
    };
    const textEditor = {
        querySelector: () => null,
    };

    assert.equal(sizing.isRelationEditor(relationEditor), true);
    assert.equal(sizing.isRelationEditor(textEditor), false);
});

test('email and phone editors keep their internal property controls', () => {
    assert.equal(calculateContactWidth({
        contentWidth: 170,
        isPhone: false,
    }), 280);
    assert.equal(calculateContactWidth({
        contentWidth: 310,
        isPhone: true,
    }), 388);
});

test('autocomplete grows to its longest suggestion within the viewport', () => {
    assert.equal(calculateAutocompleteWidth({
        suggestionTextWidth: 130,
        inputWidth: 90,
        viewportWidth: 1200,
    }), 154);
    assert.equal(calculateAutocompleteWidth({
        suggestionTextWidth: 900,
        inputWidth: 90,
        viewportWidth: 400,
    }), 376);
});

test('Espo single and multi Selectize controls expose every option', () => {
    const sizing = new InlineEditorSizing();
    const styleControl = {};
    const createEditor = source => ({
        querySelector: selector => {
            if (selector === '.selectize-control') {
                return {};
            }

            if (selector === '.selectize-input') {
                return styleControl;
            }

            return null;
        },
        querySelectorAll: selector => {
            if (
                selector ===
                'select.selectized, input.selectized'
            ) {
                return [source];
            }

            return [];
        },
    });
    const enumSource = {
        tagName: 'SELECT',
        options: [],
        selectize: {
            options: {
                publicRelations: {text: 'Relations publiques'},
            },
            settings: {mode: 'single'},
        },
    };
    const multiEnumSource = {
        tagName: 'INPUT',
        options: [],
        selectize: {
            options: {
                long: {text: 'Option multiple très longue'},
            },
            settings: {mode: 'multi'},
        },
    };

    assert.equal(
        sizing.getSelectizeWidth(createEditor(enumSource)),
        342
    );
    assert.equal(
        sizing.getSelectizeWidth(createEditor(multiEnumSource)),
        434
    );
});

test('native text input detection remains compact and content-aware', () => {
    const sizing = new InlineEditorSizing();
    const input = {
        classList: createClassList(),
        getAttribute: () => null,
        placeholder: '',
        tagName: 'INPUT',
        type: 'text',
        value: 'Texte assez long',
    };
    const editor = {
        querySelector: () => null,
        querySelectorAll: selector => {
            if (selector.startsWith('input:not')) {
                return [input];
            }

            return [];
        },
    };

    assert.equal(sizing.getDesiredPopoverWidth(editor), 278);
});

test('composite rows preserve the width required by each Espo column', () => {
    const sizing = new InlineEditorSizing();
    const select = {
        classList: createClassList(),
        getAttribute: () => null,
        options: [{textContent: 'CivilitéXX'}],
        tagName: 'SELECT',
    };
    const input = {
        classList: createClassList(),
        getAttribute: () => null,
        placeholder: 'Prénom',
        tagName: 'INPUT',
        type: 'text',
        value: '',
    };
    const createColumn = (className, control) => ({
        className,
        querySelectorAll: () => [control],
    });
    const row = {
        children: [
            createColumn('col-sm-3 col-xs-3', select),
            createColumn('col-sm-4 col-xs-4', input),
        ],
    };
    const editor = {
        querySelectorAll: selector =>
            selector === '.row' ? [row] : [],
    };

    assert.equal(sizing.getGridRowContentWidth(editor), 576);
});

test('person names are sized as a whole instead of only their salutation', () => {
    const sizing = new InlineEditorSizing();
    const salutation = {
        classList: createClassList('selectized'),
        getAttribute: name =>
            name === 'data-name' ? 'salutationName' : null,
        options: [{textContent: ''}],
        selectize: {
            options: {
                empty: {text: ''},
            },
            settings: {mode: 'single'},
        },
        tagName: 'SELECT',
    };
    const firstName = {
        classList: createClassList(),
        getAttribute: name =>
            name === 'data-name' ? 'firstName' : null,
        placeholder: 'First Name',
        tagName: 'INPUT',
        type: 'text',
        value: 'Peter',
    };
    const lastName = {
        classList: createClassList(),
        getAttribute: name =>
            name === 'data-name' ? 'lastName' : null,
        placeholder: 'Last Name',
        tagName: 'INPUT',
        type: 'text',
        value: 'YUNG',
    };
    const createColumn = (className, control) => ({
        className,
        querySelectorAll: () => [control],
    });
    const row = {
        children: [
            createColumn('col-sm-3 col-xs-3', salutation),
            createColumn('col-sm-4 col-xs-4', firstName),
            createColumn('col-sm-5 col-xs-5', lastName),
        ],
    };
    const editor = {
        querySelector: selector => {
            if (selector === 'select[data-name^="salutation"]') {
                return salutation;
            }

            if (selector === 'input[data-name^="first"]') {
                return firstName;
            }

            if (selector === 'input[data-name^="last"]') {
                return lastName;
            }

            if (selector === '.selectize-control') {
                return {};
            }

            if (selector === '.selectize-input') {
                return {};
            }

            return null;
        },
        querySelectorAll: selector => {
            if (selector.startsWith('input:not')) {
                return [salutation, firstName, lastName];
            }

            if (selector === '.row') {
                return [row];
            }

            if (
                selector ===
                'select.selectized, input.selectized'
            ) {
                return [salutation];
            }

            return [];
        },
    };

    assert.equal(sizing.getDesiredPopoverWidth(editor), 460);
});

test('entity configuration preserves legacy behavior and applies limits', () => {
    const createConfig = values => ({
        get: name => values[name],
    });

    assert.equal(
        isInlineEditEnabledForEntity(createConfig({}), 'Lead'),
        true
    );
    assert.equal(
        isInlineEditEnabledForEntity(createConfig({
            inlineListEditEnabled: false,
        }), 'Lead'),
        false
    );
    assert.equal(
        isInlineEditEnabledForEntity(createConfig({
            inlineListEditAllEntities: false,
            inlineListEditEntityList: ['Lead', 'Account'],
        }), 'Lead'),
        true
    );
    assert.equal(
        isInlineEditEnabledForEntity(createConfig({
            inlineListEditAllEntities: false,
            inlineListEditEntityList: ['Account'],
        }), 'Lead'),
        false
    );
});

test('opening a field closes the previous inline editor', async () => {
    const coordinator = new InlineEditCoordinator();
    const createView = () => {
        const view = {
            _isInlineEditMode: false,
            closeCount: 0,
            $el: {
                get: () => ({isConnected: true}),
                is: selector => selector === 'td.cell',
            },
        };

        view.inlineEditClose = async () => {
            view.closeCount++;
            view._isInlineEditMode = false;
            coordinator.release(view);
        };

        return view;
    };
    const firstView = createView();
    const secondView = createView();

    await coordinator.open(firstView, async () => {
        firstView._isInlineEditMode = true;
    });
    await coordinator.open(secondView, async () => {
        secondView._isInlineEditMode = true;
    });

    assert.equal(firstView.closeCount, 1);
    assert.equal(firstView._isInlineEditMode, false);
    assert.equal(secondView.closeCount, 0);
    assert.equal(secondView._isInlineEditMode, true);
});

test('clicking outside saves the active editor but overlays stay interactive', async () => {
    let pointerDownHandler;
    let suppressedClickHandler;
    let changeCount = 0;
    const bodyClassSet = new Set();
    const activeElement = {
        dispatchEvent: event => {
            if (event.type === 'change') {
                changeCount++;
            }
        },
        location: 'cell',
    };
    const documentElement = {
        activeElement,
        body: {
            classList: {
                contains: name => bodyClassSet.has(name),
                toggle: (name, active) => {
                    if (active) {
                        bodyClassSet.add(name);
                    } else {
                        bodyClassSet.delete(name);
                    }
                },
            },
        },
        addEventListener: (eventName, handler) => {
            if (eventName === 'pointerdown') {
                pointerDownHandler = handler;
            }

            if (eventName === 'click') {
                suppressedClickHandler = handler;
            }
        },
        removeEventListener: (eventName, handler) => {
            if (
                eventName === 'pointerdown' &&
                pointerDownHandler === handler
            ) {
                pointerDownHandler = null;
            }

            if (
                eventName === 'click' &&
                suppressedClickHandler === handler
            ) {
                suppressedClickHandler = null;
            }
        },
    };
    const coordinator = new InlineEditCoordinator(documentElement);
    const cell = {
        contains: target => target?.location === 'cell',
        isConnected: true,
    };
    const view = {
        _isInlineEditMode: false,
        closeCount: 0,
        fetchCount: 0,
        saveCount: 0,
        $el: {
            get: () => cell,
            is: selector => selector === 'td.cell',
        },
    };

    view.fetchToModel = () => {
        view.fetchCount++;
    };
    view.inlineEditSave = () => {
        view.saveCount++;
        view._isInlineEditMode = false;
        coordinator.release(view);
    };
    view.inlineEditClose = async () => {
        view.closeCount++;
        view._isInlineEditMode = false;
        coordinator.release(view);
    };

    await coordinator.open(view, async () => {
        view._isInlineEditMode = true;
    });

    assert.equal(
        documentElement.body.classList.contains(
            'inline-list-edit-session-active'
        ),
        true
    );

    pointerDownHandler({
        target: {
            closest: () => null,
            location: 'cell',
        },
    });
    await coordinator.transition;

    assert.equal(view.closeCount, 0);

    pointerDownHandler({
        target: {
            closest: selector =>
                selector.includes('.selectize-dropdown') ?
                    {} :
                    null,
            location: 'overlay',
        },
    });
    await coordinator.transition;

    assert.equal(view.closeCount, 0);

    const outsidePointerEvent = {
        preventDefaultCount: 0,
        stopImmediatePropagationCount: 0,
        stopPropagationCount: 0,
        preventDefault() {
            this.preventDefaultCount++;
        },
        stopImmediatePropagation() {
            this.stopImmediatePropagationCount++;
        },
        stopPropagation() {
            this.stopPropagationCount++;
        },
        target: {
            closest: () => null,
            location: 'outside',
        },
    };

    pointerDownHandler(outsidePointerEvent);
    await coordinator.transition;

    assert.equal(changeCount, 1);
    assert.equal(view.fetchCount, 1);
    assert.equal(view.saveCount, 1);
    assert.equal(view.closeCount, 0);
    assert.equal(view._isInlineEditMode, false);
    assert.equal(pointerDownHandler, null);
    assert.equal(
        documentElement.body.classList.contains(
            'inline-list-edit-session-active'
        ),
        false
    );
    assert.equal(outsidePointerEvent.preventDefaultCount, 1);
    assert.equal(
        outsidePointerEvent.stopImmediatePropagationCount,
        1
    );
    assert.equal(
        outsidePointerEvent.stopPropagationCount,
        1
    );
    assert.equal(typeof suppressedClickHandler, 'function');

    const suppressedClickEvent = {
        preventDefaultCount: 0,
        stopImmediatePropagationCount: 0,
        stopPropagationCount: 0,
        preventDefault() {
            this.preventDefaultCount++;
        },
        stopImmediatePropagation() {
            this.stopImmediatePropagationCount++;
        },
        stopPropagation() {
            this.stopPropagationCount++;
        },
    };

    suppressedClickHandler(suppressedClickEvent);

    assert.equal(suppressedClickEvent.preventDefaultCount, 1);
    assert.equal(
        suppressedClickEvent.stopImmediatePropagationCount,
        1
    );
    assert.equal(
        suppressedClickEvent.stopPropagationCount,
        1
    );
    assert.equal(suppressedClickHandler, null);
});
