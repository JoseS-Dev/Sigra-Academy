import { validateCreateAssignment, validateUpdateAssignment } from "./assignment.schema.mjs";

// Controlador para la gestión de asignaciones de cursos a profesores
export class AssignemtController {
    constructor({assignmentModel}) {
        this.assignmentModel = assignmentModel;
    }

    // Método para obtener cursos asignados a un estudiante
    getCoursesByStudentId = async (req, res) => {
        const { studentId } = req.params;
        try{
            const result =  await this.assignmentModel.getCoursesByStudentId(studentId);
            if(result.error) return res.status(404).json({error: result.error});
            return res.status(200).json({
                message: result.message,
                courses: result.courses
            });
        }
        catch(error){
            return res.status(500).json({error: `Error obteniendo cursos asignados: ${error.message}`});
        }
    }

    // Controlador para la obtener todos los cursos asignados a un profesor
    getCoursesByTeacherId = async (req, res) => {
        const { teacherId } = req.params;
        try{
            const result =  await this.assignmentModel.getCourseByTeacherId(teacherId);
            if(result.error) return res.status(404).json({error: result.error});
            return res.status(200).json({
                message: result.message,
                courses: result.courses
            });
        }
        catch(error){
            console.error(error);
            return res.status(500).json({error: `Error obteniendo cursos asignados: ${error.message}`});
        }
    }


    // Método para obtener cursos asignados a una sección
    getCoursesBySectionId = async (req, res) => {
        const { sectionId } = req.params;
        try{
            const result =  await this.assignmentModel.getCoursesBySectionId(sectionId);
            if(result.error) return res.status(404).json({error: result.error});
            return res.status(200).json({
                message: result.message,
                courses: result.courses
            });
        }
        catch(error){
            return res.status(500).json({error: `Error obteniendo cursos asignados: ${error.message}`});
        }
    }

    // Método para obtener detalles de un curso asignado
    getCourseById = async (req, res) => {
        const { assignmentId } = req.params;
        try{
            const result =  await this.assignmentModel.getCourseByID(assignmentId);
            if(result.error) return res.status(404).json({error: result.error});
            return res.status(200).json({
                message: result.message,
                course: result.course
            });
        }
        catch(error){
            return res.status(500).json({error: `Error obteniendo detalles del curso asignado: ${error.message}`});
        }
    }

    // Método para obtener todas las actividades de un curso asignado
    getActivitiesByAssignmentID = async (req, res) => {
        const { assignmentId } = req.params;
        try{
            const result =  await this.assignmentModel.getActivitiesByAssignmentID(assignmentId);
            if(result.error) return res.status(404).json({error: result.error});
            return res.status(200).json({
                message: result.message,
                activities: result.activities
            });
        }
        catch(error){
            return res.status(500).json({error: `Error obteniendo actividades del curso asignado: ${error.message}`});
        }
    }

    // Método para obtener todas las personas relacionadas a un curso asignado
    getPeopleByAssignmentID = async (req, res) => {
        const { assignmentId } = req.params;
        try{
            const result =  await this.assignmentModel.getPeopleByAssignmentID(assignmentId);
            if(result.error) return res.status(404).json({error: result.error});
            return res.status(200).json({
                message: result.message,
                people: result.people
            });
        }
        catch(error){
            return res.status(500).json({error: `Error obteniendo personas relacionadas al curso asignado: ${error.message}`});
        }
    }

    // Método para crear una nueva asignación de curso a profesor
    createAssignment = async (req, res) => {
        const validation = validateCreateAssignment(req.body);
        try{
            if(!validation.success){
                return res.status(400).json({
                    error: 'Datos inválidos para crear la asignación',
                    details: validation.error
                });
            }
            const result = await this.assignmentModel.createAssignement(validation.data);
            res.locals.notify = {
                userId: result.teacher_user_id,
                message: 'Has sido asignado a una nueva sección.',
                type: 'Info'
            }
            if(result.error) return  res.status(400).json({error: result.error});
            return res.status(201).json({
                message: result.message,
                assignment: result.assignment
            });
        }
        catch(error){
            return res.status(500).json({error: `Error creando la asignación: ${error.message}`});
        }
    }

    // Método para actualizar una asignación de curso a profesor
    updateAssignment = async (req, res) => {
        const { assignmentId } = req.params;
        const validation = validateUpdateAssignment(req.body);
        try{
            if(!validation.success){
                return res.status(400).json({
                    error: 'Datos inválidos para actualizar la asignación',
                    details: validation.error
                });
            }
            const result = await this.assignmentModel.updateAssignmentByID(assignmentId, validation.data);
            if(result.error) return  res.status(400).json({error: result.error});
            return res.status(200).json({
                message: result.message,
                assignment: result.assignment
            });
        }
        catch(error){
            return res.status(500).json({error: `Error actualizando la asignación: ${error.message}`});
        }
    }

    // Método para eliminar una asignación de curso a profesor
    deleteAssignment = async (req, res) => {
        const { assignmentId } = req.params;
        try{
            const result = await this.assignmentModel.deleteAssignmentByID(assignmentId);
            if(result.error) return  res.status(400).json({error: result.error});
            res.locals.notify = {
                userId: result.teacher_user_id,
                message: "Se ha borrado tu asignación a una sección",
                type: "notification"
            }
            return res.status(200).json({
                message: result.message
            });
        }
        catch(error){
            return res.status(500).json({error: `Error eliminando la asignación: ${error.message}`});
        }
    }
}