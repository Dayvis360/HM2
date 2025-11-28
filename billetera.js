function cambiarModo() {
  document.body.classList.toggle("dark-mode");

  const activado = document.body.classList.contains("dark-mode");
  localStorage.setItem("darkMode", activado ? "on" : "off");

  document.getElementById('toggleDarkMode').innerText = 
    activado ? "☀️ Modo Claro" : "🌙 Modo Oscuro";
}

// Restaurar modo al cargar
if (localStorage.getItem("darkMode") === "on") {
  document.body.classList.add("dark-mode");
  setTimeout(() => {
    const btn = document.getElementById('toggleDarkMode');
    if (btn) btn.innerText = "☀️ Modo Claro";
  }, 10);
}

// Función para mostrar secciones
function mostrarSeccion(nombre) {
  document.querySelectorAll('.seccion').forEach(s => s.classList.remove('activa'));
  const target = document.getElementById('seccion-' + nombre);
  if (target) {
    target.classList.add('activa');
    try { localStorage.setItem('lastView', nombre); } catch(e) {}
  }
  
  // Actualizar navegación
  updateNavButtons();
  
  // Scroll to top
  window.scrollTo(0, 0);
}

// Actualizar botones de navegación según si hay sesión
function updateNavButtons() {
  const loginBtn = document.getElementById('navLoginBtn');
  const logoutBtn = document.getElementById('navLogoutBtn');
  
  if (usuarioActual) {
    if (loginBtn) loginBtn.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'inline-block';
  } else {
    if (loginBtn) loginBtn.style.display = 'inline-block';
    if (logoutBtn) logoutBtn.style.display = 'none';
  }
}

// Toggle menú móvil
function toggleMenu() {
  const navLinks = document.querySelector('.nav-links');
  navLinks.classList.toggle('active');
}

// Función para enviar mensaje de contacto
function enviarMensaje(event) {
  event.preventDefault();
  const msg = document.getElementById('mensaje-contacto-feedback');
  if (msg) {
    msg.textContent = '¡Gracias por tu mensaje! Te contactaremos pronto.';
    msg.style.color = 'green';
    setTimeout(() => { msg.textContent = ''; }, 3000);
  }
  event.target.reset();
  return false;
}

// Funciones para modales de operaciones
function toggleAccion(tipo) {
  const modal = document.getElementById('modal-' + tipo);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function cerrarModal(tipo) {
  const modal = document.getElementById('modal-' + tipo);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
  }
}

// Cerrar modal al hacer click fuera
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('operation-modal')) {
    e.target.classList.remove('active');
    document.body.style.overflow = 'auto';
  }
});

// Función para cambiar tabs
function cambiarTab(tipo) {
  const tabs = document.querySelectorAll('.tab-btn');
  const contents = document.querySelectorAll('.tab-content');
  
  tabs.forEach(tab => tab.classList.remove('active'));
  contents.forEach(content => content.classList.remove('active'));
  
  event.target.classList.add('active');
  document.getElementById('tab-' + tipo).classList.add('active');
}



//  Configurá tus claves de Supabase
const SUPABASE_URL = 'https://hrvrigzzyxuookjolfid.supabase.co';
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhydnJpZ3p6eXh1b29ram9sZmlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxNzQwNzYsImV4cCI6MjA3Nzc1MDA3Nn0.Iy8hJqJbuau9YrF8AqVDmmmLSWLGaPM74hwvmA_9ruo";
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let usuarioActual = null;

async function entrar() {
  const nombre = document.getElementById('nombre').value.trim().toUpperCase();
  const msg = document.getElementById('login-feedback');
  if (!nombre) {
    if (msg) { msg.textContent = 'Ingresá un nombre'; msg.style.color = 'red'; }
    return;
  }
  // Buscar usuario
  let { data: user } = await db
    .from('usuarios')
    .select('*')
    .eq('nombre', nombre)
    .single();
  // Si no existe, crear
  if (!user) {
    const { data, error } = await db
      .from('usuarios')
      .insert([{ nombre, saldo: 0 }])
      .select()
      .single();
    if (error) {
      if (msg) { msg.textContent = 'Error creando usuario'; msg.style.color = 'red'; }
      return;
    }
    user = data;
  }
  usuarioActual = user.nombre;
  // Persistir sesión
  try { localStorage.setItem('usuario', usuarioActual); } catch(e) {}
  updateNavButtons();
  mostrarPanel();
  if (msg) msg.textContent = '';
}

async function mostrarPanel() {
  const userEl = document.getElementById('usuario');
  if (userEl) userEl.innerText = `Hola, ${usuarioActual}`;

  const tieneSecciones = !!document.getElementById('seccion-operaciones');
  if (tieneSecciones && typeof mostrarSeccion === 'function') {
    try { mostrarSeccion('operaciones'); } catch (e) { /* noop */ }
  } else if (typeof mostrarPantalla === 'function') {
    // Estructura clásica por pantallas
    mostrarPantalla('principal');
  }

  await actualizarSaldo();
  await cargarHistorial();
  await actualizarInterfazCaja();
  await actualizarCantidadDolares();
}

function mostrarPantalla(nombre) {
  // Mantener por compatibilidad pero redirigir a secciones
  mostrarSeccion(nombre);
}

async function actualizarSaldo() {
  const { data } = await db
    .from('usuarios')
    .select('saldo')
    .eq('nombre', usuarioActual)
    .single();
  document.getElementById('saldo').innerText = data.saldo;
}

async function transferir() {
  const receptor = document.getElementById('receptor').value.trim();
  const monto = Number(document.getElementById('monto').value);
  const msg = document.getElementById('transferir-feedback');
  if (!receptor || monto <= 0) {
    if (msg) { msg.textContent = 'Datos inválidos'; msg.style.color = 'red'; }
    return;
  }
  const { data: emisor } = await db
    .from('usuarios').select('*').eq('nombre', usuarioActual).single();
  const { data: rec } = await db
    .from('usuarios').select('*').eq('nombre', receptor).single();
  if (!rec) {
    if (msg) { msg.textContent = 'El receptor no existe'; msg.style.color = 'red'; }
    return;
  }
  if (emisor.saldo < monto) {
    if (msg) { msg.textContent = 'Saldo insuficiente'; msg.style.color = 'red'; }
    return;
  }
  await db.from('usuarios')
    .update({ saldo: emisor.saldo - monto })
    .eq('nombre', usuarioActual);
  await db.from('usuarios')
    .update({ saldo: rec.saldo + monto })
    .eq('nombre', receptor);
  await db.from('transacciones')
    .insert([{ 
      emisor: usuarioActual, 
      receptor, 
      monto,
      tipo: 'transferencia'
    }]);
  if (msg) { msg.textContent = 'Transferencia exitosa'; msg.style.color = 'green'; setTimeout(() => { msg.textContent = ''; }, 2500); }
  document.getElementById('receptor').value = '';
  document.getElementById('monto').value = '';
  await actualizarSaldo();
  await cargarHistorial();
}



async function depositar() {
  const montoDeposito = Number(document.getElementById('montoDeposito').value);
  const msg = document.getElementById('depositar-feedback');
  if (isNaN(montoDeposito) || montoDeposito <= 0) {
    if (msg) { msg.textContent = 'Ingresá un monto válido'; msg.style.color = 'red'; }
    return;
  }
  const { data: user, error } = await db
    .from('usuarios').select('*').eq('nombre', usuarioActual).single();
  if (error || !user) {
    if (msg) { msg.textContent = 'Usuario no encontrado'; msg.style.color = 'red'; }
    return;
  }
  // Actualizar solo al usuario actual (filtrar por nombre)
  await db.from('usuarios')
    .update({ saldo: user.saldo + montoDeposito })
    .eq('nombre', usuarioActual);
  // Registrar el depósito en la tabla de transacciones
  await db.from('transacciones')
    .insert([{ 
      emisor: usuarioActual, 
      receptor: usuarioActual, 
      monto: montoDeposito,
      tipo: 'deposito'
    }]);
  document.getElementById('montoDeposito').value = '';
  await actualizarSaldo();
  await cargarHistorial();
  if (msg) { msg.textContent = 'Depósito realizado'; msg.style.color = 'green'; setTimeout(() => { msg.textContent = ''; }, 2500); }
}

async function convertirADolares() {
  const montoARS = Number(document.getElementById("montoUSD").value);
  const msg = document.getElementById('convertir-feedback');
  if (isNaN(montoARS) || montoARS <= 0) {
    if (msg) { msg.textContent = 'Ingresá un monto válido'; msg.style.color = 'red'; }
    return;
  }
  // Cotización fija (o dinámica si querés)
  const tasaDolar = 1000; 
  const montoUSD = Number((montoARS / tasaDolar).toFixed(2));
  // Obtener datos del usuario
  const { data: user, error } = await db
    .from("usuarios")
    .select("saldo, dolares")
    .eq("nombre", usuarioActual)
    .single();
  if (error || !user) {
    if (msg) { msg.textContent = 'Error cargando usuario'; msg.style.color = 'red'; }
    return;
  }
  if (user.saldo < montoARS) {
    if (msg) { msg.textContent = 'Saldo insuficiente para convertir'; msg.style.color = 'red'; }
    return;
  }
  const nuevoSaldo = user.saldo - montoARS;
  const nuevosDolares = (user.dolares || 0) + montoUSD;
  // Actualizar usuario
  const { error: updateError } = await db
    .from("usuarios")
    .update({
      saldo: nuevoSaldo,
      dolares: nuevosDolares
    })
    .eq("nombre", usuarioActual);
  if (updateError) {
    if (msg) { msg.textContent = 'Error guardando conversión'; msg.style.color = 'red'; }
    return;
  }
  // Mostrar resultado al usuario
  document.getElementById("resultadoUSD").innerText =
    `Convertiste $${montoARS} ARS → USD ${montoUSD}`;
  await actualizarSaldo();
  await actualizarCantidadDolares();
  if (msg) { msg.textContent = 'Conversión realizada correctamente ✔️'; msg.style.color = 'green'; setTimeout(() => { msg.textContent = ''; }, 2500); }
}

async function actualizarCantidadDolares() {
  const { data: user } = await db
    .from("usuarios")
    .select("dolares")
    .eq("nombre", usuarioActual)
    .single();

  document.getElementById("dolares").innerText = user?.dolares ?? 0;
}


async function guardarEnCaja() {
  const monto = Number(document.getElementById("montoCaja").value);
  const msg = document.getElementById('caja-feedback');
  if (isNaN(monto) || monto <= 0) {
    if (msg) { msg.textContent = 'Ingresa un monto válido'; msg.style.color = 'red'; }
    return;
  }
  const { data: user, error } = await db
    .from("usuarios")
    .select("saldo, caja")
    .eq("nombre", usuarioActual)
    .single();
  if (error || !user) {
    if (msg) { msg.textContent = 'Error al cargar usuario'; msg.style.color = 'red'; }
    return;
  }
  if (user.saldo < monto) {
    if (msg) { msg.textContent = 'No tienes saldo suficiente'; msg.style.color = 'red'; }
    return;
  }
  const nuevoSaldo = user.saldo - monto;
  const nuevaCaja = (user.caja || 0) + monto;
  // Actualizar saldo y caja
  await db
    .from("usuarios")
    .update({ saldo: nuevoSaldo, caja: nuevaCaja })
    .eq("nombre", usuarioActual);
  // Actualizar UI
  document.getElementById("montoCaja").value = "";
  await actualizarSaldo();
  await actualizarInterfazCaja();
  if (msg) { msg.textContent = 'Monto guardado en tu caja correctamente 👍'; msg.style.color = 'green'; setTimeout(() => { msg.textContent = ''; }, 2500); }
}


async function retirarDeCaja() {
  const monto = Number(document.getElementById("montoRetiroCaja").value);
  const msg = document.getElementById('caja-feedback');
  if (isNaN(monto) || monto <= 0) {
    if (msg) { msg.textContent = 'Ingresá un monto válido'; msg.style.color = 'red'; }
    return;
  }
  const { data: user, error } = await db
    .from("usuarios")
    .select("saldo, caja")
    .eq("nombre", usuarioActual)
    .single();
  if (error || !user) {
    if (msg) { msg.textContent = 'Error al cargar usuario'; msg.style.color = 'red'; }
    return;
  }
  if (user.caja < monto) {
    if (msg) { msg.textContent = 'La caja no tiene suficiente dinero'; msg.style.color = 'red'; }
    return;
  }
  const nuevoSaldo = user.saldo + monto;
  const nuevaCaja = user.caja - monto;
  await db
    .from("usuarios")
    .update({ saldo: nuevoSaldo, caja: nuevaCaja })
    .eq("nombre", usuarioActual);
  // Registrar movimiento
  await db.from("transacciones").insert([{
    emisor: usuarioActual,
    receptor: usuarioActual,
    monto: monto,
    tipo: "retiro_caja"
  }]);
  document.getElementById("montoRetiroCaja").value = "";
  await actualizarSaldo();
  await actualizarInterfazCaja();
  await cargarHistorial();
  if (msg) { msg.textContent = 'Retiro desde caja realizado'; msg.style.color = 'green'; setTimeout(() => { msg.textContent = ''; }, 2500); }
}


async function actualizarInterfazCaja() {
  const { data: user } = await db
    .from("usuarios")
    .select("caja")
    .eq("nombre", usuarioActual)
    .single();

  document.getElementById("cajaMonto").innerText = user.caja || 0;
}


async function cargarHistorial() {
  const { data } = await db
    .from('transacciones')
    .select('*')
    .or('emisor.eq.' + usuarioActual + ',receptor.eq.' + usuarioActual)
    .order('fecha', { ascending: false });

  const filtro = (document.getElementById('filtroTipo') && document.getElementById('filtroTipo').value) || 'todo';

  const rows = (data || []).filter(t => (filtro === 'todo') || (t.tipo === filtro));

  const tbody = document.getElementById('historialBody');
  if (!tbody) {
    //  si no existe el body, mostrar simple texto
    const h = rows.map(t => {
      if (t.tipo === 'deposito') return `Deposito: $${t.monto} (${t.fecha || ''})`;
      const esEmisor = t.emisor === usuarioActual;
      return `${esEmisor ? 'Enviado' : 'Recibido'}: $${t.monto} ${esEmisor ? 'a' : 'de'} ${esEmisor ? t.receptor : t.emisor} (${t.fecha || ''})`;
    }).join('<br>');
    document.getElementById('historial').innerHTML = h || 'Sin movimientos';
    return;
  }

  if (!rows || rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6">Sin movimientos</td></tr>';
    return;
  }

  const html = rows.map(t => {
    const esDeposito = t.emisor === usuarioActual && t.receptor === usuarioActual;
    const esEmisor = t.emisor === usuarioActual;
    const emisor = esDeposito ? 'deposito' : t.emisor || '';
    const receptor = esDeposito ? 'deposito' : t.receptor || '';
    const monto = t.monto != null ? `$${t.monto}` : '';
    const tipo = t.tipo === 'deposito' ? 'Depósito' : (t.tipo === 'transferencia' ? 'Transferencia' : (t.tipo || ''));
    const direccion = esEmisor ? 'Enviado' : 'Recibido';
    const fecha = t.fecha ? new Date(t.fecha).toLocaleString() : '';
    return `
      <tr>
        <td>${escapeHtml(emisor)}</td>
        <td>${escapeHtml(receptor)}</td>
        <td>${escapeHtml(monto)}</td>
        <td>${escapeHtml(tipo)}</td>
        <td>${escapeHtml(direccion)}</td>
        <td>${escapeHtml(fecha)}</td>
      </tr>`;
  }).join('');

  tbody.innerHTML = html;
}

// pequeña función para escapar texto en HTML
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

}

function salir() {
  localStorage.removeItem('usuario');
  usuarioActual = null;
  updateNavButtons();
  mostrarSeccion('home');
  const msg = document.getElementById('login-feedback');
  if (msg) { msg.textContent = 'Sesión cerrada correctamente'; msg.style.color = 'green'; setTimeout(() => { msg.textContent = ''; }, 2500); }
}

// Modal de confirmación de eliminación de cuenta
function eliminarCuenta() {
  mostrarModalEliminar();
}

function mostrarModalEliminar() {
  // Si ya existe, no crear de nuevo
  if (document.getElementById('modal-eliminar-cuenta')) {
    document.getElementById('modal-eliminar-cuenta').classList.add('active');
    document.body.style.overflow = 'hidden';
    return;
  }
  const modal = document.createElement('div');
  modal.id = 'modal-eliminar-cuenta';
  modal.className = 'operation-modal active';
  modal.innerHTML = `
    <div class="operation-modal-content" style="max-width:400px;text-align:left">
      <button class="close-modal" onclick="cerrarModalEliminar()">&times;</button>
      <h2 style="color:#B00020;margin-bottom:10px">Eliminar cuenta</h2>
      <div id="eliminar-mensaje">
        <p><b>ATENCIÓN:</b> Esta acción eliminará <b>todo</b> tu saldo, dólares, caja de ahorro y tu historial. <br><b>No se puede deshacer.</b></p>
        <p>Para confirmar, escribí tu nombre de usuario exacto:</p>
        <input id="eliminar-nombre" type="text" autocomplete="off" style="width:100%;margin-bottom:10px" placeholder="Nombre de usuario">
        <div id="eliminar-error" style="color:#B00020;font-size:0.95em;margin-bottom:8px"></div>
        <button id="btn-confirmar-eliminar" class="danger" style="width:100%">Eliminar definitivamente</button>
      </div>
      <div id="eliminar-exito" style="display:none;color:green;text-align:center;font-weight:bold;margin-top:10px"></div>
    </div>
  `;
  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';

  document.getElementById('btn-confirmar-eliminar').onclick = confirmarEliminarCuenta;
  document.getElementById('eliminar-nombre').onkeydown = function(e) {
    if (e.key === 'Enter') confirmarEliminarCuenta();
  };
}

function cerrarModalEliminar() {
  const modal = document.getElementById('modal-eliminar-cuenta');
  if (modal) {
    modal.classList.remove('active');
    setTimeout(() => { if (modal.parentNode) modal.parentNode.removeChild(modal); }, 200);
    document.body.style.overflow = 'auto';
  }
}

async function confirmarEliminarCuenta() {
  const input = document.getElementById('eliminar-nombre');
  const errorDiv = document.getElementById('eliminar-error');
  const exitoDiv = document.getElementById('eliminar-exito');
  if (!input) return;
  const valor = input.value.trim().toUpperCase();
  if (valor !== usuarioActual) {
    errorDiv.textContent = 'El nombre no coincide. No se puede eliminar.';
    input.focus();
    return;
  }
  errorDiv.textContent = '';
  try {
    // 1) Borrar transacciones relacionadas
    const { error: errorTrans } = await db.from("transacciones")
      .delete()
      .or(`emisor.eq.${usuarioActual},receptor.eq.${usuarioActual}`);
    if (errorTrans) {
      errorDiv.textContent = 'Error borrando movimientos.';
      return;
    }
    // 2) Borrar usuario
    const { error: errorUser } = await db
      .from("usuarios")
      .delete()
      .eq("nombre", usuarioActual);
    if (errorUser) {
      errorDiv.textContent = 'Error eliminando usuario.';
      return;
    }
    exitoDiv.textContent = '✅ Cuenta eliminada correctamente';
    exitoDiv.style.display = 'block';
    document.getElementById('eliminar-mensaje').style.display = 'none';
    setTimeout(() => {
      cerrarModalEliminar();
      salir();
    }, 1200);
  } catch (e) {
    errorDiv.textContent = 'Ocurrió un error inesperado.';
  }
}

// Auto-login deshabilitado - el usuario debe ingresar manualmente cada vez
// const guardado = localStorage.getItem('usuario');
// if (guardado) { usuarioActual = guardado; mostrarPanel(); }

// Configurar listener del filtro
document.addEventListener('DOMContentLoaded', () => {
  // Restaurar sesión si existe
  const guardado = localStorage.getItem('usuario');
  if (guardado) {
    usuarioActual = guardado;
    const lastView = localStorage.getItem('lastView') || 'operaciones';
    mostrarPanel();
    // Sobrescribir vista si había una guardada distinta
    if (lastView && lastView !== 'operaciones') {
      mostrarSeccion(lastView);
    }
    const fb = document.getElementById('login-feedback');
    if (fb) {
      fb.textContent = `Sesión restaurada: ${usuarioActual}`;
      fb.style.color = 'green';
      setTimeout(()=>{ fb.textContent=''; },3000);
    }
  }
  const filtroEl = document.getElementById('filtroTipo');
  if (filtroEl) {
    filtroEl.addEventListener('change', () => cargarHistorial());
  }
  
  // Actualizar navegación al cargar
  updateNavButtons();
});


