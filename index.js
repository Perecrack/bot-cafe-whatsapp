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

// Tu API Key de OpenAI
const OPENAI_API_KEY = 'sk-proj-bW9pC6xbgcnb_sGYaZdJfNAojGUi_m1jPoYWtsEz5lJ8z_iTanheXrXWnKKkXgkS0ZLCDvRKhWT3BlbkFJA0JuZgCpPzqZfFm_nLL08S4dVtYzA6XtcUz7VguCsA';

// 🌐 SISTEMA ANTI-SLEEP PARA RENDER
function configurarAntiSleep() {
    const PORT = process.env.PORT || 3000;
    
    const server = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>☕ Bot de Café con IA</title>
                <meta charset="utf-8">
                <meta http-equiv="refresh" content="300">
                <style>
                    body { font-family: Arial; text-align: center; padding: 50px; background: #f5f5f5; }
                    .status { color: green; font-weight: bold; }
                    .info { background: white; padding: 20px; border-radius: 10px; margin: 20px; }
                </style>
            </head>
            <body>
                <div class="info">
                    <h1>☕ Bot de Café con IA Dinámica</h1>
                    <p>🤖 Estado: <span class="status">ACTIVO 24/7</span></p>
                    <p>📊 Archivo cargado: ${archivoCargado ? '✅ Sí' : '❌ Esperando archivo'}</p>
                    <p>📈 Registros analizados: ${datosCafe.length}</p>
                    <p>🕐 Última actividad: ${new Date().toLocaleString('es-ES')}</p>
                    <p>🔄 Actualización: Cada fin de semana</p>
                </div>
                <div class="info">
                    <h3>🧠 IA Analiza Dinámicamente:</h3>
                    <p>• Cualquier archivo Excel</p>
                    <p>• Todos los datos automáticamente</p>
                    <p>• Personas, precios, cantidades</p>
                    <p>• Respuestas inteligentes</p>
                </div>
            </body>
            </html>
        `);
    });
    
    server.listen(PORT, () => {
        console.log(`🌐 Servidor anti-sleep activo en puerto ${PORT}`);
    });
    
    setInterval(() => {
        console.log(`🔄 ${new Date().toLocaleTimeString()} - Bot activo analizando datos`);
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
    console.log('🤖☕ ¡Bot de análisis de café con IA dinámica activo 24/7!');
});

client.on('message', async msg => {
    try {
        console.log(`📱 ${new Date().toLocaleTimeString()} - Mensaje recibido`);
        
        if (msg.hasMedia) {
            console.log('📎 Archivo recibido, analizando dinámicamente...');
            const media = await msg.downloadMedia();
            
            if (media.mimetype.includes('spreadsheet') || 
                media.mimetype.includes('excel') || 
                media.filename?.endsWith('.xlsx') || 
                media.filename?.endsWith('.xls')) {
                
                nombreArchivo = `cafe_${Date.now()}.xlsx`;
                fs.writeFileSync(nombreArchivo, media.data, 'base64');
                
                try {
                    // ANÁLISIS DINÁMICO COMPLETO
                    const workbook = XLSX.readFile(nombreArchivo);
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                    
                    // Procesar TODOS los datos dinámicamente
                    const analisisCompleto = analizarExcelCompleto(rawData);
                    datosCafe = analisisCompleto.datos;
                    resumenDatos = analisisCompleto.resumen;
                    archivoCargado = true;
                    
                    console.log(`✅ Análisis completo: ${datosCafe.length} registros procesados`);
                    console.log('📊 Resumen:', resumenDatos);
                    
                    msg.reply(`🤖☕ ¡Archivo analizado completamente con IA!\n\n📊 **Análisis dinámico completado:**\n• Total registros: ${datosCafe.length}\n• Personas detectadas: ${resumenDatos.personas?.length || 0}\n• Tipos de café: ${resumenDatos.tiposCafe?.length || 0}\n• Precios únicos: ${resumenDatos.precios?.length || 0}\n• Archivo: ${media.filename}\n\n🧠 **IA lista para responder sobre:**\n• Cualquier persona en tus datos\n• Todos los tipos de café\n• Análisis de precios y cantidades\n• Comparaciones y tendencias\n• Totales y estadísticas\n\n💬 **Pregúntame lo que quieras sobre TUS datos reales!**\n\n🚀 **Actualiza cada fin de semana y yo me adapto automáticamente**`);
                    
                } catch (error) {
                    console.log('⚠️ Error procesando Excel:', error);
                    msg.reply(`❌ Error procesando el archivo Excel.\n\n🔧 **Posibles causas:**\n• Archivo corrupto\n• Formato no compatible\n• Datos muy complejos\n\n💡 **Intenta:**\n• Guardar como .xlsx\n• Verificar que tenga datos\n• Enviar archivo más simple para probar`);
                }
                
            } else {
                msg.reply('❌ Por favor, envía un archivo Excel (.xlsx o .xls).\n\n📋 **Formatos aceptados:**\n• .xlsx (Excel moderno)\n• .xls (Excel clásico)\n\n💡 **El bot analizará automáticamente todos los datos que contenga**');
            }
        } 
        else if (!archivoCargado) {
            msg.reply('👋 ¡Hola! Soy tu **asistente de café con IA dinámica**.\n\n📋 **Cómo funciono:**\n• Envíame cualquier Excel con datos de café\n• Analizo TODOS los datos automáticamente\n• Detecto personas, precios, cantidades, tipos\n• Respondo preguntas sobre TUS datos reales\n\n🧠 **IA adaptativa:**\n• No tengo datos predefinidos\n• Me adapto a tu archivo específico\n• Cada fin de semana puedes actualizar\n• Análisis completamente personalizado\n\n📊 **Funciona 24/7 en la nube**\n\n¡Envía tu archivo y empezamos! 🚀');
        } 
        else {
            console.log(`🧠 Procesando pregunta con IA sobre datos reales...`);
            const respuesta = await procesarPreguntaConIA(msg.body);
            msg.reply(respuesta);
        }
    } catch (error) {
        console.error('❌ Error general:', error);
        msg.reply('❌ Error procesando solicitud. Intenta de nuevo.');
    }
});

// 🧠 ANÁLISIS DINÁMICO COMPLETO DEL EXCEL
function analizarExcelCompleto(rawData) {
    console.log('🔍 Iniciando análisis dinámico completo...');
    
    const datos = [];
    const personas = new Set();
    const tiposCafe = new Set();
    const precios = new Set();
    const totales = [];
    
    // Analizar cada fila dinámicamente
    for (let i = 0; i < rawData.length; i++) {
        const fila = rawData[i];
        if (!fila || fila.length === 0) continue;
        
        const registro = {
            fila: i + 1,
            contenido: fila,
            persona: extraerPersonaDinamica(fila),
            tipoCafe: extraerTipoCafeDinamico(fila),
            precio: extraerPrecioDinamico(fila),
            cantidad: extraerCantidadDinamica(fila),
            total: extraerTotalDinamico(fila),
            fecha: extraerFechaDinamica(fila),
            observaciones: extraerObservacionesDinamicas(fila)
        };
        
        // Solo agregar si tiene información relevante
        if (registro.persona || registro.tipoCafe || registro.precio > 0 || registro.cantidad > 0) {
            datos.push(registro);
            
            // Recopilar información única
            if (registro.persona) personas.add(registro.persona);
            if (registro.tipoCafe) tiposCafe.add(registro.tipoCafe);
            if (registro.precio > 0) precios.add(registro.precio);
            if (registro.total > 0) totales.push(registro.total);
        }
    }
    
    // Crear resumen dinámico
    const resumen = {
        totalRegistros: datos.length,
        personas: Array.from(personas),
        tiposCafe: Array.from(tiposCafe),
        precios: Array.from(precios).sort((a, b) => b - a), // Mayor a menor
        totalGeneral: totales.reduce((sum, val) => sum + val, 0),
        promedioPrecios: precios.size > 0 ? Array.from(precios).reduce((a, b) => a + b, 0) / precios.size : 0,
        fechaAnalisis: new Date().toISOString()
    };
    
    console.log('✅ Análisis dinámico completado:', resumen);
    
    return { datos, resumen };
}

// FUNCIONES DE EXTRACCIÓN DINÁMICA
function extraerPersonaDinamica(fila) {
    for (let celda of fila) {
        if (typeof celda === 'string') {
            const texto = celda.toLowerCase().trim();
            // Detectar nombres comunes (puedes expandir esta lista)
            const nombresComunes = ['pablo', 'juan', 'maria', 'carlos', 'ana', 'luis', 'jose', 'pedro', 'sofia', 'diego'];
            for (let nombre of nombresComunes) {
                if (texto.includes(nombre)) {
                    return nombre.charAt(0).toUpperCase() + nombre.slice(1);
                }
            }
            // Si parece un nombre (primera letra mayúscula, solo letras)
            if (/^[A-Z][a-z]+$/.test(celda.trim())) {
                return celda.trim();
            }
        }
    }
    return null;
}

function extraerTipoCafeDinamico(fila) {
    const texto = fila.join(' ').toLowerCase();
    const tipos = {
        'verde': 'Café Verde',
        'seco': 'Café Seco',
        'pasilla': 'Pasilla',
        'oreado': 'Café Oreado',
        'pergamino': 'Pergamino',
        'cereza': 'Cereza',
        'húmedo': 'Café Húmedo',
        'mojado': 'Café Mojado'
    };
    
    for (let [clave, valor] of Object.entries(tipos)) {
        if (texto.includes(clave)) {
            return valor;
        }
    }
    return null;
}

function extraerPrecioDinamico(fila) {
    for (let celda of fila) {
        if (typeof celda === 'number' && celda > 100 && celda < 1000000) {
            return celda;
        }
        // Intentar extraer números de strings
        if (typeof celda === 'string') {
            const numero = parseFloat(celda.replace(/[^\d.]/g, ''));
            if (!isNaN(numero) && numero > 100 && numero < 1000000) {
                return numero;
            }
        }
    }
    return 0;
}

function extraerCantidadDinamica(fila) {
    for (let celda of fila) {
        if (typeof celda === 'number' && celda > 0 && celda < 10000) {
            return celda;
        }
    }
    return 0;
}

function extraerTotalDinamico(fila) {
    for (let celda of fila) {
        if (typeof celda === 'number' && celda > 1000) {
            return celda;
        }
    }
    return 0;
}

function extraerFechaDinamica(fila) {
    for (let celda of fila) {
        if (celda instanceof Date) {
            return celda.toISOString().split('T')[0];
        }
        if (typeof celda === 'string' && /\d{1,2}\/\d{1,2}\/\d{4}/.test(celda)) {
            return celda;
        }
    }
    return null;
}

function extraerObservacionesDinamicas(fila) {
    const observaciones = [];
    for (let celda of fila) {
        if (typeof celda === 'string' && celda.length > 10 && !extraerPersonaDinamica([celda]) && !extraerTipoCafeDinamico([celda])) {
            observaciones.push(celda);
        }
    }
    return observaciones.join('; ');
}

// 🧠 IA CON DATOS DINÁMICOS
async function procesarPreguntaConIA(pregunta) {
    try {
        const contexto = prepararContextoDinamico();
        
        const prompt = `Eres un asistente experto en análisis de datos de café. Tienes acceso a datos REALES y DINÁMICOS de un archivo Excel.

DATOS REALES DISPONIBLES:
${contexto}

INSTRUCCIONES IMPORTANTES:
1. Responde SOLO basándote en los datos reales proporcionados
2. NO inventes información que no esté en los datos
3. Si no tienes un dato específico, dilo claramente
4. Usa emojis relevantes (☕🌱☀️🫘💰📊👤💡)
5. Responde en español de forma natural y conversacional
6. Si preguntan por una persona específica, busca en los datos reales
7. Para precios, usa los valores exactos detectados
8. Para totales, suma los valores reales encontrados
9. Sé preciso con los números pero explica el contexto
10. Mantén respuestas concisas pero informativas

PREGUNTA DEL USUARIO: "${pregunta}"

Analiza los datos reales y responde:`;

        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: prompt
                }
            ],
            max_tokens: 500,
            temperature: 0.3 // Menos creatividad, más precisión
        }, {
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        const respuestaIA = response.data.choices[0].message.content;
        console.log(`✅ IA respondió basándose en datos reales`);
        
        return respuestaIA;

    } catch (error) {
        console.error('❌ Error con IA:', error.message);
        return procesarPreguntaRespaldoDinamico(pregunta);
    }
}

function prepararContextoDinamico() {
    if (!archivoCargado || datosCafe.length === 0) {
        return "No hay datos cargados actualmente.";
    }
    
    let contexto = `
📊 RESUMEN DE DATOS REALES:
- Total de registros analizados: ${resumenDatos.totalRegistros}
- Fecha de análisis: ${new Date(resumenDatos.fechaAnalisis).toLocaleDateString()}

👥 PERSONAS DETECTADAS:
${resumenDatos.personas.map(p => `- ${p}`).join('\n')}

☕ TIPOS DE CAFÉ ENCONTRADOS:
${resumenDatos.tiposCafe.map(t => `- ${t}`).join('\n')}

💰 PRECIOS DETECTADOS (ordenados de mayor a menor):
${resumenDatos.precios.map(p => `- $${p.toLocaleString()}`).join('\n')}

💎 TOTAL GENERAL: $${resumenDatos.totalGeneral.toLocaleString()}
📈 PRECIO PROMEDIO: $${Math.round(resumenDatos.promedioPrecios).toLocaleString()}

📋 MUESTRA DE REGISTROS DETALLADOS:
`;

    // Agregar muestra de registros reales
    datosCafe.slice(0, 10).forEach((registro, index) => {
        contexto += `
Registro ${index + 1}:
- Persona: ${registro.persona || 'No especificada'}
- Tipo de café: ${registro.tipoCafe || 'No especificado'}
- Precio: $${registro.precio || 0}
- Cantidad: ${registro.cantidad || 0}
- Total: $${registro.total || 0}
- Observaciones: ${registro.observaciones || 'Ninguna'}
`;
    });

    return contexto;
}

function procesarPreguntaRespaldoDinamico(pregunta) {
    if (!archivoCargado) {
        return '❌ No hay datos cargados. Por favor envía un archivo Excel primero.';
    }
    
    return `🤖 **Sistema de respaldo activo**\n\nBasándome en los datos reales cargados:\n\n📊 **Información disponible:**\n• ${resumenDatos.totalRegistros} registros\n• ${resumenDatos.personas.length} personas\n• ${resumenDatos.tiposCafe.length} tipos de café\n• Total: $${resumenDatos.totalGeneral.toLocaleString()}\n\n💡 **Pregúntame específicamente sobre:**\n• Alguna persona: ${resumenDatos.personas.join(', ')}\n• Tipos de café: ${resumenDatos.tiposCafe.join(', ')}\n• Precios y totales\n\n¿Qué dato específico necesitas?`;
}

client.initialize();
