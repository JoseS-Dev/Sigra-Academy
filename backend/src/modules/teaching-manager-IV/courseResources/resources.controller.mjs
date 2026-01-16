import { validateCreateResource, validateUpdateResource } from "./resources.schema.mjs";

// Controlador que maneja las solicitudes relacionadas con los recursos de curso
export class ResourceController {
    constructor({ResourceModel}){
        this.model = ResourceModel;
    }

    // Controlador para  obtener todos los recursos de una asignación
    getResourcesByAssignment = async (req, res) => {
        const {assignmentId} = req.params;
        try{
            const result = await this.model.getResourcesByAssignment(Number(assignmentId));
            if(result.error) return res.status(404).json({error: result.error});
            return res.status(200).json({
                message: result.message,
                resources: result.resources
            });
        }
        catch(error){
            return res.status(500).json({error: 'Error al obtener los recursos'});
        }
    }

    // Controlador para obtener un recurso por su ID
    getResourceById = async (req, res) => {
        const {resourceId} = req.params;
        try{
            const result = await this.model.getResourceById(Number(resourceId));
            if(result.error) return res.status(404).json({error: result.error});
            return res.status(200).json({
                message: result.message,
                resource: result.resource
            });
        }
        catch(error){
            return res.status(500).json({error: 'Error al obtener el recurso'});
        }
    }

    // Controlador para crear un nuevo recurso
    createResource = async (req, res) => {
        if(!req.file) return res.status(400).json({error: 'El archivo del recurso es requerido'});
        const data = {
            ...req.body,
            assignment_id: Number(req.body.assignment_id),
            file_path_or_url: req.file.path
        }
        const validation = validateCreateResource(data);
        try{
            if(!validation.success){
                return res.status(400).json({
                    error: 'Error de validación',
                    details: validation.error
                });
            }
            const result = await this.model.createResource(data);
            if(result.error) return res.status(404).json({error: result.error});
            return res.status(201).json({
                message: result.message,
                resource: result.resource
            });
        }
        catch(error){
            console.error(error);
            return res.status(500).json({error: 'Error al crear el recurso'});
        }
    }

    // Controlador para actualizar un recurso existente
    updateResource = async (req, res) => {
        const {resourceId} = req.params;
        const data = {
            ...req.body,
            file_path_or_url: req.file ? req.file.path : undefined
        }
        const validation = validateUpdateResource(data);
        try{
            if(!validation.success){
                return res.status(400).json({
                    error: 'Error de validación',
                    details: validation.error
                });
            }
            const result = await this.model.updateResource(Number(resourceId), data);
            if(result.error) return res.status(404).json({error: result.error});
            return res.status(200).json({
                message: result.message,
                resource: result.resource
            });
        }
        catch(error){
            return res.status(500).json({error: 'Error al actualizar el recurso'});
        }
    }

    // Controlador para eliminar un recurso existente
    deleteResource = async (req, res) => {
        const {resourceId} = req.params;
        try{
            const result = await this.model.deleteResource(Number(resourceId));
            if(result.error) return res.status(404).json({error: result.error});
            return res.status(200).json({
                message: result.message
            });
        }
        catch(error){
            console.error(error);
            return res.status(500).json({error: 'Error al eliminar el recurso'});
        }
    }
}