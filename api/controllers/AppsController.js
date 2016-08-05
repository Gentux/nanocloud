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
 */

/* globals Apps, MachineService, PlazaService, StorageService */

const Promise = require("bluebird");

/**
 * Controller of apps resource.
 *
 * @class AppsController
 */

module.exports = {

  /**
   * Handles the /apps/connections endpoint
   *
   * @method connections
   */
  connections(req, res) {
    MachineService.getMachineForUser(req.user)
      .then((machine) => {
        var connections = [];

        return Apps.find()
          .then((apps) => {
            apps.forEach((app) => {
              connections.push({
                id: app.id,
                hostname: machine.ip,
                port: 3389,
                username: machine.username,
                password: machine.password,
                "remote-app": '',
                protocol: 'rdp',
                "app-name": app.alias
              });
            });

            return res.ok(connections);
          })
          .catch((err) => {
            return res.negotiate(err);
          });
      })
      .catch((err) => res.negotiate(err));
  },

  patch: function(req, res) {

    // Path is "/api/apps/*", there is always at least 4 elements in this split
    let appId = req.path.split('/')[3];
    let newApplication = null;

    const updateApplication = Promise.promisify(Apps.update);

    updateApplication({
      id: appId
    }, req.body.data.attributes)
    .then((applications) => {
      newApplication = applications[0];

      if (newApplication.state === "running") {
        return Promise.all([
            MachineService.getMachineForUser(req.user),
            StorageService.findOrCreate(req.user)
        ])
          .then((results) => {
            let machine = results[0];
            let storage = results[0];

            // TODO hard coded plaza port
            return PlazaService.exec(
                machine.ip,
                9090, {
                  'hide-window': true,
                  wait: true,
                  username: machine.username,
                  command: [
                    "C:\\Windows\\System32\\net.exe",
                    "use", "z:",
                    "\\\\" + storage.hostname + "\\" + storage.username,
                    "/user:" + storage.username,
                    storage.Password
                  ],
                  stdin: ''
                })
            .then((res) => {
              console.log(res.body);
              console.log(res.data);
              PlazaService.exec(machine.ip, 9090, {
                command: [
                  "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
                  "-Command",
                  "-"
                ],
                stdin: "$a = New-Object -ComObject shell.application;$a.NameSpace( \"Z:\\\" ).self.name = \"Storage\""
              });
            });

            // TODO Launch app
          });
      }

      return res.ok(newApplication);
    })
    .catch((err) => res.negotiate(err));
  }
};
