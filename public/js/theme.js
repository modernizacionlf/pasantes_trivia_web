(function() {
    function applyInitialTheme() {
        try {
            const savedTheme = localStorage.getItem('theme');
            const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            
            let themeToApply = 'light'; // Tema por defecto

            if (savedTheme) {
                // Si el usuario ya eligió un tema, se usa ese.
                themeToApply = savedTheme;
            } else if (systemPrefersDark) {
                // Si no, se usa la preferencia del SO.
                themeToApply = 'dark';
            }

            // Se aplica la clase al elemento raíz del documento.
            if (themeToApply === 'dark') {
                document.documentElement.classList.add('dark-mode');
            } else {
                document.documentElement.classList.remove('dark-mode');
            }
        } catch (error) {
            console.error("Error al aplicar el tema inicial:", error);
        }
    }

    applyInitialTheme();

    /**
     * Esta parte del script espera a que la página esté completamente cargada
     * para encontrar el botón del tema y añadirle la funcionalidad de click.
     */
    document.addEventListener('DOMContentLoaded', () => {
        const themeToggleButton = document.getElementById('theme-toggle-button');
        // Si el botón no existe en la página actual, no hacemos nada más.
        if (!themeToggleButton) return;

        const themeIcon = themeToggleButton.querySelector('i');

        // Función para actualizar el ícono del botón (luna o sol).
        function updateIcon() {
            if (document.documentElement.classList.contains('dark-mode')) {
                themeIcon.classList.remove('fa-moon');
                themeIcon.classList.add('fa-sun');
            } else {
                themeIcon.classList.remove('fa-sun');
                themeIcon.classList.add('fa-moon');
            }
        }

        // Actualizamos el ícono cuando carga la página.
        updateIcon();

        // Añadimos el evento de click para cambiar el tema.
        themeToggleButton.addEventListener('click', () => {
            const isDarkMode = document.documentElement.classList.toggle('dark-mode');
            const newTheme = isDarkMode ? 'dark' : 'light';
            
            // Se guarda la elección del usuario.
            localStorage.setItem('theme', newTheme);
            
            updateIcon();
        });
    });
})();