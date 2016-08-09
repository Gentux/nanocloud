/**
 * TeamController
 *
 * @description :: Server-side logic for managing teams
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

/* globals JsonApiService, Team, User */

module.exports = {
  create(req, res) {
    const user = req.user;

    const body = JsonApiService.deserialize(req.body);

    if (user.team) {
      return res.negotiate(new Error('You already belong to a team'));
    }

    let team = {
      name: body.data.attributes.name,
      members: [ user.id ]
    };

    Team.create(team)
    .then((team) => {

      User.update(user.id, {
        isTeamAdmin: true
      })
      .then(() => {
        Team.findOne(team.id)
        .populate('members')
        .populate('pendingMembers')
        .then((teams) => {
          res.send(JsonApiService.serialize('teams', teams));
        });
      });

    });
  },

  find(req, res) {
    const user = req.user;

    if (user.isAdmin) {
      Team.find()
      .populate('members')
      .populate('pendingMembers')
      .then((teams) => {
        res.send(JsonApiService.serialize('teams', teams));
      });
      return;
    }

    if (!user.team) {
      res.send(JsonApiService.serialize('teams', []));
      return;
    }

    if (user.isTeamAdmin) {
      Team.findOne(user.team)
      .populate('members')
      .populate('pendingMembers')
      .then((teams) => {
        res.send(JsonApiService.serialize('teams', teams));
      });
      return;
    }

    Team.findOne(user.team)
    .then((teams) => {
      res.send(JsonApiService.serialize('teams', teams));
    });
  }
};

