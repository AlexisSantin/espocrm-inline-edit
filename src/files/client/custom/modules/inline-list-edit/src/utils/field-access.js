const READ_ONLY_LOGIC_TYPE_LIST = [
    'readOnly',
    'readOnlySaved',
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
