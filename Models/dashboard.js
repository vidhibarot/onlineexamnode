const { where } = require("sequelize");
const { STATUS, STATUS_CODES, STATUS_MESSAGES, ROLE_TYPES_ID } = require("../config/constant");
const {
    exams: examsSchema,
    users: usersSchema,
    standards: standardsSchema,
    subjects: subjectsSchema,
} = require("../Database/Schema");
const moment = require("moment")
class dashboardModel {

    // Add exam type
    async getDashboardCount() {

        let todayExamData = await examsSchema.findAndCountAll({
            where: {
                date: moment().format("YYYY-MM-DD"),
                isDelete: STATUS.NOTDELETED,
                status: STATUS.ACTIVE
            }
        });

        let studentData = await usersSchema.findAndCountAll({
            where: {
                role_id: ROLE_TYPES_ID.STUDENTS,
                isDelete: STATUS.NOTDELETED,
                status: STATUS.ACTIVE
            }
        });

        let standardData = await standardsSchema.findAndCountAll({
            isDelete: STATUS.NOTDELETED,
            status: STATUS.ACTIVE
        });

        let subjectData = await subjectsSchema.findAndCountAll({
            isDelete: STATUS.NOTDELETED,
            status: STATUS.ACTIVE
        });

        return {
            todayExamData,
            studentData,
            standardData,
            subjectData
        }
    };

};

module.exports = dashboardModel;