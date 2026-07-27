/**
 * Keeps previous installations enabled until an administrator explicitly
 * limits the extension to selected entities.
 */
export default function isInlineEditEnabledForEntity(
    config,
    entityType
) {
    if (config.get('inlineListEditEnabled') === false) {
        return false;
    }

    if (config.get('inlineListEditAllEntities') !== false) {
        return true;
    }

    const entityList =
        config.get('inlineListEditEntityList');

    return Array.isArray(entityList) &&
        entityList.includes(entityType);
}
