document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('formulario');
    const errorMessageDiv = document.getElementById('error-message');
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        errorMessageDiv.textContent = '';
        const email = document.getElementById('email').value;
        const current_password = document.getElementById('current_password').value;
        const new_password = document.getElementById('new_password').value;
        try {
            const response = await fetch('/fiscalizadores/cambiar-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    current_password: current_password,
                    new_password: new_password
                })
            });
            const result = await response.json();
            if (response.ok) { 
                alert('¡Contraseña cambiada con éxito!');
                window.location.href = '/loginpanel.html';
            } else {
                errorMessageDiv.textContent = result.error || 'Ocurrió un error inesperado.';
            }
        } catch (error) {
            console.error('Error en la petición:', error);
            errorMessageDiv.textContent = 'No se pudo conectar con el servidor. Inténtalo más tarde.';
        }
    });
});