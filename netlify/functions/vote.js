const { createVoteHandler } = require('../../scripts/vote');

// Thin wrapper: the logic lives in scripts/vote.js so it can be tested with a mock fetch.
exports.handler = createVoteHandler();
