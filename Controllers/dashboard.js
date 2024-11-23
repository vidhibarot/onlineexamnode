
const { STATUS_CODES, STATUS_MESSAGES } = require('../config/constant');

const dashboardModel = new (require('../Models/dashboard'))();

class dashboardController {

    //Get dashboard count
    async getDashboardCount(req, res) {
        try {
            let data = await dashboardModel.getDashboardCount();

            res.handler.success(data, STATUS_MESSAGES.EXAM_TYPE.EXAM_TYPE_ADD);

        } catch (error) {
            res.handler.serverError(error);
        };
    };
};

module.exports = dashboardController;