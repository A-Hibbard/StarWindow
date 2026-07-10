const User = require('../../models/user');
const EventType = require('../../models/eventType');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

module.exports = {
  create,
  login,
  me,
  checkToken,
  updateEventTypes,
};

async function create(req, res) {
  try {
    const user = await User.create(req.body);
    const token = createJWT(user);
    console.log(`created user ${user.email}`);
    res.json(token);
  } catch (err) {
    console.error('POST /api/users (signup) failed:', err);
    res.status(400).json({ error: err.message, code: err.code });
  }
}

async function login(req, res) {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(401).json({ error: 'Invalid email' });

    const match = await bcrypt.compare(req.body.password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid email or password' });

    console.log(`user ${user.email} logs in`);
    res.json(createJWT(user));
  } catch (err) {
    console.error('POST /api/users/login failed:', err);
    res.status(400).json({ error: err.message, code: err.code });
  }
}

async function me(req, res) {
  try {
    const user = await User.findById(req.user.user_id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    console.error("GET /api/users/me failed:", err);
    res.status(400).json({ error: err.message, code: err.code });
  }
}

function checkToken(req, res) {
  console.log('req.user', req.user);
  res.json(req.exp);
}

async function updateEventTypes(req, res) {
  try {
    const eventTypeIds = Array.isArray(req.body.eventTypeIds) ? req.body.eventTypeIds : [];
    const savedEventTypeIds = await EventType.replaceForUser(req.user.user_id, eventTypeIds);
    res.json({ eventTypeIds: savedEventTypeIds });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

function createJWT(user) {
  return jwt.sign(
    {
      user: {
        user_id: user.user_id,
        email: user.email,
        f_name: user.f_name,
        l_name: user.l_name,
        status_id: user.status_id,
        status: user.status,
      },
    },
    process.env.SECRET,
    { expiresIn: '24h' }
  );
}
