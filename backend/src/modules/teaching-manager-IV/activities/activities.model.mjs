import {db} from '../../../../database/db.database.mjs';

// Modelo que interactua con la tabla activities de la base de datos
export class ActivitiesModel {
    // Método para obtener todas las actividades de un curso especifico
    static async getActivitiesByAssignment(assignmentId){
        if(!assignmentId) return {error: 'El ID de la asignación es requerido'};
        // Se verifica si existe la asignación
        const [existingAssignment] = await db.query(
            `SELECT * FROM teacher_assignments WHERE assignment_id = ?`,
            [assignmentId]
        );
        if(existingAssignment.length === 0) return {error: 'La asignación no existe'};
        // Si existe, se obtienen las actividades asociadas
        const [activities] = await db.query(
            `SELECT act.*, s.subject_name, sec.section_name, CONCAT(t.first_name, ' ', t.last_name) AS teacher_name
            FROM activities act JOIN teacher_assignments ta ON act.assignment_id = ta.assignment_id
            JOIN subjects s ON ta.subject_id = s.subject_id
            JOIN sections sec ON ta.section_id = sec.section_id
            JOIN users t ON ta.teacher_user_id = t.user_id
            WHERE act.assignment_id = ?`,
            [assignmentId]
        );
        if(activities.length === 0) return {message: 'No hay actividades para esta asignación'};
        return {
            message: 'Actividades obtenidas exitosamente',
            activities: activities
        }
    }

    // Método para obtener una actividad por su ID
    static async getActivityById(activityId){
        if(!activityId) return {error: 'El ID de la actividad es requerido'};
        const [activity] = await db.query(
            `SELECT act.*, s.subject_name, sec.section_name, res.title, res.resource_type, res.file_path_or_url
            FROM activities act JOIN teacher_assignments ta ON act.assignment_id = ta.assignment_id
            JOIN subjects s ON ta.subject_id = s.subject_id
            JOIN sections sec ON ta.section_id = sec.section_id
            JOIN course_resources res ON ta.assignment_id = res.assignment_id
            WHERE act.activity_id = ?`,
            [activityId]
        );
        if(activity.length === 0) return {error: 'La actividad no existe'};
        return {
            message: 'Actividad obtenida exitosamente',
            activity: activity[0]
        }
    }

    // Método para cambiar el estado de visibilidad de una actividad
    static async toggleActivityVisibility(activityId, isVisible){
        if(!activityId || isVisible === undefined) return {error: 'El ID de la actividad y el estado de visibilidad son requeridos'};
        // Se verifica que exista la actividad
        const [existingActivity] = await db.query(
            `SELECT * FROM activities WHERE activity_id = ?`,
            [activityId]
        );
        if(existingActivity.length === 0) return {error: 'La actividad no existe'};
        // Si existe, se actualiza su visibilidad
        const [updatedActivity] = await db.query(
            `UPDATE activities SET is_visible = ? WHERE activity_id = ?`,
            [isVisible, activityId]
        );
        if(updatedActivity.affectedRows === 0) return {error: 'No se pudo actualizar la visibilidad de la actividad'};
        return {
            message: `Se ha ${isVisible ? 'mostrado' : 'ocultado'} la actividad exitosamente`
        }
    }

    // Método para crear una nueva actividad
    static async createActivity(data){
        if(!data) return {error: 'Los datos de la actividad son requeridos'};
        const {assignment_id, ...rest} = data;
        // Se verifica si existe la asignación
        const [existingAssignment] = await db.query(
            `SELECT * FROM teacher_assignments WHERE assignment_id = ?`,
            [assignment_id]
        );
        if(existingAssignment.length === 0) return {error: 'La asignación no existe'};
        // Además se verifica que no exista una actividad con el mismo nombre en la misma asignación
        const [existingActivity] = await db.query(
            `SELECT * FROM activities WHERE assignment_id = ? AND title = ?`,
            [assignment_id, rest.title]
        );
        if(existingActivity.length > 0) return {error: 'Ya existe una actividad con ese nombre en esta asignación'};
        // Si no existe, se crea la nueva actividad
        const [result] = await db.query(
            `INSERT INTO activities (assignment_id, title, description, weight_percentage, due_date)
            VALUES (?, ?, ?, ?, ?)`, [assignment_id, rest.title, rest.description, rest.weight_percentage, rest.due_date]
        );
        if(result.affectedRows === 0) return {error: 'No se pudo crear la actividad'};
        // Se obtiene la actividad creada
        const [newActivity] = await db.query(
            `SELECT * FROM activities WHERE activity_id = ?`,
            [result.insertId]
        );
        if(newActivity.length === 0) return {error: 'No se pudo obtener la actividad creada'};
        return {
            message: 'Actividad creada exitosamente',
            activity: newActivity[0]
        }
    }

    // Método para actualizar una actividad existente
    static async updateActivity(activityId, data){
        if(!activityId || !data) return {error: 'El ID de la actividad y los datos son requeridos'};
        const allowedFields = ['title', 'description', 'weight_percentage', 'due_date', 'is_active'];
        const updatedToFields = {};
        for(const field of allowedFields){
            if(data[field] !== undefined){
                updatedToFields[field] = data[field];
            }
        }
        // Se verifica que exista la actividad
        const [existingActivity] = await db.query(
            `SELECT * FROM activities WHERE activity_id = ?`,
            [activityId]
        );
        if(existingActivity.length === 0) return {error: 'La actividad no existe'};
        // Sie xiste, se procede a actualizarla
        const fields = [];
        const values = [];

        Object.entries(updatedToFields).forEach(([key, value]) => {
            fields.push(`${key} = ?`);
            values.push(value);
        });
        values.push(activityId); // Para la cláusula WHERE

        const [updatedActivity] = await db.query(
            `UPDATE activities SET ${fields.join(', ')} WHERE activity_id = ?`,
            values
        );
        if(updatedActivity.affectedRows === 0) return {error: 'No se pudo actualizar la actividad'};
        // Se obtiene la actividad actualizada
        const [activity] = await db.query(
            `SELECT * FROM activities WHERE activity_id = ?`,
            [activityId]
        );
        return {
            message: 'Actividad actualizada exitosamente',
            activity: activity[0]
        }
    }

    // Método para eliminar una actividad
    static async deleteActivity(activityId){
        if(!activityId) return {error: 'El ID de la actividad es requerido'};
        // Se verifica que exista la actividad
        const [existingActivity] = await db.query(
            `SELECT * FROM activities WHERE activity_id = ?`,
            [activityId]
        );
        if(existingActivity.length === 0) return {error: 'La actividad no existe'};
        // Si existe, se procede a eliminarla
        const [deletedActivity] = await db.query(
            `DELETE FROM activities WHERE activity_id = ?`,
            [activityId]
        );
        if(deletedActivity.affectedRows === 0) return {error: 'No se pudo eliminar la actividad'};
        return {
            message: 'Actividad eliminada exitosamente'
        }
    }
}