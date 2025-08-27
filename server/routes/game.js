const express = require('express');
const router = express.Router();
const pool = require('../db');

// Obtener preguntas aleatorias de una categoría (VERSIÓN CORREGIDA)
router.get('/questions/:categoriaId', async (req, res) => {
    const { categoriaId } = req.params;
    const userId = req.session.userId;
    
    if (!userId) {
        return res.status(401).json({ success: false, error: 'No autorizado. Por favor, regístrese para jugar.' });
    }
    
    try {
        const idsResult = await pool.query(
            `SELECT p.id FROM preguntas p
             JOIN respuestas r ON p.id = r.id_pregunta
             WHERE p.id_categoria = $1 AND p.verificada = true`,
            [categoriaId]
        );

        let ids = idsResult.rows.map(row => row.id);

        if (ids.length < 5) {
            return res.status(404).json({ 
                success: false,
                error: 'No hay suficientes preguntas disponibles en esta categoría.' 
            });
        }

        // Mezcla el array de IDs (Algoritmo Fisher-Yates)
        for (let i = ids.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [ids[i], ids[j]] = [ids[j], ids[i]];
        }

        // Toma los primeros 5 IDs y obtiene sus datos
        const selectedIds = ids.slice(0, 5);
        
        const preguntasResult = await pool.query(
            `SELECT 
                p.id, p.pregunta, p.imagen, 
                r.opcion_a, r.opcion_b, r.opcion_c, r.opcion_d, r.opcion_correcta
             FROM preguntas p
             JOIN respuestas r ON p.id = r.id_pregunta
             WHERE p.id = ANY($1::int[])`,
            [selectedIds]
        );
        const preguntas = preguntasResult.rows;
        
        // PASO 4: Crea el juego y procesa las preguntas
        const nuevoJuego = await pool.query(
            'INSERT INTO juegos (id_usuario, id_categoria) VALUES ($1, $2) RETURNING id',
            [userId, categoriaId]
        );
        const idJuego = nuevoJuego.rows[0].id;

        const preguntasConOpcionesMezcladas = preguntas.map(pregunta => {
            const opciones = [
                { letra: 'a', texto: pregunta.opcion_a },
                { letra: 'b', texto: pregunta.opcion_b },
                { letra: 'c', texto: pregunta.opcion_c },
                { letra: 'd', texto: pregunta.opcion_d }
            ];
            
            // Mezcla las opciones de respuesta
            for (let i = opciones.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [opciones[i], opciones[j]] = [opciones[j], opciones[i]];
            }

            return {
                id: pregunta.id,
                pregunta: pregunta.pregunta,
                imagen: pregunta.imagen,
                opciones: opciones,
                respuesta_correcta: Buffer.from(pregunta.opcion_correcta).toString('base64')
            };
        });

        res.json({ 
            success: true,
            id_juego: idJuego,
            data: preguntasConOpcionesMezcladas
        });

    } catch (err) {
        console.error('Error al obtener preguntas:', err);
        res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
});


// Endpoint para verificar una respuesta
router.post('/check-answer', async (req, res) => {
    const { id_juego, preguntaId, respuestaUsuario, tiempoRestante, respuestaCorrectaEncriptada } = req.body;
    const userId = req.session.userId;

    if (!userId) {
        return res.status(401).json({ success: false, error: 'No autorizado.' });
    }

    if (!id_juego || !preguntaId || !respuestaUsuario || tiempoRestante === undefined || !respuestaCorrectaEncriptada) {
        return res.status(400).json({ success: false, error: 'Faltan datos requeridos.' });
    }

    try {
        const respuestaCorrectaTexto = Buffer.from(respuestaCorrectaEncriptada, 'base64').toString('utf-8');
        const esCorrecta = (respuestaUsuario === respuestaCorrectaTexto);

        const tiempoMaximo = 15;
        const puntosBase = 100;
        const puntosPorSegundo = (1000 - puntosBase) / tiempoMaximo;
        
        const puntosObtenidos = esCorrecta 
            ? Math.max(puntosBase, Math.round(puntosBase + (tiempoRestante * puntosPorSegundo)))
            : 0;

        await pool.query(
            `INSERT INTO resultados (id_usuario, id_pregunta, id_juego, respuesta_usuario, es_correcta, puntos_obtenidos, tiempo_respuesta)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [userId, preguntaId, id_juego, respuestaUsuario, esCorrecta, puntosObtenidos, tiempoMaximo - tiempoRestante]
        );

        res.json({
            success: true,
            data: {
                esCorrecta: esCorrecta,
                opcionCorrecta: respuestaCorrectaTexto,
                puntosObtenidos: puntosObtenidos
            }
        });

    } catch (error) {
        console.error('Error al verificar respuesta:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor.' });
    }
});

// Endpoint para finalizar el juego
router.post('/end-game', async (req,res) => {
    const { id_juego, puntuacion_final } = req.body;
    const userId = req.session.userId;

    if (!id_juego || puntuacion_final === undefined) {
        return res.status(400).json({ error: 'Faltan datos (id_juego, puntuacion_final).' });
    }

    try {
        const result = await pool.query(
            'UPDATE juegos SET puntuacion_final = $1 WHERE id = $2 AND id_usuario = $3',
            [puntuacion_final, id_juego, userId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'El juego no se encontró o no pertenece al usuario.' });
        }

        res.status(200).json({ success: true, message: 'Juego finalizado y puntuación guardada.' });

    } catch (err) {
        console.error('Error al finalizar el juego:', err);
        res.status(500).json({ err: 'Error interno del servidor.' });
    }
});

// Endpoint para obtener el ranking
router.get('/leaderboard', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                u.nombre as nombre_usuario,
                SUM(r.puntos_obtenidos) as puntuacion_total,
                SUM(CASE WHEN r.es_correcta THEN 1 ELSE 0 END) as respuestas_correctas,
                COUNT(r.id) as total_respuestas
            FROM resultados r
            JOIN registro u ON r.id_usuario = u.id
            GROUP BY u.id, u.nombre
            ORDER BY puntuacion_total DESC
            LIMIT 5
        `);

        res.json({
            success: true,
            data: {
                ranking: result.rows,
                actualizado: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Error al obtener el ranking:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error al obtener el ranking'
        });
    }
});

module.exports = router;