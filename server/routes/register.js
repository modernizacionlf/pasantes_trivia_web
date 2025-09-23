const express = require('express');
const router = express.Router();
const pool = require('../db');

function capitalize(str) {
    if (typeof str !== 'string' || str.length === 0) {
        return '';
    }
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// Metodo GET para registro
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM registro');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al obtener los registros');
  }
});

// Metodo POST para registro
router.post('/', async (req, res) => {
    try {
        const { dni, nombre, apellido, telefono } = req.body;

        if (!dni || !nombre || !apellido || !telefono) {
            return res.status(400).json({ message: 'Todos los datos deben ser ingresados' });
        }
        if (!/^\d{7,8}$/.test(dni)) {
            return res.status(400).json({ message: 'DNI Inválido. El DNI debe tener como máximo 8 dígitos' });
        }
        if (!/^\d{6,15}$/.test(telefono)) {
            return res.status(400).json({ message: 'Numero inválido. Ingrese un número de hasta 10 dígitos' });
        }

        const nombreFormateado = capitalize(nombre);
        const apellidoFormateado = capitalize(apellido);

        const dniExist = await pool.query('SELECT * FROM registro WHERE dni = $1', [dni]);
        
        if (dniExist.rows.length > 0) {
            // --- LÓGICA PARA USUARIO EXISTENTE ---
            const user = dniExist.rows[0];
            
            const totalCategoriasResult = await pool.query('SELECT COUNT(*) FROM categorias');
            const totalCategorias = parseInt(totalCategoriasResult.rows[0].count, 10);

            const jugadasResult = await pool.query(
                'SELECT DISTINCT id_categoria FROM juegos WHERE id_usuario = $1',
                [user.id]
            );
            const jugadas = jugadasResult.rows.map(r => r.id_categoria);

            const allCategoriesPlayed = jugadas.length >= totalCategorias;

            req.session.userId = user.id;
            req.session.userNombre = user.nombre;
            
            return res.status(200).json({
                success: true,
                message: 'Sesión iniciada correctamente.',
                allCategoriesPlayed: allCategoriesPlayed,
                user: { 
                    id: user.id, 
                    nombre: user.nombre,
                    apellido: user.apellido,
                    jugadas: jugadas
                }
            });

        } else {
            // --- LÓGICA PARA NUEVO USUARIO ---
            const result = await pool.query(
                'INSERT INTO registro (dni, nombre, apellido, telefono) VALUES ($1, $2, $3, $4) RETURNING *',
                [dni, nombreFormateado, apellidoFormateado, telefono]
            );  
            
            const newUser = result.rows[0];
            req.session.userId = newUser.id;
            req.session.userNombre = newUser.nombre;
            
            res.status(201).json({
                success: true,
                message: 'Usuario registrado y sesión iniciada.',
                allCategoriesPlayed: false,
                user: { 
                    id: newUser.id, 
                    nombre: newUser.nombre,
                    apellido: newUser.apellido,
                    jugadas: []
                }
            });
        }

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Hubo un error en el servidor al procesar el registro.' });
    }
});

module.exports = router;