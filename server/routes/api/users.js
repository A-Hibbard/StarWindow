const express = require('express');
const router = express.Router();
const usersCtrl = require('../../controllers/api/users');
const ensureLoggedIn = require('../../config/ensureLoggedIn');

router.post('/', usersCtrl.create);
router.post('/signup', usersCtrl.create);
router.post('/login', usersCtrl.login);
router.get('/me', ensureLoggedIn, usersCtrl.me);
router.put('/me', ensureLoggedIn, usersCtrl.updateMe);
router.get('/check-token', ensureLoggedIn, usersCtrl.checkToken);
router.get('/event-types', ensureLoggedIn, usersCtrl.getEventTypes);
router.put('/event-types', ensureLoggedIn, usersCtrl.updateEventTypes);

module.exports = router;
