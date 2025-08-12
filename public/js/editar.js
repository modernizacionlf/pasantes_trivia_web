document.addEventListener('DOMContentLoaded', function () {
    verificarSesion();

    const questionSelect = document.getElementById('questionSelect');
    const answersEditContainer = document.getElementById('answersEditContainer');
    const saveChangesBtn = document.getElementById('saveChangesBtn');
    const backBtn = document.getElementById('backBtn');

    let preguntasParaEditar = [];
    let nuevaImagenBase64 = null;

    async function verificarSesion() {
        try {
            const response = await fetch('/auth/verificar-sesion', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();
            if (!data.success) {
                window.location.href = '/login';
                return;
            }
            inicializarEditor();
        } catch (error) {
            console.error('Error verificando sesión:', error);
            window.location.href = '/login';
        }
    }

    function inicializarEditor() {
        const storedPreguntas = localStorage.getItem('preguntasParaEditar');
        if (storedPreguntas) {
            preguntasParaEditar = JSON.parse(storedPreguntas);
            if (preguntasParaEditar.length > 0) {
                preguntasParaEditar.forEach((pregunta, index) => {
                    const option = document.createElement('option');
                    option.value = index;
                    option.textContent = pregunta.texto;
                    questionSelect.appendChild(option);
                });
                mostrarCamposParaEditar();
            } else {
                answersEditContainer.innerHTML = '<p>No se han seleccionado preguntas para editar.</p>';
            }
        } else {
            console.error("¡ERROR! No se encontró 'preguntasParaEditar' en localStorage.");
        }

        questionSelect.addEventListener('change', mostrarCamposParaEditar);
        saveChangesBtn.addEventListener('click', guardarCambios);
        backBtn.addEventListener('click', () => {
            localStorage.removeItem('preguntasParaEditar');
            window.location.href = 'dashboard.html';
        });
    }
    function mostrarCamposParaEditar() {
        answersEditContainer.innerHTML = '';
        nuevaImagenBase64 = null;
        const selectedIndex = questionSelect.value;
        if (selectedIndex === "") return;
        const pregunta = preguntasParaEditar[parseInt(selectedIndex)];
        const imagenContainer = document.createElement('div');
        imagenContainer.className = 'imagen-container';
        const imagenLabel = document.createElement('label');
        imagenLabel.textContent = 'Imagen de la pregunta:';
        imagenContainer.appendChild(imagenLabel);
        const imgPreviewActual = document.createElement('img');
        imgPreviewActual.className = 'img-preview';
        imgPreviewActual.src = pregunta.imagen || 'https://placehold.co/800x600?text=Sin+imagen';
        imagenContainer.appendChild(imgPreviewActual);
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/png';
        const imgPreviewNueva = document.createElement('img');
        imgPreviewNueva.className = 'img-preview';
        imgPreviewNueva.style.display = 'none';
        fileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    nuevaImagenBase64 = e.target.result;
                    imgPreviewNueva.src = nuevaImagenBase64;
                    imgPreviewNueva.style.display = 'block';
                    imgPreviewActual.style.display = 'none';
                };
                reader.readAsDataURL(file);
            }
        });
        imagenContainer.appendChild(fileInput);
        imagenContainer.appendChild(imgPreviewNueva);
        if (pregunta.imagen) {
            const btnEliminarImagen = document.createElement('button');
            btnEliminarImagen.textContent = 'Eliminar imagen';
            btnEliminarImagen.type = 'button';
            btnEliminarImagen.addEventListener('click', () => {
                nuevaImagenBase64 = null;
                pregunta.imagen = null; 
                imgPreviewActual.src = 'https://placehold.co/800x600?text=Sin+imagen';
                imgPreviewActual.style.display = 'block';
                imgPreviewNueva.style.display = 'none';
                fileInput.value = '';
                btnEliminarImagen.style.display = 'none'; 
            });
            imagenContainer.appendChild(btnEliminarImagen);
        }
        answersEditContainer.appendChild(imagenContainer);
        const preguntaLabel = document.createElement('label');
        preguntaLabel.textContent = 'Texto de la pregunta:';
        const preguntaInput = document.createElement('input');
        preguntaInput.type = 'text';
        preguntaInput.id = 'preguntaTextInput';
        preguntaInput.value = pregunta.texto;
        answersEditContainer.appendChild(preguntaLabel);
        answersEditContainer.appendChild(preguntaInput);
        ['opcion_a', 'opcion_b', 'opcion_c', 'opcion_d'].forEach(opcionKey => {
            const opcionLabel = document.createElement('label');
            opcionLabel.textContent = `Opción ${opcionKey.split('_')[1].toUpperCase()}:`;
            const opcionInput = document.createElement('input');
            opcionInput.type = 'text';
            opcionInput.id = `input-${opcionKey}`;
            opcionInput.value = pregunta[opcionKey] || '';
            answersEditContainer.appendChild(opcionLabel);
            answersEditContainer.appendChild(opcionInput);
        });
        const correctaLabel = document.createElement('label');
        correctaLabel.textContent = 'Respuesta Correcta:';
        const correctaSelect = document.createElement('select');
        correctaSelect.id = 'correctaSelect';
        const opciones = {
            'opcion_a': 'Opción A',
            'opcion_b': 'Opción B',
            'opcion_c': 'Opción C',
            'opcion_d': 'Opción D'
        };
        for (const [valor, texto] of Object.entries(opciones)) {
            const option = document.createElement('option');
            option.value = valor;
            option.textContent = texto;
            correctaSelect.appendChild(option);
        }
        correctaSelect.value = pregunta.opcion_correcta;
        answersEditContainer.appendChild(correctaLabel);
        answersEditContainer.appendChild(correctaSelect);
    }
    async function guardarCambios() {
        const selectedIndex = questionSelect.value;
        if (selectedIndex === "") return;
        const preguntaAEditar = preguntasParaEditar[parseInt(selectedIndex)];
        const datosActualizados = {
            id: preguntaAEditar.id,
            verificada: false,
            texto: document.getElementById('preguntaTextInput').value,
            opcion_a: document.getElementById('input-opcion_a').value,
            opcion_b: document.getElementById('input-opcion_b').value,
            opcion_c: document.getElementById('input-opcion_c').value,
            opcion_d: document.getElementById('input-opcion_d').value,
            opcion_correcta: document.getElementById('correctaSelect').value,
            imagen: (preguntaAEditar.imagen === null && !nuevaImagenBase64)
                ? null
                : (nuevaImagenBase64 || preguntaAEditar.imagen)
        };
        console.log("Enviando datos actualizados al servidor:", datosActualizados);
        try {
            const response = await fetch(`/preguntas/${datosActualizados.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datosActualizados)
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.error);
            alert("¡Cambios guardados con éxito!");
        } catch (error) {
            console.error("Error al guardar cambios:", error);
            alert("Error al guardar: " + error.message);
        }
    }
});
