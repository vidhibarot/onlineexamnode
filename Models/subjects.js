const mailer = new (require("../Utils/mailer"))();
const {
    subjects: subjectsSchema,
    users: usersSchema,
} = require("../Database/Schema");
require("dotenv").config();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { createHashPassword, generateOtp, unlinkRemoveFile } = require('../Utils/helpers');
const { STATUS, STATUS_CODES } = require("../config/constant");
const moment = require('moment');
const { Op, where } = require("sequelize");
const FileManager = new (require("../Utils/file_manager"));

class subjectModel {

    // Add subjects
    async addSubject(bodyData, userInfo) {
        return await subjectsSchema.create({ "user_id": userInfo.id, ...bodyData }, ({
            attributes: { exclude: ['createdAt', 'updatedAt', 'updatedAt', 'createdAt'] },
        }))
    }

    // Update subjects
    async updateSubject(bodyData, userInfo) {
        let idCheck = await subjectsSchema.findOne({
            where: {
                id: bodyData?.id,
                isDelete: STATUS.NOTDELETED
            }
        });
        if (!idCheck) {
            return {
                status: STATUS_CODES.NOT_VALID_DATA,
            }
        }
        return await subjectsSchema.update({ "user_id": userInfo.id, ...bodyData }, {
            where: {
                id: bodyData?.id
            }
        });
    }

    // Delete subjects
    async deleteSubject(id) {
        let idCheck = await subjectsSchema.findOne({
            where: {
                id: id,
                isDelete: STATUS.NOTDELETED
            }
        });
        if (!idCheck) {
            return {
                status: STATUS_CODES.NOT_VALID_DATA,
            };
        }
        return await subjectsSchema.update({
            isDelete: STATUS.DELETED
        },
            {
                where: {
                    id: id
                }
            });
    }

    // Get subjects by id
    async getSubjectByID(id) {
        let getIdData = await subjectsSchema.findOne({
            attributes: { exclude: ['createdAt', 'updatedAt'] },
            where: {
                id: id,
                status: STATUS.ACTIVE,
                isDelete: STATUS.NOTDELETED
            },
            include: [
                {
                    model: usersSchema,
                    attributes: { exclude: ['createdAt', 'updatedAt', 'isDelete'] }
                }
            ],
        });
        if (!getIdData) {
            return { status: STATUS_CODES.NOT_FOUND }
        }
        return getIdData
    }

    // Get all subjects
    async getAllSubjectList(bodyData) {
        console.log("body Data is tehrere>>", bodyData)
        var itemsPerPage;
        var lastRecordIndex;
        var currentPage;
        var firstRecordIndex;
        if (bodyData?.currentPage && bodyData?.itemsPerPage) {
            currentPage = bodyData?.currentPage;
            itemsPerPage = bodyData?.itemsPerPage;
            lastRecordIndex = currentPage * itemsPerPage;
            firstRecordIndex = lastRecordIndex - itemsPerPage;
        }
        var sortBy = [];
        if (bodyData?.sortBy && bodyData?.sortBy?.length > 0) {
            bodyData?.sortBy?.map((sort) => {
                if (sort?.id !== "" && sort?.desc !== "") {
                    if (sort?.desc == true) {
                        sortBy?.push([sort?.id, "desc"]);
                    } else {
                        sortBy?.push([sort?.id, "asc"]);
                    }
                }
            });
        }
        if (sortBy?.length < 1) {
            sortBy = [['name', 'asc']];
        }
        var filterQuery = {};
        var userQuery = {};
        if (bodyData?.filters && bodyData?.filters?.length > 0) {
            bodyData?.filters?.forEach((filter) => {
                if (filter?.id != "" && filter?.value != "") {
                    if (typeof (filter?.value) === 'string') {
                        if (filter?.id === 'user.full_name') {
                            userQuery["full_name"] = {
                                [SEQUELIZE.Op.like]: `%${filter?.value.trim()}%`,
                            };
                        }
                        else {
                            filterQuery[filter?.id] = {
                                [SEQUELIZE.Op.like]: `%${filter?.value.trim()}%`,
                            };
                        }

                    } else {
                        filterQuery[filter?.id] = {
                            [SEQUELIZE.Op.eq]: `${filter?.value}`
                        };
                    }
                }
            });;
        }
        console.log("USR QUERY IS THERERER>>", userQuery)
        const value = await subjectsSchema.findAndCountAll({
            where: {
                isDelete: STATUS.NOTDELETED,
                ...filterQuery
            },
            include: [
                {
                    model: usersSchema,
                    where: {
                        ...userQuery
                    },
                    attributes: { exclude: ['createdAt', 'updatedAt', 'isDelete'] }
                }
            ],
            offset: firstRecordIndex,
            limit: itemsPerPage,
            order: [...sortBy],
        });
        console.log("FINAL DATA IS THERERERER>>", value)
return value
       
    }
}

module.exports = subjectModel;