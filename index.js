const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const XLSX = require('xlsx');
const axios = require('axios');
const http = require('http');

let datosCafe = [];
let archivoCargado = false;
let nombreArchivo = '';
let resumenDatos = {};

// 🔐 API KEY SEGURA (desde variable de entorno)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Verificar que la API Key esté configurada
if (!OPENAI_API_KEY) {
    console.log('⚠️ ADVERTENCIA: API Key de OpenAI no configurada');
    console.log('🔧 Configúrala en Render → Environment Variables');
} else {
    console.log('✅ API Key de OpenAI configurada correctamente');
}

// 🌐 SISTEMA ANTI-SLEEP
function configurarAntiSleep() {
    const PORT = process.env.PORT || 3000;
    
    const server = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>☕ Bot de Café Seguro</title>
                <meta charset="utf-8">
                <meta http-equiv="refresh" content="300">
                <style>
                    body { font-family: Arial; text-align: center; padding: 50px; background: #f5f5f5; }
                    .status { color: green; font-weight: bold; }
                    .info { background: white; padding: 20px; border-radius: 10px; margin: 20px; }
                    .warning { color: orange; }
                </style>
            </head>
            <body>
                <div class="info">
                    <h1>☕ Bot de Café con IA Segura</h1>
                    <p>🤖 Estado: <span class="status">ACTIVO 24/7</span></p>
                    <p>📊 Archivo cargado: ${archivoCargado ? '✅ Sí' : '❌ Esperando archivo'}</p>
                    <p>🔐 API Key: ${OPENAI_API_KEY ? '✅ Configurada' : '<span class="warning">❌ No configurada</span>'}</p>
                    <p>📈 Registros: ${datosCafe.length}</p>
                    <p>🕐 Última actividad: ${new Date().toLocaleString('es-ES')}</p>
                </div>
                <div class="info">
                    <h3>🔐 Seguridad mejorada:</h3>
                    <p>• API Keys en variables de entorno</p>
                    <p>• No expuestas en código público</p>
                    <p>• Protección automática de GitHub</p>
                </div>
            </body>
            </html>
        `);
    });
    
    server.listen(PORT, () => {
        console.log(`🌐 Servidor seguro activo en puerto ${PORT}`);
    });
    
    setInterval(() => {
        console.log(`🔄 ${new Date().toLocaleTimeString()} - Bot seguro activo`);
    }, 8 * 60 * 1000);
}

configurarAntiSleep();

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

client.on('qr', (qr) => {
    console.log('🤖☕ QR Code para WhatsApp Web:');
    console.log('QR String:', qr);
    qrcode.generate(qr, { small: true });
    console.log('👆 Escanea este código con WhatsApp');
});

client.on('ready', () => {
    console.log('🤖☕ ¡Bot de café seguro activo 24/7!');
});

client.on('message', async msg => {
    try {
        console.log(`📱 ${new Date().toLocaleTimeString()} - Mensaje recibido`);
        
        if (msg.hasMedia) {
            msg.reply('📎 Archivo recibido, procesando... ⏳');
            
            const media = await msg.downloadMedia();
            
            if (media.mimetype.includes('spreadsheet') || 
                media.mimetype.includes('excel') || 
                media.filename?.endsWith('.xlsx') || 
                media.filename?.endsWith('.xls')) {
                
                nombreArchivo = `cafe_${Date.now()}.xlsx`;
                fs.writeFileSync(nombreArchivo, media.data, 'base64');
                
                try {
                    setTimeout(() => msg.reply('🔍 Analizando datos...'), 2000);
                    
                    const workbook = XLSX.readFile(nombreArchivo);
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                    
                    const analisisCompleto = analizarExcelMejorado(rawData);
                    datosCafe = analisisCompleto.datos;
                    resumenDatos = analisisCompleto.resumen;
                    archivoCargado = true;
                    
                    console.log(`✅ Análisis completado: ${datosCafe.length} registros`);
                    
                    msg.reply(`🤖☕ ¡Análisis completado!\n\n📊 **Resultados:**\n• Registros: ${datosCafe.length}\n• Personas: ${resumenDatos.personas?.length || 0}\n• Tipos café: ${resumenDatos.tiposCafe?.length || 0}\n• Total: $${resumenDatos.totalGeneral?.toLocaleString() || 0}\n\n🧠 **IA lista** ${OPENAI_API_KEY ? '✅' : '(⚠️ API Key pendiente)'}\n💬 ¡Pregúntame sobre tus datos!`);
                    
                } catch (error) {
                    console.log('⚠️ Error procesando Excel:', error);
                    msg.reply(`❌ Error procesando archivo.`);
                }
                
            } else {
                msg.reply('❌ Envía un archivo Excel (.xlsx o .xls)');
            }
        } 
        else if (!archivoCargado) {
            msg.reply('👋 ¡Hola! Envíame un archivo Excel con datos de café.\n\n🔐 **Bot seguro con variables de entorno**\n🧠 **IA integrada**\n⚡ **Análisis dinámico**');
        } 
        else {
            msg.reply('🧠 Consultando IA... ⏳');
            
            const respuesta = await procesarPreguntaConIASegura(msg.body);
            msg.reply(respuesta);
        }
    } catch (error) {
        console.error('❌ Error general:', error);
        msg.reply('❌ Error procesando. Intenta de nuevo.');
    }
});

// 🧠 IA CON VERIFICACIÓN SEGURA
async function procesarPreguntaConIASegura(pregunta) {
    try {
        if (!OPENAI_API_KEY) {
            console.log('⚠️ API Key no disponible, usando respaldo');
            return procesarPreguntaRespaldo(pregunta);
        }
        
        const contexto = prepararContexto();
        
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: `Eres un experto en café. Datos: ${contexto}. Responde en español con emojis.`
                },
                {
                    role: 'user',
                    content: pregunta
                }
            ],
            max_tokens: 400,
            temperature: 0.3
        }, {
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });

        console.log(`✅ IA OpenAI respondió`);
        return response.data.choices[0].message.content;

    } catch (error) {
        console.error('❌ Error IA:', error.response?.status || error.message);
        
        if (error.response?.status === 401) {
            return '🔑 **API Key inválida**\n\nNecesita ser actualizada en Render.\n\n' + procesarPreguntaRespaldo(pregunta);
        }
        
        return procesarPreguntaRespaldo(pregunta);
    }
}

// Resto de funciones (analizarExcelMejorado, etc.) - las mismas del código anterior
function analizarExcelMejorado(rawData) {
    console.log('🔍 Análisis mejorado iniciado...');
    
    const datos = [];
    const personas = new Set();
    const tiposCafe = new Set();
    const precios = new Set();
    const totales = [];
    
    for (let i = 1; i < rawData.length; i++) {
        const fila = rawData[i];
        if (!fila || fila.length === 0) continue;
        
        const registro = {
            fila: i + 1,
            persona: extraerPersona(fila),
            tipoCafe: extraerTipoCafe(fila),
            precio: extraerPrecio(fila),
            total: extraerTotal(fila)
        };
        
        if (registro.persona || registro.tipoCafe || registro.precio > 0) {
            datos.push(registro);
            
            if (registro.persona && !esHeader(registro.persona)) {
                personas.add(registro.persona);
            }
            if (registro.tipoCafe) tiposCafe.add(registro.tipoCafe);
            if (registro.precio > 0) precios.add(registro.precio);
            if (registro.total > 0) totales.push(registro.total);
        }
    }
    
    const resumen = {
        totalRegistros: datos.length,
        personas: Array.from(personas),
        tiposCafe: Array.from(tiposCafe),
        precios: Array.from(precios).sort((a, b) => b - a),
        totalGeneral: totales.reduce((sum, val) => sum + val, 0)
    };
    
    return { datos, resumen };
}

function extraerPersona(fila) {
    for (let celda of fila) {
        if (typeof celda === 'string') {
            const texto = celda.trim();
            if (esNombreReal(texto) && !esHeader(texto)) {
                return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
            }
        }
    }
    return null;
}

function esNombreReal(texto) {
    const nombres = ['pablo', 'juan', 'maria', 'carlos', 'ana', 'luis', 'jose'];
    return nombres.some(nombre => texto.toLowerCase().includes(nombre)) ||
           /^[A-Z][a-z]{2,15}$/.test(texto);
}

function esHeader(texto) {
    const headers = ['carga', 'nombre', 'total', 'precio', 'pasilla', 'cafe'];
    return headers.some(header => texto.toLowerCase().includes(header));
}

function extraerTipoCafe(fila) {
    const texto = fila.join(' ').toLowerCase();
    if (texto.includes('verde')) return 'Café Verde';
    if (texto.includes('seco')) return 'Café Seco';
    if (texto.includes('pasilla')) return 'Pasilla';
    return null;
}

function extraerPrecio(fila) {
    for (let celda of fila) {
        if (typeof celda === 'number' && celda >= 100 && celda <= 1000000) {
            return celda;
        }
    }
    return 0;
}

function extraerTotal(fila) {
    for (let celda of fila) {
        if (typeof celda === 'number' && celda > 10000) {
            return celda;
        }
    }
    return 0;
}

function prepararContexto() {
    if (!archivoCargado) return "Sin datos";
    
    return `Registros: ${resumenDatos.totalRegistros}, Personas: ${resumenDatos.personas.join(', ')}, Tipos: ${resumenDatos.tiposCafe.join(', ')}, Total: $${resumenDatos.totalGeneral}`;
}

function procesarPreguntaRespaldo(pregunta) {
    return `🤖 **Sistema de respaldo activo**\n\n📊 **Datos disponibles:**\n• ${resumenDatos.totalRegistros || 0} registros\n• ${resumenDatos.personas?.length || 0} personas\n• Total: $${resumenDatos.totalGeneral?.toLocaleString() || '0'}\n\n💡 Pregúntame sobre totales, personas o tipos de café.`;
}

client.initialize();
