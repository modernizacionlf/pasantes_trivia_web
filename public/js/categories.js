document.addEventListener('DOMContentLoaded', async () => {
    const user = JSON.parse(localStorage.getItem('user'));

    if (!user) {
        // Si no hay usuario, no debería estar aquí. Redirigir al inicio.
        window.location.href = 'index.html';
        return;
    }

    const jugadas = user.jugadas || [];

    try {
        const res = await fetch('/categories');
        if (!res.ok) throw new Error('No se pudo conectar con el servidor.');
        const categorias = await res.json();

        const contenedor = document.getElementById('categories-container');
        if (!contenedor) {
            console.error('El contenedor #categories-container no existe.');
            return;
        }
        
        contenedor.innerHTML = '';

        categorias.forEach(categoria => {
            const item = document.createElement('div');
            item.classList.add('icon-item');

            const link = document.createElement('a');
            link.classList.add('a-icono');
            link.href = '#'; 
            link.innerHTML = `<i class="fa-solid fa-file-image fa-2xl"></i>`;

            const span = document.createElement('span');
            span.textContent = categoria.categoria;

            if (jugadas.includes(categoria.id)) {
                item.classList.add('jugada');
            } else {
                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    localStorage.setItem('categoriaSeleccionada', categoria.id);
                    window.location.href = 'trivia.html';
                });
            }

            item.appendChild(link);
            item.appendChild(span);
            contenedor.appendChild(item);
        });
    } catch (error) {
        console.error('Error al obtener categorías:', error);
        const contenedor = document.getElementById('categories-container');
        if(contenedor) contenedor.innerHTML = `<p style="color:red;">${error.message}</p>`;
    }
});

    try {
    // Reutilizamos la variable 'categorias' que ya tiene los datos del fetch
    // y la variable 'jugadas' del usuario.
    
    const randomButton = document.querySelector('.random button');
    const categoriasDisponibles = categorias.filter(cat => !jugadas.includes(cat.id));

    if (categoriasDisponibles.length === 0) {
        randomButton.textContent = '¡Todo completado!';
        randomButton.disabled = true;
    } else {
        randomButton.addEventListener('click', () => {
            // Elige una categoría aleatoria de la lista de disponibles
            const randomCategory = categoriasDisponibles[Math.floor(Math.random() * categoriasDisponibles.length)];
            
            // Guarda la selección y redirige a la trivia
            localStorage.setItem('categoriaSeleccionada', randomCategory.id);
            window.location.href = 'trivia.html';
        });
    }
    } catch (error) {/* el botón simplemente no tendrá funcionalidad si el fetch falla. */}
