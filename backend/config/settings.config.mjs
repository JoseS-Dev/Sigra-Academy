import dotenv from 'dotenv';
dotenv.config();

// Configuraciones generales
export const SETTINGS = {
    PORT: process.env.PORT || 3000,
    DB_HOST: process.env.DB_HOST || 'localhost',
    DB_USER: process.env.DB_USER || 'root',
    DB_PASSWORD: process.env.DB_PASSWORD || '*hola/555/hawai*',
    DB_NAME: process.env.DB_NAME || 'sigra_academy',
    DB_PORT: process.env.DB_PORT || 3306,
    JWT_SECRET: process.env.JWT_SECRET || 'YOUR_SECRET_KEY',
    BASE_PATH: process.env.BASE_PATH || '/api',
    MAIL_FROM: process.env.MAIL_FROM || '"Sigra Academy" <no-reply@sigra.local>',
    MAIL_HOST: process.env.MAIL_HOST || 'smtp.example.com',
    MAIL_PORT: process.env.MAIL_PORT ? parseInt(process.env.MAIL_PORT) : 587,
    MAIL_USER: process.env.MAIL_USER || 'user@example.com',
    MAIL_PASSWORD: process.env.MAIL_PASSWORD || 'yourpassword',
    APP_URL: process.env.APP_URL || 'http://localhost:3000',
}