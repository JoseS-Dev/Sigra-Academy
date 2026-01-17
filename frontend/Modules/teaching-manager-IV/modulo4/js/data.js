// Configuración mínima del frontend: solo usuarios actuales
// (Datos dinámicos se obtienen desde el backend mediante las APIs implementadas)

const currentUserProfesor = { id: 2, name: 'María González', role: 'profesor' };
const currentUserEstudiante = { id: 3, name: 'Luis Ramírez', role: 'estudiante', seccion: 'A' };

// URL base del backend (cambiar si el servidor está en otra URL/puerto)
const API_BASE = 'http://localhost:4300/api';

// Exponer flag para mostrar UI de desarrollo solo en entornos locales
const IS_LOCALHOST = ['localhost','127.0.0.1'].includes(location.hostname);
window.__SHOW_DEV_UI__ = !!(IS_LOCALHOST || window.__DEBUG || false);

// Hacemos accesibles las variables como globals para scripts no módulo
window.currentUserProfesor = currentUserProfesor;
window.currentUserEstudiante = currentUserEstudiante;
window.API_BASE = API_BASE;

// Helper para llamadas API con manejo de errores y validación de JSON
window._backend_offline = false;
window._backend_offline_notified = false;
window._showBackendOfflineBanner = () => {
    if(window._backend_offline_notified) return;
    window._backend_offline_notified = true;
    // Do not create or show any visual banner. Log only to console per project requirement.
    if(window.__SHOW_DEV_UI__){
        console.warn('Aviso: el servidor no responde. Algunas funciones pueden no estar disponibles. (UI suppressed)');
    } else {
        console.warn('El servidor no está disponible. Consulte los logs de la consola. (UI suppressed)');
    }
};

// Helper: quick health check against server root /_health. Returns true/false
window.checkBackendHealth = async (timeout = 3000) => {
    const healthUrl = (window.API_BASE || 'http://localhost:4300/api').replace(/\/api$/, '') + '/_health';
    try{
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        const res = await fetch(healthUrl, { method: 'GET', signal: controller.signal });
        clearTimeout(id);
        return res && res.ok && String(await res.text()).trim().toLowerCase() === 'ok';
    }catch(e){ return false; }
};
window.apiFetch = async (pathOrUrl, options = {}) => {
    const url = (typeof pathOrUrl === 'string' && pathOrUrl.startsWith('http')) ? pathOrUrl : `${API_BASE}${pathOrUrl}`;
    try{
        const res = await fetch(url, options);
        const text = await res.text();
        if(!res.ok){
            const msg = `HTTP ${res.status} - ${text || res.statusText}`;
            throw new Error(msg);
        }
        if(!text) return {};
        try{ return JSON.parse(text); }
        catch(e){ throw new Error('Invalid JSON response from ' + url); }
    }catch(err){
        // If network error (server down / connection refused) provide a friendlier message
        const m = (err && err.message) ? err.message.toLowerCase() : '';
        if(m.includes('failed to fetch') || m.includes('network') || m.includes('econnrefused')){
            window._backend_offline = true;
            window._showBackendOfflineBanner();
            // For non-dev environments avoid exposing internal endpoints and stack/details
            if(window.__SHOW_DEV_UI__){
                throw new Error(`No se pudo conectar con el servidor (${API_BASE}). Verifique que el backend esté ejecutándose.`);
            }
            throw new Error('El servidor no está disponible. Intente de nuevo más tarde.');
        }
        throw new Error(err.message || 'Network error');
    }
};

// Small modal helper utilities used across modules
window.showMessageModal = (title, message, okText='Aceptar') => {
    return new Promise(resolve => {
        // If backend is already flagged as offline, suppress showing error modals in the UI
        // (log to console instead). This prevents exposing DB/connectivity errors to users.
        try{
            if(window._backend_offline && title && String(title).toLowerCase() === 'error'){
                console.error('Suppressed UI error modal while backend offline:', message);
                resolve(true);
                return;
            }
        }catch(e){ /* ignore */ }
        // Create overlay
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.inset = '0';
        overlay.style.background = 'rgba(0,0,0,0.35)';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.zIndex = 9999;
        overlay.innerHTML = `
            <div style="background:white; padding:22px; border-radius:12px; width:420px; max-width:90%; box-shadow:0 8px 30px rgba(0,0,0,0.15);">
                <h3 style="margin-top:0; margin-bottom:8px; color:#123E6A;">${title}</h3>
                <div style="color:#333; margin-bottom:18px;">${message}</div>
                <div style="display:flex; justify-content:flex-end; gap:10px;">
                    <button id="modal-ok-btn" style="background:#0B57A4; color:white; border:none; padding:8px 14px; border-radius:8px; cursor:pointer;">${okText}</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        overlay.querySelector('#modal-ok-btn').addEventListener('click', () => { document.body.removeChild(overlay); resolve(true); });
    });
};

window.showInputModal = (title, labelText = '', placeholder = '', validator = (v)=>true, initialValue = '') => {
    return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.inset = '0';
        overlay.style.background = 'rgba(0,0,0,0.35)';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.zIndex = 9999;
        overlay.innerHTML = `
            <div style="background:white; padding:22px; border-radius:12px; width:440px; max-width:96%; box-shadow:0 8px 30px rgba(0,0,0,0.15);">
                <h3 style="margin-top:0; margin-bottom:8px; color:#123E6A;">${title}</h3>
                <div style="margin-bottom:12px; color:#333;">${labelText}</div>
                <input id="modal-input-field" placeholder="${placeholder}" style="width:100%; padding:8px 10px; border-radius:6px; border:1px solid #ddd; margin-bottom:10px;" />
                <div id="modal-error" style="color:#C52B3D; font-size:0.9rem; display:none; margin-bottom:8px;"></div>
                <div style="display:flex; justify-content:flex-end; gap:8px;">
                    <button id="modal-cancel" style="background:#e6eef9; color:#0b57a4; border:none; padding:8px 14px; border-radius:8px; cursor:pointer;">Cancelar</button>
                    <button id="modal-accept" style="background:#0B57A4; color:white; border:none; padding:8px 14px; border-radius:8px; cursor:pointer;">Aceptar</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        const input = overlay.querySelector('#modal-input-field');
        input.value = initialValue || '';
        const err = overlay.querySelector('#modal-error');
        overlay.querySelector('#modal-cancel').addEventListener('click', () => { document.body.removeChild(overlay); resolve(null); });
        overlay.querySelector('#modal-accept').addEventListener('click', () => {
            const val = input.value.trim();
            const v = validator(val);
            if(v === true){ document.body.removeChild(overlay); resolve(val); }
            else { err.style.display = 'block'; err.textContent = (typeof v === 'string') ? v : 'Valor inválido'; }
        });
        input.addEventListener('keydown', (e) => { if(e.key === 'Enter') overlay.querySelector('#modal-accept').click(); });
        input.focus();
    });
};

// Styled confirm modal that returns true/false
window.showConfirmModal = (title, message, acceptText='Aceptar', cancelText='Cancelar') => {
    return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.inset = '0';
        overlay.style.background = 'rgba(0,0,0,0.35)';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.zIndex = 9999;
        overlay.innerHTML = `
            <div style="background:white; padding:22px; border-radius:12px; width:420px; max-width:90%; box-shadow:0 8px 30px rgba(0,0,0,0.15);">
                <h3 style="margin-top:0; margin-bottom:8px; color:#123E6A;">${title}</h3>
                <div style="color:#333; margin-bottom:18px;">${message}</div>
                <div style="display:flex; justify-content:flex-end; gap:10px;">
                    <button id="modal-cancel-btn" style="background:#e6eef9; color:#0b57a4; border:none; padding:8px 14px; border-radius:8px; cursor:pointer;">${cancelText}</button>
                    <button id="modal-accept-btn" style="background:#C52B3D; color:white; border:none; padding:8px 14px; border-radius:8px; cursor:pointer;">${acceptText}</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        overlay.querySelector('#modal-cancel-btn').addEventListener('click', () => { document.body.removeChild(overlay); resolve(false); });
        overlay.querySelector('#modal-accept-btn').addEventListener('click', () => { document.body.removeChild(overlay); resolve(true); });
    });
};