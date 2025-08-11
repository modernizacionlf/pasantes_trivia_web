document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('registerForm');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const dniValue = form.dni.value.trim();
    const nombreValue = form.name.value.trim();
    const apellidoValue = form.surname.value.trim();
    const telefonoValue = form.phoneNumber.value.trim();

    // Si todos los campos tienen el atributo 'required' no es necesario hacer esta validación en JS
    // if (!dni || !nombre || !apellido || !telefono) {
    //   alert('Por favor completá todos los campos.');
    //   return;
    // }
    
    // Los regex pueden usarse como validación de patrones en HTML
    // if (!/^\d/.test(dni)) {
    //   alert('El DNI debe tener solo números y tener entre 7 y 8 dígitos.');
    //   return;
    // }

    // if (!/^\d{6,15}$/.test(telefono)) {
    //   alert('El número de teléfono debe tener entre 6 y 15 dígitos.');
    //   return;
    // }

    const formValues = { dniValue, nombreValue, apellidoValue, telefonoValue };
    try {
      const response = await fetch('http://localhost:3000/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formValues),
      });

      if (response.ok) {
        const userData = await response.json();
        localStorage.setItem('user', JSON.stringify({
          id: userData.id,
          nombre: userData.nombre,
          apellido: userData.apellido,
          jugadas: []
        }));

        window.location.href = 'categories.html';
      } else {
        const error = await response.json();
        alert('Error en registro: ' + (error.message || 'Error desconocido'));
      }
    } catch (err) {
      alert('Error de conexión: ' + err.message);
    }
  });
});
