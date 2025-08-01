document.addEventListener('DOMContentLoaded', async () => {
    const table = document.getElementById('ranking-table');
    const tbody = document.getElementById('ranking-body');
    const loader = document.getElementById('loader');
    const errorMessage = document.getElementById('error-message');

    try {
        const response = await fetch('/api/game/leaderboard');
        
        if (!response.ok) {
            throw new Error(`Error ${response.status}: No se pudo obtener el ranking.`);
        }

        const result = await response.json();

        if (result.success && result.data.ranking.length > 0) {
            const ranking = result.data.ranking;
            
            tbody.innerHTML = ''; // limpia el cuerpo de la tabla

            ranking.forEach((player, index) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="rank">#${index + 1}</td>
                    <td>${escapeHTML(player.nombre_usuario)}</td>
                    <td>${player.puntuacion_total}</td>
                    <td>${player.respuestas_correctas} / ${player.total_respuestas}</td>
                `;
                tbody.appendChild(row);
            });

        } else if (result.data.ranking.length === 0) {
             errorMessage.textContent = 'Aún no hay datos en el ranking. ¡Juega para ser el primero!';
             errorMessage.style.display = 'block';
        } else {
            throw new Error(result.error || 'Respuesta inesperada del servidor.');
        }

    } catch (error) {
        console.error('Error al cargar el ranking:', error);
        errorMessage.textContent = 'No se pudo cargar el ranking. Inténtalo de nuevo más tarde.';
        errorMessage.style.display = 'block';
    } finally {
        loader.style.display = 'none';
        if (tbody.innerHTML !== '') {
            table.style.display = 'table';
        }
    }
});

// Función para evitar inyección de HTML (XSS)
function escapeHTML(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}