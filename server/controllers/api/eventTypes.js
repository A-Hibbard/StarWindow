const EventType = require('../../models/eventType');

module.exports = {
  getAll,
};

async function getAll(req, res) {
  try {
    const eventTypes = await EventType.getAll();
    res.json(eventTypes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
