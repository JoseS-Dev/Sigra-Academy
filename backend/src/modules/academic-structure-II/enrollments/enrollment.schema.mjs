import {z} from 'zod';

// Esquema de validación para la creación de una inscripcion de un estudiante a una sección
const EnrollmentSchema = z.object({
    student_user_id: z.number().int().positive(),
    section_id: z.number().int().positive(),
    status: z.enum(['active', 'dropped', 'completed']).optional()
});

// Función que valida los datos de inscripcion de un estudiante en una sección
export function validateEnrollment(data){
    return EnrollmentSchema.safeParse(data);
}

// Función que valida los datos de actualización de una inscripcion
export function validateEnrollmentUpdate(data){
    return EnrollmentSchema.partial().safeParse(data);
}

