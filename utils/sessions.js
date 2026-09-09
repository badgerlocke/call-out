function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function userSessionFilter(userId) {
  const id = String(userId);
  return {
    $or: [
      { "session.passport.user": id },
      {
        session: {
          $regex: `"passport":\\{"user":"${escapeRegex(id)}"`,
        },
      },
    ],
  };
}

async function destroyUserSessions(userId, { keepSessionId } = {}, collection) {
  if (!userId || !collection) {
    return;
  }

  const filter = userSessionFilter(userId);
  if (keepSessionId) {
    filter._id = { $ne: keepSessionId };
  }

  await collection.deleteMany(filter);
}

module.exports = {
  destroyUserSessions,
  userSessionFilter,
};
