/**
 * Nanocloud turns any traditional software into a cloud solution, without
 * changing or redeveloping existing source code.
 *
 * Copyright (C) 2016 Nanocloud Software
 *
 * This file is part of Nanocloud.
 *
 * Nanocloud is free software; you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * Nanocloud is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General
 * Public License
 * along with this program.  If not, see
 * <http://www.gnu.org/licenses/>.
 */

import Ember from 'ember';
import DS from 'ember-data';
import {validator, buildValidations} from 'ember-cp-validations';

const Validations = buildValidations({
  name: [
    validator('presence', true),
    validator('length', {
      min: 2,
      max: 255
    })
  ],
  poolSize: [
    validator('number', {
      allowBlank: true,
      integer: true,
      allowString: true,
      gte: 0,
    })
  ]
});

export default DS.Model.extend(Validations, {
  configuration: Ember.inject.service('configuration'),
  iaasId: DS.attr('string'),
  name: DS.attr('string'),
  buildFrom: DS.attr('string'),
  poolSize: DS.attr('number'),
  computedPoolSize: Ember.computed('poolSize', function() {
    if (this.get('poolSize') === null) {
      return this.get('configuration.machinePoolSize');
    } else {
      return this.get('poolSize');
    }
  }),
  deleted: DS.attr('boolean'),
  instancesSize: DS.attr('string'),
  password: DS.attr('string'),
  createdAt: DS.attr('date'),
  updatedAt: DS.attr('date'),

  apps: DS.hasMany('app'),
  groups: DS.hasMany('group'),
});
