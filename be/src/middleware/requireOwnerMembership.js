const ownerMembershipService = require("../services/ownerMembershipService");

module.exports = {
  requireActiveMembership: ownerMembershipService.requireActiveMembership,
  requireMembershipToPublish: ownerMembershipService.requireMembershipToPublish,
};
