import express,{json} from "express";
import cors from "cors";
import morgan from "morgan";
import { SETTINGS } from "./config/settings.config.mjs";
import { registerRoutes } from "./src/core/utils/function.util.mjs";
import { ListRoutes } from "./src/api/routes/api.routes.mjs";
import { activityNotifierMiddleware } from "./src/api/middlewares/email.middleware.mjs";



// Se inicializan el servidor express
const app = express();


app.use(cors());
app.use(json());
app.use(morgan("dev"));
app.use(activityNotifierMiddleware);

app.use('/uploads', express.static('uploads'));

// Registro de rutas
registerRoutes(app, ListRoutes);

// Servidor escuchando en el puerto configurado
app.listen(SETTINGS.PORT, () => {
    console.log(`Servidor ejecutándose en el puerto ${SETTINGS.PORT}`);
});

