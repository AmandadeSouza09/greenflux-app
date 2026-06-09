from flask import Flask, request, jsonify, send_from_directory
from werkzeug.security import generate_password_hash, check_password_hash
import re

app = Flask(__name__, static_folder='.', static_url_path='')

# Usuário de demonstração para login
users = {
    'user@greenflux.com': generate_password_hash('senha123')
}

# Armazena cartões cadastrados durante a execução
cards = []

CARD_NUMBER_PATTERN = re.compile(r'^\d{16}$')
EXPIRY_PATTERN = re.compile(r'^(0[1-9]|1[0-2])/(\d{2})$')
CVV_PATTERN = re.compile(r'^\d{3,4}$')


def mask_card_number(number: str) -> str:
    number = re.sub(r'\D', '', number)
    return '•••• •••• •••• ' + number[-4:]


@app.route('/')
def homepage():
    return app.send_static_file('index.html')


@app.route('/login', methods=['GET', 'POST'])
def login_route():
    if request.method == 'GET':
        return app.send_static_file('login.html')

    email = request.form.get('email', '').strip().lower()
    senha = request.form.get('senha', '').strip()

    if not email or not senha:
        return jsonify(success=False, message='Preencha e-mail e senha.'), 400

    senha_hash = users.get(email)
    if not senha_hash or not check_password_hash(senha_hash, senha):
        return jsonify(success=False, message='Credenciais inválidas. Verifique e tente novamente.'), 401

    return jsonify(success=True, message='Login realizado com sucesso!')


@app.route('/card', methods=['GET'])
def card_page():
    return app.send_static_file('card.html')


@app.route('/register-card', methods=['POST'])
def register_card():
    cardholder = request.form.get('cardholder', '').strip()
    card_number = re.sub(r'\D', '', request.form.get('card-number', ''))
    expiry = request.form.get('expiry', '').strip()
    cvv = request.form.get('cvv', '').strip()

    if not cardholder or not card_number or not expiry or not cvv:
        return jsonify(success=False, message='Todos os campos são obrigatórios.'), 400

    if not CARD_NUMBER_PATTERN.match(card_number):
        return jsonify(success=False, message='Número do cartão inválido. Use 16 dígitos.'), 400

    if not EXPIRY_PATTERN.match(expiry):
        return jsonify(success=False, message='Data de validade inválida. Use MM/AA.'), 400

    if not CVV_PATTERN.match(cvv):
        return jsonify(success=False, message='CVV inválido. Use 3 ou 4 dígitos.'), 400

    cards.append({
        'cardholder': cardholder,
        'card_number': mask_card_number(card_number),
        'expiry': expiry,
        'cvv': cvv[-3:]
    })

    return jsonify(success=True, message='Cartão cadastrado com sucesso!')


@app.route('/<path:filename>')
def static_files(filename):
    return send_from_directory('.', filename)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
