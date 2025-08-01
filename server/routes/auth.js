const express = require('express');
const bcrypt = require('bcryptjs');
const path = require('path');
const pool = require('../db');

const router = express.Router();

const verificarFiscalizador = (req, res, next) => {
    if (!req.session.fiscalizador) {
        res.redirect('/login');
    }
    next();
};

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ 
                success: false,
                error: 'Email y contraseña son requeridos' 
            });
        }
        const query = `
            SELECT f.*, c.categoria 
            FROM fiscalizadores f 
            JOIN categorias c ON f.id_categoria = c.id 
            WHERE f.email = $1
        `;
        const result = await pool.query(query, [email]);
        const fiscalizador = result.rows[0];
        if (!fiscalizador) {
            return res.status(401).json({ 
                success: false,
                error: 'Credenciales inválidas' 
            });
        }
        const passwordValida = await bcrypt.compare(password, fiscalizador.password);
        if (!passwordValida) {
            return res.status(401).json({ 
                success: false,
                error: 'Credenciales inválidas' 
            });
        }
        req.session.fiscalizador = {
            id: fiscalizador.id,
            email: fiscalizador.email,
            id_categoria: fiscalizador.id_categoria,
            categoria: fiscalizador.categoria
        };
        res.json({ 
            success: true,
            message: 'Login exitoso',
            fiscalizador: {
                email: fiscalizador.email,
                categoria: fiscalizador.categoria
            }
        });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error interno del servidor' 
        });
    }
});

// POST /auth/logout - Cerrar sesión
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ 
                success: false,
                error: 'Error al cerrar sesión' 
            });
        }
        res.json({ 
            success: true,
            message: 'Sesión cerrada exitosamente' 
        });
    });
});

// GET /auth/fiscalizador - Obtener datos del fiscalizador logueado
router.get('/fiscalizador', verificarFiscalizador, (req, res) => {
    res.json({
        success: true,
        fiscalizador: req.session.fiscalizador
    });
});

// POST /auth/verificar-sesion - Verificar si hay sesión activa
router.post('/verificar-sesion', (req, res) => {
    if (req.session.fiscalizador) {
        res.json({
            success: true,
            fiscalizador: req.session.fiscalizador
        });
    } else {
        res.status(401).json({
            success: false,
            error: 'No hay sesión activa'
        });
    }
});

module.exports = { router, verificarFiscalizador };