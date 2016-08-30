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

export default Ember.Controller.extend({

  /* global $:false */
  session: Ember.inject.service('session'),
  teamController: Ember.inject.controller('protected.users.teams'),
  protectedController: Ember.inject.controller('protected'),
  teams: Ember.computed.oneWay('teamController.teams'),
  dimBackground: Ember.computed.and('focusModeTeams', 'protectedController.hasNoTeam'),
  focusModeTeams: false,
  loadState: false,

  sortableTableConfig: {

    filteringIgnoreCase: true,
    messageConfig: {
      searchLabel: "Search",
    },

    customIcons: {
      "sort-asc": "fa fa-caret-up",
      "sort-desc": "fa fa-caret-down",
      "caret": "fa fa-minus",
      "column-visible": "fa fa-minus",
    },

    customClasses: {
      "pageSizeSelectWrapper": "pagination-number"
    }
  },

  columns: [
    {
      "title": "Name",
      "disableFiltering": true,
      "filterWithSelect": false,
      "template": "protected/users/teams/index/table/user-name",
    },
    {
      "propertyName": "email",
      "title": "Email",
      "disableFiltering": true,
      "filterWithSelect": false,
    },
    {
      "title": "Status",
      "sortDirection": "asc",
      "sortPrecedence": 0,
      "disableFiltering": true,
      "filterWithSelect": false,
      "template": "protected/users/teams/index/table/activated-user",
    }
  ],

  actions: {
    createTeam() {
      this.get('model')
        .validate()
        .then(({ validations }) => {

          if (validations.get('isInvalid') === true) {
            return this.toast.error('Cannot create a team');
          }
          else {
            this.set('loadState', true);
            this.get('model').save()
              .then((team) => {
                this.set('focusModeTeams', false);
                $('.teams-focus-input').velocity(
                  {
                    opacity: 0,
                    right: "100%",
                    position: "absolute"
                  },
                  {
                    easing: 'easeOutQuart',
                    duration: 700,
                    visibility: "hidden",
                  });
                this.toast.success('Team has been created successfully');
                this.get('session.user').set('team', team.get('id'));
                Ember.run.later((() => {
                  this.send('refreshModel');
                }), 200);
              })
              .catch((err) => {
                this.send("error", err);
              })
              .finally(() => {
                this.set('loadState', false);
              });
          }
        });
    },

    closeFocusModeTeams() {
      this.set('focusModeTeams', false);
    }
  }
});
