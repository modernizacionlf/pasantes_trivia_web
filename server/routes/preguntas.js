const express = require('express');
const pool = require('../db');
const { verificarFiscalizador } = require('./auth');
const router = express.Router();
const fs = require('fs'); 
const path = require('path'); 

const UPLOAD_DIR = path.join(__dirname, '../uploads/preguntas'); 
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// GET /preguntas - Obtener preguntas de la categoría del fiscalizador
router.get('/', verificarFiscalizador, async (req, res) => {
    try {
        const fiscalizador = req.session.fiscalizador;
        const query = `
            SELECT
                p.id,
                p.pregunta,
                p.verificada,
                r.opcion_a,
                r.opcion_b,
                r.opcion_c,
                r.opcion_d,
                r.opcion_correcta,
                p.imagen  
            FROM preguntas p
            LEFT JOIN respuestas r ON p.id = r.id_pregunta
            WHERE p.id_categoria = $1
            ORDER BY p.id DESC
        `;
        const result = await pool.query(query, [fiscalizador.id_categoria]);
        res.json({
            success: true,
            preguntas: result.rows
        });
    } catch (error) {
        console.error('Error obteniendo preguntas:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// POST /preguntas - Crear nueva pregunta
router.post('/', verificarFiscalizador, async (req, res) => {
    const client = await pool.connect();
    try {
        const fiscalizador = req.session.fiscalizador;
        const { pregunta, opcion_a, opcion_b, opcion_c, opcion_d, opcion_correcta_key, imagen } = req.body; 

        if (!pregunta || !opcion_a || !opcion_b || !opcion_c || !opcion_d || !opcion_correcta_key) {
            return res.status(400).json({
                success: false,
                error: 'Todos los campos de texto son requeridos'
            });
        }

        const validOptionKeys = ['opcion_a', 'opcion_b', 'opcion_c', 'opcion_d'];
        if (!validOptionKeys.includes(opcion_correcta_key)) {
            return res.status(400).json({
                success: false,
                error: 'La clave de la opción correcta debe ser "opcion_a", "opcion_b", "opcion_c" o "opcion_d"'
            });
        }

        let opcion_correcta_value;
        switch (opcion_correcta_key) {
            case 'opcion_a':
                opcion_correcta_value = opcion_a;
                break;
            case 'opcion_b':
                opcion_correcta_value = opcion_b;
                break;
            case 'opcion_c':
                opcion_correcta_value = opcion_c;
                break;
            case 'opcion_d':
                opcion_correcta_value = opcion_d;
                break;
        }

        let imageDbPath = null; 

        if (imagen) {
            const matches = imagen.match(/^data:image\/png;base64,(.+)$/);
            if (!matches || matches.length < 2) {
                return res.status(400).json({
                    success: false,
                    error: 'Formato de imagen Base64 PNG inválido.'
                });
            }
            const base64Data = matches[1];
            const buffer = Buffer.from(base64Data, 'base64');

            const fileName = `pregunta_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.png`; // Nombre único
            const filePath = path.join(UPLOAD_DIR, fileName);

            fs.writeFileSync(filePath, buffer); 
            imageDbPath = `/uploads/preguntas/${fileName}`;
        }
        

        await client.query('BEGIN');

        const preguntaQuery = `
            INSERT INTO preguntas (pregunta, id_categoria, verificada, imagen) 
            VALUES ($1, $2, false, $3) 
            RETURNING id
        `;
        const preguntaResult = await client.query(preguntaQuery, [
            pregunta,
            fiscalizador.id_categoria,
            imageDbPath 
        ]);

        const preguntaId = preguntaResult.rows[0].id;

        await client.query(
            'INSERT INTO respuestas (id_pregunta, opcion_a, opcion_b, opcion_c, opcion_d, opcion_correcta) VALUES ($1, $2, $3, $4, $5, $6)',
            [preguntaId, opcion_a, opcion_b, opcion_c, opcion_d, opcion_correcta_value]
        );

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Pregunta creada exitosamente',
            pregunta_id: preguntaId,
            image_path: imageDbPath 
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creando pregunta:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor al crear la pregunta'
        });
    } finally {
        client.release();
    }
});

router.patch('/:id/verificar', verificarFiscalizador, async (req, res) => {
    const client = await pool.connect();
    const preguntaId = req.params.id;
    try {
        const fiscalizador = req.session.fiscalizador;
        await client.query('BEGIN');
        const permisoResult = await client.query(
            'SELECT id FROM preguntas WHERE id = $1 AND id_categoria = $2',
            [preguntaId, fiscalizador.id_categoria]
        );
        if (permisoResult.rows.length === 0) {
            return res.status(403).json({ success: false, error: 'No tienes permisos para modificar esta pregunta.' });
        }
        const updateQuery = 'UPDATE preguntas SET verificada = true WHERE id = $1';
        const result = await client.query(updateQuery, [preguntaId]);
        if (result.rowCount === 0) {
            throw new Error('La pregunta no se encontró para ser actualizada.');
        }
        await client.query('COMMIT');
        res.json({ success: true, message: 'Pregunta verificada exitosamente.' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al verificar la pregunta:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor.' });
    } finally {
        client.release();
    }
});

// PUT /preguntas/:id - Actualizar una pregunta existente
router.put('/:id', verificarFiscalizador, async (req, res) => {
    const client = await pool.connect();
    const preguntaId = req.params.id;
    try {
        const fiscalizador = req.session.fiscalizador;
        const { texto, verificada, opcion_a, opcion_b, opcion_c, opcion_d, opcion_correcta, imagen } = req.body;
        await client.query('BEGIN');
        const verificarResult = await client.query(
            'SELECT imagen FROM preguntas WHERE id = $1 AND id_categoria = $2',
            [preguntaId, fiscalizador.id_categoria]
        );
        if (verificarResult.rows.length === 0) {
            return res.status(403).json({ success: false, error: 'No tienes permisos para editar esta pregunta' });
        }
        const oldImageDbPath = verificarResult.rows[0].imagen;
        let newImageDbPath = oldImageDbPath;
        if (imagen === null) {
            if (oldImageDbPath) {
                const oldFullPath = path.join(__dirname, '..', oldImageDbPath);
                if (fs.existsSync(oldFullPath)) fs.unlinkSync(oldFullPath);
            }
            newImageDbPath = null;
        }
        if (imagen && typeof imagen === 'string' && imagen.startsWith('data:image/')) {
            const matches = imagen.match(/^data:image\/png;base64,(.+)$/);
            if (!matches) throw new Error('Formato de imagen Base64 PNG inválido.');
            const buffer = Buffer.from(matches[1], 'base64');
            const fileName = `pregunta_${Date.now()}.png`;
            const filePath = path.join(UPLOAD_DIR, fileName);
            fs.writeFileSync(filePath, buffer);
            newImageDbPath = `/uploads/preguntas/${fileName}`;
            if (oldImageDbPath) {
                const oldFullPath = path.join(__dirname, '..', oldImageDbPath);
                if (fs.existsSync(oldFullPath)) fs.unlinkSync(oldFullPath);
            }
        }
        const preguntaQuery = `
            UPDATE preguntas 
            SET pregunta = $1, imagen = $2, verificada = $3
            WHERE id = $4
        `;
        await client.query(preguntaQuery, [texto, newImageDbPath, verificada, preguntaId]);
        let opcion_correcta_value = '';
        switch (opcion_correcta) {
            case 'opcion_a': opcion_correcta_value = opcion_a; break;
            case 'opcion_b': opcion_correcta_value = opcion_b; break;
            case 'opcion_c': opcion_correcta_value = opcion_c; break;
            case 'opcion_d': opcion_correcta_value = opcion_d; break;
        }
        const respuestasQuery = `
            UPDATE respuestas 
            SET opcion_a = $1, opcion_b = $2, opcion_c = $3, opcion_d = $4, opcion_correcta = $5 
            WHERE id_pregunta = $6
        `;
        await client.query(respuestasQuery, [opcion_a, opcion_b, opcion_c, opcion_d, opcion_correcta_value, preguntaId]);
        await client.query('COMMIT');
        res.json({ success: true, message: 'Pregunta actualizada exitosamente' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error actualizando pregunta:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor' });
    } finally {
        client.release();
    }
});

// DELETE /preguntas/:id - Eliminar pregunta
router.delete('/:id', verificarFiscalizador, async (req, res) => {
    const client = await pool.connect();

    try {
        const fiscalizador = req.session.fiscalizador;
        const preguntaId = req.params.id;

        const getImageQuery = `SELECT imagen FROM preguntas WHERE id = $1 AND id_categoria = $2`;
        const imageResult = await client.query(getImageQuery, [preguntaId, fiscalizador.id_categoria]);
        const imageToDeletePath = imageResult.rows.length > 0 ? imageResult.rows[0].imagen : null;

        const verificarQuery = `
            SELECT id FROM preguntas
            WHERE id = $1 AND id_categoria = $2
        `;
        const verificarResult = await client.query(verificarQuery, [preguntaId, fiscalizador.id_categoria]);

        if (verificarResult.rows.length === 0) {
            return res.status(403).json({
                success: false,
                error: 'No tienes permisos para eliminar esta pregunta'
            });
        }

        await client.query('BEGIN');
        await client.query('DELETE FROM respuestas WHERE id_pregunta = $1', [preguntaId]);
        await client.query('DELETE FROM preguntas WHERE id = $1', [preguntaId]);
        await client.query('COMMIT');

        if (imageToDeletePath) {
            const fullImagePath = path.join(__dirname, '..', imageToDeletePath); 
            if (fs.existsSync(fullImagePath)) {
                fs.unlinkSync(fullImagePath); 
                console.log(`Imagen eliminada del disco: ${fullImagePath}`);
            } else {
                console.warn(`Intento de eliminar imagen que no existe: ${fullImagePath}`);
            }
        }
        res.json({
            success: true,
            message: 'Pregunta eliminada exitosamente'
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error eliminando pregunta:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    } finally {
        client.release();
    }
});

module.exports = router;