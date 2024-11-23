const otpGenerator = require("otp-generator");
const bcrypt = require("bcrypt");
const FileManager = new (require("../Utils/file_manager"))();
const fs = require("fs");
const moment = require("moment");
const { Op, where } = require("sequelize");
const {
    leave_configurations: leaveConfigurationsSchema,
    holidays: holidaysSchema,
    questions: questionsSchema,
    options: optionsSchema,
    users: usersSchema,
    exams: examsSchema,
    standards: standardSchema,
    subjects: subjectsSchema,
    standard_user_relations: standardUserRelationSchema,
} = require("../Database/Schema");
const { STATUS } = require("../Config/constant");
const cron = require("node-cron");

/*
 * Generate Random Token
 */
function generateCustomToken() {
    let randomString = require("randomstring"),
        Encrypt = require("./../Configs/encrypt"),
        encrypt = new Encrypt();

    let tokenString = randomString.generate({
        length: 25,
        charset: "alphanumeric",
    });

    return encrypt.encryptEntity(tokenString);
}

// Generate Otp for forgot password
async function generateOtp() {
    return otpGenerator.generate(6, {
        lowerCaseAlphabets: false,
        upperCaseAlphabets: false,
        specialChars: false,
    });
}

// To create Hash Password
async function createHashPassword(password) {
    return await bcrypt.hash(password, 10);
}

// Get File Name
async function getFileName(url) {
    return (test = url.split("/").pop());
}

function checkModules(a1, a2) {
    // compare a1 values to a2 if not true then return that module
    return a1.filter((elem) => a2.indexOf(elem) === -1);
}

// Delete From Folder
async function unlinkRemoveFile(folderName, url) {
    let localPath = FileManager.resolvePath(folderName);
    let fileName = await getFileName(url);
    fs.unlink(localPath + fileName, function (err) {
        if (err) {
            return { data: err, status: false };
        } else {
            return { data: "err", status: true };
        }
    });
}

async function isOffSaturday(satDates) {
    let offSaturdayDate = [];
    let configuredSaturDays = [];
    let getOffSaturday = await leaveConfigurationsSchema.findOne({
        where: {
            name: "off Saturdays",
        },
    });
    if (getOffSaturday) {
        configuredSaturDays = await getOffSaturday?.value.split(",");
    } else {
        configuredSaturDays = ["1", "2", "3", "4", "5"];
    }
    await satDates.map(async (dates) => {
        const dateToCheck = moment(dates);
        const dayOfMonth = dateToCheck.date();
        if (dayOfMonth <= 7) {
            let checkDate = configuredSaturDays.includes("1");
            if (checkDate) {
                offSaturdayDate.push(dates);
            }
        } else if (dayOfMonth <= 14) {
            let checkDate = configuredSaturDays.includes("2");
            if (checkDate) {
                offSaturdayDate.push(dates);
            }
        } else if (dayOfMonth <= 21) {
            let checkDate = configuredSaturDays.includes("3");
            if (checkDate) {
                offSaturdayDate.push(dates);
            }
        } else if (dayOfMonth <= 28) {
            let checkDate = configuredSaturDays.includes("4");
            if (checkDate) {
                offSaturdayDate.push(dates);
            }
        } else {
            let checkDate = configuredSaturDays.includes("5");
            if (checkDate) {
                offSaturdayDate.push(dates);
            }
        }
    });

    return offSaturdayDate;
}

async function findHolidays(dateFrom, dateTo) {
    let startDate = moment(dateFrom);
    let endDate = moment(dateTo);
    const eightDaysBefore = startDate.subtract(8, "days").format("YYYY-MM-DD");
    const eightDaysAfter = endDate.add(8, "days").format("YYYY-MM-DD");
    const sundayDates = [];
    const saturdayDates = [];
    const holidayDates = [];
    for (
        let date = moment(eightDaysBefore);
        date.isSameOrBefore(moment(eightDaysAfter));
        date.add(1, "day")
    ) {
        if (date.weekday() === 0) {
            sundayDates.push(date.format("YYYY-MM-DD"));
        } else if (date.weekday() === 6) {
            saturdayDates.push(date.format("YYYY-MM-DD"));
        }
    }
    let holidays = await holidaysSchema.findAll({
        where: {
            date_from: {
                [Op.between]: [eightDaysBefore, eightDaysAfter],
            },
        },
        raw: true,
    });

    await holidays.map((holiday) => {
        for (
            let date = moment(holiday.date_from);
            date.isSameOrBefore(moment(holiday.date_to));
            date.add(1, "day")
        ) {
            holidayDates.push(date.format("YYYY-MM-DD"));
        }
    });

    let offSaturdayDate = await isOffSaturday(saturdayDates);

    let holidaysWithOffDays = offSaturdayDate.concat(sundayDates, holidayDates);
    return holidaysWithOffDays.sort();
}

async function countSandwichDates(bodyData) {
    let leaveDates = await findHolidays(bodyData?.dateFrom, bodyData?.dateTo);

    let checkDateFrom = moment(bodyData?.dateFrom)
        .subtract(1, "days")
        .format("YYYY-MM-DD");

    let checkDateTo = moment(bodyData?.dateTo)
        .add(1, "days")
        .format("YYYY-MM-DD");

    let isFromDateSandwich = leaveDates.includes(checkDateFrom);
    let isToDateSandwich = leaveDates.includes(checkDateTo);

    if (isFromDateSandwich && isToDateSandwich) {
        let fromToDate = [];
        for (
            let date = moment(bodyData?.dateFrom);
            date.isSameOrBefore(moment(bodyData?.dateTo));
            date.add(1, "day")
        ) {
            fromToDate.push(date.format("YYYY-MM-DD"));
        }

        let uniqueDatesSet = new Set([...leaveDates, ...fromToDate]);
        let uniqueSortedDates = Array.from(uniqueDatesSet).sort();

        let sequenceCount = 1;
        let maxSequenceCount = 1;

        for (let i = 1; i < uniqueSortedDates.length; i++) {
            let currentDate = moment(uniqueSortedDates[i]);
            let prevDate = moment(uniqueSortedDates[i - 1]);
            if (currentDate.diff(prevDate, "days") === 1) {
                sequenceCount++;
                maxSequenceCount = Math.max(maxSequenceCount, sequenceCount);
            } else {
                sequenceCount = 1;
            }
        }
        return maxSequenceCount;
    } else {
        return false;
    }
}

// Get Current Exam's Question List
async function studentQuestionList(queData) {
    const currentDate = moment(Date.now()).format("YYYY-MM-DD");
    var currentTime = moment().format("HH:mm:ss");

    if (queData?.data && queData?.data?.standard_id) {
        const examData = await examsSchema.findAll({
            // raw: true,
            attributes: ['id', 'standard_id', 'date','start_time', 'end_time'],
            where: {
                standard_id: queData?.data?.standard_id,
                start_time: { [Op.lte]: currentTime },
                end_time: { [Op.gte]: currentTime },
                date: currentDate,
                isDelete: STATUS.NOTDELETED,
            },
            include: [
                {
                    model: questionsSchema,
                    attributes: { exclude: ['createdAt', 'updatedAt', 'isDelete'] },
                    include: {
                        model: optionsSchema,
                        attributes: { exclude: ['createdAt', 'updatedAt', 'isDelete'] }

                    }
                },
                {
                    model: subjectsSchema,
                    attributes: ['name']
                }
            ],
            order: [
                [{ model: questionsSchema }, 'sortOrder', 'ASC'],
                [{ model: questionsSchema }, { model: optionsSchema }, 'sortOrder', 'ASC']
            ]
        });

        return examData;

        // const questionList = await Promise.all(examData?.map(async (data) => {
        //     const currentDate = moment(Date.now()).format("YYYY-MM-DD");
        //     var currentTime = moment().format("HH:mm:ss");
        //     if ((data?.date === currentDate) && (currentTime === data?.start_time || currentTime <= data?.end_time)) {
        //         const subjectName = await subjectsSchema.findOne({
        //             raw: true,
        //             where: {
        //                 id: data?.subject_id
        //             },
        //             attributes: ['name']
        //         });

        //         const questionPaper = await questionsSchema.findAll({
        //             // raw: true,
        //             where: {
        //                 exam_id: data?.id
        //             },
        //             include: [
        //                 {
        //                     model: optionsSchema,
        //                     attributes: { exclude: ["createdAt", "updatedAt"] },
        //                 },
        //             ],
        //         });
        //         return {
        //             questionPaper,
        //             start_time: data?.start_time,
        //             end_time: data?.end_time,
        //             std_id: data?.standard_id,
        //             sub_name: subjectName[0]
        //         }
        //     }
        // }));
        // return questionList[0];
    }
}

module.exports = {
    generateOtp,
    createHashPassword,
    unlinkRemoveFile,
    findHolidays,
    countSandwichDates,
    checkModules,
    studentQuestionList
};
