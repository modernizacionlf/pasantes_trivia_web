const express = require('express');
const router = express.Router();
const pool = require('../db');

//Metodo GET para registro
router.get('/', async (request, response) => {
  try {
    const result = await pool.query('SELECT * FROM registros');
    response.json(result.rows);
  } catch (err) {
    console.error(err);
    response.status(500).send('Error al obtener los registros');
  }
});

//Metodo POST para registro
router.post('/', async (request, response) => {
    console.log(response)
    try {
        const { dniValue, nombreValue, apellidoValue, telefonoValue } = request.body;

        // las validaciones ya se hicieron en el client-side no es necesario hacerlas en el server-side.
        // if (!dni || !nombre || !apellido || !telefono) {
        //     return response.status(400).json({ message: 'Todos los datos deben ser ingresados' });
        // }

        // if (!/^\d{7,8}$/.test(dni)) {
        //     return response.status(400).json({ message: 'DNI Inválido. El DNI debe tener como máximo 8 dígitos' });
        // }

        // if (!/^\d{10}$/.test(telefono)) {
        //     return res.status(400).json({ message: 'Numero inválido. Ingrese un número de hasta 10 dígitos' });
        // }

        // Solo hacer el request de id, nombre para minimizar el impacto versus hacer el request de todas las columnas.
        // limitar la respuesta a 1 row
        const existingUserResult = await pool.query('SELECT id, nombre FROM registros WHERE dni = $1 LIMIT 1', [dniValue]);
        // pueden usar el valor rowCount como comparación más directa
        if (existingUserResult.rowCount > 0) {
            // El DNI ya existe, así que iniciamos sesión para ese usuario
            const user = existingUserResult.rows[0];
            request.session.userId = user.id;
            request.session.userNombre = user.nombre;
            return response.status(200).json({
                success: true,
                message: 'Sesión iniciada correctamente.',
                user: { id: user.id, nombre: user.nombre }
            });
        }

        // El DNI no existe, procedemos a registrarlo
        // RETURNING solo 'id' y 'nombre' para reducir impacto del query.
        const result = await pool.query(
            'INSERT INTO registros (dni, nombre, apellido, telefono) VALUES ($1, $2, $3, $4) RETURNING id, nombre',
            [dniValue, nombreValue, apellidoValue, telefonoValue]
        );
        
        const newUser = result.rows[0];
        request.session.userId = newUser.id;
        request.session.userNombre = newUser.nombre;
        response.status(201).json({
            success: true,
            message: 'Usuario registrado y sesión iniciada.',
            user: { id: newUser.id, nombre: newUser.nombre }
        });
    } catch (err) {
        console.error(err);
        response.status(500).json({ success: false, message: 'Hubo un error en el servidor al procesar el registro.' });
    }
});

module.exports = router;