let preguntas = [];
let fiscalizadorInfo = null;

async function verificarSesion() {
    try {
        const response = await fetch('/auth/verificar-sesion', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const data = await response.json();
        if (!data.success) {
            window.location.href = '/login';
            return;
        }
        fiscalizadorInfo = data.fiscalizador;
        document.getElementById('texto').innerHTML = `Estas fiscalizando: <strong>${fiscalizadorInfo.categoria}</strong><br>Selecciona las preguntas a editar`;
        await cargarPreguntas();
    } catch (error) {
        console.error('Error verificando sesión:', error);
        window.location.href = '/login';
    }
}

// Cargar preguntas desde la base de datos
async function cargarPreguntas() {
    try {
        showLoading();
        const response = await fetch('/preguntas', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.error || 'Error cargando preguntas');
        }
        preguntas = data.preguntas.map(p => ({
            id: p.id,
            texto: p.pregunta,
            opcion_a: p.opcion_a,
            opcion_b: p.opcion_b,
            opcion_c: p.opcion_c,
            opcion_d: p.opcion_d,
            opcion_correcta: p.opcion_correcta,
            verificada: p.verificada,
            imagen: p.imagen || null
        }));
        renderizarPreguntas();
    } catch (error) {
        console.error('Error cargando preguntas:', error);
        mostrarError('Error cargando las preguntas: ' + error.message);
    } finally {
        hideLoading();
    }
}

function showLoading() {
    const container = document.getElementById('preguntasContainer');
    container.innerHTML = '<div class="loading">Cargando preguntas...</div>';
}

function hideLoading() {
}

function mostrarError(mensaje) {
    const container = document.getElementById('preguntasContainer');
    container.innerHTML = `<div class="error">⚠️ ${mensaje}</div>`;
}

function mostrarExito(mensaje) {
    const notification = document.createElement('div');
    notification.className = 'notification success';
    notification.textContent = mensaje;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

const anadirBtn = document.getElementById('anadirBtn');
const eliminarBtn = document.getElementById('eliminarBtn');
const anadirPreguntasForm = document.getElementById('anadirPreguntas');
const cerrarPreguntas = document.getElementById('cerrarPreguntas');
const imagenInput = document.getElementById('POST-imagen');
const imagenPrevisualizacion = document.getElementById('imagenPrevisualizacion');

imagenInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            imagenPrevisualizacion.src = e.target.result;
            imagenPrevisualizacion.style.display = 'block';
        };
        reader.readAsDataURL(file);
    } else {
        imagenPrevisualizacion.src = '';
        imagenPrevisualizacion.style.display = 'none';
    }
});
anadirBtn.addEventListener('click', (e) => {
    if (e.target === anadirBtn) {
        anadirPreguntasForm.style.display = anadirPreguntasForm.style.display === 'flex' ? 'none' : 'flex';
    }
});
cerrarPreguntas.addEventListener('click', (e) => {
    if (e.target === cerrarPreguntas) {
        anadirPreguntasForm.style.display = 'none';
        limpiarFormulario();
    }
});

// Funcion de compresion de imagen que mantiene PNG con máxima compresión
function comprimirImagen(file, maxWidth = 250, maxHeight = 200) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (event) => {
            const img = new Image();
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                let { width, height } = img;
                
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                if (ratio < 1) {
                    width = Math.floor(width * ratio);
                    height = Math.floor(height * ratio);
                }
                
                canvas.width = width;
                canvas.height = height;
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'medium';
                ctx.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('No se pudo comprimir la imagen'));
                        }
                    },
                    'image/png'
                );
            };
            
            img.onerror = () => reject(new Error('Error al cargar la imagen'));
            img.src = event.target.result;
        };
        
        reader.onerror = () => reject(new Error('Error al leer el archivo'));
        reader.readAsDataURL(file);
    });
}

function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
            resolve(reader.result);
        };
        reader.onerror = (error) => {
            reject(new Error("Error al convertir Blob a Base64: " + error.message));
        };
    });
}

anadirPreguntasForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    const imagenFile = imagenInput.files[0];
    let imagenBase64 = null;

    if (imagenFile) {
        try {
            // Verificar el tamaño del archivo antes de procesarlo
            const maxSizeInMB = 1; 
            if (imagenFile.size > maxSizeInMB * 1024 * 1024) {
                alert(`La imagen es demasiado grande. Máximo ${maxSizeInMB}MB permitido.`);
                return;
            }

            console.log('Comprimiendo imagen...');
            
            const blobComprimido = await comprimirImagen(imagenFile, 250, 200);
            console.log(`Tamaño original: ${(imagenFile.size / 1024).toFixed(2)} KB`);
            console.log(`Tamaño comprimido: ${(blobComprimido.size / 1024).toFixed(2)} KB`);
            
            // Verificar que la imagen comprimida sea muy pequeña
            const maxCompressedSize = 200 * 1024; 
            if (blobComprimido.size > maxCompressedSize) {
                const blobMasComprimido = await comprimirImagen(imagenFile, 150, 120);
                if (blobMasComprimido.size > maxCompressedSize) {
                    alert('La imagen es demasiado compleja. Intenta con una imagen más simple, de menor resolución o en formato PNG optimizado.');
                    return;
                }
                imagenBase64 = await blobToBase64(blobMasComprimido);
                console.log(`Tamaño final: ${(blobMasComprimido.size / 1024).toFixed(2)} KB`);
            } else {
                imagenBase64 = await blobToBase64(blobComprimido);
            }
            
            const base64Size = new Blob([imagenBase64]).size;
            console.log(`Tamaño Base64: ${(base64Size / 1024).toFixed(2)} KB`);
            
            if (base64Size > 300 * 1024) { 
                alert('La imagen procesada sigue siendo muy grande. Intenta con una imagen más pequeña.');
                return;
            }
            
        } catch (error) {
            console.error('Error al procesar la imagen:', error);
            alert('Error al procesar la imagen: ' + error.message);
            return;
        }
    }

    const dataToSend = {
        pregunta: formData.get('pregunta'),
        opcion_a: formData.get('opcion_a'),
        opcion_b: formData.get('opcion_b'),
        opcion_c: formData.get('opcion_c'),
        opcion_d: formData.get('opcion_d'),
        opcion_correcta_key: formData.get('opcion_correcta'),
        imagen: imagenBase64
    };

    if (!dataToSend.pregunta || !dataToSend.opcion_a || !dataToSend.opcion_b || !dataToSend.opcion_c || !dataToSend.opcion_d || !dataToSend.opcion_correcta_key) {
        alert('Por favor, completa todos los campos de texto y opciones.');
        return;
    }

    try {
        console.log('Enviando datos al servidor...');
        const response = await fetch('/preguntas', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dataToSend)
        });
        
        // Verificar si la respuesta es JSON válida
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error('Respuesta no es JSON:', text);
            throw new Error('El servidor devolvió una respuesta inválida. Posiblemente la imagen es demasiado grande.');
        }
        
        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error || 'Error creando pregunta');
        }
        
        mostrarExito('Pregunta añadida correctamente');
        limpiarFormulario();
        anadirPreguntasForm.style.display = 'none';
        await cargarPreguntas();
    } catch (error) {
        console.error('Error creando pregunta:', error);
        alert('Error al crear la pregunta: ' + error.message);
    }
});

function limpiarFormulario() {
    document.getElementById('POST-pregunta').value = '';
    document.getElementById('POST-opcion_a').value = '';
    document.getElementById('POST-opcion_b').value = '';
    document.getElementById('POST-opcion_c').value = '';
    document.getElementById('POST-opcion_d').value = '';
    document.getElementById('POST-opcion_correcta').value = '';
    document.getElementById('POST-imagen').value = '';
    imagenPrevisualizacion.src = '';
    imagenPrevisualizacion.style.display = 'none';
}

function renderizarPreguntas() {
    const container = document.getElementById('preguntasContainer');
    if (preguntas.length === 0) {
        container.innerHTML = '<div class="empty">No hay preguntas en esta categoría. ¡Añade la primera!</div>';
        return;
    }
    container.innerHTML = '';
    preguntas.forEach((pregunta, index) => {
        const preguntaDiv = document.createElement('div');
        preguntaDiv.className = 'pregunta';
        const estadoTexto = pregunta.verificada ? '✅ Verificada' : '⏳ Pendiente';
        const estadoClass = pregunta.verificada ? 'verificada' : 'pendiente';
        preguntaDiv.innerHTML = `
            <span>${pregunta.texto}</span>
            ${pregunta.imagen ? `<img src="${pregunta.imagen}" alt="Imagen de la pregunta" style="max-width: 100px; height: auto; margin-left: 10px;">` : ''} 
            <div class="pregunta-estado ${estadoClass}">${estadoTexto}</div>
            <input type="checkbox" class="checkbox" id="check-${index}" data-id="${pregunta.id}">
        `;
        const respuestasDiv = document.createElement('div');
        respuestasDiv.className = 'respuestas';
        respuestasDiv.id = `respuestas-${index}`;
        respuestasDiv.innerHTML = `
            <p><strong>A:</strong> ${pregunta.opcion_a}</p>
            <p><strong>B:</strong> ${pregunta.opcion_b}</p>
            <p><strong>C:</strong> ${pregunta.opcion_c}</p>
            <p><strong>D:</strong> ${pregunta.opcion_d}</p>
            <p class="correcta"><strong>Correcta:</strong> ${pregunta.opcion_correcta}</p>
        `;
        preguntaDiv.addEventListener('click', (e) => {
            if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'IMG') {
                respuestasDiv.style.display = respuestasDiv.style.display === 'block' ? 'none' : 'block';
            }
        });
        const checkbox = preguntaDiv.querySelector('input');
        checkbox.addEventListener('change', actualizarBotonEditar);
        container.appendChild(preguntaDiv);
        container.appendChild(respuestasDiv);
    });
    actualizarBotonEditar();
}

function actualizarBotonEditar() {
    const checkboxes = document.querySelectorAll('.checkbox');
    const algunaVerificada = Array.from(checkboxes).some(cb => cb.checked);
    const editarBtn = document.getElementById('editarBtn');
    editarBtn.style.display = algunaVerificada ? 'block' : 'none';
    eliminarBtn.style.display = algunaVerificada ? 'block' : 'none';
}


editarBtn.addEventListener('click', () => {
    const checkboxes = document.querySelectorAll('.checkbox:checked');
    const idsSeleccionados = Array.from(checkboxes).map(cb => cb.dataset.id);
    const preguntasParaEditar = preguntas.filter(p => idsSeleccionados.includes(String(p.id)));
    localStorage.setItem('preguntasParaEditar', JSON.stringify(preguntasParaEditar));
    window.location.href = '/edit.html'; 
});
eliminarBtn.addEventListener('click', async () => {
    const checkboxes = document.querySelectorAll('.checkbox:checked');
    const idsParaEliminar = Array.from(checkboxes).map(cb => cb.dataset.id);
    if (idsParaEliminar.length === 0) {
        return alert('Por favor, selecciona al menos una pregunta para eliminar.');
    }
    if (!confirm(`¿Estás seguro de que quieres eliminar ${idsParaEliminar.length} pregunta(s)? Esta acción no se puede deshacer.`)) {
        return;
    }
    console.log('IDs a eliminar:', idsParaEliminar);
    try {
    const promesasDeBorrado = idsParaEliminar.map(id => 
        fetch(`/preguntas/${id}`, {
            method: 'DELETE'
        })
        .then(res => res.json())
        .catch(err => ({ success: false, error: 'Error de red', detalle: err }))
    );
        const resultados = await Promise.all(promesasDeBorrado);
        console.log('Resultados de eliminación:', resultados);
        const errores = resultados.filter(res => !res.success);
        if (errores.length > 0) {
            throw new Error('Algunas preguntas no se pudieron eliminar.');
        }
        mostrarExito('Pregunta(s) eliminada(s) correctamente.');
        await cargarPreguntas(); 
    } catch (error) {
        console.error('Error eliminando preguntas:', error);
        alert('Error al eliminar las preguntas: ' + error.message);
    }
});

window.onload = verificarSesion;