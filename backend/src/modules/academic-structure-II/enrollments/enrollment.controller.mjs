import { validateEnrollment, validateEnrollmentUpdate } from "./enrollment.schema.mjs";

// Controlador que maneja las solicitudes relacionadas con las inscripciones
export class EnrollmentController {
    constructor({enrollmentController}){
        this.enrollmentController = enrollmentController;
    }

    // Método para obtener todas las inscripciones
    getAllEnrollments = async (req, res) => {
        try{
            const result = await this.enrollmentController.getAllEnrollments();
            if(result.error) return res.status(404).json({error: result.error});
            return res.status(200).json({
                message: result.message,
                enrollments: result.enrollments
            });
        }
        catch(error){
            return res.status(500).json({error: 'Error del servidor al obtener las inscripciones.'});
        }
    }

    // Método para obtener todas las inscripciones de una sección específica
    getEnrollmentsBySection = async (req, res) => {
        const {sectionId} = req.params;
        try{
            const result = await this.enrollmentController.getEnrollmentsBySection(Number(sectionId));
            if(result.error) return res.status(404).json({error: result.error});
            return res.status(200).json({
                message: result.message,
                enrollments: result.enrollments
            });
        }
        catch(error){
            return res.status(500).json({error: 'Error del servidor al obtener las inscripciones de la sección.'});
        }
    }

    // Método para obtener una inscripción por su ID
    getEnrollmentById = async (req, res) => {
        const {enrollmentId} = req.params;
        try{
            const result = await this.enrollmentController.getEnrollmentById(Number(enrollmentId));
            if(result.error) return res.status(404).json({error: result.error});
            return res.status(200).json({
                message: result.message,
                enrollment: result.enrollment
            });
        }
        catch(error){
            return res.status(500).json({error: 'Error del servidor al obtener la inscripción.'});
        }
    }

    // Controlador para obtener las inscripciones por su estado
    getEnrollmentByStatus = async (req, res) => {
        const {status} = req.params;
        try{
            const result = await this.enrollmentController.getEnrollmentByStatus(status);
            if(result.error) return res.status(404).json({error: result.error});
            return res.status(200).json({
                message: result.message,
                enrollments: result.enrollments
            });
        }
        catch(error){
            return res.status(500).json({error: 'Error del servidor al obtener las inscripciones por estado.'});
        }
    }

    // Método para crear una nueva inscripción
    createEnrollment = async (req, res) => {
        const validation = validateEnrollment(req.body);
        try{
            if(!validation.success){
                return res.status(400).json({
                    error: 'Datos de inscripción inválidos.',
                    details: validation.error
                });
            }
            const result = await this.enrollmentController.createEnrollment(validation.data);
            if(result.error) return res.status(400).json({error: result.error});
            res.locals.notify = {
                userId: validation.data.student_user_id,
                message: 'Tu inscripción ha sido creada exitosamente.',
                type: 'notification'
            };
            return res.status(201).json({
                message: result.message,
                enrollment: result.enrollment
            });
        }
        catch(error){
            return res.status(500).json({error: 'Error del servidor al crear la inscripción.'});
        }
    }

    // Método para actualizar una inscripción existente
    updateEnrollmentStatus = async (req, res) => {
        const {enrollmentId} = req.params;
        const validation = validateEnrollmentUpdate(req.body);
        try{
            if(!validation.success){
                return res.status(400).json({
                    error: 'Datos de actualización inválidos.',
                    details: validation.error
                });
            }
            const {status} = validation.data;
            const result = await this.enrollmentController.updateEnrollmentStatus(Number(enrollmentId), status);
            if(result.error) return res.status(400).json({error: result.error});
            return res.status(200).json({
                message: result.message
            });
        }
        catch(error){
            return res.status(500).json({error: 'Error del servidor al actualizar la inscripción.'});
        }
    }

    // Método para eliminar una inscripción
    deleteEnrollment = async (req, res) => {
        const {enrollmentId} = req.params;
        try{
            const result = await this.enrollmentController.deleteEnrollment(Number(enrollmentId));
            if(result.error) return res.status(404).json({error: result.error});
            res.locals.notify = {
                userId: result.student_user_id,
                message: "Se ha borrado tu inscripción a una sección",
                type: "notification"
            }
            return res.status(200).json({
                message: result.message
            });
        }
        catch(error){
            return res.status(500).json({error: 'Error del servidor al eliminar la inscripción.'});
        }
    }
}