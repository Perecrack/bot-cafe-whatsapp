const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const XLSX = require('xlsx');
const axios = require('axios');
const http = require('http');
const { parse } = require('csv-parse/sync');

let datosCafe = [];
let archivoCargado = false;
let resumenDatos = {};

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.warn('⚠️ API Key de OpenAI no configurada en variables de entorno.');
}

function analizarExcel(rawData) {
  const datos = [];
  const personas = new Set();
  const tiposCafe = new Set();
  const totales = [];

  for (let i = 1; i < rawData.length; i++) {
    const fila = rawData[i];
    if (!fila || fila.length === 0) continue;

    const persona = extraerPersona(fila);
    const tipoCafe = extraerTipoCafe(fila);
    const precio = extraerNumero(fila);
    const total = extraerTotal(fila);

    if (persona || tipoCafe || precio > 0) {
      datos.push({ persona, tipoCafe, precio, total });
      if (persona) personas.add(persona);
      if (tipoCafe) tiposCafe.add(tipoCafe);
      if (total > 0) totales.push(total);
    }
  }

  return {
    datos,
    resumen: {
      totalRegistros: datos.length,
      personas: Array.from(personas),
      tiposCafe: Array.from(tiposCafe),
      totalGeneral: totales.reduce((a, b) => a + b, 0)
    }
  };
}

function analizarCSV(textoCSV) {
  const records = csvParse(textoCSV, { skip_empty_lines: true });
  return analizarExcel(records);
}

function analizarJSON(jsonData) {
  // Asumimos jsonData es un array de objetos con campos: persona, tipoCafe, precio, total
  const datos = [];
  const personas = new Set();
  const tiposCafe = new Set();
  const totales = [];

  for (const item of jsonData) {
    const persona = item.persona || null;
    const tipoCafe = item.tipoCafe || null;
    const precio = Number(item.precio) || 0;
    const total = Number(item.total) || 0;

    datos.push({ persona, tipoCafe, precio, total });
    if (persona) personas.add(persona);
    if (tipoCafe) tiposCafe.add(tipoCafe);
    if (total > 0) totales.push(total);
  }

  return {
    datos,
    resumen: {
      totalRegistros: datos.length,
      personas: Array.from(personas),
      tiposCafe: Array.from(tiposCafe),
      totalGeneral: totales.reduce((a, b) => a + b, 0)
    }
  };
}

function extraerPersona(fila) {
  for (const celda of fila) {
    if (typeof celda === 'string') {
      const texto = celda.trim().toLowerCase();
      if (texto && !esHeader(texto) && /^[a-záéíóúñ]+$/i.test(texto)) {
        return texto.charAt(0).toUpperCase() + texto.slice(1);
      }
    }
  }
  return null;
}

function esHeader(texto) {
  const headers = ['carga', 'nombre', 'total', 'precio', 'pasilla', 'cafe', 'peso', 'valor'];
  return headers.some(h => texto.includes(h));
}

function extraerTipoCafe(fila) {
  const texto = fila.join(' ').toLowerCase();
  if (texto.includes('verde')) return 'Café Verde';
  if (texto.includes('seco')) return 'Café Seco';
  if (texto.includes('pasilla')) return 'Pasilla';
  return null;
}

function extraerNumero(fila) {
  for (const celda of fila) {
    if (typeof celda === 'number' && celda > 0 && celda < 1000000) return celda;
    if (typeof celda === 'string') {
      const num = parseFloat(celda.replace(/[^0-9.,]/g, '').replace(',', '.'));
      if (!isNaN(num) && num > 0 && num < 1000000) return num;
    }
  }
  return 0;
}

function extraerTotal(fila) {
  for (const celda of fila) {
    if (typeof celda === 'number' && celda > 10000) return celda;
    if (typeof celda === 'string') {
      const num = parseFloat(celda.replace(/[^0-9.,]/g, '').replace(',', '.'));
      if (!isNaN(num) && num > 10000) return num;
    }
  }
  return 0;
}

function prepararContexto() {
  if (!archivoCargado) return "Sin datos cargados.";

  return `Registros: ${resumenDatos.totalRegistros}, Personas: ${resumenDatos.personas.join(', ')}, Tipos de café: ${resumenDatos.tiposCafe.join(', ')}, Total: $${resumenDatos.totalGeneral.toLocaleString()}`;
}

async function procesarPreguntaConIA(pregunta, intentos = 3) {
  if (!OPENAI_API_KEY) {
    return '⚠️ API Key de OpenAI no configurada.';
  }
  try {
    const contexto = prepararContexto();
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: `Eres un experto en café. Datos: ${contexto}. Responde en español con emojis.` },
        { role: 'user', content: pregunta }
      ],
      max_tokens: 400,
      temperature: 0.3
    }, {
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` }
    });
    return response.data.choices[0].message.content;
  } catch (error) {
    if (error.response && error.response.status === 429 && intentos > 0) {
      console.log('⚠️ Límite de tasa alcanzado, esperando 10 segundos...');
      await new Promise(r => setTimeout(r, 10000));
      return procesarPreguntaConIA(pregunta, intentos - 1);
    }
    console.error('❌ Error IA:', error.message);
    return '❌ Lo siento, el sistema está saturado. Intenta de nuevo más tarde.';
  }
}

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu'
    ]
  }
});

client.on('qr', qr => {
  console.log('🤖☕ QR Code para WhatsApp Web:');
  qrcode.generate(qr, { small: true });
  console.log('👆 Escanea este código con WhatsApp');
});

client.on('ready', () => {
  console.log('🤖☕ ¡Bot de café seguro activo 24/7!');
});

client.on('message', async msg => {
  try {
    if (msg.hasMedia) {
      msg.reply('📎 Archivo recibido, procesando... ⏳');
      const media = await msg.downloadMedia();

      if (media.filename.endsWith('.xlsx') || media.filename.endsWith('.xls')) {
        const workbook = XLSX.read(media.data, { type: 'base64' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        const analisis = analizarExcel(rawData);
        datosCafe = analisis.datos;
        resumenDatos = analisis.resumen;
        archivoCargado = true;
        msg.reply(`🤖☕ ¡Análisis completado!\n\n📊 Resultados:\n• Registros: ${resumenDatos.totalRegistros}\n• Personas: ${resumenDatos.personas.length}\n• Tipos café: ${resumenDatos.tiposCafe.length}\n• Total: $${resumenDatos.totalGeneral.toLocaleString()}\n\n🧠 IA lista ✅\n💬 ¡Pregúntame sobre tus datos!`);
      } else if (media.filename.endsWith('.csv')) {
        const textoCSV = Buffer.from(media.data, 'base64').toString('utf-8');
        const analisis = analizarCSV(textoCSV);
        datosCafe = analisis.datos;
        resumenDatos = analisis.resumen;
        archivoCargado = true;
        msg.reply(`🤖☕ ¡Análisis completado!\n\n📊 Resultados:\n• Registros: ${resumenDatos.totalRegistros}\n• Personas: ${resumenDatos.personas.length}\n• Tipos café: ${resumenDatos.tiposCafe.length}\n• Total: $${resumenDatos.totalGeneral.toLocaleString()}\n\n🧠 IA lista ✅\n💬 ¡Pregúntame sobre tus datos!`);
      } else if (media.filename.endsWith('.json')) {
        const textoJSON = Buffer.from(media.data, 'base64').toString('utf-8');
        const jsonData = JSON.parse(textoJSON);
        const analisis = analizarJSON(jsonData);
        datosCafe = analisis.datos;
        resumenDatos = analisis.resumen;
        archivoCargado = true;
        msg.reply(`🤖☕ ¡Análisis completado!\n\n📊 Resultados:\n• Registros: ${resumenDatos.totalRegistros}\n• Personas: ${resumenDatos.personas.length}\n• Tipos café: ${resumenDatos.tiposCafe.length}\n• Total: $${resumenDatos.totalGeneral.toLocaleString()}\n\n🧠 IA lista ✅\n💬 ¡Pregúntame sobre tus datos!`);
      } else {
        msg.reply('❌ Formato no soportado. Envía un archivo Excel (.xlsx/.xls), CSV o JSON.');
      }
    } else {
      if (!archivoCargado) {
        msg.reply('👋 Por favor, envía un archivo Excel, CSV o JSON con datos de café para comenzar.');
        return;
      }
      msg.reply('🧠 Consultando IA... ⏳');
      const respuesta = await procesarPreguntaConIA(msg.body);
      msg.reply(respuesta);
    }
  } catch (error) {
    console.error('❌ Error general:', error);
    msg.reply('❌ Error procesando tu solicitud. Intenta de nuevo.');
  }
});

// Servidor para mantener bot activo (anti-sleep)
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`<h1>☕ Bot de Café activo</h1><p>Estado: ${archivoCargado ? 'Archivo cargado' : 'Esperando archivo'}</p>`);
}).listen(PORT, () => {
  console.log(`🌐 Servidor activo en puerto ${PORT}`);
});

client.initialize();
