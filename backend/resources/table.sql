-- ==========================================
-- 1. CREACIÓN DE LA BASE DE DATOS
-- ==========================================
CREATE DATABASE IF NOT EXISTS sigra_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sigra_db;

-- ==========================================
-- MODULO 1: SEGURIDAD Y CONTROL DE ACCESOS (CORE)
-- ==========================================

-- Tabla de Roles (Normalización de roles)
CREATE TABLE roles (
    role_id INT AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE, -- Admin, Docente, Estudiante
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE permissions (
    permission_id INT AUTO_INCREMENT PRIMARY KEY,
    permission_name VARCHAR(100) NOT NULL UNIQUE, -- "manage_users", "view_grades"
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla intermedia Roles-Permisos (Many-to-Many)
CREATE TABLE role_permissions (
    role_id INT NOT NULL,
    permission_id INT NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(permission_id) ON DELETE CASCADE
);



-- Tabla Maestra de Usuarios (Entidad Fuerte)
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    role_id INT NOT NULL,
    national_id VARCHAR(20) NOT NULL UNIQUE, -- DNI, Cédula
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(12) NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- Almacenar hash, nunca texto plano
    national_parent_id INT,
    first_name_parent VARCHAR(100),
    last_name_parent VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE CASCADE
);

-- Tabla para Recuperación de Contraseñas
CREATE TABLE login_session (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    token VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ==========================================
-- MODULO 2: ESTRUCTURA ACADÉMICA (CEREBRO)
-- ==========================================

-- Años Académicos / Periodos (Ej: 2024-2025)
CREATE TABLE academic_years (
    year_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL, -- "Periodo 2024-2025"
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- Grados o Años de estudio (Ej: 1er Año, 2do Año)
CREATE TABLE grades (
    grade_id INT AUTO_INCREMENT PRIMARY KEY,
    grade_name VARCHAR(50) NOT NULL, -- "1er Año", "2do Año"
    level_order INT NOT NULL -- Para ordenar jerárquicamente (1, 2, 3...)
);

-- Secciones (Grupos de estudio vinculados a un Grado y un Año Académico)
CREATE TABLE sections (
    section_id INT AUTO_INCREMENT PRIMARY KEY,
    grade_id INT NOT NULL,
    academic_year_id INT NOT NULL,
    section_name VARCHAR(5) NOT NULL, -- "A", "B", "C"
    capacity INT DEFAULT 20, -- Cupos máximos
    number_of_students INT DEFAULT 0, -- Cantidad actual de estudiantes inscritos
    FOREIGN KEY (grade_id) REFERENCES grades(grade_id) ON DELETE CASCADE,
    FOREIGN KEY (academic_year_id) REFERENCES academic_years(year_id) ON DELETE CASCADE
);

-- Materias (Catálogo general)
CREATE TABLE subjects (
    subject_id INT AUTO_INCREMENT PRIMARY KEY,
    grade_id INT NOT NULL, -- Pertenece a la malla de un año específico
    subject_name VARCHAR(100) NOT NULL, -- "Matemáticas", "Historia"
    code_subject VARCHAR(140) NOT NULL,
    is_active BOOLEAN DEFAULT(TRUE), 
    description TEXT,
    FOREIGN KEY (grade_id) REFERENCES grades(grade_id) ON DELETE CASCADE
);

-- Prerrequisitos de Materias
CREATE TABLE subject_prerequisites(
    id INT AUTO_INCREMENT PRIMARY KEY,
    subject_id INT,
    subject_prerequisites_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(subject_id) ON DELETE CASCADE,
    FOREIGN KEY (subject_prerequisites_id) REFERENCES subjects(subject_id) ON DELETE CASCADE
);

-- Matricula / Inscripción (Vincula Estudiante -> Sección)
-- NOTA: Al insertar aquí, la lógica de negocio (Backend) debe saber que el estudiante
-- hereda todas las materias del grado de esa sección.
CREATE TABLE enrollments (
    enrollment_id INT AUTO_INCREMENT PRIMARY KEY,
    student_user_id INT NOT NULL,
    section_id INT NOT NULL,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('active', 'dropped', 'completed') DEFAULT 'active',
    FOREIGN KEY (student_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (section_id) REFERENCES sections(section_id) ON DELETE CASCADE,
    UNIQUE(student_user_id, section_id) -- Un estudiante solo en una sección por periodo
);

-- ==========================================
-- MODULO 3: CARGA ACADÉMICA Y HORARIOS
-- ==========================================

-- Asignación Docente (Mesa de tres patas: Docente + Materia + Sección)
-- Esta tabla representa "La clase real" donde ocurren las notas y tareas.
CREATE TABLE teacher_assignments (
    assignment_id INT AUTO_INCREMENT PRIMARY KEY,
    teacher_user_id INT NOT NULL,
    subject_id INT NOT NULL,
    section_id INT NOT NULL,
    FOREIGN KEY (teacher_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(subject_id) ON DELETE CASCADE,
    FOREIGN KEY (section_id) REFERENCES sections(section_id) ON DELETE CASCADE,
    UNIQUE(subject_id, section_id) -- Solo un profesor por materia en una sección específica
);

-- Horarios
CREATE TABLE schedules (
    schedule_id INT AUTO_INCREMENT PRIMARY KEY,
    assignment_id INT NOT NULL,
    day_of_week ENUM('Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes') NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    classroom VARCHAR(50), -- Aula física
    FOREIGN KEY (assignment_id) REFERENCES teacher_assignments(assignment_id) ON DELETE CASCADE
);

-- ==========================================
-- MODULO 4 Y 6: ACTIVIDADES Y RECURSOS
-- ==========================================

-- Actividades/Tareas creadas por el docente
CREATE TABLE activities (
    activity_id INT AUTO_INCREMENT PRIMARY KEY,
    assignment_id INT NOT NULL, -- Vinculado a la "Clase"
    title VARCHAR(150) NOT NULL,
    description TEXT,
    weight_percentage DECIMAL(5,2) NOT NULL, -- Ponderación (Ej: 20.00 %)
    due_date DATETIME,
    is_active BOOLEAN DEFAULT TRUE,
    is_visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assignment_id) REFERENCES teacher_assignments(assignment_id) ON DELETE CASCADE
);

-- Entregas de Estudiantes (Buzón)
CREATE TABLE submissions (
    submission_id INT AUTO_INCREMENT PRIMARY KEY,
    activity_id INT NOT NULL,
    student_user_id INT NOT NULL,
    file_path VARCHAR(255), -- Ruta del archivo subido archive/grade/section/subjects/activity/student
    submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    comments TEXT, -- Comentarios del alumno
    FOREIGN KEY (activity_id) REFERENCES activities(activity_id) ON DELETE CASCADE,
    FOREIGN KEY (student_user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Recursos Didácticos (Archivos de clase)
CREATE TABLE course_resources (
    resource_id INT AUTO_INCREMENT PRIMARY KEY,
    assignment_id INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    resource_type ENUM('PDF', 'Video') NOT NULL,
    file_path_or_url VARCHAR(255) NOT NULL, 
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assignment_id) REFERENCES teacher_assignments(assignment_id) ON DELETE CASCADE
);

-- Asistencia de Estudiantes
CREATE TABLE course_access_log(
    access_id INT AUTO_INCREMENT PRIMARY KEY,
    student_user_id INT NOT NULL,
    assignment_id INT NOT NULL,
    access_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (assignment_id) REFERENCES teacher_assignments(assignment_id) ON DELETE CASCADE
);
-- ==========================================
-- MODULO 5: CALIFICACIONES
-- ==========================================

-- Calificaciones por Actividad
CREATE TABLE grades_log (
    grade_id INT AUTO_INCREMENT PRIMARY KEY,
    activity_id INT NOT NULL,
    student_user_id INT NOT NULL,
    score DECIMAL(5,2) NOT NULL, -- Ej: 18.50
    feedback TEXT, -- Retroalimentación del docente
    graded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (activity_id) REFERENCES activities(activity_id) ON DELETE CASCADE,
    FOREIGN KEY (student_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE(activity_id, student_user_id) -- Solo una nota por actividad por alumno
);

-- ==========================================
-- MODULO 7: NOTIFICACIONES
-- ==========================================

CREATE TABLE notifications (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL, -- Destinatario
    title VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('generic', 'activity', 'warning', 'notification') DEFAULT 'notification',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);