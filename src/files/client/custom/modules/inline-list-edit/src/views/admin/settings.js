import SettingsEditRecordView from 'views/settings/record/edit';

export default class InlineListEditSettingsView
    extends SettingsEditRecordView {

    layoutName = 'inlineListEdit'

    dynamicLogicDefs = {
        fields: {
            inlineListEditAllEntities: {
                visible: {
                    conditionGroup: [
                        {
                            attribute: 'inlineListEditEnabled',
                            type: 'isTrue',
                        },
                    ],
                },
            },
            inlineListEditEntityList: {
                visible: {
                    conditionGroup: [
                        {
                            attribute: 'inlineListEditEnabled',
                            type: 'isTrue',
                        },
                        {
                            attribute: 'inlineListEditAllEntities',
                            type: 'isFalse',
                        },
                    ],
                },
            },
        },
    }

    setup() {
        if (this.model.get('inlineListEditEnabled') == null) {
            this.model.set('inlineListEditEnabled', true);
        }

        if (this.model.get('inlineListEditAllEntities') == null) {
            this.model.set('inlineListEditAllEntities', true);
        }

        if (this.model.get('inlineListEditEntityList') == null) {
            this.model.set('inlineListEditEntityList', []);
        }

        super.setup();
    }
}
