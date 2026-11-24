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
            inlineListEditAdminEnabled: {
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

        if (this.model.get('inlineListEditAdminEnabled') == null) {
            this.model.set('inlineListEditAdminEnabled', false);
        }

        if (this.model.get('inlineListEditEntityList') == null) {
            this.model.set('inlineListEditEntityList', []);
        }

        super.setup();
    }
}
