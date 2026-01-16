import { Router } from "express";
import { AssistanceController } from "./assistance.controller.mjs";
import { AssistanceModel } from "./assistance.model.mjs";

const router = Router();
const controller = new AssistanceController({assistanceController: AssistanceModel});

// Rutas relacionadas con la asistencia a asignaciones
// Ruta para obtener todos los registros de asistencia de una asignación
router.get('/assignment/:assignmentId', controller.getAllAssistances);
// Ruta para registrar la asistencia de un estudiante a una asignación
router.post('/register', controller.registerAssistance);
// Ruta para actualizar un registro de asistencia
router.patch('/update/:accessId', controller.updateAssistance);

export const AssistanceRouter = router;