import { Router } from "express";
import { SETTINGS } from "../../../config/settings.config.mjs";
import { controlRoute } from "../../modules/access-control-I/control.route.mjs";
import { subjectRoute } from "../../modules/academic-structure-II/subjects/subjects.route.mjs";
import { GradesLogRoutes } from "../../modules/grades-record-V/grades/grades.route.mjs";
import { RecordsRoutes } from "../../modules/grades-record-V/records/records.route.mjs";
import { prelaciesRoute } from "../../modules/academic-structure-II/prelacies/prelacies.route.mjs";
import { SectionRoutes } from "../../modules/academic-structure-II/sections/section.route.mjs";
import { GradeRoutes } from "../../modules/academic-structure-II/grades/grade.route.mjs";
import { YearRoutes } from "../../modules/academic-structure-II/years/year.route.mjs";
import { managerRoutes } from '../../modules/academic-manager-III/manager.route.mjs'
import { AssignmentRouter } from "../../modules/academic-manager-III/assignments/assignment.route.mjs";

const router = Router();


export const ListRoutes = {
    auth: {
        control: router.use(`${SETTINGS.BASE_PATH}/auth`, controlRoute)
    },
    academicStructure: {
        subjects: router.use(`${SETTINGS.BASE_PATH}/subjects`, subjectRoute),
        prelacies: router.use(`${SETTINGS.BASE_PATH}/prelacies`, prelaciesRoute),
        sections: router.use(`${SETTINGS.BASE_PATH}/sections`, SectionRoutes),
        gradeAcademic: router.use(`${SETTINGS.BASE_PATH}/grades`, GradeRoutes),
        years: router.use(`${SETTINGS.BASE_PATH}/years`, YearRoutes)
    },
    grades: {
        grades: router.use(`${SETTINGS.BASE_PATH}/grades-log`, GradesLogRoutes),
        records: router.use(`${SETTINGS.BASE_PATH}/records`, RecordsRoutes)
    },
    academicManager: {
        assignments: router.use(`${SETTINGS.BASE_PATH}/assignments`, AssignmentRouter)
    }  
}