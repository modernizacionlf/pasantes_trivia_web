const express = require('express');
const router = express.Router();
const pool = require('../db');

// Obtener preguntas aleatorias de una categoría
router.get('/questions/:categoriaId', async (req, res) => {
    const { categoriaId } = req.params;
    const userId = req.session.userId;
    
    try {
        // Validar que la categoría existe
        const categoriaCheck = await pool.query(
            'SELECT id FROM categorias WHERE id = $1',
            [categoriaId]
        );

        if (categoriaCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Categoría no encontrada' });
        }

        // crea una nueva entrada en la tabla 'juegos'
        const nuevoJuego = await pool.query(
            'INSERT INTO juegos (id_usuario, id_categoria) VALUES ($1, $2) RETURNING id',
            [userId, categoriaId]
        );
        const idJuego = nuevoJuego.rows[0].id;

        // Obtener 5 preguntas aleatorias con sus respuestas
        const result = await pool.query(
            `SELECT 
                p.id, 
                p.pregunta,
                p.imagen, 
                r.opcion_a, 
                r.opcion_b, 
                r.opcion_c, 
                r.opcion_d,
                r.opcion_correcta
            FROM preguntas p
            JOIN respuestas r ON p.id = r.id_pregunta
            WHERE p.id_categoria = $1 
            AND p.verificada = true 
            AND r.verificada = true
            ORDER BY RANDOM()
            LIMIT 5`,
            [categoriaId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                error: 'No hay preguntas disponibles para esta categoría' 
            });
        }

        // Randomizar opciones de respuesta
        const preguntasConOpcionesMezcladas = result.rows.map(pregunta => {
            const opciones = [
                { letra: 'a', texto: pregunta.opcion_a },
                { letra: 'b', texto: pregunta.opcion_b },
                { letra: 'c', texto: pregunta.opcion_c },
                { letra: 'd', texto: pregunta.opcion_d }
            ];
            
            // mezclar opciones
            for (let i = opciones.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [opciones[i], opciones[j]] = [opciones[j], opciones[i]];
            }

            // encuentra la opción correcta después de mezclar
            const opcionCorrecta = opciones.find(
                opcion => opcion.texto === pregunta.opcion_correcta
            )?.letra;

            return {
                id: pregunta.id,
                pregunta: pregunta.pregunta,
                imagen: pregunta.imagen,
                opciones: opciones,
                respuesta_correcta: opcionCorrecta // envia la letra de la respuesta correcta
            };
        });

        const responseData = { 
            success: true,
            id_juego: idJuego,
            data: preguntasConOpcionesMezcladas
        };
        res.json(responseData);

    } catch (err) {
        console.error('Error al obtener preguntas:', err);
        res.status(500).json({ err: 'Error interno del servidor' });
    }
});

// Endpoint para verificar una respuesta
router.post('/check-answer', async (req, res) => {
    const { id_juego, preguntaId, respuesta, tiempoRestante } = req.body;
    const userId = req.session.userId;

    if (!userId) {
        return res.status(401).json({ success: false, error: 'No autorizado. Por favor, regístrese para jugar.' });
    }

    if (!preguntaId || !respuesta || tiempoRestante === undefined) {
        return res.status(400).json({ success: false, error: 'Faltan datos requeridos.' });
    }

    try {
        await pool.query('BEGIN');

        const respuestaResult = await pool.query(
            `SELECT opcion_a, opcion_b, opcion_c, opcion_d, opcion_correcta FROM respuestas WHERE id_pregunta = $1`,
            [preguntaId]
        );

        if (respuestaResult.rows.length === 0) {
            await pool.query('ROLLBACK');
            return res.status(404).json({ success: false, error: 'Pregunta no encontrada.' });
        }

        const r = respuestaResult.rows[0];
        let respuestaUsuarioTexto = '';
        if (respuesta === 'a') respuestaUsuarioTexto = r.opcion_a;
        else if (respuesta === 'b') respuestaUsuarioTexto = r.opcion_b;
        else if (respuesta === 'c') respuestaUsuarioTexto = r.opcion_c;
        else if (respuesta === 'd') respuestaUsuarioTexto = r.opcion_d;

        const esCorrecta = (respuestaUsuarioTexto === r.opcion_correcta);

        let opcionCorrectaLetra = '';
        if (r.opcion_correcta === r.opcion_a) opcionCorrectaLetra = 'a';
        else if (r.opcion_correcta === r.opcion_b) opcionCorrectaLetra = 'b';
        else if (r.opcion_correcta === r.opcion_c) opcionCorrectaLetra = 'c';
        else if (r.opcion_correcta === r.opcion_d) opcionCorrectaLetra = 'd';

        const tiempoMaximo = 15;
        const puntosBase = 100;
        const puntosPorSegundo = (1000 - puntosBase) / tiempoMaximo;
        const puntosObtenidos = esCorrecta ? Math.max(
            puntosBase,
            Math.min(1000, Math.round(puntosBase + (tiempoRestante * puntosPorSegundo)))
        ) : 0;

        await pool.query(
            `INSERT INTO resultados (id_usuario, id_pregunta, id_juego, respuesta_usuario, es_correcta, puntos_obtenidos, tiempo_respuesta)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [userId, preguntaId, id_juego, respuesta, esCorrecta, puntosObtenidos, tiempoMaximo - tiempoRestante]
        );

        await pool.query('COMMIT');

        res.json({
            success: true,
            data: {
                esCorrecta: esCorrecta,
                opcionCorrecta: opcionCorrectaLetra,
                puntosObtenidos: puntosObtenidos
            }
        });

    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Error al verificar respuesta:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor al verificar la respuesta.' });
    }
});

router.post('/end-game', async (req,res) => {
    const { id_juego, puntuacion_final } = req.body;
    const userId = req.session.userId;

    if (!id_juego || puntuacion_final === undefined) {
        return res.status(400).json({ error: 'Faltan datos (id_juego, puntuacion_final).' });
    }

    try {
        // actualiza la fila correspondiente en la tabla 'juegos'
        const result = await pool.query(
            'UPDATE juegos SET puntuacion_final = $1 WHERE id = $2 AND id_usuario = $3',
            [puntuacion_final, id_juego, userId]
        );

        // verifica si la fila se actualizó correctamente
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'El juego no se encontró o no pertenece al usuario.' });
        }

        res.status(200).json({ success: true, message: 'Juego finalizado y puntuación guardada.' });

    } catch (err) {
        console.error('Error al finalizar el juego:', err);
        res.status(500).json({ err: 'Error interno del servidor.' });
    }
});

/**
 * @route GET /api/game/leaderboard
 * @description Obtiene el ranking general de jugadores
 * @returns {Object} Lista de jugadores ordenados por puntuación
 */
router.get('/leaderboard', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                u.id as usuario_id,
                u.nombre as nombre_usuario,
                COUNT(r.id) as total_respuestas,
                SUM(CASE WHEN r.es_correcta THEN 1 ELSE 0 END) as respuestas_correctas,
                SUM(r.puntos_obtenidos) as puntuacion_total,
                ROUND(AVG(CASE WHEN r.es_correcta THEN r.puntos_obtenidos ELSE NULL END), 2) as promedio_puntos_correctas,
                MIN(r.tiempo_respuesta) as mejor_tiempo
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
            error: 'Error al obtener el ranking',
            detalles: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * @route GET /api/game/user-stats/:userId
 * @description Obtiene las estadísticas de un jugador específico
 * @param {string} userId - ID del usuario
 * @returns {Object} Estadísticas detalladas del jugador
 */
router.get('/user-stats/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        // Verificar si el usuario existe
        const userCheck = await pool.query(
            'SELECT id, nombre FROM registro WHERE id = $1',
            [userId]
        );

        if (userCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }

        // Obtener estadísticas generales
        const statsQuery = await pool.query(`
            SELECT 
                COUNT(r.id) as total_respuestas,
                SUM(CASE WHEN r.es_correcta THEN 1 ELSE 0 END) as respuestas_correctas,
                COALESCE(SUM(r.puntos_obtenidos), 0) as puntuacion_total,
                ROUND(
                    AVG(CASE 
                        WHEN r.es_correcta THEN r.puntos_obtenidos 
                        ELSE NULL 
                    END) FILTER (WHERE r.es_correcta), 
                    2
                ) as promedio_puntos_correctas,
                MIN(r.tiempo_respuesta) as mejor_tiempo
            FROM resultados r
            WHERE r.id_usuario = $1
            GROUP BY r.id_usuario
        `, [userId]);

        // Obtener estadísticas por categoría
        const categoriasQuery = await pool.query(`
            SELECT 
                c.id as categoria_id,
                c.categoria as nombre_categoria,
                COUNT(r.id) as total_preguntas,
                SUM(CASE WHEN r.es_correcta THEN 1 ELSE 0 END) as correctas,
                COALESCE(SUM(r.puntos_obtenidos), 0) as puntos
            FROM resultados r
            JOIN preguntas p ON r.id_pregunta = p.id
            JOIN categorias c ON p.id_categoria = c.id
            WHERE r.id_usuario = $1
            GROUP BY c.id, c.categoria
            ORDER BY puntos DESC
        `, [userId]);

        // Obtener historial reciente
        const historialQuery = await pool.query(`
            SELECT 
                r.fecha_respuesta,
                p.pregunta,
                r.respuesta_usuario,
                r.es_correcta,
                r.puntos_obtenidos,
                r.tiempo_respuesta,
                c.categoria
            FROM resultados r
            JOIN preguntas p ON r.id_pregunta = p.id
            JOIN categorias c ON p.id_categoria = c.id
            WHERE r.id_usuario = $1
            ORDER BY r.fecha_respuesta DESC
            LIMIT 10
        `, [userId]);

        // Construir respuesta
        const response = {
            success: true,
            data: {
                usuario: {
                    id: userCheck.rows[0].id,
                    nombre: userCheck.rows[0].nombre
                },
                estadisticas: statsQuery.rows[0] || {
                    total_respuestas: 0,
                    respuestas_correctas: 0,
                    puntuacion_total: 0,
                    promedio_puntos_correctas: 0,
                    mejor_tiempo: null
                },
                por_categoria: categoriasQuery.rows,
                historial: historialQuery.rows
            }
        };

        res.json(response);

    } catch (error) {
        console.error('Error al obtener estadísticas del usuario:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error al obtener estadísticas',
            detalles: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;
