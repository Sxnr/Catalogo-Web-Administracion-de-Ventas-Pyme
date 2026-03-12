// 1. DEFINICIÓN MAESTRA DE PRODUCTOS
const productos = [
    { id: 1, nombre: "Void Stealth", precio: 12990, imagen: "void.png" },
    { id: 2, nombre: "Neural Link", precio: 12990, imagen: "neural.png" },
    { id: 3, nombre: "Titan Frame", precio: 13990, imagen: "titan.png" }
];

// 2. FUNCIÓN PARA OBTENER EL STOCK REAL
function obtenerStockReal() {
    const stockBase = {
        1: { "M": 2, "L": 2 },
        2: { "M": 1, "L": 1 },
        3: { "M": 2, "L": 1 }
    };

    const stockGuardado = localStorage.getItem('stockLimitBrake');
    if (stockGuardado) {
        return JSON.parse(stockGuardado);
    } else {
        localStorage.setItem('stockLimitBrake', JSON.stringify(stockBase));
        return stockBase;
    }
}

// Variables globales
let stockActual = obtenerStockReal();
let carrito = [];

function cargarProductos() {
    // Sincronizamos con el Admin antes de renderizar
    stockActual = obtenerStockReal(); 

    const contenedor = document.getElementById('catalogo');
    if (!contenedor) return;

    contenedor.innerHTML = productos.map(p => {
        // Generar opciones basadas en el stock real
        const opcionesTalla = Object.keys(stockActual[p.id]).map(talla => {
            const cant = stockActual[p.id][talla];
            const isAgotado = cant <= 0;
            return `<option value="${talla}" ${isAgotado ? "disabled" : ""}>
                ${talla} ${isAgotado ? "(SOLD OUT)" : `(${cant} Disp.)`}
            </option>`;
        }).join('');

        return `
            <div class="card">
                <img src="${p.imagen}" class="producto-img">
                <div class="card-info">
                    <h3>${p.nombre}</h3>
                    <p class="precio">$${p.precio.toLocaleString('es-CL')}</p>
                    <select id="talla-${p.id}" class="select-talla">
                        ${opcionesTalla}
                    </select>
                </div>
                <button class="btn-add" onclick="agregarAlCarrito(${p.id})">BLOQUEAR UNIDAD</button>
            </div>
        `;
    }).join('');
}

function agregarAlCarrito(id) {
    const selectTalla = document.getElementById(`talla-${id}`);
    if (!selectTalla) return;
    
    const talla = selectTalla.value;

    // 1. Verificar stock disponible
    if (stockActual[id] && stockActual[id][talla] > 0) {
        
        // 2. Descontar en la variable local
        stockActual[id][talla]--; 

        // 3. ¡VITAL! Guardar el descuento inmediatamente en la memoria para que el Admin lo vea
        localStorage.setItem('stockLimitBrake', JSON.stringify(stockActual));
        
        const producto = productos.find(p => p.id === id);
        
        carrito.push({
            id: producto.id,
            nombre: producto.nombre,
            precio: producto.precio,
            talla: talla
        });

        // 4. Actualizar interfaz
        renderizarCarrito();
        cargarProductos(); 
        
        console.log(`Unidad de ${producto.nombre} bloqueada. Stock actualizado en memoria.`);
    } else {
        alert("¡Alerta de Arsenal! Esta unidad acaba de ser bloqueada o está agotada.");
    }
}

function renderizarCarrito() {
    const lista = document.getElementById('lista-carrito');
    const totalTxt = document.getElementById('total-pago');
    const selectRegion = document.getElementById('region-select');

    if (!lista || !totalTxt) return;

    if (carrito.length === 0) {
        lista.innerHTML = "<p style='color:#666; font-style:italic;'>El arsenal está vacío...</p>";
        totalTxt.innerText = "$0";
        return;
    }

    let subtotal = carrito.reduce((acc, p) => acc + p.precio, 0);
    let zona = selectRegion ? selectRegion.value : "presencial";
    let costoEnvio = 0;

    if (zona !== "presencial") {
        let tallaEnvio = "S"; 
        if (carrito.length >= 2 && carrito.length <= 3) tallaEnvio = "M";
        else if (carrito.length > 3) tallaEnvio = "L";

        const tarifas = {
            "S": { mismaZona: 3700, stgoCentro: 5100, extremo: 9000 },
            "M": { mismaZona: 4300, stgoCentro: 6800, extremo: 14000 },
            "L": { mismaZona: 4900, stgoCentro: 8700, extremo: 16500 }
        };
        costoEnvio = tarifas[tallaEnvio][zona];
    }

    lista.innerHTML = carrito.map((p, index) => `
        <div class="item-carrito" style="display:flex; justify-content:space-between; margin-bottom:10px; border-bottom:1px solid #222; padding-bottom:5px;">
            <span><strong style="color:var(--cian);">${p.nombre}</strong> <small>(${p.talla})</small></span>
            <span>$${p.precio.toLocaleString('es-CL')} 
                <button onclick="eliminarDelCarrito(${index})" style="background:none; border:none; color:var(--rojo); cursor:pointer; font-weight:bold; margin-left:10px;">X</button>
            </span>
        </div>
    `).join('');

    totalTxt.innerText = `$${(subtotal + costoEnvio).toLocaleString('es-CL')}`;
}

function eliminarDelCarrito(index) {
    const item = carrito[index];
    
    // Devolvemos el stock y guardamos el cambio
    stockActual[item.id][item.talla]++;
    localStorage.setItem('stockLimitBrake', JSON.stringify(stockActual));
    
    carrito.splice(index, 1);
    
    renderizarCarrito();
    cargarProductos();
}

function actualizarEnvio() {
    const zona = document.getElementById('region-select').value;
    const campos = document.getElementById('datos-cliente');
    
    if (zona !== "presencial") {
        campos.style.display = "block";
    } else {
        campos.style.display = "none";
    }
    renderizarCarrito();
}

function enviarInstagram() {
    const elNombre = document.getElementById('nombre-cli');
    const elRut = document.getElementById('rut-cli');
    const elCorreo = document.getElementById('correo-cli');
    const elTel = document.getElementById('tel-cli');
    const elDir = document.getElementById('direccion-cli');
    const elCom = document.getElementById('comuna-cli');
    const elRef = document.getElementById('ref-cli');

    // Validación de campos obligatorios
    if (!elNombre.value || !elRut.value || !elCorreo.value || !elTel.value || !elDir.value || !elCom.value) {
        alert("⚠️ Completa todos los datos obligatorios para el despacho.");
        return;
    }

    try {
        localStorage.setItem('stockLimitBrake', JSON.stringify(stockActual));

        const nuevaOrden = {
            envio: { 
                nombre: elNombre.value, 
                rut: elRut.value,
                correo: elCorreo.value,
                tel: elTel.value,
                dir: elDir.value, 
                com: elCom.value,
                ref: elRef.value // Referencia opcional
            },
            items: [...carrito],
            total: document.getElementById('total-pago').innerText,
            confirmado: false,
            fecha: new Date().toLocaleString()
        };

        let historial = JSON.parse(localStorage.getItem('historialOrdenes')) || [];
        historial.push(nuevaOrden);
        localStorage.setItem('historialOrdenes', JSON.stringify(historial));
        localStorage.setItem('ultimoPedido', JSON.stringify(nuevaOrden));

        window.location.href = "confirmacion.html";
    } catch (e) {
        console.error(e);
    }
}

// Iniciar catálogo al cargar
cargarProductos();