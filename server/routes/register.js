const express = require('express');
const router = express.Router();
const pool = require('../db');

//Metodo GET para registro
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM registro');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al obtener los registros');
  }
});

//Metodo POST para registro
router.post('/', async (req, res) => {
    try {
        const { dni, nombre, apellido, telefono } = req.body;

        if (!dni || !nombre || !apellido || !telefono) {
            return res.status(400).json({ message: 'Todos los datos deben ser ingresados' });
        }

        if (!/^\d{7,8}$/.test(dni)) {
            return res.status(400).json({ message: 'DNI Inválido. El DNI debe tener como máximo 8 dígitos' });
        }

        if (!/^\d{10}$/.test(telefono)) {
            return res.status(400).json({ message: 'Numero inválido. Ingrese un número de hasta 10 dígitos' });
        }

        const dniExist = await pool.query('SELECT * FROM registro WHERE dni = $1', [dni]);
        
        if (dniExist.rows.length > 0) {
            // El DNI ya existe, así que iniciamos sesión para ese usuario
            const user = dniExist.rows[0];
            req.session.userId = user.id;
            req.session.userNombre = user.nombre;
            return res.status(200).json({
                success: true,
                message: 'Sesión iniciada correctamente.',
                user: { id: user.id, nombre: user.nombre }
            });
        }

        // El DNI no existe, procedemos a registrarlo
        const result = await pool.query(
            'INSERT INTO registro (dni, nombre, apellido, telefono) VALUES ($1, $2, $3, $4) RETURNING *',
            [dni, nombre, apellido, telefono]
        );
        
        const newUser = result.rows[0];
        req.session.userId = newUser.id;
        req.session.userNombre = newUser.nombre;
        
        res.status(201).json({
            success: true,
            message: 'Usuario registrado y sesión iniciada.',
            user: { id: newUser.id, nombre: newUser.nombre }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Hubo un error en el servidor al procesar el registro.' });
    }
});

module.exports = router;