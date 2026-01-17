import {createConnection} from 'mysql2/promise.js'
import { SETTINGS } from '../config/settings.config.mjs'

export const db = await createConnection({
    host: SETTINGS.DB_HOST,
    user: SETTINGS.DB_USER,
    password: SETTINGS.DB_PASSWORD,
    database: SETTINGS.DB_NAME,
    port: SETTINGS.DB_PORT,
    decimalNumbers: true
});