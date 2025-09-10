document.addEventListener('DOMContentLoaded', async () => {
    const user = JSON.parse(localStorage.getItem('user'));

    if (!user) {
        window.location.href = 'index.html';
        return;
    }

    const jugadas = user.jugadas || [];

    try {
        const res = await fetch('/categories');
        if (!res.ok) throw new Error('No se pudo conectar con el servidor.');
        const categorias = await res.json();

        const contenedor = document.getElementById('categories-container');
        contenedor.innerHTML = '';

        const iconosPorCategoria = {
            'Cultura': 'fa-solid fa-book',
            'Deportes': 'fa-solid fa-person-running',
            'Salud': 'fa-solid fa-house-medical',
            'Juventudes': 'fa-solid fa-children'
        };

        const iconoPorDefecto = 'fa-solid fa-question-circle';

        categorias.forEach(categoria => {
            const item = document.createElement('div');
            item.classList.add('icon-item');

            const link = document.createElement('a');
            link.classList.add('a-icono');
            link.href = '#'; 
            const claseIcono = iconosPorCategoria[categoria.categoria] || iconoPorDefecto;
            link.innerHTML = `<i class="${claseIcono} fa-lg"></i>`;

            const span = document.createElement('span');
            span.textContent = categoria.categoria;

            if (jugadas.includes(categoria.id)) {
                item.classList.add('jugada');
            } else {
                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    localStorage.setItem('categoriaSeleccionada', categoria.id);
                    window.location.href = '/pages/trivia';
                });
            }

            item.appendChild(link);
            item.appendChild(span);
            contenedor.appendChild(item);
        });

        // Funcionalidad del botón aleatorio
        document.getElementById('btn-aleatoria').addEventListener('click', async () => {
            try {
                const resRandom = await fetch('/categories/random', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ exclude: jugadas })
                });

                const categoria = await resRandom.json();
                if (categoria && categoria.id) {
                    localStorage.setItem('categoriaSeleccionada', categoria.id);
                    window.location.href = 'trivia.html';
                } else {
                    alert('No hay categorías disponibles o ya jugaste todas.');
                }
            } catch (err) {
                console.error('Error obteniendo categoría aleatoria:', err);
                alert('Hubo un problema al obtener la categoría.');
            }
        });

    } catch (error) {
        console.error('Error al obtener categorías:', error);
        const contenedor = document.getElementById('categories-container');
        if (contenedor) contenedor.innerHTML = `<p style="color:red;">${error.message}</p>`;
    }
});
