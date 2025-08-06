document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('formulario');

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const dni = document.getElementById('POST-dni').value.trim();
        const nombre = document.getElementById('POST-name').value.trim();
        const apellido = document.getElementById('POST-surname').value.trim();
        const telefono = document.getElementById('POST-number').value.trim();

        if (!dni || !nombre || !apellido || !telefono) {
            mostrarError('Por favor completá todos los campos.');
            return;
        }

        if (!/^\d{7,8}$/.test(dni)) {
            mostrarError('El DNI debe tener solo números y tener entre 7 y 8 dígitos.');
            return;
        }

        if (!/^\d{6,15}$/.test(telefono)) {
            mostrarError('El número de teléfono debe tener entre 6 y 15 dígitos.');
            return;
        }

        const data = { dni, nombre, apellido, telefono };
        const submitBtn = form.querySelector('input[type="submit"]');
        const originalText = submitBtn.value;
        submitBtn.disabled = true;
        submitBtn.value = 'Enviando...';

        try {
            const response = await fetch('/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (response.ok) {
                const userData = await response.json();

                localStorage.setItem('user', JSON.stringify({
                    id: userData.id,
                    nombre: userData.nombre,
                    apellido: userData.apellido,
                    jugadas: []
                }));

                mostrarExito('Registro Exitoso. Redirigiendo...');

                form.reset();

                setTimeout(() => {
                    window.location.href = 'categories.html';
                }, 1500);

            } else {
                const error = await response.json();
                mostrarError('Error en registro: ' + (error.message || 'Error desconocido'));
            }
        } catch (err) {
            mostrarError('Error de conexión: ' + err.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.value = originalText;
        }
    });

    // Funciones de mensaje
    function mostrarError(mensaje) {
        limpiarMensajes();
        const mensajeDiv = document.createElement('div');
        mensajeDiv.className = 'mensaje-error';
        mensajeDiv.style.cssText = `
            background-color: #f8d7da;
            color: #721c24;
            padding: 12px;
            border: 1px solid #f5c6cb;
            border-radius: 6px;
            margin: 15px 0;
            text-align: center;
            font-weight: 500;
            animation: slideIn 0.3s ease-out;
        `;
        mensajeDiv.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ${mensaje}`;
        document.getElementById('formulario').appendChild(mensajeDiv);

        setTimeout(() => {
            if (mensajeDiv.parentNode) {
                mensajeDiv.style.animation = 'slideOut 0.3s ease-in';
                setTimeout(() => mensajeDiv.remove(), 300);
            }
        }, 6000);
    }

    function mostrarExito(mensaje) {
        limpiarMensajes();
        const mensajeDiv = document.createElement('div');
        mensajeDiv.className = 'mensaje-exito';
        mensajeDiv.style.cssText = `
            background-color: #d4edda;
            color: #155724;
            padding: 12px;
            border: 1px solid #c3e6cb;
            border-radius: 6px;
            margin: 15px 0;
            text-align: center;
            font-weight: 500;
            animation: slideIn 0.3s ease-out;
        `;
        mensajeDiv.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${mensaje}`;
        document.getElementById('formulario').appendChild(mensajeDiv);
    }

    function limpiarMensajes() {
        const mensajes = document.querySelectorAll('.mensaje-error, .mensaje-exito, .mensaje-info');
        mensajes.forEach(mensaje => mensaje.remove());
    }

    // Animaciones
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideOut {
            from { opacity: 1; transform: translateY(0); }
            to { opacity: 0; transform: translateY(-10px); }
        }
    `;
    document.head.appendChild(style);
});
