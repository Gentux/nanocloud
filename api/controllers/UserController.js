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
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * UserController
 *
 * @description :: Server-side logic for managing users
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

/* globals User, JsonApiService */

const _= require('lodash');

module.exports = {

  findOne: function(req, res) {
    if (req.user.isAdmin || req.user.id === req.allParams().id) {
      return User.findOne(req.allParams().id)
        .populate('groups')
        .then(res.ok)
        .catch(res.negotiate);
    }
    return res.forbidden();
  },

  find: function(req, res) {

    if (req.allParams().me === 'true') {
      var me = JsonApiService.serialize('users', req.user);

      return res.send(me);
    }

    if (!req.user.isAdmin) {
      return res.forbidden();
    }
    return User.find()
      .populate('groups')
      .then(res.ok)
      .catch(res.negotiate);
  },

  update: function(req, res) {

    req.body = JsonApiService.deserialize(req.body);

    if (req.user.isAdmin) {
      return JsonApiService.updateOneRecord(req, res);
    } else if (req.user.id === req.allParams().id) {
      // Check if simple user isn't changing "admin" settings
      return User.findOne({
        id: req.allParams().id
      })
        .then((userToUpdate) => {
          let isAdmin = _.get(req.body, 'data.attributes.isAdmin');
          let isTeamAdmin = _.get(req.body, 'data.attributes.isTeamAdmin');
          if ((isAdmin === undefined || userToUpdate.isTeamAdmin === isAdmin) &&
              (isTeamAdmin === undefined || userToUpdate.isAdmin === isTeamAdmin)) {
            return JsonApiService.updateOneRecord(req, res);
          }
        });
    } else {
      if (!req.allParams().id) {
        return res.badRequest('Invalid user id');
      }

      return User.findOne(req.allParams().id)
        .populate('groups')
        .then((userToUpdate) => {
          if (!req.user.isTeamAdmin || req.user.team.id !== userToUpdate.team.id) {
            return res.forbidden('You need to be an administrator or team admin to perform this operation');
          }

          if (userToUpdate.isTeamAdmin !== _.get(req.body, 'data.attributes.isTeamAdmin')) {
            return User.update({
              id: req.allParams().id
            }, {
              isTeamAdmin: _.get(req.body, 'data.attributes.isTeamAdmin')
            })
            .then((user) => {
              return res.ok(user);
            });
          } else {
            return res.forbidden('You are not allowed to modify this user');
          }
        })
        .catch(res.negotiate);
    }
  }
};
