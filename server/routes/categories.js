const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/', async(req,res) => {
    try {
        const result = await pool.query('SELECT * FROM categorias');
        res.json(result.rows);
    } catch (err) {
        console.error('Error al obtener categorías:', err);
        res.status(500).json({ message: 'Error al obtener categorias' });
    }
});

module.exports = router;