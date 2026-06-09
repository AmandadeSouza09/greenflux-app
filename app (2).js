const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// CONEXÃO COM BANCO
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'greenflux'
});

// Páginas estáticas
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Index.HTML'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, ' (2).html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'register.html'));
});

// ROTA DE LOGIN
app.post('/login', (req, res) => {
    const { email, senha } = req.body;

    const sql = 'SELECT * FROM usuarios WHERE email = ? AND senha = ?';

    db.query(sql, [email, senha], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Erro no servidor' });
        }

        if (results.length > 0) {
            res.json({ message: 'Login realizado com sucesso' });
        } else {
            res.status(401).json({ message: 'E-mail ou senha inválidos' });
        }
    });
});

// ROTA DE REGISTRO
app.post('/register', (req, res) => {
    const { nome, email, senha, confirmSenha } = req.body;

    if (!nome || !email || !senha || !confirmSenha) {
        return res.status(400).json({ message: 'Preencha todos os campos.' });
    }

    if (senha !== confirmSenha) {
        return res.status(400).json({ message: 'As senhas não coincidem.' });
    }

    const checkSql = 'SELECT id FROM usuarios WHERE email = ?';
    db.query(checkSql, [email], (checkErr, checkResults) => {
        if (checkErr) {
            return res.status(500).json({ message: 'Erro no servidor.' });
        }

        if (checkResults.length > 0) {
            return res.status(409).json({ message: 'E-mail já cadastrado.' });
        }

        const insertSql = 'INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)';
        db.query(insertSql, [nome, email, senha], insertErr => {
            if (insertErr) {
                return res.status(500).json({ message: 'Erro ao cadastrar usuário.' });
            }

            res.json({ message: 'Cadastro realizado com sucesso.' });
        });
    });
});

// SERVIDOR
app.listen(3000, () => {
    console.log('Servidor rodando em http://localhost:3000');
});
