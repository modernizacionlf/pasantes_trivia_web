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

// POST /fiscalizadores/cambiar-password - Cambiar contraseña de un fiscalizador
router.post('/cambiar-password', async (req, res) => {
    try {
        const { email, current_password, new_password } = req.body;
        if (!email || !current_password || !new_password) {
            return res.status(400).json({
                success: false,
                error: 'Todos los campos son requeridos'
            });
        }
        const userQuery = 'SELECT * FROM fiscalizadores WHERE email = $1';
        const userResult = await pool.query(userQuery, [email]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }
        const user = userResult.rows[0];
        const isMatch = await bcrypt.compare(current_password, user.password);    
        if (!isMatch) {
            return res.status(401).json({ 
                success: false,
                error: 'La contraseña actual es incorrecta'
            });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(new_password, salt);
        const updateQuery = 'UPDATE fiscalizadores SET password = $1 WHERE email = $2';
        await pool.query(updateQuery, [hashedPassword, email]);
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