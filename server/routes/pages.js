const express = require('express');
const path = require('path');
const router = express.Router();
const { verificarFiscalizador } = require('./auth');

// GET /pages/login
router.get('/login', (req, res) => {
    if (req.session && req.session.fiscalizador) {
        return res.redirect('/dashboard');
    }
    res.sendFile(path.join(__dirname, '../../public/loginPanel.html')); 
});

// GET /pages/dashboard
router.get('/dashboard', verificarFiscalizador, (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/dashboard.html')); 
});

// GET /pages/edit
router.get('/edit', verificarFiscalizador, (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/edit.html'));
});

// GET /pages/index
router.get('/index', (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/index.html')); 
});

// GET /pages/categories
router.get('/categories', (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/categories.html')); 
});

// GET/pages/trivia
router.get('/trivia', (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/trivia.html')); 
});

module.exports = router;