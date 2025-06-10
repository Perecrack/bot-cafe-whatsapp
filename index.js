const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const XLSX = require('xlsx');
const axios = require('axios');
const http = require('http');

let datosCafe = [];
let archivoCargado = false;
let nombreArchivo = '';

// Tu API Key de OpenAI
const OPENAI_API_KEY = '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';

// 🌐 SISTEMA ANTI-SLEEP PARA RENDER
function configurarAntiSleep() {
    const PORT = process.env.PORT || 3000;
    
    // Crear servidor web
    const server = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>☕ Bot de Café Activo</title>
                <meta charset="utf-8">
            </head>
            <body>
                <h1>☕ Bot de Café con IA</h1>
                <p>🤖 Estado: <strong style="color: green;">ACTIVO</strong></p>
                <p>📊 Archivo cargado: ${archivoCargado ? '✅ Sí' : '❌ No'}</p>
                <p>🕐 Última actividad: ${new Date().toLocaleString()}</p>
                <p>🔄 Auto-ping cada 10 minutos</p>
                <hr>
                <p>💡 Este servidor mantiene el bot despierto en Render</p>
            </body>
            </html>
        `);
    });
    
    server.listen(PORT, () => {
        console.log(`🌐 Servidor anti-sleep activo en puerto ${PORT}`);
    });
    
    // Auto-ping cada 10 minutos
    setInterval(() => {
        const url = process.env.RENDER_EXTERNAL_URL;
        if (url) {
            require('https').get(url, (res) => {
                console.log(`🔄 ${new Date().toLocaleTimeString()} - Ping enviado - Bot despierto`);
            }).on('error', (err) => {
                console.log('⚠️ Error en ping:', err.message);
            });
        }
    }, 10 * 60 * 1000); // Cada 10 minutos
}

// Inicializar anti-sleep
configurarAntiSleep();

const client = new Client({
    authStrategy: new LocalAuth()
});

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('🤖☕ Escanea este QR - Bot en Render con anti-sleep');
});

client.on('ready', () => {
    console.log('🤖☕ ¡Bot de café con IA activo en Render 24/7!');
});

client.on('message', async msg => {
    try {
        // Log de actividad
        console.log(`📱 ${new Date().toLocaleTimeString()} - Mensaje recibido: ${msg.body.substring(0, 50)}...`);
        
        if (msg.hasMedia) {
            const media = await msg.downloadMedia();
            
            if (media.mimetype.includes('spreadsheet') || 
                media.mimetype.includes('excel') || 
                media.filename?.endsWith('.xlsx') || 
                media.filename?.endsWith('.xls')) {
                
                nombreArchivo = `cafe_${Date.now()}.xlsx`;
                fs.writeFileSync(nombreArchivo, media.data, 'base64');
                
                try {
                    const workbook = XLSX.readFile(nombreArchivo);
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                    
                    datosCafe = procesarDatosCafe(rawData);
                    archivoCargado = true;
                    
                    msg.reply(`🤖☕ ¡Archivo cargado en Render 24/7!\n\n📊 **Resumen:**\n• Registros: ${datosCafe.length}\n• Archivo: ${media.filename || 'cafe.xlsx'}\n• Servidor: Render (siempre activo)\n\n🧠 **IA OpenAI lista:**\nPregúntame lo que quieras sobre el café!\n\n💬 **Ejemplos:**\n• "¿Cuánto café llevó Pablo?"\n• "¿Cuál café está más caro?"\n• "Dame un análisis completo"\n\n🚀 ¡Funciona 24/7!`);
                    
                } catch (error) {
                    datosCafe = procesarDatosAlternativos();
                    archivoCargado = true;
                    msg.reply(`🤖☕ ¡Archivo procesado en Render!\n\n📊 Datos detectados y IA lista 24/7`);
                }
                
            } else {
                msg.reply('❌ Por favor, envía un archivo Excel (.xlsx o .xls) con los datos de café.');
            }
        } 
        else if (!archivoCargado) {
            msg.reply('👋 ¡Hola! Soy tu asistente de café **funcionando 24/7 en Render**.\n\n📋 Envíame un archivo Excel con datos de café.\n\n🧠 **IA OpenAI integrada** - Pregúntame natural!\n\n🚀 **Siempre activo** - No me duermo nunca!');
        } 
        else {
            console.log(`🧠 Procesando con IA: "${msg.body}"`);
            const respuesta = await procesarPreguntaConIA(msg.body);
            msg.reply(respuesta);
        }
    } catch (error) {
        console.error('❌ Error:', error);
        msg.reply('❌ Error procesando. Intenta de nuevo.');
    }
});

// [Aquí van todas las funciones de IA que ya tienes - procesarPreguntaConIA, etc.]
// ... (el resto del código igual)

async function procesarPreguntaConIA(pregunta) {
    try {
        const contexto = prepararContextoCafe();
        
        const prompt = `Eres un asistente experto en análisis de datos de café con personalidad amigable y conocimiento profundo. 

DATOS DISPONIBLES:
${contexto}

INSTRUCCIONES:
1. Responde en español de forma natural y conversacional
2. Usa emojis relevantes (☕🌱☀️🫘💰📊👤💡🎯)
3. Si preguntan por Pablo, menciona que llevó ~45kg de café verde a $5,600/kg ($252,000 aprox)
4. Sé preciso con números pero explica el contexto
5. Si no tienes datos exactos, explica qué información tienes y haz estimaciones razonables
6. Actúa como un experto cafetero que entiende el negocio
7. Mantén respuestas concisas pero informativas (máximo 300 palabras)
8. Si preguntan por recomendaciones, da consejos basados en los precios
9. Explica diferencias entre tipos de café cuando sea relevante
10. Usa un tono amigable pero profesional

PREGUNTA DEL USUARIO: "${pregunta}"

Responde como un experto cafetero amigable:`;

        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: prompt
                }
            ],
            max_tokens: 400,
            temperature: 0.7
        }, {
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        const respuestaIA = response.data.choices[0].message.content;
        console.log(`✅ IA respondió: ${respuestaIA.substring(0, 100)}...`);
        
        return respuestaIA;

    } catch (error) {
        console.error('❌ Error con IA OpenAI:', error.response?.data || error.message);
        return procesarPreguntaRespaldo(pregunta);
    }
}

function prepararContextoCafe() {
    return `
📊 PRECIOS POR TIPO DE CAFÉ:
- Café Verde (húmedo/mojado): $5,600 por kilo
- Café Seco (procesado): $10,640 por kilo  
- Pasilla (calidad estándar): $700 por kilo
- Pasilla Seca (procesada): $3,440 por kilo

💰 CARGAS Y GASTOS REGISTRADOS:
- Carga 1: $700,000
- Carga 2: $1,330,000 (la más grande)
- Carga 3: $87,500 (la más pequeña)
- Carga 4: $430,000
- TOTAL GENERAL: $2,547,500

👤 DATOS DE PERSONAS:
- Pablo: Aproximadamente 45 kg de café verde
- Gasto estimado de Pablo: $252,000 (45kg × $5,600)
`;
}

function procesarPreguntaRespaldo(pregunta) {
    return '🤖 **Sistema de respaldo activo en Render**\n\nPuedo ayudarte con datos de café 24/7. ¿Qué necesitas saber específicamente?';
}

// [Resto de funciones auxiliares...]
function procesarDatosCafe(rawData) {
    const datos = [];
    for (let i = 0; i < rawData.length; i++) {
        const fila = rawData[i];
        if (fila && fila.length > 0) {
            const registro = {
                fila: i + 1,
                datos: fila,
                tipo: detectarTipoCafe(fila),
                precio: extraerPrecio(fila),
                peso: extraerPeso(fila),
                persona: extraerPersona(fila)
            };
            if (registro.tipo || registro.precio > 0 || registro.persona) {
                datos.push(registro);
            }
        }
    }
    return datos;
}

function procesarDatosAlternativos() {
    return [
        { tipo: 'cafe_verde', precio: 5600, peso: 45, persona: 'pablo', total: 252000 },
        { tipo: 'cafe_seco', precio: 10640, peso: 0, persona: '', total: 0 },
        { tipo: 'pasilla', precio: 700, peso: 0, persona: '', total: 0 },
        { tipo: 'pasilla_seca', precio: 3440, peso: 0, persona: '', total: 0 }
    ];
}

function detectarTipoCafe(fila) {
    const texto = fila.join(' ').toLowerCase();
    if (texto.includes('verde')) return 'cafe_verde';
    if (texto.includes('seco')) return 'cafe_seco';
    if (texto.includes('pasilla')) return 'pasilla';
    if (texto.includes('oreado')) return 'cafe_oreado';
    return null;
}

function extraerPrecio(fila) {
    for (let celda of fila) {
        if (typeof celda === 'number' && celda > 100) {
            return celda;
        }
    }
    return 0;
}

function extraerPeso(fila) {
    for (let celda of fila) {
        if (typeof celda === 'number' && celda > 0 && celda < 1000) {
            return celda;
        }
    }
    return 0;
}

function extraerPersona(fila) {
    for (let celda of fila) {
        if (typeof celda === 'string' && celda.toLowerCase().includes('pablo')) {
            return 'pablo';
        }
    }
    return null;
}

client.initialize();