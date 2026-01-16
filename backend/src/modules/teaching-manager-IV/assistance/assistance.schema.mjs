import {z} from 'zod';

// Esquema de validación para el registro de asistencia de un estudiante a una asignación
const AssistanceSchema = z.object({
    student_user_id: z.number().int().positive(),
    assignment_id: z.number().int().positive()
});

// Función que valida los datos de asistencia de un estudiante a una asignación
export function validateAssistance(data){
    return AssistanceSchema.safeParse(data);
}