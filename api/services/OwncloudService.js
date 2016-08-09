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
 */

/* globals ConfigService, OwncloudUser, Team */

const qs      = require('querystring');
const Promise = require('bluebird');
const request = require('request');
const url     = require('url');

function owncloudAPIRequest(req) {
  return ConfigService.get('owncloudURL', 'owncloudAdminUsername', 'owncloudAdminPassword')
  .then((config) => {

    let uri = url.parse(config.owncloudURL + '/ocs/v1.php/cloud' + req.pathname + '?format=json');

    let username = qs.escape(config.owncloudAdminUsername);
    let password = qs.escape(config.owncloudAdminPassword);

    uri.auth =  `${username}:${password}`;

    uri = url.format(uri);

    const opts = {
      method: req.method || 'GET',
      uri,
      json: true
    };

    if (req.hasOwnProperty('form')) {
      opts.form = req.form;
    }

    return new Promise((resolve, reject) => {
      request(opts, (err, res, body) => {
        if (err) {
          reject(err);
          return;
        }

        if (res.statusCode !== 200) {
          reject(new Error('Unsuccessful attempt. Code: ' + res.statusCode));
          return;
        }

        return resolve(body);
      });
    });
  });
}

/**
 * createUser
 *
 * Create a new owncloud account
 *
 * @param {string} Owncloud account's username
 * @param {string} Owncloud account's password
 */
function createUser(username, password) {
  return owncloudAPIRequest({
    method: 'POST',
    pathname: '/users',
    form: {
      userid: username,
      password: password
    }
  });
}

/**
 * createGroup
 *
 * Create a new owncloud group
 *
 * @param {string} Owncloud account's username
 * @param {string} Owncloud account's password
 */
function createGroup(user) {
  return owncloudAPIRequest({
    method: 'POST',
    pathname: '/groups',
    form: {
      groupid: user.team
    }
  })
  .then((res) => {
    if (res.ocs.meta.status === 'failure') {
      throw new Error('Unable to create owncloud\'s group');
    }
  });
}

function getGroup(groupname) {
  return owncloudAPIRequest({
    method: 'GET',
    pathname: '/groups/' + encodeURIComponent(groupname),
    form: {
      groupid: groupname
    }
  })
  .then((res) => {
    if (res.ocs.meta.status === 'failure') {
      throw new Error('Unable to retrieve owncloud\'s group');
    }
  });
}

/**
 * assignUserToGroup
 *
 * Assign a user to a group
 *
 * @param {string} Owncloud account's username
 * @param {string} Owncloud account's group name
 */
function assignUserToGroup(username, groupname) {
  return owncloudAPIRequest({
    method: 'POST',
    pathname: '/users/' + encodeURIComponent(username) + '/groups',
    form: {
      groupid: groupname
    }
  });
}

function getUser(username) {
  return owncloudAPIRequest({
    method: 'GET',
    pathname: '/users/' + encodeURIComponent(username)
  })
  .then((res) => {
    if (res.ocs.meta.status === 'failure') {
      throw new Error('Unable to retreive owncloud\'s user');
    }
  });
}

function updateUserEmail(username, email) {
  return owncloudAPIRequest({
    method: 'PUT',
    pathname: '/users/' + encodeURIComponent(username),
    form: {
      key: 'email',
      value: email
    }
  })
  .then((res) => {
    if (res.ocs.meta.status === 'failure') {
      throw new Error('Unable to update the owncloud user\'s email');
    }
  });
}

function updateUserDisplayName(username, displayName) {
  return owncloudAPIRequest({
    method: 'PUT',
    pathname: '/users/' + encodeURIComponent(username),
    form: {
      key: 'display',
      value: displayName
    }
  })
  .then((res) => {
    if (res.ocs.meta.status === 'failure') {
      throw new Error('Unable to update the owncloud user\'s display');
    }
  });
}

function updateUserPassword(username, password) {
  return owncloudAPIRequest({
    method: 'PUT',
    pathname: '/users/' + encodeURIComponent(username),
    form: {
      key: 'password',
      value: password
    }
  })
  .then((res) => {
    if (res.ocs.meta.status === 'failure') {
      throw new Error('Unable to update the owncloud user\'s password');
    }
  });
}

function findOrCreateUser(user) {
  return getUser(user.id)
  .then(() => {
    return OwncloudUser.findOne(user.id)
    .then((user) => {
      if (user) {
        return user.password;
      } else {

        // We have, somehow, lost the owncloud user password.
        // Let's update it
        const password = Math.random().toString(36).slice(-20);

        return updateUserPassword(user.id, password)
        .then(() => password);

      }
    });
  }, () => {
    const password = Math.random().toString(36).slice(-20);

    return createUser(user.id, password)
    .then(() => {
      return OwncloudUser.create({
        id: user.id,
        password: password
      })
      .then(() => {
        return Promise.all([
          updateUserDisplayName(user.id, `${user.firstName} ${user.lastName}`),
          updateUserEmail(user.id, user.email)
        ])
        .return(password);
      });
    });
  });
}

function findOrCreateGroup(user) {
  return getGroup(user.team)
  .catch(() => {
    return createGroup(user)
    .then(() => {
      return createShare(user);
    });
  });
}

function createShare(user) {
  return ConfigService.get('owncloudURL')
  .then((config) => {

    return Team.findOne(user.team)
    .then((team) => {
      return OwncloudUser.findOne(user.id)
      .then((owncloudUser) => {


        let uri = url.parse(
          config.owncloudURL + '/remote.php/webdav/' + qs.escape(team.name));

        let username = qs.escape(user.id);
        let password = qs.escape(owncloudUser.password);

        uri.auth =  `${username}:${password}`;
        uri = url.format(uri);


        return new Promise((resolve, reject) => {
          request({
            method: 'MKCOL',
            uri
          }, (err, res) => {
            if (err) {
              reject(err);
              return;
            }

            if (res.statusCode !== 201) {
              reject(new Error('Unable to create the user shared directory'));
              return;
            }

            uri = url.parse(
              config.owncloudURL +
                '/ocs/v1.php/apps/files_sharing/api/v1/shares?format=json'
            );

            uri.auth =  `${username}:${password}`;
            uri = url.format(uri);

            request({
              method: 'POST',
              uri,
              form: {
                path: '/' + qs.escape(team.name),
                shareWith: user.team,
                shareType: '1'
              }
            }, (err) => {
              if (err) {
                reject(err);
                return;
              }
              return resolve();
            });
          });
        });
      });
    });
  });
}

function getStorageForUser(user) {
  return ConfigService.get('owncloudURL')
  .then((config) => {
    return findOrCreateUser(user)
    .then((password) => {

      return findOrCreateGroup(user)
      .then(() => {
        return assignUserToGroup(user.id, user.team)
        .then(() => {

          return Team.findOne(user.team)
          .then((team) => {
            let teamName = qs.escape(team.name);
            let username = encodeURIComponent(user.id);

            password = encodeURIComponent(password);

            return {
              username,
              password,
              url: config.owncloudURL + '/remote.php/webdav/' + teamName
            };
          });
        });
      });
    });
  });
}

module.exports = { getStorageForUser };
