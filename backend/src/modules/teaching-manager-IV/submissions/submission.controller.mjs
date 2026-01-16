import { validateCreateSubmission, validateUpdateSubmission } from "./submission.schema.mjs";

// Controlador que maneja las solicitudes realcionadas con las entregas de actividades
export class SubmissionController {
    constructor({SubmissionModel}){
        this.model = SubmissionModel;
    }
    // Controlador para obtener todas las entregas de una actividad
    getSubmissionByActivityId = async (req, res) => {
        const {activityId} = req.params;
        try{
            const result = await this.model.getSubmissionByActivityId(Number(activityId));
            if(result.error) return res.status(404).json({error: result.error});
            return res.status(200).json({
                message: result.message,
                submissions: result.submissions
            });
        }
        catch(error){
            return res.status(500).json({error: 'Error al obtener las entregas'});
        }
    }

    // Controlador para obtener una entrega por su ID
    getSubmissionById = async (req, res) => {
        const {submissionId} = req.params;
        try{
            const result = await this.model.getSubmissionById(Number(submissionId));
            if(result.error) return res.status(404).json({error: result.error});
            return res.status(200).json({
                message: result.message,
                submission: result.submission
            });
        }
        catch(error){
            return res.status(500).json({error: 'Error al obtener la entrega'});
        }
    }

    // Controlador para obtener todas las entregas de un estudiante
    getSubmissionByUserId = async (req, res) => {
        const {studentUserId} = req.params;
        try{
            const result = await this.model.getSubmissionByUserId(Number(studentUserId));
            if(result.error) return res.status(404).json({error: result.error});
            return res.status(200).json({
                message: result.message,
                submissions: result.submissions
            });
        }
        catch(error){
            return res.status(500).json({error: 'Error al obtener las entregas'});
        }
    }

    // Controlador para crear una nueva entrega
    createSubmission = async (req, res) => {
        if(!req.file) return res.status(400).json({error: 'El archivo de la entrega es requerido'});
        const Data = {
            ...req.body,
            activity_id: Number(req.body.activity_id),
            student_user_id: Number(req.body.student_user_id),
            file_path: req.file.path
        }
        const validation = validateCreateSubmission(Data);
        try{
            if(!validation.success){
                return res.status(400).json({
                    error: 'Datos de entrega inválidos',
                    details: validation.error
                });
            }
            const result = await this.model.createSubmission(Data);
            if(result.error) return res.status(400).json({error: result.error});
            return res.status(201).json({
                message: result.message,
                submission: result.submission
            });
        }
        catch(error){
            return res.status(500).json({error: 'Error al crear la entrega'});
        }
    }

    // Controlador para actualizar una entrega existente
    updateSubmission = async (req, res) => {
        const {submissionId} = req.params;
        const data = {
            ...req.body,
            file_path: req.file ? req.file.path : undefined
        }
        const validation = validateUpdateSubmission(data);
        try{
            if(!validation.success){
                return res.status(400).json({
                    error: 'Datos de entrega inválidos',
                    details: validation.error
                });
            }
            const result = await this.model.updateSubmission(Number(submissionId), validation.data);
            if(result.error) return res.status(400).json({error: result.error});
            return res.status(200).json({
                message: result.message,
                submission: result.submission
            });
        }
        catch(error){
            return res.status(500).json({error: 'Error al actualizar la entrega'});
        }
    }

    // Controlador para eliminar una entrega
    deleteSubmission = async (req, res) => {
        const {submissionId} = req.params;
        try{
            const result = await this.model.deleteSubmission(Number(submissionId));
            if(result.error) return res.status(400).json({error: result.error});
            return res.status(200).json({
                message: result.message
            });
        }
        catch(error){
            return res.status(500).json({error: 'Error al eliminar la entrega'});
        }
    }
}