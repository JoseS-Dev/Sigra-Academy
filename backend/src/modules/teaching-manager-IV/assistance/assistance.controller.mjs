import { validateAssistance } from "./assistance.schema.mjs";

// Controlador que maneja las solicitudes relacionadas con la asistencia a asignaciones
export class AssistanceController {
    constructor({assistanceController}){
        this.assistanceController = assistanceController;
    }

    // Método para obtener todos los registros de asistencia de una asignación
    getAllAssistances = async (req, res) => {
        const {assignmentId} = req.params;
        try{
            const result = await this.assistanceController.getAllAssistances(Number(assignmentId));
            if(result.error) return res.status(404).json({error: result.error});
            return res.status(200).json({
                message: result.message,
                assistances: result.assistances
            });
        }
        catch(error){
            return res.status(500).json({error: 'Error del servidor al obtener los registros de asistencia.'});
        }
    }

    // Método para registrar la asistencia de un estudiante a una asignación
    registerAssistance = async (req, res) => {
        const validation = validateAssistance(req.body);
        try{
            if(!validation.success) return res.status(400).json({error: 'Datos de asistencia inválidos.', details: validation.error});
            const result = await this.assistanceController.registerAssistance(validation.data);
            if(result.error) return res.status(400).json({error: result.error});
            return res.status(201).json({
                message: result.message,
                assistanceId: result.assistanceId
            });
        }
        catch(error){
            console.error(error);
            return res.status(500).json({error: 'Error del servidor al registrar la asistencia.'});
        }
    }

    // Método para actualizar un registro de asistencia
    updateAssistance = async (req, res) => {
        const {accessId} = req.params;
        try{
            const result = await this.assistanceController.updateAssistance(Number(accessId));
            if(result.error) return res.status(404).json({error: result.error});
            return res.status(200).json({
                message: result.message
            });
        }
        catch(error){
            return res.status(500).json({error: 'Error del servidor al actualizar el registro de asistencia.'});
        }
    }
}