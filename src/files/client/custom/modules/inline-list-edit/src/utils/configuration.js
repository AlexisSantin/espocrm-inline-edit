/**
 * Keeps previous installations enabled until an administrator explicitly
 * limits the extension to selected entities.
 */
function isInlineEditEntityAvailable(
    metadata,
    entityType,
    isAdministration
) {
    const defs =
        metadata?.get(['scopes', entityType]) || {};

    if (
        !defs.entity ||
        defs.disabled ||
        entityType === 'Settings'
    ) {
        return false;
    }

    if (defs.object) {
        return true;
    }

    if (!isAdministration) {
        return false;
    }

    return Boolean(
        metadata?.get([
            'clientDefs',
            entityType,
            'recordViews',
            'edit',
        ])
    );
}

export default function isInlineEditEnabledForEntity(
    config,
    entityType,
    metadata,
    isAdministration = false
) {
    if (
        !isInlineEditEntityAvailable(
            metadata,
            entityType,
            isAdministration
        ) ||
        config.get('inlineListEditEnabled') === false ||
        (isAdministration &&
            config.get('inlineListEditAdminEnabled') === false)
    ) {
        return false;
    }

    if (isAdministration) {
        return true;
    }

    if (config.get('inlineListEditAllEntities') !== false) {
        return true;
    }

    const entityList =
        config.get('inlineListEditEntityList');

    return Array.isArray(entityList) &&
        entityList.includes(entityType);
}
