import { db } from "../../../../database/db.database.mjs";
import fs from 'fs';
// Modelo que interactúa con la tabla course_resources de la base de datos
export class ResourceModel {
    // Método para obtener todos los recursos de una asignación especifico
    static async getResourcesByAssignment(assignmentId){
        if(!assignmentId) return {error: 'El ID de la asignación es requerido'};
        // Se verifica si existe la asignación
        const [existingAssignment] = await db.query(
            `SELECT * FROM teacher_assignments WHERE assignment_id = ?`,
            [assignmentId]
        );
        if(existingAssignment.length === 0) return {error: 'La asignación no existe'};
        // Si existe, se obtienen los recursos asociados
        const [resources] = await db.query(
            `SELECT res.*, s.subject_name FROM course_resources res
            JOIN teacher_assignments ta ON res.assignment_id = ta.assignment_id
            JOIN subjects s ON ta.subject_id = s.subject_id WHERE res.assignment_id = ?`,
            [assignmentId]
        );
        if(resources.length === 0) return {message: 'No hay recursos para esta asignación'};
        return {
            message: 'Recursos obtenidos exitosamente',
            resources: resources
        }
    }

    // Método para obtener un recurso por su ID
    static async getResourceById(resourceId){
        if(!resourceId) return {error: 'El ID del recurso es requerido'};
        const [resource] = await db.query(
            `SELECT res.*, s.subject_name FROM course_resources res
            JOIN teacher_assignments ta ON res.assignment_id = ta.assignment_id
            JOIN subjects s ON ta.subject_id = s.subject_id
            WHERE res.resource_id = ?`,
            [resourceId]
        );
        if(resource.length === 0) return {error: 'El recurso no existe'};
        return {
            message: 'Recurso obtenido exitosamente',
            resource: resource[0]
        }
    }

    // Método para crear un nuevo recurso
    static async createResource(data){
        if(!data) return {error: 'Los datos del recurso son requeridos'};
        const {assignment_id, ...rest} = data;
        // Se verifica si existe la asignación
        const [existingAssignment] = await db.query(
            `SELECT * FROM teacher_assignments WHERE assignment_id = ?`,
            [assignment_id]
        );
        if(existingAssignment.length === 0) return {error: 'La asignación no existe'};
        // Además se verifica que no exista un recurso con el mismo título en la misma asignación
        const [existingResource] = await db.query(
            `SELECT * FROM course_resources WHERE assignment_id = ? AND title = ?`,
            [assignment_id, rest.title]
        );
        if(existingResource.length > 0) return {error: 'Ya existe un recurso con el mismo título en esta asignación'};
        // Si no existe, se crea el recurso
        const [result] = await db.query(
            `INSERT INTO course_resources (assignment_id, title, resource_type, file_path_or_url)
            VALUES (?, ?, ?, ?)`,
            [assignment_id, rest.title, rest.resource_type, rest.file_path_or_url]
        );
        if(result.affectedRows === 0) return {error: 'No se pudo crear el recurso'};
        // Se obtiene el recurso recién creado
        const [resource] = await db.query(
            `SELECT * FROM course_resources WHERE resource_id = ?`,
            [result.insertId]
        );
        if(resource.length === 0) return {error: 'No se pudo obtener el recurso creado'};
        return {
            message: 'Recurso creado exitosamente',
            resource: resource[0]
        }
    }

    // Método para actualizar un recurso existente
    static async updateResource(resourceId, data){
        if(!resourceId || !data) return {error: 'El ID del recurso y los datos son requeridos'};
        const allowedFields = ['title', 'resource_type', 'file_path_or_url'];
        const updatedToFields = {};
        for(const field of allowedFields){
            if(data[field] !== undefined){
                updatedToFields[field] = data[field];
            }
        }

        // Se verifica que exista el recurso
        const [existingResource] = await db.query(
            `SELECT * FROM course_resources WHERE resource_id = ?`,
            [resourceId]
        );
        if(existingResource.length === 0) return {error: 'El recurso no existe'};
        // Si existe, se procede a actualizarlo
        const fields = [];
        const values = [];

        Object.entries(updatedToFields).forEach(([key, value]) => {
            fields.push(`${key} = ?`);
            values.push(value);
        });
        values.push(resourceId); // Para el WHERE
        const [result] = await db.query(
            `UPDATE course_resources SET ${fields.join(', ')}, uploaded_at = NOW() WHERE resource_id = ?`,
            values
        );
        if(result.affectedRows === 0) return {error: 'No se pudo actualizar el recurso'};
        // Se obtiene el recurso actualizado
        const [resource] = await db.query(
            `SELECT * FROM course_resources WHERE resource_id = ?`,
            [resourceId]
        );
        return {
            message: 'Recurso actualizado exitosamente',
            resource: resource[0]
        }
    }

    // Método para eliminar un recurso existente
    static async deleteResource(resourceId){
        if(!resourceId) return {error: 'El ID del recurso es requerido'};
        // Se verifica que exista el recurso
        const [existingResource] = await db.query(
            `SELECT * FROM course_resources WHERE resource_id = ?`,
            [resourceId]
        );
        if(existingResource.length === 0) return {error: 'El recurso no existe'};
        // Si existe, se procede a eliminarlo
        const [result] = await db.query(
            `DELETE FROM course_resources WHERE resource_id = ?`,
            [resourceId]
        );
        if(result.affectedRows === 0) return {error: 'No se pudo eliminar el recurso'};
        // A su vez se borra el archivo que se creo en la carpeta uploads/resources
        const filePath = existingResource[0].file_path_or_url;
        fs.unlink(filePath, (err) => {
            if (err) {
                console.error('Error al eliminar el archivo:', err);
            }
        })
        return {
            message: 'Recurso eliminado exitosamente'
        }
    }
}