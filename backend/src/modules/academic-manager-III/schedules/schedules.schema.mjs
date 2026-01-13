import {z} from 'zod';

// Esquema para crear o actualizar un horario
const ScheduleSchema = z.object({
    assignment_id: z.number().int().positive(),
    day_of_week: z.enum(['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']),
    start_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)'),
    end_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)'),
    classroom: z.string().max(50)
});

// Función para validar datos al crear un horario
export function validateSchedule(data){
    return ScheduleSchema.safeParse(data);
}

// Función para validar datos al actualizar un horario
export function validateUpdateSchedule(data){
    return ScheduleSchema.partial().safeParse(data);
}