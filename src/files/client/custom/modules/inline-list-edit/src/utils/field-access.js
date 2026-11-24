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

const READ_ONLY_LOGIC_TYPE_LIST = [
    'readOnly',
    'readOnlySaved',
];

const LOGIC_TYPE_LIST = [
    ...READ_ONLY_LOGIC_TYPE_LIST,
    'required',
];

const CONDITION_GROUP_TYPE_LIST = [
    'and',
    'or',
    'not',
];

/**
 * Returns the dynamic logic defined for a field. EspoCRM stores it under
 * `logicDefs`; `clientDefs.<Entity>.dynamicLogic` is kept as a fallback for
 * older customizations.
 */
export const getFieldLogicDefs = (metadata, entityType, fieldName) => {
    if (!metadata || !entityType || !fieldName) {
        return null;
    }

    return (
        metadata.get(['logicDefs', entityType, 'fields', fieldName]) ||
        metadata.get([
            'clientDefs',
            entityType,
            'dynamicLogic',
            'fields',
            fieldName,
        ]) ||
        null
    );
};

/**
 * Lists the record attributes a condition group reads. Runtime values such as
 * `$user.id` do not come from the record and are skipped.
 */
export const getConditionAttributeList = conditionGroup => {
    const attributeSet = new Set();

    const collect = item => {
        if (Array.isArray(item)) {
            item.forEach(collect);

            return;
        }

        if (!item || typeof item !== 'object') {
            return;
        }

        if (CONDITION_GROUP_TYPE_LIST.includes(item.type)) {
            collect(item.value);

            return;
        }

        if (
            typeof item.attribute === 'string' &&
            item.attribute &&
            !item.attribute.startsWith('$')
        ) {
            attributeSet.add(item.attribute);
        }
    };

    collect(conditionGroup);

    return [...attributeSet];
};

/**
 * Lists the attributes read by the entity's `readOnly`, `readOnlySaved` and
 * `required` rules. A record list only fetches the attributes of its columns,
 * so these must be selected too for the rules to see the actual record.
 */
export const getLogicAttributeList = (metadata, entityType) => {
    if (!metadata || !entityType) {
        return [];
    }

    const fieldNameSet = new Set([
        ...Object.keys(
            metadata.get(['logicDefs', entityType, 'fields']) || {}
        ),
        ...Object.keys(
            metadata.get([
                'clientDefs',
                entityType,
                'dynamicLogic',
                'fields',
            ]) || {}
        ),
    ]);
    const attributeSet = new Set();

    fieldNameSet.forEach(fieldName => {
        const logicDefs = getFieldLogicDefs(metadata, entityType, fieldName);

        LOGIC_TYPE_LIST.forEach(type => {
            getConditionAttributeList(logicDefs?.[type]?.conditionGroup)
                .forEach(attribute => attributeSet.add(attribute));
        });
    });

    return [...attributeSet];
};

/**
 * Exposes a list row to EspoCRM's condition engine. Reading an attribute the
 * row did not load throws, so the rule counts as impossible to evaluate
 * instead of silently comparing an empty value.
 */
export const createLoadedAttributeModel = model => ({
    entityType: model.entityType,
    isNew: () => model.isNew(),
    has: attribute => {
        if (model.get(attribute) === undefined) {
            throw new Error(
                `Inline List Edit: attribute "${attribute}" is not loaded ` +
                'in this list row; the dynamic logic rule cannot be checked.'
            );
        }

        return true;
    },
    get: attribute => model.get(attribute),
});

/**
 * Mirrors the `inlineEditDisabled` field parameter honored by EspoCRM detail
 * views before they initialize inline editing.
 */
export const isInlineEditDisabledForField = view => Boolean(
    view.inlineEditDisabled ||
    view.params?.inlineEditDisabled ||
    view.options?.inlineEditDisabled
);

/**
 * A condition that cannot be evaluated locks the field: the full edit form
 * remains available, while an unexpected inline edit could bypass a rule.
 */
export const isReadOnlyByLogic = (logicDefs, checkConditionGroup) =>
    READ_ONLY_LOGIC_TYPE_LIST.some(type => {
        const conditionGroup = logicDefs?.[type]?.conditionGroup;

        if (!conditionGroup) {
            return false;
        }

        try {
            return Boolean(checkConditionGroup(conditionGroup));
        } catch (error) {
            console.error(error);

            return true;
        }
    });

/**
 * Returns `null` when the field has no dynamic required rule.
 */
export const isRequiredByLogic = (logicDefs, checkConditionGroup) => {
    const conditionGroup = logicDefs?.required?.conditionGroup;

    if (!conditionGroup) {
        return null;
    }

    try {
        return Boolean(checkConditionGroup(conditionGroup));
    } catch (error) {
        console.error(error);

        return null;
    }
};

const getViewLogicDefs = view => getFieldLogicDefs(
    view.getMetadata?.(),
    view.model?.entityType || view.entityType,
    view.name
);

/**
 * Field-level checks performed in addition to entity, record and field ACL.
 */
export const canInlineEditField = (view, checkConditionGroup) =>
    !isInlineEditDisabledForField(view) &&
    !isReadOnlyByLogic(getViewLogicDefs(view), checkConditionGroup);

/**
 * Applies a dynamic `required` rule as the full form would. The field's own
 * required parameter is restored when the condition no longer applies.
 */
export const applyRequiredLogic = (view, checkConditionGroup) => {
    const required = isRequiredByLogic(
        getViewLogicDefs(view),
        checkConditionGroup
    );

    if (required === null) {
        return false;
    }

    if (view._inlineListEditBaseRequired === undefined) {
        view._inlineListEditBaseRequired = Boolean(view.params?.required);
    }

    if (required) {
        view.setRequired();
    } else if (!view._inlineListEditBaseRequired) {
        view.setNotRequired();
    }

    return true;
};
