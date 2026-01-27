import {db} from '../../../../database/db.database.mjs';

// Modelo que interactua con la tabla enrollments de la base de datos
export class EnrollmentModel {
    // Método para obtener todas las incripciones
    static async getAllEnrollments(){
        const [enrollments] = await db.query(
            `SELECT e.enrollment_id, CONCAT(u.first_name, ' ', u.last_name) AS student_name,
            u.email, sec.section_name, g.grade_name, ay.name AS academic_year, e.status
            FROM enrollments e JOIN users u ON e.student_user_id = u.user_id
            JOIN sections sec ON e.section_id = sec.section_id
            JOIN grades g ON sec.grade_id = g.grade_id
            JOIN academic_years ay ON sec.academic_year_id = ay.year_id`
        );
        if(enrollments.length === 0) return {error: 'No se encontraron inscripciones.'};
        return {
            message: 'Inscripciones obtenidas exitosamente.',
            enrollments: enrollments
        }
    }

    // Método para obtener todas las incripciones de una sección especifica
    static async getEnrollmentsBySection(sectionId){
        if(!sectionId) return {error: 'El ID de la sección es requerido.'};
        // Se verifica que exista la sección
        const [existingSection] = await db.query(
            `SELECT sec.*, g.grade_name, ay.name AS academic_year FROM sections sec
            JOIN grades g ON sec.grade_id = g.grade_id
            JOIN academic_years ay ON sec.academic_year_id = ay.year_id
            WHERE sec.section_id = ?`,
            [sectionId]
        );
        if(existingSection.length === 0) return {error: 'La sección no existe.'};
        // Si existe, se obtienen las incripciones
        const [enrollments] = await db.query(
            `SELECT e.enrollment_id, CONCAT(u.first_name, ' ', u.last_name) AS student_name,
            u.email, sec.section_name, g.grade_name, ay.name AS academic_year, e.status
            FROM enrollments e JOIN users u ON e.student_user_id = u.user_id
            JOIN sections sec ON e.section_id = sec.section_id
            JOIN grades g ON sec.grade_id = g.grade_id
            JOIN academic_years ay ON sec.academic_year_id = ay.year_id
            WHERE e.section_id = ?`,
            [sectionId]
        );
        if(enrollments.length === 0) return {error: 'No se encontraron inscripciones para esta sección.'};
        return {
            message: `Incripciones de la sección ${existingSection[0].section_name} del grado ${existingSection[0].grade_name} del año académico ${existingSection[0].academic_year} obtenidas exitosamente.`,
            enrollments: enrollments
        }
    }

    // Método para obtener una incripcion por su ID
    static async getEnrollmentById(enrollmentId){
        if(!enrollmentId) return {error: 'El ID de la inscripcion es requerido.'};
        const [enrollment] = await db.query(
            `SELECT e.enrollment_id, CONCAT(u.first_name, ' ', u.last_name) AS student_name,
            u.email, sec.section_name, g.grade_name, ay.name AS academic_year, e.status,
            sub.subject_name FROM enrollments e JOIN users u ON e.student_user_id = u.user_id
            JOIN sections sec ON e.section_id = sec.section_id
            JOIN grades g ON sec.grade_id = g.grade_id
            JOIN academic_years ay ON sec.academic_year_id = ay.year_id
            LEFT JOIN subjects sub ON g.grade_id = sub.grade_id
            WHERE e.enrollment_id = ?`,
            [enrollmentId]
        );
        if(enrollment.length === 0) return {error: 'La inscripcion no existe.'};
        return {
            message: 'Inscripcion obtenida exitosamente.',
            enrollment: enrollment[0]
        }
    }

    // Método para cambiar el estado de una inscripcion academica
    static async updateEnrollmentStatus(enrollmentId, status){
        if(!enrollmentId || !status) return {error: 'El ID de la inscripcion y el estado son requeridos.'};

        // Se verifica que exista la incripcion
        const [existingEnrollment] = await db.query(
            `SELECT * FROM enrollments WHERE enrollment_id = ?`,
            [enrollmentId]
        );
        if(existingEnrollment.length === 0) return {error: 'La inscripcion no existe.'};
        // Si existe, se actualiza el estado
        const [updatedEnrolment] = await db.query(
            `UPDATE enrollments SET status = ? WHERE enrollment_id = ?`,
            [status, enrollmentId]
        );
        if(updatedEnrolment.affectedRows === 0) return {error: 'No se pudo actualizar el estado de la inscripcion.'};
        return {
            message: 'Estado de la inscripcion actualizado exitosamente.',
        }
    }

    // Método para obtener las inscripciones por su estado
    static async getEnrollmentByStatus(status){
        if(!status) return {error: 'El estado es requerido.'};
        const [enrollments] = await db.query(
            `SELECT e.enrollment_id, CONCAT(u.first_name, ' ', u.last_name) AS student_name,
            u.email, sec.section_name, g.grade_name, ay.name AS academic_year
            FROM enrollments e JOIN users u ON e.student_user_id = u.user_id
            JOIN sections sec ON e.section_id = sec.section_id
            JOIN grades g ON sec.grade_id = g.grade_id
            JOIN academic_years ay ON sec.academic_year_id = ay.year_id
            WHERE e.status = ?`,
            [status]
        );
        if(enrollments.length === 0) return {error: 'No se encontraron inscripciones con este estado.'};
        return {
            message: `Inscripciones con estado ${status} obtenidas exitosamente.`,
            enrollments: enrollments
        }
    }

    // Método para crear una nueva inscripción
    static async createEnrollment(data){
        if(!data) return {error: 'Los datos de la inscripción son requeridos.'};
        const {student_user_id, section_id} = data;
        // Se verifica que exista el estudiante y la sección
        const [existingEnrollment] = await db.query(
            `SELECT * FROM enrollments WHERE student_user_id = ?
            AND section_id = ?`,
            [student_user_id, section_id]
        );
        if(existingEnrollment.length > 0) return {error: 'El estudiante ya está inscrito en esta sección.'};
        // Antes de crear la inscripción, se verifica que la sección no haya alcanzado su capacidad maxima
        const [section] = await db.query(
            `SELECT * FROM sections WHERE section_id = ?`,
            [section_id]
        );
        if(section[0].number_of_students >= section[0].capacity){
            return {error: 'La sección ha alcanzado su capacidad máxima de estudiantes.'};
        }
        // Si no ha alcanzado la capacidad, se crea la inscripción
        const [newEnrollment] = await db.query(
            `INSERT INTO enrollments (student_user_id, section_id)
            VALUES (?, ?)`, [student_user_id, section_id]
        );
        // Se actualiza el número de estudiantes inscritos en la sección
        const [updatedSection] = await db.query(
            `UPDATE sections SET number_of_students = number_of_students + 1
            WHERE section_id = ?`,
            [section_id]
        );
        if(newEnrollment.affectedRows === 0) return {error: 'No se pudo crear la inscripción.'};
        return {
            message: 'Inscripción creada exitosamente.',
            enrollmentId: newEnrollment.insertId
        }
    }

    // Método para eliminar una inscripción
    static async deleteEnrollment(enrollmentId){
        if(!enrollmentId) return {error: 'El ID de la inscripción es requerido.'};
        // Se verifica que exista la inscripción
        const [existingEnrollment] = await db.query(
            `SELECT * FROM enrollments WHERE enrollment_id = ?`,
            [enrollmentId]
        );
        if(existingEnrollment.length === 0) return {error: 'La inscripción no existe.'};
        // Si existe, se elimina la incripción
        const [deletedEnrollment] = await db.query(
            `DELETE FROM enrollments WHERE enrollment_id = ?`,
            [enrollmentId]
        );
        // Se actualiza el número de estudiantes inscritos en la sección
        const [updatedSection] = await db.query(
            `UPDATE sections SET number_of_students = number_of_students - 1
            WHERE section_id = ?`,
            [existingEnrollment[0].section_id]
        );
        if(deletedEnrollment.affectedRows === 0) return {error: 'No se pudo eliminar la inscripción.'};
        return {
            message: 'Inscripción eliminada exitosamente.',
            student_user_id: existingEnrollment[0].student_user_id
        }
    }
}