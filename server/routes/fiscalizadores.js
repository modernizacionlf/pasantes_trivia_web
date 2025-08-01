const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const router = express.Router();

// Función para crear fiscalizadores
async function crearFiscalizador(email, password, idCategoria) {
    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        const query = 'INSERT INTO fiscalizadores (email, password, id_categoria) VALUES ($1, $2, $3) RETURNING *';
        const result = await pool.query(query, [email, hashedPassword, idCategoria]);
        
        console.log(`Fiscalizador creado: ${email} para categoría ${idCategoria}`);
        return result.rows[0];
    } catch (error) {
        if (error.code === '23505') {
            console.log(`El fiscalizador ${email} ya existe`);
            return null;
        } else {
            console.error('Error creando fiscalizador:', error);
            throw error;
        }
    }
}

// POST /fiscalizadores/crear - Crear un fiscalizador específico
router.post('/crear', async (req, res) => {
    try {
        const { email, password, id_categoria } = req.body;
        
        if (!email || !password || !id_categoria) {
            return res.status(400).json({
                success: false,
                error: 'Email, password e id_categoria son requeridos'
            });
        }
        const categoriaResult = await pool.query('SELECT * FROM categorias WHERE id = $1', [id_categoria]);
        if (categoriaResult.rows.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'La categoría especificada no existe'
            });
        }
        
        const fiscalizador = await crearFiscalizador(email, password, id_categoria);
        
        if (!fiscalizador) {
            return res.status(400).json({
                success: false,
                error: 'El fiscalizador ya existe'
            });
        }
        
        res.json({
            success: true,
            message: 'Fiscalizador creado exitosamente',
            fiscalizador: {
                id: fiscalizador.id,
                email: fiscalizador.email,
                categoria: categoriaResult.rows[0].categoria
            }
        });
        
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            error: 'Error creando fiscalizador'
        });
    }
});

// POST /fiscalizadores/cambiar-password - Cambiar contraseña de un fiscalizador
router.post('/cambiar-password', async (req, res) => {
    try {
        const { email, nueva_password } = req.body;
        
        if (!email || !nueva_password) {
            return res.status(400).json({
                success: false,
                error: 'Email y nueva_password son requeridos'
            });
        }
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(nueva_password, salt);
        
        const query = 'UPDATE fiscalizadores SET password = $1 WHERE email = $2 RETURNING email';
        const result = await pool.query(query, [hashedPassword, email]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Fiscalizador no encontrado'
            });
        }
        
        res.json({
            success: true,
            message: 'Contraseña actualizada exitosamente'
        });
        
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            error: 'Error cambiando contraseña'
        });
    }
});

module.exports = router;