const router = (require('express')).Router()

const Authentication = new (require("../Middleware/authentication"));
const dashboardController = new (require('../Controllers/dashboard'));
const userAuth = Authentication.userAuth;

// Get dashboard count 
router.route('/getcount').get(userAuth, dashboardController.getDashboardCount);

module.exports = router