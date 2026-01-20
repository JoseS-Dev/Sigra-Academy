import { db } from '../../../../database/db.database.mjs'

// Consultas de asignaciones de profesor para módulo 1 (access control)
export class TeacherAssignmentAccessModel {
  // Obtener todas las asignaciones con detalle de materia y sección
  static async getAll() {
    const [rows] = await db.query(
      `SELECT ta.assignment_id,
              ta.teacher_user_id,
              CONCAT(u.first_name, ' ', u.last_name) AS teacher_name,
              ta.subject_id, s.subject_name,
              ta.section_id, sec.section_name, g.grade_name,
              ay.name AS academic_year
       FROM teacher_assignments ta
       JOIN users u ON ta.teacher_user_id = u.user_id
       JOIN subjects s ON ta.subject_id = s.subject_id
       JOIN sections sec ON ta.section_id = sec.section_id
       JOIN grades g ON sec.grade_id = g.grade_id
       JOIN academic_years ay ON sec.academic_year_id = ay.year_id`
    )

    if (rows.length === 0) return { error: 'No hay asignaciones registradas' }
    return { message: 'Asignaciones obtenidas exitosamente', assignments: rows }
  }

  // Obtener asignaciones de un profesor por user_id
  static async getByUserId(userId) {
    if (!userId) return { error: 'El ID del profesor es requerido' }

    const [teacher] = await db.query(`SELECT * FROM users WHERE user_id = ?`, [userId])
    if (teacher.length === 0) return { error: 'Profesor no encontrado' }

    const [rows] = await db.query(
      `SELECT ta.assignment_id,
              ta.teacher_user_id,
              CONCAT(u.first_name, ' ', u.last_name) AS teacher_name,
              ta.subject_id, s.subject_name,
              ta.section_id, sec.section_name, g.grade_name,
              ay.name AS academic_year
       FROM teacher_assignments ta
       JOIN users u ON ta.teacher_user_id = u.user_id
       JOIN subjects s ON ta.subject_id = s.subject_id
       JOIN sections sec ON ta.section_id = sec.section_id
       JOIN grades g ON sec.grade_id = g.grade_id
       JOIN academic_years ay ON sec.academic_year_id = ay.year_id
       WHERE ta.teacher_user_id = ?`,
      [userId]
    )

    if (rows.length === 0) return { error: 'No se encontraron asignaciones para este profesor' }
    return { message: 'Asignaciones del profesor obtenidas exitosamente', assignments: rows }
  }
}
