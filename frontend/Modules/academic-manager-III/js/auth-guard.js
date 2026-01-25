(async function () {
    const token = localStorage.getItem('sigra_token');
    
    if (!token) {
        window.location.href = '../../access-control-I/login.html';
        return;
    }

    try {
        // Opcional: Preguntar al backend si el token sigue siendo válido
        const response = await fetch('http://localhost:5200/api/auth/verify-auth', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error("Token expirado");
        }
    } catch (error) {
        localStorage.clear(); // Limpiar todo si el token no sirve
        window.location.href = '../../access-control-I/login.html';
    }
})();