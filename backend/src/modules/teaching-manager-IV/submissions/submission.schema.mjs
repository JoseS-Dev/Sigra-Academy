import {z} from "zod";

// Esquema de validación para la creación de una entrega de una actividad
const createSubmissionSchema = z.object({
    activity_id: z.number().int().positive(),
    student_user_id: z.number().int().positive(),
    file_path: z.string().min(1).max(500),
    comments: z.string().max(1000).optional()
});

// Esquema de validación para la actualización de una entrega de una actividad
const updateSubmissionSchema = z.object({
    file_path: z.string().min(1).max(500).optional(),
    comments: z.string().max(1000).optional()
});

// Función para validar los datos de creación de una entrega
export function validateCreateSubmission(data) {
    return createSubmissionSchema.safeParse(data);
}

// Función para validar los datos de actualización de una entrega
export function validateUpdateSubmission(data) {
    return updateSubmissionSchema.partial().safeParse(data);
}