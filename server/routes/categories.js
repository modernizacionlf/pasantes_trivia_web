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

router.post('/random', async (req, res) => {
    const { exclude = [] } = req.body; // IDs de categorías ya jugadas

    try {
        const result = await pool.query(
            `
            SELECT id, categoria
            FROM categorias
            WHERE NOT (id = ANY($1::int[]))
            ORDER BY RANDOM()
            LIMIT 1
            `,
            [exclude]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No hay categorías disponibles' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error en /categories/random:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;