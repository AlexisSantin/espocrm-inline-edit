import assert from 'node:assert/strict';
import test from 'node:test';

import {
    applyRequiredLogic,
    canInlineEditField,
    getFieldLogicDefs,
    isInlineEditDisabledForField,
    isReadOnlyByLogic,
    isRequiredByLogic,
} from '../files/client/custom/modules/inline-list-edit/src/utils/field-access.js';

const createMetadata = data => ({
    get: path => data[path.join('.')],
});

const lockedWhenClosed = {
    readOnly: {
        conditionGroup: [
            {type: 'equals', attribute: 'status', value: 'Closed'},
        ],
    },
};

/**
 * Minimal stand-in for EspoCRM's condition engine: supports `equals`.
 */
const createChecker = attributes => conditionGroup =>
    conditionGroup.every(item =>
        item.type === 'equals' &&
        attributes[item.attribute] === item.value
    );

const createView = (overrides = {}) => {
    const view = {
        name: 'description',
        params: {},
        options: {},
        model: {entityType: 'Case'},
        requiredCalls: [],
        getMetadata: () => createMetadata({
            'logicDefs.Case.fields.description': lockedWhenClosed,
        }),
        setRequired() {
            view.params.required = true;
            view.requiredCalls.push('setRequired');
        },
        setNotRequired() {
            view.params.required = false;
            view.requiredCalls.push('setNotRequired');
        },
        ...overrides,
    };

    return view;
};

test('field logic is read from logicDefs with a clientDefs fallback', () => {
    const metadata = createMetadata({
        'logicDefs.Case.fields.status': {from: 'logicDefs'},
        'clientDefs.Lead.dynamicLogic.fields.status': {from: 'clientDefs'},
    });

    assert.deepEqual(
        getFieldLogicDefs(metadata, 'Case', 'status'),
        {from: 'logicDefs'}
    );
    assert.deepEqual(
        getFieldLogicDefs(metadata, 'Lead', 'status'),
        {from: 'clientDefs'}
    );
    assert.equal(getFieldLogicDefs(metadata, 'Account', 'status'), null);
    assert.equal(getFieldLogicDefs(null, 'Case', 'status'), null);
});

test('the inlineEditDisabled field parameter blocks inline editing', () => {
    assert.equal(isInlineEditDisabledForField({}), false);
    assert.equal(
        isInlineEditDisabledForField({inlineEditDisabled: true}),
        true
    );
    assert.equal(
        isInlineEditDisabledForField({params: {inlineEditDisabled: true}}),
        true
    );
    assert.equal(
        isInlineEditDisabledForField({options: {inlineEditDisabled: true}}),
        true
    );
    assert.equal(
        canInlineEditField(
            createView({inlineEditDisabled: true}),
            createChecker({status: 'New'})
        ),
        false
    );
});

test('dynamic read-only rules lock the field only when they apply', () => {
    assert.equal(
        canInlineEditField(createView(), createChecker({status: 'New'})),
        true
    );
    assert.equal(
        canInlineEditField(createView(), createChecker({status: 'Closed'})),
        false
    );
    assert.equal(
        isReadOnlyByLogic(
            {
                readOnlySaved: {
                    conditionGroup: [
                        {
                            type: 'equals',
                            attribute: 'status',
                            value: 'Closed',
                        },
                    ],
                },
            },
            createChecker({status: 'Closed'})
        ),
        true
    );
    assert.equal(isReadOnlyByLogic(null, () => true), false);
});

test('a read-only rule that cannot be evaluated locks the field', () => {
    const consoleError = console.error;

    console.error = () => {};

    try {
        assert.equal(
            isReadOnlyByLogic(lockedWhenClosed, () => {
                throw new Error('Unsupported condition');
            }),
            true
        );
    } finally {
        console.error = consoleError;
    }
});

test('dynamic required rules follow the row and restore the field default', () => {
    const logicDefs = {
        required: {
            conditionGroup: [
                {type: 'equals', attribute: 'status', value: 'Closed'},
            ],
        },
    };
    const view = createView({
        getMetadata: () => createMetadata({
            'logicDefs.Case.fields.description': logicDefs,
        }),
    });

    assert.equal(
        isRequiredByLogic(logicDefs, createChecker({status: 'Closed'})),
        true
    );
    assert.equal(isRequiredByLogic({}, () => true), null);

    assert.equal(
        applyRequiredLogic(view, createChecker({status: 'Closed'})),
        true
    );
    assert.equal(view.params.required, true);

    applyRequiredLogic(view, createChecker({status: 'New'}));
    assert.equal(view.params.required, false);
    assert.deepEqual(view.requiredCalls, ['setRequired', 'setNotRequired']);

    const nativelyRequired = createView({
        params: {required: true},
        getMetadata: () => createMetadata({
            'logicDefs.Case.fields.description': logicDefs,
        }),
    });

    applyRequiredLogic(nativelyRequired, createChecker({status: 'New'}));
    assert.equal(nativelyRequired.params.required, true);
    assert.deepEqual(nativelyRequired.requiredCalls, []);

    const withoutRule = createView();

    assert.equal(applyRequiredLogic(withoutRule, () => true), false);
    assert.deepEqual(withoutRule.requiredCalls, []);
});
