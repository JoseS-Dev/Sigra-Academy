import { validateCreateActivity, validateUpdateActivity } from "./activities.schema.mjs";

// Controlador que maneja las solicitudes relacionadas con las actividades
export class ActivitiesController {
    constructor({ActivitiesModel}){
        this.model = ActivitiesModel;
    }

    // Controlador para obtener todas las actividades de una asignación
    getActivitiesByAssignment = async (req, res) => {
        const {assignmentId} = req.params;
        try{
            const result = await this.model.getActivitiesByAssignment(Number(assignmentId));
            if(result.error) return res.status(404).json({error: result.error});
            return res.status(200).json({
                message: result.message,
                activities: result.activities
            });
        }
        catch(error){
            return res.status(500).json({error: 'Error al obtener las actividades'});
        }
    }

    // Controlador para obtener una actividad por su ID
    getActivityById = async (req, res) => {
        const {activityId} = req.params;
        try{
            const result = await this.model.getActivityById(Number(activityId));
            if(result.error) return res.status(404).json({error: result.error});
            return res.status(200).json({
                message: result.message,
                activity: result.activity
            });
        }
        catch(error){
            return res.status(500).json({error: 'Error al obtener la actividad'});
        }
    }

    // Controlador para cambiar la visibilidad de una actividad
    toggleActivityVisibility = async (req, res) => {
        const {activityId} = req.params;
        const {isVisible} = req.body;
        try{
            const result = await this.model.toggleActivityVisibility(Number(activityId), Boolean(isVisible));
            if(result.error) return res.status(404).json({error: result.error});
            return res.status(200).json({
                message: result.message,
                activity: result.activity
            });
        }
        catch(error){
            return res.status(500).json({error: 'Error al actualizar la visibilidad de la actividad'});
        }
    }

    // Controlador para crear una nueva actividad
    createActivity = async (req, res) => {
        const validation = validateCreateActivity(req.body);
        try{
            if(!validation.success){
                return res.status(400).json({
                    error: 'Datos de actividad inválidos',
                    details: validation.error
                });
            }
            const result = await this.model.createActivity(validation.data);
            if(result.error) return res.status(400).json({error: result.error});
            return res.status(201).json({
                message: result.message,
                activity: result.activity
            });
        }
        catch(error){
            console.error(error);
            return res.status(500).json({error: 'Error al crear la actividad'});
        }
    }

    // Controlador para actualizar una actividad existente
    updateActivity = async(req, res) => {
        const {activityId} = req.params;
        const validation = validateUpdateActivity(req.body);
        try{
            if(!validation.success){
                return res.status(400).json({
                    error: 'Datos de actividad inválidos',
                    details: validation.error
                });
            }
            const result = await this.model.updateActivity(Number(activityId), validation.data);
            if(result.error) return res.status(400).json({error: result.error});
            return res.status(200).json({
                message: result.message,
                activity: result.activity
            });
        }
        catch(error){
            return res.status(500).json({error: 'Error al actualizar la actividad'});
        }
    }

    // Controlador para eliminar una actividad
    deleteActivity = async (req, res) => {
        const {activityId} = req.params;
        try{
            const result = await this.model.deleteActivity(Number(activityId));
            if(result.error) return res.status(404).json({error: result.error});
            return res.status(200).json({
                message: result.message
            });
        }
        catch(error){
            return res.status(500).json({error: 'Error al eliminar la actividad'});
        }
    }
}