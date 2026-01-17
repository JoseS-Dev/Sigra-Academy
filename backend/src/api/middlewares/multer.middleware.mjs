import multer from "multer";
import path from "path";
import fs from "fs";
import { acceptedDocuments, acceptedImages, acceptedVideos } from "../../core/utils/resources.util.mjs";

// Función para las configuraciones de Multer
export function configureMulter(directory){
    // Se verifica si existe el directorio
    if(!fs.existsSync(directory)){
        fs.mkdirSync(directory, {recursive: true});
    }
    // Configuración del almacenamiento
    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, directory);
        },
        filename: (req, file, cb) => {
            cb(null, file.originalname)
        }
    })
    return multer({
        storage: storage,
        limits: {fileSize: 12 * 1024 * 1024}, // Limite de 12MB
        fileFilter: (req, file, cb) => {
            const ext = path.extname(file.originalname).toLowerCase();
            if(!acceptedImages.includes(ext) && !acceptedVideos.includes(ext) && 
            !acceptedDocuments.includes(ext)){
                return cb(new Error('Solo se permiten archivos de imagen, video o documento'));
            }
            cb(null, true);
        }
    });
}

const uploadSubmission = path.resolve('uploads/submissions');
const multerSubmission = configureMulter(uploadSubmission);
export const submissionUploadMiddleware = multerSubmission.single('file_path');

const uploadResources = path.resolve('uploads/resources');
const multerResources = configureMulter(uploadResources);
export const resourceUploadMiddleware = multerResources.single('file_path_or_url');
