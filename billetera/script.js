//  Configurá tus claves de Supabase
const SUPABASE_URL = 'https://hrvrigzzyxuookjolfid.supabase.co';
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhydnJpZ3p6eXh1b29ram9sZmlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxNzQwNzYsImV4cCI6MjA3Nzc1MDA3Nn0.Iy8hJqJbuau9YrF8AqVDmmmLSWLGaPM74hwvmA_9ruo";
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let usuarioActual = null;

async function entrar() {
  const nombre = document.getElementById('nombre').value.trim().toUpperCase();

  if (!nombre) return alert("Ingresá un nombre");

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
    if (error) return alert("Error creando usuario");
    user = data;
  }

  usuarioActual = user.nombre;
  localStorage.setItem('usuario', usuarioActual);
  mostrarPanel();
}

async function mostrarPanel() {
  document.getElementById('login').style.display = 'none';
  document.getElementById('panel').style.display = 'block';
  document.getElementById('usuario').innerText = `Usuario: ${usuarioActual}`;
  await actualizarSaldo();
  await cargarHistorial();
  // configurar listener del filtro (si existe en la UI)
  const filtroEl = document.getElementById('filtroTipo');
  if (filtroEl) {
    filtroEl.addEventListener('change', () => cargarHistorial());
  }
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
  if (!receptor || monto <= 0) return alert("Datos inválidos");

  const { data: emisor } = await db
    .from('usuarios').select('*').eq('nombre', usuarioActual).single();
  const { data: rec } = await db
    .from('usuarios').select('*').eq('nombre', receptor).single();

  if (!rec) return alert("El receptor no existe");
  if (emisor.saldo < monto) return alert("Saldo insuficiente");

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

  alert("Transferencia exitosa ");
  document.getElementById('receptor').value = '';
  document.getElementById('monto').value = '';
  await actualizarSaldo();
  await cargarHistorial();
}



async function depositar() {
  const montoDeposito = Number(document.getElementById('montoDeposito').value);
  if (isNaN(montoDeposito) || montoDeposito <= 0) return alert('Ingresá un monto válido');

  const { data: user, error } = await db
    .from('usuarios').select('*').eq('nombre', usuarioActual).single();
  if (error || !user) return alert('Usuario no encontrado');

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
  alert('Depósito realizado ');
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
  document.getElementById('panel').style.display = 'none';
  document.getElementById('login').style.display = 'block';
}

// Restaurar sesión
const guardado = localStorage.getItem('usuario');
if (guardado) { usuarioActual = guardado; mostrarPanel(); }
