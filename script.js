// script.js - Interactive Features GreenFlux

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.querySelector('.search-box input');
    const searchButton = document.querySelector('.btn-search');
    const cartButton = document.querySelector('.btn-cart');
    const cartCount = document.querySelector('.cart-count');
    const mobileCartCount = document.querySelector('.mobile-cart-count');
    const mobileCartLink = document.querySelector('.mobile-cart-link');
    const categoryCards = document.querySelectorAll('.category-card');

    const purchaseSection = document.getElementById('purchase-section');
    const selectedFuelText = document.getElementById('selected-fuel');
    const fuelSubtypeRow = document.querySelector('.fuel-subtype-row');
    const fuelSubtypeSelect = document.getElementById('fuel-subtype');
    const litersInput = document.getElementById('liters-input');
    const moneyInput = document.getElementById('money-input');
    const locationInput = document.getElementById('location-input');
    const addToCartButton = document.getElementById('add-to-cart');
    const closePurchaseButtons = document.querySelectorAll('.close-purchase, #cancel-purchase');

    const paymentSection = document.getElementById('payment-section');
    const summaryFuel = document.getElementById('summary-fuel');
    const summaryLiters = document.getElementById('summary-liters');
    const summaryDistance = document.getElementById('summary-distance');
    const summaryLocation = document.getElementById('summary-location');
    const summarySubtotal = document.getElementById('summary-subtotal');
    const summaryTax = document.getElementById('summary-tax');
    const summaryFreight = document.getElementById('summary-freight');
    const summaryTotal = document.getElementById('summary-total');
    const summaryTime = document.getElementById('summary-time');
    const summaryPix = document.getElementById('summary-pix');
    const summaryDebit = document.getElementById('summary-debit');
    const summaryCredit = document.getElementById('summary-credit');
    const summaryCash = document.getElementById('summary-cash');
    const closePaymentButton = document.getElementById('close-payment');
    const checkoutButton = document.getElementById('checkout-button');
    const paymentRows = document.querySelectorAll('.payment-method-row');

    const orders = [];
    let currentFuelType = '';
    const STORAGE_TRANSPORT_REQUESTS_KEY = 'greenflux_transport_requests';

    const getSavedTransportRequests = () => {
        const raw = localStorage.getItem(STORAGE_TRANSPORT_REQUESTS_KEY);
        if (!raw) return [];
        try {
            return JSON.parse(raw);
        } catch (error) {
            console.warn('Erro ao ler pedidos de transporte do localStorage:', error);
            return [];
        }
    };

    const saveTransportRequests = requests => {
        localStorage.setItem(STORAGE_TRANSPORT_REQUESTS_KEY, JSON.stringify(requests));
    };

    const getNextTransportRequestId = requests => {
        if (!requests.length) return 1;
        return Math.max(...requests.map(r => r.id)) + 1;
    };

    const createTransportRequestFromOrder = order => {
        const requests = getSavedTransportRequests();
        const nearestPosto = getPostosComDistancias(order.location).sort((a, b) => a.distance - b.distance)[0];
        const currentUser = getCurrentUser();
        const request = {
            id: getNextTransportRequestId(requests),
            customerName: currentUser ? currentUser.nome : 'Cliente',
            from: nearestPosto ? nearestPosto.name : 'Posto mais próximo',
            to: order.location,
            distance: order.distance || 0,
            liters: order.liters,
            fuelType: `${order.type} — ${order.variation}`,
            total: order.total || (order.subtotal + (order.freight || 0) + (order.tax || 0)),
            paymentMethod: null,
            status: 'Pendente',
            createdAt: Date.now()
        };
        requests.push(request);
        saveTransportRequests(requests);
        return request;
    };

    const formatOrderDateTime = timestamp => {
        if (!timestamp) return 'Data indisponível';
        const date = new Date(timestamp);
        const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
        const timeOptions = { hour: '2-digit', minute: '2-digit' };
        const dateString = date.toLocaleDateString('pt-BR', options);
        const timeString = date.toLocaleTimeString('pt-BR', timeOptions);
        return `${dateString} · ${timeString}`;
    };

    const fuelOptions = {
        Gasolina: [
            { value: 'Gasolina Comum', label: 'Gasolina Comum - R$ 6,49', price: 6.49 },
            { value: 'Gasolina Aditivada', label: 'Gasolina Aditivada - R$ 6,99', price: 6.99 }
        ],
        Etanol: [
            { value: 'Etanol', label: 'Etanol — R$ 3,99', price: 3.99 }
        ],
        Elétrico: [
            { value: 'Elétrico', label: 'Elétrico — R$ 2,19', price: 2.19 }
        ]
    };
    const TAX_PER_KM = 1.10;
    const FREIGHT_FIXED = 9.30;
    
    // === DADOS DOS POSTOS E DISTÂNCIAS ===
    const postos = [
        {
            name: 'Auto Posto Pekny',
            address: 'Rua João Pekny, 1498',
            distances: {
                'Gerando Falcões': 2.6,
                'Praça da Bíblia': 1.9,
                'Jardim Helena': 3.3,
                'Vila Julia': 2.8,
                'Avenida 18 de Julho': 2.1
            }
        },
        {
            name: 'Auto Posto Ipiranga – Calmon Viana',
            address: 'Av. Brasil, 1170',
            distances: {
                'Gerando Falcões': 3.1,
                'Praça da Bíblia': 2.3,
                'Jardim Helena': 3.6,
                'Vila Julia': 2.9,
                'Avenida 18 de Julho': 2.5
            }
        },
        {
            name: 'Posto Portal de Poá',
            address: 'Av. Fernando Rossi',
            distances: {
                'Gerando Falcões': 2.3,
                'Praça da Bíblia': 1.6,
                'Jardim Helena': 3.1,
                'Vila Julia': 2.6,
                'Avenida 18 de Julho': 1.9
            }
        }
    ];

    // Função para retornar os postos disponíveis com suas distâncias
    const getPostosComDistancias = (location) => {
        if (!location) return [];
        return postos.map(posto => ({
            ...posto,
            distance: posto.distances[location]
        })).filter(p => p.distance !== undefined);
    };

    // Função para obter a distância mínima (do posto mais próximo)
    const getMinDistance = (location) => {
        const postosDisponiveis = getPostosComDistancias(location);
        if (postosDisponiveis.length === 0) return null;
        return Math.min(...postosDisponiveis.map(p => p.distance));
    };

    // Função para calcular a taxa baseada na distância
    const calculateTaxByDistance = (distance) => {
        if (!distance || distance <= 0) return 0;
        return Number((distance * TAX_PER_KM).toFixed(2));
    };

    const getSubtotalFromInput = (fuelType, liters, fuelSubtype) => {
        const typedSubtotal = parseMoneyValue(moneyInput?.value);
        if (typedSubtotal > 0) return typedSubtotal;
        return calculateFuelPrice(fuelType, liters, fuelSubtype);
    };

    // Função para atualizar o cálculo em tempo real
    const updateFreightCalculation = () => {
        const liters = Number(litersInput.value) || 0;
        const location = locationInput.value;
        const fuelType = currentFuelType;
        const fuelSubtype = fuelSubtypeSelect?.value;

        const freightCalcDiv = document.getElementById('freight-calculation');
        const calcDistance = document.getElementById('calc-distance');
        const calcTaxLabel = document.getElementById('calc-tax-label');
        const calcSubtotal = document.getElementById('calc-subtotal');
        const calcTax = document.getElementById('calc-tax');
        const calcFreight = document.getElementById('calc-freight');
        const calcTotal = document.getElementById('calc-total');

        if (!location || fuelType === '—' || !fuelSubtype) {
            freightCalcDiv.style.display = 'none';
            return;
        }

        const distance = getMinDistance(location);
        if (distance === null) {
            freightCalcDiv.style.display = 'none';
            return;
        }

        const subtotal = getSubtotalFromInput(fuelType, liters, fuelSubtype);
        const tax = calculateTaxByDistance(distance);
        const freight = FREIGHT_FIXED;
        const total = subtotal + tax + freight;

        calcDistance.textContent = distance.toFixed(1).replace('.', ',');
        if (calcTaxLabel) {
            calcTaxLabel.textContent = `${distance.toFixed(1).replace('.', ',')} × R$ ${TAX_PER_KM.toFixed(2).replace('.', ',')}`;
        }
        calcSubtotal.textContent = formatMoney(subtotal);
        calcTax.textContent = formatMoney(tax);
        calcFreight.textContent = formatMoney(freight);
        calcTotal.textContent = formatMoney(total);
        freightCalcDiv.style.display = 'block';
    };

    // === Role-based UI ===
    const transporterSection = document.getElementById('transporter-dashboard');
    const transportList = document.getElementById('transport-list');

    let transportRequests = getSavedTransportRequests();

    const renderTransportRequests = () => {
        transportRequests = getSavedTransportRequests();
        transportRequests.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        if (!transportList) return;
        transportList.innerHTML = '';

        if (!transportRequests.length) {
            transportList.innerHTML = '<p>Nenhum pedido disponível no momento.</p>';
            return;
        }

        transportRequests.forEach(req => {
            const item = document.createElement('div');
            item.className = 'transport-item';
            item.innerHTML = `
                <div class="transport-left">
                    <strong>${req.customerName} — Pedido ${req.id}</strong>
                    <div>${req.from} → ${req.to}</div>
                    <div>${formatOrderDateTime(req.createdAt)}</div>
                    <div>${req.liters} litros • ${req.distance} km</div>
                    <div>Combustível: ${req.fuelType}</div>
                    <div>Pagamento: ${req.paymentMethod || 'Aguardando pagamento'}</div>
                    <div>Total: ${formatMoney(req.total || 0)}</div>
                </div>
                <div class="transport-right">
                    <div class="transport-status">${req.status}</div>
                    <div class="transport-actions">
                        <button data-id="${req.id}" class="btn-accept">Aceitar</button>
                        <button data-id="${req.id}" class="btn-decline">Recusar</button>
                    </div>
                </div>
            `;
            transportList.appendChild(item);
        });

        // handlers
        transportList.querySelectorAll('.btn-accept').forEach(btn => btn.addEventListener('click', (e) => {
            const id = Number(btn.getAttribute('data-id'));
            // remover o pedido ao aceitar (simula ação no backend)
            transportRequests = transportRequests.filter(x => x.id !== id);
            saveTransportRequests(transportRequests);
            alert('Pedido aceito e removido da lista.');
            renderTransportRequests();
        }));

        transportList.querySelectorAll('.btn-decline').forEach(btn => btn.addEventListener('click', (e) => {
            const id = Number(btn.getAttribute('data-id'));
            // remover o pedido ao recusar também
            transportRequests = transportRequests.filter(x => x.id !== id);
            saveTransportRequests(transportRequests);
            alert('Pedido recusado e removido da lista.');
            renderTransportRequests();
        }));
    };

    const renderRoleUI = () => {
        try {
            const current = getCurrentUser();
            if (current && current.role === 'transportador') {
                // show transporter view
                if (transporterSection) transporterSection.classList.remove('hidden');
                // hide client-specific sections
                purchaseSection.classList.add('hidden');
                document.querySelectorAll('.categories, .hero').forEach(el => el.classList.add('hidden'));
                document.body.classList.remove('cliente-logado');
                renderTransportRequests();
            } else if (current && current.role === 'cliente') {
                // client view
                if (transporterSection) transporterSection.classList.add('hidden');
                document.querySelectorAll('.categories, .hero').forEach(el => el.classList.remove('hidden'));
                document.body.classList.add('cliente-logado');
            } else {
                if (transporterSection) transporterSection.classList.add('hidden');
                document.querySelectorAll('.categories, .hero').forEach(el => el.classList.remove('hidden'));
                document.body.classList.remove('cliente-logado');
            }
        } catch (err) {
            console.warn('Erro ao renderizar UI por role', err);
        }
    };

    const paymentRates = {
        PIX: 0,
        Débito: 0.01,
        Crédito: 0.03,
        Dinheiro: 0
    };
    let selectedPaymentMethod = null;

    const poaMapPanel = document.getElementById('poa-map-panel');
    const openPoaMapButton = document.getElementById('open-poa-map');
    const closePoaMapButton = document.getElementById('close-poa-map');

    let showPoaMapPanel = () => {
        if (poaMapPanel) {
            poaMapPanel.classList.remove('hidden');
        }
    };

    const hidePoaMapPanel = () => {
        if (poaMapPanel) {
            poaMapPanel.classList.add('hidden');
        }
    };

    if (openPoaMapButton) {
        openPoaMapButton.addEventListener('click', showPoaMapPanel);
    }

    if (closePoaMapButton) {
        closePoaMapButton.addEventListener('click', hidePoaMapPanel);
    }

    // --- Image zoom & pan controls ---
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    const imgWrap = document.querySelector('.map-image-wrap');
    const poaImg = document.getElementById('poa-map-image');

    let scale = 1;
    const minScale = 1;
    const maxScale = 3;
    let translateX = 0;
    let translateY = 0;
    let isPanning = false;
    let panStart = { x: 0, y: 0 };

    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

    function updateTransform() {
        if (!poaImg) return;
        poaImg.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    }

    function updateLimitsAndClamp() {
        if (!poaImg || !imgWrap) return;
        const baseW = poaImg.clientWidth;
        const baseH = poaImg.clientHeight;
        const cw = imgWrap.clientWidth;
        const ch = imgWrap.clientHeight;
        const scaledW = baseW * scale;
        const scaledH = baseH * scale;
        const maxTX = Math.max(0, (scaledW - cw) / 2);
        const maxTY = Math.max(0, (scaledH - ch) / 2);
        translateX = clamp(translateX, -maxTX, maxTX);
        translateY = clamp(translateY, -maxTY, maxTY);
    }

    function setScale(newScale, centerX = null, centerY = null) {
        // optional centering not strictly required for basic zoom
        scale = clamp(newScale, minScale, maxScale);
        if (scale === minScale) {
            translateX = 0;
            translateY = 0;
        }
        updateLimitsAndClamp();
        updateTransform();
    }

    zoomInBtn?.addEventListener('click', () => setScale((+(scale + 0.25).toFixed(2))));
    zoomOutBtn?.addEventListener('click', () => setScale((+(scale - 0.25).toFixed(2))));

    // Pointer-based panning (drag)
    if (imgWrap && poaImg) {
        imgWrap.addEventListener('pointerdown', (e) => {
            if (scale <= 1) return;
            isPanning = true;
            imgWrap.setPointerCapture(e.pointerId);
            panStart.x = e.clientX - translateX;
            panStart.y = e.clientY - translateY;
            poaImg.classList.add('dragging');
            e.preventDefault();
        });

        imgWrap.addEventListener('pointermove', (e) => {
            if (!isPanning) return;
            translateX = e.clientX - panStart.x;
            translateY = e.clientY - panStart.y;
            updateLimitsAndClamp();
            updateTransform();
        });

        imgWrap.addEventListener('pointerup', (e) => {
            if (!isPanning) return;
            isPanning = false;
            try { imgWrap.releasePointerCapture(e.pointerId); } catch (err) {}
            poaImg.classList.remove('dragging');
        });

        imgWrap.addEventListener('pointercancel', () => {
            isPanning = false;
            poaImg.classList.remove('dragging');
        });
    }

    // Reset transform when opening
    const originalShow = showPoaMapPanel;
    showPoaMapPanel = () => {
        if (poaMapPanel) {
            // reset
            scale = 1;
            translateX = 0;
            translateY = 0;
            updateTransform();
            poaMapPanel.classList.remove('hidden');
        }
    };

    const populateSubtypeOptions = fuelType => {
        if (!fuelSubtypeSelect) return;
        const options = fuelOptions[fuelType] ?? [];
        fuelSubtypeSelect.innerHTML = '';

        if (fuelType === 'Gasolina') {
            fuelSubtypeRow?.classList.remove('hidden');
            fuelSubtypeSelect.innerHTML = '<option value="" disabled selected>Selecione a gasolina</option>';
            options.forEach(option => {
                const opt = document.createElement('option');
                opt.value = option.value;
                opt.textContent = option.label;
                fuelSubtypeSelect.appendChild(opt);
            });
        } else {
            fuelSubtypeRow?.classList.add('hidden');
            const singleOption = options[0];
            if (singleOption) {
                const opt = document.createElement('option');
                opt.value = singleOption.value;
                opt.textContent = singleOption.label;
                opt.selected = true;
                fuelSubtypeSelect.appendChild(opt);
            }
        }
    };

    const formatMoney = value => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const getSelectedFuelDisplay = () => {
        if (!currentFuelType) return '—';
        // If subtype select has a selected option, prefer its full label (it includes price)
        try {
            if (fuelSubtypeSelect && fuelSubtypeSelect.selectedOptions && fuelSubtypeSelect.selectedOptions.length) {
                let txt = fuelSubtypeSelect.selectedOptions[0].textContent || fuelSubtypeSelect.selectedOptions[0].innerText || '';
                // normalize dash characters to simple hyphen and spacing
                txt = txt.replace(/\u2014|\u2013|\u2012|—/g, '-').replace(/\s*-\s*/, ' - ');
                return txt || currentFuelType;
            }
        } catch (err) {
            // ignore and fallback
        }
        // fallback: show fuel type and unit price
        const price = getSelectedUnitPrice(currentFuelType);
        return `${currentFuelType} - ${formatMoney(price)}`;
    };

    const getSelectedUnitPrice = (fuelType = currentFuelType, subtype = fuelSubtypeSelect?.value) => {
        if (!fuelType || !fuelOptions[fuelType]) return 0;
        const options = fuelOptions[fuelType];
        if (!subtype) return options[0]?.price || 0;
        const found = options.find(o => o.value === subtype);
        return found ? found.price : (options[0]?.price || 0);
    };

    const calculateFuelPrice = (fuelType, liters, fuelSubtype) => {
        const price = getSelectedUnitPrice(fuelType, fuelSubtype);
        return Number((price * liters).toFixed(2));
    };

    const scrollToElement = element => element?.scrollIntoView({ behavior: 'smooth', block: 'start' });

    const parseMoneyValue = (str) => {
        if (!str && str !== 0) return 0;
        // normalize comma to dot and remove non-numeric except dot
        const normalized = String(str).replace(/\./g, '').replace(/,/g, '.').replace(/[^\d.]/g, '');
        const v = parseFloat(normalized);
        return isNaN(v) ? 0 : v;
    };

    // Sync money -> liters
    moneyInput?.addEventListener('input', () => {
        const money = parseMoneyValue(moneyInput.value);
        const price = getSelectedUnitPrice();
        if (!price || !money) {
            litersInput.value = '';
            updateFreightCalculation();
            return;
        }
        const liters = +(money / price).toFixed(2);
        litersInput.value = liters;
        updateFreightCalculation();
    });

    // Sync liters -> money
    litersInput?.addEventListener('input', () => {
        const liters = Number(litersInput.value) || 0;
        const price = getSelectedUnitPrice();
        if (!price || !liters) {
            if (moneyInput) moneyInput.value = '';
            updateFreightCalculation();
            return;
        }
        const money = +(liters * price).toFixed(2);
        if (moneyInput) moneyInput.value = money.toFixed(2).replace('.', ',');
        updateFreightCalculation();
    });

    // When fuel subtype changes, recalc based on whichever field has value
    fuelSubtypeSelect?.addEventListener('change', () => {
        selectedFuelText.textContent = getSelectedFuelDisplay();
        if (moneyInput && moneyInput.value) {
            moneyInput.dispatchEvent(new Event('input'));
        } else if (litersInput && litersInput.value) {
            litersInput.dispatchEvent(new Event('input'));
        } else {
            updateFreightCalculation();
        }
    });

    // Event listeners para atualizar cálculo em tempo real
    litersInput?.addEventListener('input', updateFreightCalculation);
    locationInput?.addEventListener('change', updateFreightCalculation);
    fuelSubtypeSelect?.addEventListener('change', updateFreightCalculation);

    const openPurchasePanel = fuelType => {
        currentFuelType = fuelType;
        populateSubtypeOptions(fuelType);
        selectedFuelText.textContent = getSelectedFuelDisplay();
        litersInput.value = '';
        locationInput.value = '';
        if (moneyInput) moneyInput.value = '';
        purchaseSection.classList.remove('hidden');
        scrollToElement(purchaseSection);
    };

    const closePurchasePanel = () => purchaseSection.classList.add('hidden');
    const closePaymentPanel = () => paymentSection.classList.add('hidden');

    const resetPaymentSelection = () => {
        selectedPaymentMethod = null;
        paymentRows.forEach(row => row.classList.remove('selected'));
        checkoutButton.classList.add('hidden');
    };

    const openPaymentPanel = () => {
        if (!orders.length) return;

        const order = orders[orders.length - 1];
        const total = order.total || (order.subtotal + (order.tax || 0) + (order.freight || 0));

        summaryFuel.textContent = `${order.type} — ${order.variation}`;
        summaryLiters.textContent = `${order.liters} ${order.type === 'Elétrico' ? 'kWh' : 'litros'}`;
        summaryDistance.textContent = `${order.distance.toFixed(1)} km`;
        summaryLocation.textContent = order.location;
        summarySubtotal.textContent = formatMoney(order.subtotal);
        summaryTax.textContent = formatMoney(order.tax || 0);
        summaryFreight.textContent = formatMoney(order.freight || 0);
        summaryTotal.textContent = formatMoney(total);
        summaryTime.textContent = `${order.minutes} min`;
        summaryPix.textContent = formatMoney(total * (1 + paymentRates.PIX));
        summaryDebit.textContent = formatMoney(total * (1 + paymentRates.Débito));
        summaryCredit.textContent = formatMoney(total * (1 + paymentRates.Crédito));
        summaryCash.textContent = formatMoney(total * (1 + paymentRates.Dinheiro));

        resetPaymentSelection();
        paymentSection.classList.remove('hidden');
        scrollToElement(paymentSection);
    };

    const updateCartCount = () => {
        const count = orders.length;
        if (cartCount) cartCount.textContent = count;
        if (mobileCartCount) mobileCartCount.textContent = count;
    };

    const handleSearch = () => {
        const address = searchInput.value.trim();
        if (!address) {
            alert('Por favor, digite sua localização para entrega.');
            return;
        }
        alert(`Buscando postos próximos a: ${address}\n\nFuncionalidade em desenvolvimento.`);
    };

    searchButton?.addEventListener('click', handleSearch);
    searchInput?.addEventListener('keypress', e => {
        if (e.key === 'Enter') handleSearch();
    });

    categoryCards.forEach(card => {
        card.addEventListener('click', () => openPurchasePanel(card.dataset.fuel));
    });

    litersInput?.addEventListener('input', updateFreightCalculation);
    locationInput?.addEventListener('change', updateFreightCalculation);
    fuelSubtypeSelect?.addEventListener('change', updateFreightCalculation);

    addToCartButton?.addEventListener('click', () => {
        const fuelType = currentFuelType;
        const fuelSubtype = fuelSubtypeSelect?.value;
        const liters = Number(litersInput.value);
        const location = locationInput.value.trim();

        if (!fuelType || fuelType === '—') {
            alert('Selecione um tipo de combustível.');
            return;
        }

        if (!fuelSubtype) {
            alert('Selecione a variante de combustível.');
            return;
        }

        if (!liters || liters <= 0) {
            alert('Informe a quantidade de litros.');
            return;
        }

        if (!location) {
            alert('Informe a localização de entrega.');
            return;
        }

        const subtotal = getSubtotalFromInput(fuelType, liters, fuelSubtype);
        const distance = getMinDistance(location);
        if (distance === null) {
            alert('Localização inválida. Escolha uma localização disponível.');
            return;
        }
        const tax = calculateTaxByDistance(distance);
        const freight = FREIGHT_FIXED;
        const order = {
            type: fuelType,
            variation: fuelSubtype,
            liters,
            location,
            distance: distance,
            subtotal,
            tax,
            freight,
            total: subtotal + tax + freight,
            minutes: 20 + Math.round(liters * 0.8),
            transportRequestId: null,
            paymentMethod: null
        };

        const transportRequest = createTransportRequestFromOrder(order);
        order.transportRequestId = transportRequest.id;
        orders.push(order);
        updateCartCount();
        alert(`Pedido adicionado ao carrinho:\n\nTipo: ${fuelType} - ${fuelSubtype}\nQuantidade: ${liters} ${fuelType === 'Elétrico' ? 'kWh' : 'litros'}\nDistância: ${distance.toFixed(1)} km\nTaxa: ${formatMoney(order.tax)}\nFrete fixo: ${formatMoney(order.freight)}\nSubtotal: ${formatMoney(order.subtotal)}\nTotal: ${formatMoney(order.total)}\nLocalização: ${location}`);
        closePurchasePanel();
    });

    closePurchaseButtons?.forEach(button => button.addEventListener('click', closePurchasePanel));
    closePaymentButton?.addEventListener('click', closePaymentPanel);

    paymentRows.forEach(row => {
        row.addEventListener('click', () => {
            paymentRows.forEach(item => item.classList.remove('selected'));
            row.classList.add('selected');
            selectedPaymentMethod = row.dataset.payment;
            checkoutButton.classList.remove('hidden');
        });
    });

    checkoutButton?.addEventListener('click', () => {
        if (!orders.length) {
            alert('Seu carrinho está vazio.');
            return;
        }

        if (!selectedPaymentMethod) {
            alert('Selecione uma forma de pagamento para continuar.');
            return;
        }

        const paidOrder = orders[orders.length - 1];
        if (paidOrder && paidOrder.transportRequestId) {
            const requests = getSavedTransportRequests();
            const transportRequest = requests.find(r => r.id === paidOrder.transportRequestId);
            if (transportRequest) {
                transportRequest.paymentMethod = selectedPaymentMethod;
                saveTransportRequests(requests);
            }
        }

        alert(`Pagamento finalizado via ${selectedPaymentMethod}! Seu pedido está a caminho.`);
        orders.length = 0;
        updateCartCount();
        closePaymentPanel();
        renderTransportRequests();
    });

    cartButton?.addEventListener('click', () => {
        if (!orders.length) {
            alert('Seu carrinho está vazio. Adicione um pedido antes de acessar o pagamento.');
            return;
        }
        openPaymentPanel();
    });

    mobileCartLink?.addEventListener('click', () => {
        if (!orders.length) {
            alert('Seu carrinho está vazio. Adicione um pedido antes de acessar o pagamento.');
            return;
        }
        openPaymentPanel();
    });

    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', event => {
            event.preventDefault();
            const target = document.querySelector(link.getAttribute('href'));
            if (target) scrollToElement(target);
        });
    });

    const header = document.querySelector('.header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 40) {
            header?.classList.add('header-scrolled');
        } else {
            header?.classList.remove('header-scrolled');
        }
    });

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'none';
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -100px 0px' });

    document.querySelectorAll('.category-card, .restaurant-card, .step, .purchase-panel, .payment-panel').forEach(element => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        observer.observe(element);
    });

    setTimeout(() => {
        document.querySelectorAll('.category-card').forEach((element, index) => {
            setTimeout(() => {
                element.style.opacity = '1';
                element.style.transform = 'none';
            }, index * 100);
        });
    }, 150);
    // Render UI according to logged user's role (cliente / transportador)
    renderRoleUI();
});
