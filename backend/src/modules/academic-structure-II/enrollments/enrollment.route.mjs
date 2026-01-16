import {Router} from 'express';
import { EnrollmentController } from './enrollment.controller.mjs';
import { EnrollmentModel } from './enrollment.model.mjs';

const router = Router();
const controller = new EnrollmentController({enrollmentController: EnrollmentModel});

// Rutas relacionadas con las inscripciones
// Ruta para obtener todas las inscripciones
router.get('/all', controller.getAllEnrollments);
// Ruta para obtener las inscripciones de una sección específica
router.get('/section/:sectionId', controller.getEnrollmentsBySection);
// Ruta para obtener una inscripción por su ID
router.get('/:enrollmentId', controller.getEnrollmentById);
// Ruta para obtener las inscripciones por su estado
router.get('/status/:status', controller.getEnrollmentByStatus);
// Ruta para crear una nueva inscripción
router.post('/create', controller.createEnrollment);
// Ruta para actualizar una inscripción existente
router.patch('/update/:enrollmentId', controller.updateEnrollmentStatus);
// Ruta para eliminar una inscripción
router.delete('/delete/:enrollmentId', controller.deleteEnrollment);

export const EnrollmentRouter = router;
