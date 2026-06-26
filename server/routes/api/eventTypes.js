const express = require('express');
const router = express.Router();
const eventTypesCtrl = require('../../controllers/api/eventTypes');

router.get('/', eventTypesCtrl.getAll);

module.exports = router;
