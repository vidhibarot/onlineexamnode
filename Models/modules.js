const mailer = new (require("../Utils/mailer"))();
const { MODULES, ROLE_TYPES_ID } = require("../config/constant");

const { modules: modulesSchema, roles: roleSchema, permissions: permissionSchema, } = require("../Database/Schema");
const { checkModules } = require("../Utils/helpers");

class examModel {
    // Get all exams
    async getAllModulesList() {
        let moduleData = await modulesSchema.findAll({
            where: {
                isDelete: STATUS.NOTDELETED,
            },
        });
        return moduleData;
    }

    // check modules and added permission
    async checkModuleChanges() {
        let modules = await modulesSchema.findAll({
            attributes: ["name"],
        });

        const moduleConfig = Object.values(MODULES)
        const dbModuleValue = modules?.map((data) => data?.name)

        const newModules = checkModules(moduleConfig, dbModuleValue);
        const removeModule = checkModules(dbModuleValue, moduleConfig);

        // Remove modules that doesn't exist in config's constant file
        if (removeModule?.length > 0) {
            await modulesSchema.destroy({ where: { name: removeModule } })
        }

        // Add new modules
        if (newModules?.length > 0) {
            var addedNewModule = await modulesSchema.bulkCreate(
                newModules?.map((data) => {
                    return {
                        name: data,
                        status: 1
                    }
                })
            )
        }

        console.log(`Added new ${newModules?.length} modules`);

        const allRole = await roleSchema.findAll({ attributes: ["id"], });

        let permissions = [];
        await allRole?.forEach(async (role) => {
            await addedNewModule?.forEach((module) => {
                if (role?.id === ROLE_TYPES_ID?.ADMIN) {
                    permissions.push({
                        role_id: role?.id,
                        module_id: module?.dataValues?.id,
                        read_access: true,
                        write_access: true,
                        delete_access: true,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    })
                } else {
                    permissions.push({
                        role_id: role?.id,
                        module_id: module?.dataValues?.id,
                        read_access: false,
                        write_access: false,
                        delete_access: false,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    })
                }
            })
        })
        await permissionSchema.bulkCreate(permissions);
        console.log("Added permissions for new modules");
    }
}

module.exports = examModel;
