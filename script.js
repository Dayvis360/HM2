//  Configurá tus claves de Supabase
const SUPABASE_URL = 'https://hrvrigzzyxuookjolfid.supabase.co';
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhydnJpZ3p6eXh1b29ram9sZmlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxNzQwNzYsImV4cCI6MjA3Nzc1MDA3Nn0.Iy8hJqJbuau9YrF8AqVDmmmLSWLGaPM74hwvmA_9ruo";
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let usuarioActual = null;

async function entrar() {
  const nombre = document.getElementById('nombre').value.trim();
  if (!nombre) return alert("Ingresá un nombre");

  // Buscar usuario existente
  let { data: user } = await db
    .from('usuarios')
    .select('*')
    .eq('nombre', nombre)
    .single();

  // Si no existe, crear nuevo
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

  // Actualizar saldos
  await db.from('usuarios')
    .update({ saldo: emisor.saldo - monto })
    .eq('nombre', usuarioActual);
  await db.from('usuarios')
    .update({ saldo: rec.saldo + monto })
    .eq('nombre', receptor);

  // Registrar ambas transacciones (una para el emisor, otra para el receptor)
  await db.from('transacciones').insert([
    { emisor: usuarioActual, receptor, monto, tipo: 'transferido' },
    { emisor: receptor, receptor: usuarioActual, monto, tipo: 'recibido' }
  ]);

  alert("Transferencia exitosa ✅");
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

  // Sumar saldo al usuario actual
  await db.from('usuarios')
    .update({ saldo: user.saldo + montoDeposito })
    .eq('nombre', usuarioActual);

  // Registrar depósito con tipo
  await db.from('transacciones')
    .insert([{ emisor: 'DEPOSITO', receptor: usuarioActual, monto: montoDeposito, tipo: 'deposito' }]);

  document.getElementById('montoDeposito').value = '';
  await actualizarSaldo();
  await cargarHistorial();
  alert('Depósito realizado ✅');
}

async function cargarHistorial() {
  const { data } = await db
    .from('transacciones')
    .select('*')
    .or(`emisor.eq.${usuarioActual},receptor.eq.${usuarioActual}`)
    .order('fecha', { ascending: false });

  if (!data || data.length === 0) {
    document.getElementById('historial').innerHTML = "Sin movimientos";
    return;
  }

  // Generar texto legible según el tipo
  const h = data.map(t => {
    if (t.tipo === 'deposito') {
      return `<p> Depósito : +$${t.monto}</p>`;
    } else if (t.tipo === 'transferido') {
      return `<p> Transferencia enviada a ${t.receptor}: -$${t.monto}</p>`;
    } else if (t.tipo === 'recibido') {
      return `<p> Transferencia recibida de ${t.emisor}: +$${t.monto}</p>`;
    } else {
      // por compatibilidad con registros viejos sin tipo
      if (t.emisor === 'DEPOSITO')
        return `<p> Depósito recibido: +$${t.monto}</p>`;
      if (t.emisor === usuarioActual)
        return `<p> Transferencia enviada a ${t.receptor}: -$${t.monto}</p>`;
      return `<p> Transferencia recibida de ${t.emisor}: +$${t.monto}</p>`;
    }
  }).join('');

  document.getElementById('historial').innerHTML = h;
}

function salir() {
  localStorage.removeItem('usuario');
  usuarioActual = null;
  document.getElementById('panel').style.display = 'none';
  document.getElementById('login').style.display = 'block';
}

// Restaurar sesión si ya estaba logueado
const guardado = localStorage.getItem('usuario');
if (guardado) { usuarioActual = guardado; mostrarPanel(); }
