import { db } from '../../../database/db.database.mjs'

export async function getUser(userId) {
	if (!userId) return null
	const query = `SELECT user_id, role_id, first_name, last_name, email, phone, is_active, created_at, updated_at FROM users WHERE user_id = ? LIMIT 1`;
	try {
		const [rows] = await db.execute(query, [userId]);
		if (!rows || rows.length === 0) return null
		return rows[0]
	} catch (error) {
		throw error
	}
}

export async function getUserByName(name) {
	if (!name) return null
	const like = `%${name}%`
	const query = `SELECT user_id, role_id, first_name, last_name, email, phone, is_active, created_at, updated_at FROM users WHERE first_name LIKE ? OR last_name LIKE ? LIMIT 1`;
	try {
		const [rows] = await db.execute(query, [like, like]);
		if (!rows || rows.length === 0) return null
		return rows[0]
	} catch (error) {
		throw error
	}
}

export async function getUserByEmail(email) {
	if (!email) return null
	const query = `SELECT user_id, role_id, first_name, last_name, email, phone, password_hash, is_active, created_at, updated_at FROM users WHERE email = ? LIMIT 1`;
	try {
		const [rows] = await db.execute(query, [email]);
		if (!rows || rows.length === 0) return null
		return rows[0]
	} catch (error) {
		throw error
	}
}

export async function getUserRoleById(userId) {
	if (userId == null) return null
	const query = `SELECT user_id, role_id, first_name, last_name FROM users WHERE user_id = ? LIMIT 1`;
	try {
		const [rows] = await db.execute(query, [userId]);
		if (!rows || rows.length === 0) return null
		return rows[0]
	} catch (error) {
		throw error
	}
}


export async function getAllUsers() {
	const query = `SELECT first_name, role_id, last_name, email AS mail, is_active FROM users`;
	try {
		const [rows] = await db.execute(query);
		return rows || []
	} catch (error) {
		throw error
	}
}


export async function createUser({ email, first_name, last_name, phone, password_hash }) {
	if (!email || !first_name || !last_name || !password_hash) return null

	try {
		// Obtener el último user_id y sumar 1 (según requisito)
		const [maxRows] = await db.execute('SELECT MAX(user_id) AS maxid FROM users');
		const maxId = (maxRows && maxRows[0] && maxRows[0].maxid) ? Number(maxRows[0].maxid) : 0;
		const newId = maxId + 1;

		// Campos requeridos en la tabla: role_id y password_hash son NOT NULL.
		// Asignamos un role por defecto (3 = student).
		const roleId = 3;

		// Formatear fechas para MySQL DATETIME/TIMESTAMP
		const now = new Date();
		const pad = (n) => String(n).padStart(2, '0');
		const mysqlDate = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

		const insertQuery = `INSERT INTO users (user_id, role_id, first_name, last_name, email, phone, password_hash, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
		const params = [newId, roleId, first_name, last_name, email, phone || '', password_hash, 1, mysqlDate, mysqlDate];

		await db.execute(insertQuery, params);

		// Devolver el nuevo usuario (fetch de la fila insertada)
		const [rows] = await db.execute('SELECT user_id, role_id, first_name, last_name, email, phone, is_active, created_at, updated_at FROM users WHERE user_id = ? LIMIT 1', [newId]);
		if (!rows || rows.length === 0) return null
		return rows[0]
	} catch (error) {
		throw error
	}
}

export default { getUser, getUserByName, getUserByEmail, getUserRoleById, getAllUsers, createUser }
