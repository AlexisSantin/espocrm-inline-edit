/************************************************************************
 * This file is part of Inline List Edit for EspoCRM.
 *
 * Copyright (C) 2026 Alexis SANTIN
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 ************************************************************************/

import assert from 'node:assert/strict';
import test from 'node:test';

import {
    applyRequiredLogic,
    canInlineEditField,
    createLoadedAttributeModel,
    getConditionAttributeList,
    getFieldLogicDefs,
    getLogicAttributeList,
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

test('condition attributes are collected from nested groups', () => {
    assert.deepEqual(
        getConditionAttributeList([
            {type: 'equals', attribute: 'status', value: 'Closed'},
            {
                type: 'or',
                value: [
                    {type: 'isEmpty', attribute: 'assignedUserId'},
                    {type: 'equals', attribute: '$user.id', value: 'x'},
                    {
                        type: 'not',
                        value: {type: 'contains', attribute: 'teamsIds'},
                    },
                    {type: 'equals', attribute: 'status', value: 'New'},
                ],
            },
        ]),
        ['status', 'assignedUserId', 'teamsIds']
    );
    assert.deepEqual(getConditionAttributeList(undefined), []);
});

test('every attribute read by field rules is selected for the list', () => {
    const metadata = createMetadata({
        'logicDefs.Case.fields': {
            description: {
                ...lockedWhenClosed,
                visible: {
                    conditionGroup: [
                        {type: 'isNotEmpty', attribute: 'visibleOnly'},
                    ],
                },
            },
            priority: {},
        },
        'logicDefs.Case.fields.description': {
            ...lockedWhenClosed,
            visible: {
                conditionGroup: [
                    {type: 'isNotEmpty', attribute: 'visibleOnly'},
                ],
            },
        },
        'clientDefs.Case.dynamicLogic.fields': {
            name: {},
        },
        'clientDefs.Case.dynamicLogic.fields.name': {
            readOnlySaved: {
                conditionGroup: [
                    {type: 'isTrue', attribute: 'isLocked'},
                ],
            },
            required: {
                conditionGroup: [
                    {type: 'equals', attribute: 'type', value: 'Incident'},
                ],
            },
        },
    });

    assert.deepEqual(
        getLogicAttributeList(metadata, 'Case'),
        ['status', 'isLocked', 'type']
    );
    assert.deepEqual(getLogicAttributeList(metadata, 'Account'), []);
    assert.deepEqual(getLogicAttributeList(null, 'Case'), []);
});

test('a rule reading an attribute missing from the row locks the field', () => {
    const attributes = {status: 'New', closedAt: null};
    const model = createLoadedAttributeModel({
        entityType: 'Case',
        isNew: () => false,
        get: attribute => attributes[attribute],
    });

    assert.equal(model.has('status'), true);
    assert.equal(model.has('closedAt'), true);
    assert.equal(model.get('status'), 'New');
    assert.throws(() => model.has('accountId'), /accountId/);

    const checker = conditionGroup => conditionGroup.every(item =>
        model.has(item.attribute) &&
        model.get(item.attribute) === item.value
    );
    const consoleError = console.error;

    console.error = () => {};

    try {
        assert.equal(isReadOnlyByLogic(lockedWhenClosed, checker), false);
        assert.equal(
            isReadOnlyByLogic(
                {
                    readOnly: {
                        conditionGroup: [
                            {type: 'equals', attribute: 'accountId', value: 'a'},
                        ],
                    },
                },
                checker
            ),
            true
        );
    } finally {
        console.error = consoleError;
    }
});
