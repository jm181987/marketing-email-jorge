const express = require('express');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3001;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Dados em memória
let attackHistory = [];
let totalStats = { sent: 0, failed: 0, targets: new Set() };

// Sistema de persistência
const REPORTS_FILE = path.join(__dirname, 'email_reports.json');
const TRACKING_FILE = path.join(__dirname, 'tracking_data.json');

// Carregar dados salvos
let emailReports = loadEmailReports();
let trackingData = loadTrackingData();

function loadEmailReports() {
    try {
        if (fs.existsSync(REPORTS_FILE)) {
            return JSON.parse(fs.readFileSync(REPORTS_FILE, 'utf8'));
        }
    } catch (error) {
        console.log('❌ Erro ao carregar reports:', error);
    }
    return [];
}

function loadTrackingData() {
    try {
        if (fs.existsSync(TRACKING_FILE)) {
            return JSON.parse(fs.readFileSync(TRACKING_FILE, 'utf8'));
        }
    } catch (error) {
        console.log('❌ Erro ao carregar tracking:', error);
    }
    return {};
}

function saveEmailReports() {
    try {
        fs.writeFileSync(REPORTS_FILE, JSON.stringify(emailReports, null, 2));
    } catch (error) {
        console.log('❌ Erro ao salvar reports:', error);
    }
}

function saveTrackingData() {
    try {
        fs.writeFileSync(TRACKING_FILE, JSON.stringify(trackingData, null, 2));
    } catch (error) {
        console.log('❌ Erro ao salvar tracking:', error);
    }
}

// BANCO DE NOMES ANTI-SPAM
const ANTI_SPAM_NAMES = {
    technical: [
        "Suporte Técnico", "Equipe de TI", "Departamento de Tecnologia", "Sistema de Notificações",
        "Central de Sistemas", "Admin do Sistema", "Gestor de Plataforma", "Assistência Técnica",
        "Suporte ao Cliente", "Help Desk", "Service Desk", "NOC Center", "Operações de TI"
    ],
    corporate: [
        "Departamento Financeiro", "Recursos Humanos", "Gestão de Contas", "Administração",
        "Controladoria", "Comunicação Corporativa", "Relacionamento com Cliente", "Customer Success",
        "Atendimento ao Cliente", "Secretaria Geral", "Presidência", "Diretoria Executiva"
    ],
    communications: [
        "Comunicações Internas", "Central de Notícias", "Divulgação Corporativa", "Marketing Digital",
        "Comunicação Social", "Imprensa Oficial", "Relações Públicas", "Assessoria de Comunicação",
        "Newsletter System", "Alertas Automatizados", "Sistema de Broadcast", "Canal Oficial"
    ],
    security: [
        "Segurança da Informação", "Cybersecurity Team", "Proteção de Dados", "Compliance Office",
        "Auditoria Interna", "Gestão de Riscos", "Security Operations", "Data Protection Officer",
        "Alerta de Segurança", "Monitoramento de Sistema", "Controle de Acesso"
    ],
    departments: [
        "Departamento Comercial", "Setor de Vendas", "Área de Negócios", "Business Development",
        "Parcerias Estratégicas", "Expansão de Mercado", "Desenvolvimento Comercial", "Account Management"
    ]
};

// TEMPLATES HTML PRONTOS COM BOTÕES
const HTML_TEMPLATES = {
    corporate: `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: #0056b3; color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; color: #333; line-height: 1.6; }
        .button { background: #0056b3; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 15px 0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #e9ecef; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Notificação do Sistema</h1>
            <p>Comunicação Oficial</p>
        </div>
        <div class="content">
            <h2>Prezado Cliente,</h2>
            <p>Estamos entrando em contato para informar sobre importantes atualizações em nossa plataforma.</p>
            
            <p><strong>Informações Relevantes:</strong></p>
            <ul>
                <li>Atualização de segurança implementada</li>
                <li>Novos recursos disponíveis</li>
                <li>Manutenção programada do sistema</li>
            </ul>
            
            <p>Para mais detalhes, acesse sua conta através do link abaixo:</p>
            
            <center>
                <a href="https://exemplo.com/acessar-conta" class="button">Acessar Minha Conta</a>
            </center>
            
            <p style="margin-top: 25px;">Esta é uma mensagem automática, por favor não responda este email.</p>
        </div>
        <div class="footer">
            <p>&copy; 2024 Sistema de Notificações. Todos os direitos reservados.</p>
        </div>
    </div>
</body>
</html>`,

    promotional: `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 15px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
        .header { background: linear-gradient(45deg, #ff0022, #8a2be2); color: white; padding: 40px; text-align: center; }
        .content { padding: 40px; color: #333; }
        .button { background: linear-gradient(45deg, #ff0022, #8a2be2); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; display: inline-block; font-weight: bold; margin: 20px 0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔥 PROMOÇÃO ESPECIAL!</h1>
            <p>Oferta por tempo limitado</p>
        </div>
        <div class="content">
            <h2>Você foi selecionado!</h2>
            <p>Parabéns! Você acaba de ganhar acesso exclusivo à nossa promoção especial.</p>
            <p><strong>Desconto de 50%</strong> em todos os produtos!</p>
            <p>Esta oferta é válida apenas por 24 horas. Não perca essa oportunidade!</p>
            <center>
                <a href="https://exemplo.com/promocao" class="button">👉 GARANTIR AGORA 👈</a>
            </center>
            <p style="text-align: center; margin-top: 20px;">
                <a href="https://exemplo.com/condicoes">Ver condições da promoção</a>
            </p>
        </div>
        <div class="footer">
            <p>© 2025 nkj System. Todos os direitos reservados.</p>
        </div>
    </div>
</body>
</html>`,

    alert: `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; background: #ffe6e6; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border: 3px solid #ff0022; border-radius: 10px; overflow: hidden; box-shadow: 0 5px 15px rgba(255,0,34,0.2); }
        .header { background: #ff0022; color: white; padding: 25px; text-align: center; }
        .alert-icon { font-size: 48px; margin-bottom: 15px; }
        .content { padding: 30px; color: #333; }
        .warning-box { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 20px; margin: 20px 0; }
        .button { background: #ff0022; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="alert-icon">🚨</div>
            <h1>ALERTA DE SEGURANÇA</h1>
            <p>Ação Imediata Requerida</p>
        </div>
        <div class="content">
            <h2>Atividade Suspeita Detectada</h2>
            <p>Identificamos uma atividade incomum na sua conta que requer sua atenção imediata.</p>
            
            <div class="warning-box">
                <strong>⚠️ AVISO IMPORTANTE:</strong>
                <p>Se você não reconhece esta atividade, tome as seguintes medidas imediamente:</p>
                <ol>
                    <li>Altere sua senha</li>
                    <li>Verifique as permissões da conta</li>
                    <li>Entre em contato conosco</li>
                </ol>
            </div>
            
            <p>Para verificar esta atividade e proteger sua conta:</p>
            <center>
                <a href="https://exemplo.com/verificar-seguranca" class="button">🔒 VERIFICAR ATIVIDADE</a>
            </center>
            <p style="text-align: center; margin-top: 15px;">
                <a href="https://exemplo.com/ajuda">Precisa de ajuda?</a>
            </p>
        </div>
        <div class="footer">
            <p>© 2024 NKJ Sistema de Segurança</p>
        </div>
    </div>
</body>
</html>`
};

// FUNÇÃO PARA GERAR NOME ALEATÓRIO
function generateRandomName(targetEmail, index) {
    const email = targetEmail.toLowerCase();
    let category;
    
    if (email.includes('finance') || email.includes('account') || email.includes('money')) {
        category = 'corporate';
    }
    else if (email.includes('tech') || email.includes('it') || email.includes('system')) {
        category = 'technical';
    }
    else if (email.includes('security') || email.includes('safe') || email.includes('protect')) {
        category = 'security';
    }
    else if (email.includes('sale') || email.includes('comerc') || email.includes('business')) {
        category = 'departments';
    }
    else if (email.includes('news') || email.includes('media') || email.includes('comun')) {
        category = 'communications';
    }
    else {
        const categories = Object.keys(ANTI_SPAM_NAMES);
        category = categories[index % categories.length];
    }
    
    const names = ANTI_SPAM_NAMES[category];
    return names[Math.floor(Math.random() * names.length)];
}

// SISTEMA DE TRACKING - MODIFICADO PARA USAR EMAIL EN LUGAR DE ID
function generateTrackingPixel(targetEmail) {
    return `<!-- Tracking Pixel -->
<div style="display:none; font-size:0; line-height:0;">
    <img src="http://localhost:${PORT}/track/open/${encodeURIComponent(targetEmail)}" width="1" height="1" alt="" border="0" style="display:block; width:1px; height:1px;"/>
</div>`;
}

function trackLinks(htmlContent, targetEmail) {
    return htmlContent.replace(/href="(https?:\/\/[^"]*)"/g, 
        (match, url) => `href="http://localhost:${PORT}/track/click/${encodeURIComponent(targetEmail)}?url=${encodeURIComponent(url)}"`
    );
}

function addTrackingToEmail(htmlContent, targetEmail) {
    if (!htmlContent || typeof htmlContent !== 'string') {
        return htmlContent;
    }
    
    let trackedContent = htmlContent;
    trackedContent = trackLinks(trackedContent, targetEmail);
    
    const pixelCode = generateTrackingPixel(targetEmail);
    
    if (trackedContent.includes('</body>')) {
        trackedContent = trackedContent.replace('</body>', pixelCode + '</body>');
    } else {
        trackedContent += pixelCode;
    }
    
    return trackedContent;
}

// ROTAS DE TRACKING - MODIFICADAS PARA USAR EMAIL
app.get('/track/open/:targetEmail', (req, res) => {
    const { targetEmail } = req.params;
    const decodedEmail = decodeURIComponent(targetEmail);
    
    console.log(`📨 PIXEL ACESSADO por: ${decodedEmail}`);
    
    if (!trackingData[decodedEmail]) {
        trackingData[decodedEmail] = { 
            email: decodedEmail,
            opens: 0, 
            clicks: [], 
            firstOpen: new Date().toISOString(),
            lastOpen: null
        };
    }
    
    trackingData[decodedEmail].opens += 1;
    trackingData[decodedEmail].lastOpen = new Date().toISOString();
    
    console.log(`✅ ABERTURA REGISTRADA: ${decodedEmail} - Total: ${trackingData[decodedEmail].opens}`);
    
    saveTrackingData();
    
    const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
    res.writeHead(200, {
        'Content-Type': 'image/png',
        'Content-Length': pixel.length,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    res.end(pixel);
});

app.get('/track/click/:targetEmail', (req, res) => {
    const { targetEmail } = req.params;
    const { url } = req.query;
    const decodedEmail = decodeURIComponent(targetEmail);
    
    console.log(`🔗 CLIQUE DETECTADO de: ${decodedEmail}`);
    
    if (!trackingData[decodedEmail]) {
        trackingData[decodedEmail] = { 
            email: decodedEmail,
            opens: 0, 
            clicks: [], 
            firstOpen: new Date().toISOString() 
        };
    }
    
    const decodedUrl = decodeURIComponent(url);
    trackingData[decodedEmail].clicks.push({
        url: decodedUrl,
        timestamp: new Date().toISOString(),
        ip: req.ip
    });
    
    console.log(`✅ CLIQUE REGISTRADO: ${decodedEmail} -> ${decodedUrl}`);
    
    saveTrackingData();
    res.redirect(decodedUrl);
});

// ROTA PARA LIMPIAR TRACKING DATA
app.post('/clear-tracking-data', (req, res) => {
    const previousCount = Object.keys(trackingData).length;
    trackingData = {};
    saveTrackingData();
    
    res.json({
        success: true,
        message: 'Dados de tracking borrados',
        previousCount: previousCount,
        currentCount: 0
    });
});

// HTML COMPLETO CORREGIDO
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="pt-br">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>⚡ KNJ MAIL DOMINATOR</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; font-family: Arial, sans-serif; }
            body { background: #0a0a0a; color: #ffffff; min-height: 100vh; padding: 20px; }
            .container { max-width: 1400px; margin: 0 auto; }
            .header { text-align: center; padding: 30px 0; border-bottom: 2px solid #00ff44; margin-bottom: 30px; }
            .header h1 { font-size: 2.5rem; color: #00ff44; margin-bottom: 10px; text-shadow: 0 0 10px rgba(0,255,68,0.5); }
            
            .btn-report {
                background: #ff9900; color: #000; font-size: 16px; padding: 15px 25px; margin: 20px 0;
                display: block; width: 100%; text-align: center; border: 2px solid #fff; border-radius: 8px;
                text-shadow: 0 1px 2px rgba(0,0,0,0.5); box-shadow: 0 0 10px #ff9900; font-weight: bold;
            }
            
            .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
            .stat-card { background: #111111; padding: 20px; border-radius: 10px; text-align: center; border: 1px solid #333; }
            .stat-number { font-size: 2rem; font-weight: bold; margin-bottom: 5px; }
            .sent { color: #00ff44; } .failed { color: #ff0022; } .targets { color: #0066ff; } .ratio { color: #8a2be2; }
            
            .main-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            .card { background: #111111; border: 1px solid #222; border-radius: 10px; padding: 20px; }
            .card h3 { color: #00ff44; margin-bottom: 20px; }
            
            .form-group { margin-bottom: 15px; }
            .form-group label { display: block; margin-bottom: 5px; color: #cccccc; }
            .form-control { width: 100%; padding: 10px; background: #1a1a1a; border: 1px solid #333; border-radius: 5px; color: #ffffff; }
            .textarea-sm { height: 100px; font-size: 12px; font-family: monospace; }
            .textarea-html { height: 400px; font-size: 12px; font-family: monospace; }
            
            .btn { padding: 12px 20px; border: none; border-radius: 5px; font-weight: bold; cursor: pointer; margin: 5px; }
            .btn-primary { background: #00ff44; color: #000; width: 100%; }
            .btn-small { padding: 8px 15px; font-size: 12px; background: #0066ff; color: white; }
            .btn-success { background: #00ff44; color: #000; }
            .btn-tracking-small { background: #ff00ff; color: #000; font-size: 14px; padding: 10px 20px; }
            .btn-clear { background: #ff0022; color: white; }
            .btn-download { background: #00cc88; color: #000; }
            
            .progress-bar { width: 100%; height: 5px; background: #333; border-radius: 3px; margin: 10px 0; overflow: hidden; }
            .progress-fill { height: 100%; background: #00ff44; width: 0%; transition: width 0.3s; }
            
            .log-container { background: #111111; border-radius: 10px; padding: 20px; margin-bottom: 20px; max-height: 400px; overflow-y: auto; }
            .log-entry { padding: 10px; margin-bottom: 8px; border-radius: 5px; border-left: 4px solid; background: #1a1a1a; }
            .log-success { border-left-color: #00ff44; } .log-error { border-left-color: #ff0022; }
            .log-warning { border-left-color: #ffcc00; } .log-info { border-left-color: #0066ff; }
            .log-html { border-left-color: #8a2be2; } .log-tracking { border-left-color: #ff00ff; }
            
            .tab-buttons { display: flex; margin-bottom: 10px; border-bottom: 1px solid #333; }
            .tab-btn { padding: 10px 20px; background: #222; border: none; color: #ccc; cursor: pointer; margin-right: 5px; }
            .tab-btn.active { background: #00ff44; color: #000; }
            .tab-content { display: none; }
            .tab-content.active { display: block; }
            
            .template-buttons { display: flex; flex-wrap: wrap; gap: 10px; margin: 10px 0; }
            .template-btn { background: #444; color: white; border: none; padding: 8px 15px; border-radius: 5px; cursor: pointer; font-size: 12px; }
            
            .html-preview { background: white; color: black; padding: 15px; border-radius: 5px; height: 300px; margin-top: 10px; border: 1px solid #333; overflow: auto; }
            .feature-badge { background: #8a2be2; color: white; padding: 2px 8px; border-radius: 10px; font-size: 10px; margin-left: 5px; }

            .modal { display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.8); }
            .modal-content { background-color: #111; margin: 5% auto; padding: 20px; border: 2px solid #00ff44; border-radius: 10px; width: 90%; max-width: 1200px; max-height: 80vh; overflow-y: auto; }
            .close { color: #aaa; float: right; font-size: 28px; font-weight: bold; cursor: pointer; }
            .close:hover { color: #fff; }
            
            .report-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px; margin-top: 20px; }
            .report-item { background: #1a1a1a; padding: 15px; border-radius: 8px; border-left: 4px solid; }
            .report-success { border-left-color: #00ff44; } .report-error { border-left-color: #ff0022; }
            
            .report-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
            .report-email { font-weight: bold; color: #00ff44; }
            .report-status { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
            .status-success { background: #00ff44; color: #000; } .status-error { background: #ff0022; color: #fff; }
            
            .filter-buttons { display: flex; gap: 10px; margin: 15px 0; flex-wrap: wrap; }
            .filter-btn { padding: 8px 15px; background: #333; color: #ccc; border: none; border-radius: 5px; cursor: pointer; }
            .filter-btn.active { background: #00ff44; color: #000; }
            
            .stats-badge { background: #8a2be2; color: white; padding: 10px 15px; border-radius: 8px; margin: 10px 0; text-align: center; }
            .date-filters { display: flex; gap: 10px; margin: 15px 0; align-items: center; flex-wrap: wrap; }
            .date-input { background: #1a1a1a; border: 1px solid #333; border-radius: 5px; color: white; padding: 8px; }
            .download-section { background: #1a2a1a; padding: 15px; border-radius: 8px; margin: 15px 0; }
            .tracking-stats { background: #2a1a2a; padding: 15px; border-radius: 8px; margin: 15px 0; }
            .tracking-item { background: #1a1a1a; padding: 10px; border-radius: 5px; margin: 5px 0; border-left: 3px solid #ff00ff; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>⚡ KNJ MAIL DOMINATOR</h1>
                <p>Advanced HTML Email Campaign Platform</p>
            </div>

            <div class="report-section">
                <button class="btn-report" onclick="showEmailReports()">📊 VER RELATÓRIOS DETALHADOS</button>
                <p style="text-align: center; color: #ccc; margin-top: 10px;">Status individual de todos os emails enviados</p>
            </div>
            
            <div class="stats-grid">
                <div class="stat-card"><div class="stat-number sent" id="statSent">0</div><div>Emails Sent</div></div>
                <div class="stat-card"><div class="stat-number failed" id="statFailed">0</div><div>Failed</div></div>
                <div class="stat-card"><div class="stat-number targets" id="statTargets">0</div><div>Targets</div></div>
                <div class="stat-card"><div class="stat-number ratio" id="statRatio">0%</div><div>Success Rate</div></div>
            </div>
            
            <div class="main-grid">
                <div class="card">
                    <h3>⚙️ Attack Configuration <span class="feature-badge">MULTI-TARGET</span></h3>
                    
                    <div class="form-group">
                        <label>🎯 Target Emails (um por linha)</label>
                        <textarea class="form-control textarea-sm" id="targetEmails" placeholder="email1@example.com\nemail2@example.com">seu-email@provedor.com</textarea>
                        <div style="display: flex; gap: 10px; margin-top: 5px;">
                            <button class="btn btn-small" onclick="addSampleEmails()">📋 Add Sample</button>
                            <button class="btn btn-small" onclick="clearTargets()">🗑️ Clear</button>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>📊 Emails per Target</label>
                        <input type="range" class="form-control" id="emailQuantity" min="1" max="3" value="1">
                        <div style="text-align: center;"><span id="quantityValue">1</span> email(s) per target</div>
                    </div>
                    
                    <div class="form-group">
                        <label>📝 Email Subject</label>
                        <input type="text" class="form-control" id="emailSubject" value="Atualização Importante do Sistema">
                    </div>
                    
                    <div class="form-group">
                        <label>💬 Message Type</label>
                        <div class="tab-buttons">
                            <button class="tab-btn" onclick="showTab('text')">📝 Text</button>
                            <button class="tab-btn active" onclick="showTab('html')">🌐 HTML</button>
                        </div>
                        
                        <div id="text-tab" class="tab-content">
                            <textarea class="form-control" id="emailMessage" rows="4">Prezado usuário,

Esta é uma comunicação oficial sobre sua conta.

Atenciosamente,
Equipe de Suporte</textarea>
                        </div>
                        
                        <div id="html-tab" class="tab-content active">
                            <textarea class="form-control textarea-html" id="htmlMessage" placeholder="Digite seu código HTML aqui...">${HTML_TEMPLATES.corporate}</textarea>
                            
                            <div class="template-buttons">
                                <button class="template-btn" onclick="loadTemplate('corporate')">🏢 Corporate</button>
                                <button class="template-btn" onclick="loadTemplate('promotional')">🔥 Promotional</button>
                                <button class="template-btn" onclick="loadTemplate('alert')">🚨 Alert</button>
                                <button class="template-btn" onclick="previewHTML()">👁️ Preview</button>
                                <button class="template-btn" onclick="clearHTML()">🗑️ Clear</button>
                            </div>
                            
                            <div id="htmlPreview" class="html-preview" style="display: none;">
                                <h4>HTML Preview:</h4>
                                <iframe id="previewFrame" style="width: 100%; height: 250px; border: 1px solid #ccc;"></iframe>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="card">
                    <h3>🔑 SMTP Configuration <span class="feature-badge">RANDOM NAMES</span></h3>
                    
                    <div class="form-group">
                        <label>📧 SendGrid API Key</label>
                        <input type="text" class="form-control" id="apiKey" placeholder="SG.sua_api_key_aqui">
                    </div>
                    
                    <div class="form-group">
                        <label>👤 From Email (Verified)</label>
                        <input type="email" class="form-control" id="fromEmail" placeholder="seu-email@dominio.com">
                    </div>
                    
                    <div class="form-group">
                        <label>🎭 Sender Name Mode</label>
                        <div style="display: flex; gap: 10px; margin-top: 5px;">
                            <button class="btn btn-small btn-success" onclick="setNameMode('auto')">🤖 AUTO NAMES</button>
                            <button class="btn btn-small" onclick="setNameMode('fixed')">👤 FIXED NAME</button>
                        </div>
                        <div style="margin-top: 10px; font-size: 12px; color: #00ff44;" id="nameModeStatus">✅ Auto Names: Cada email terá remetente diferente</div>
                        <input type="text" class="form-control" id="fromName" value="Sistema de Notificações" style="display: none; margin-top: 10px;">
                    </div>

                    <div class="form-group">
                        <label>🎯 Tracking System</label>
                        <div style="display: flex; gap: 10px; margin-top: 5px;">
                            <button class="btn btn-small btn-tracking-small" onclick="setTrackingMode('enabled')">📨 TRACKING ON</button>
                            <button class="btn btn-small" onclick="setTrackingMode('disabled')">🚫 TRACKING OFF</button>
                        </div>
                        <div style="margin-top: 10px; font-size: 12px; color: #ff00ff;" id="trackingStatus">📨 Tracking: ATIVADO - Aberturas e cliques serão rastreados</div>
                    </div>
                    
                    <div style="background: #1a2a1a; padding: 15px; border-radius: 5px; margin-top: 15px;">
                        <strong>🚀 FEATURES ATIVAS:</strong>
                        <div style="margin-top: 10px; font-size: 12px;">
                            <div>✅ HTML Support - Botões, cores, imagens</div>
                            <div>✅ Random Names - Remetentes únicos</div>
                            <div>✅ Multi-target - Múltiplos emails</div>
                            <div>✅ Templates - Designs prontos</div>
                            <div>✅ Email Reports PERSISTENTES</div>
                            <div>✅ TRACKING AVANÇADO</div>
                        </div>
                    </div>
                    
                    <button class="btn btn-primary" onclick="startUltimateAttack()">🚀 LAUNCH HTML ATTACK</button>
                    
                    <div class="progress-bar"><div class="progress-fill" id="attackProgress"></div></div>
                    
                    <div style="margin-top: 15px; font-size: 12px; color: #ccc;">
                        <strong>📈 Status:</strong> <span id="progressText">Ready - HTML Mode Active</span>
                    </div>
                </div>
            </div>
            
            <div class="card">
                <h3>📋 Attack Logs</h3>
                <div class="log-container" id="attackLog">
                    <div class="log-entry log-html">🌐 HTML ULTIMATE MODE ACTIVATED</div>
                    <div class="log-entry log-success">✅ Random Names + HTML Support Enabled</div>
                    <div class="log-entry log-tracking">📨 TRACKING SYSTEM ENABLED</div>
                </div>
            </div>
            
            <div class="card">
                <h3>🕐 Attack History</h3>
                <div id="attackHistory"><div class="log-entry log-info">No attacks recorded yet</div></div>
            </div>
        </div>

        <!-- Modal para relatórios -->
        <div id="reportModal" class="modal">
            <div class="modal-content">
                <span class="close" onclick="closeReportModal()">&times;</span>
                <h2>📊 Relatório Detalhado</h2>
                <p>Status individual de CADA email enviado</p>
                
                <div class="download-section">
                    <strong>📥 DOWNLOAD DO RELATÓRIO:</strong>
                    <div style="display: flex; gap: 10px; margin-top: 10px; flex-wrap: wrap;">
                        <button class="btn btn-download" onclick="downloadReport('csv')">📊 Baixar CSV</button>
                        <button class="btn btn-download" onclick="downloadReport('json')">📁 Baixar JSON</button>
                        <button class="btn btn-tracking-small" onclick="showTrackingReports()">📨 Ver Tracking</button>
                        <button class="btn btn-clear" onclick="clearAllReports()">🗑️ Limpar Tudo</button>
                    </div>
                </div>

                <div class="date-filters">
                    <span class="filter-label">📅 Filtrar por Data:</span>
                    <input type="date" id="startDate" class="date-input" onchange="filterByDate()">
                    <span class="filter-label">até</span>
                    <input type="date" id="endDate" class="date-input" onchange="filterByDate()">
                    <button class="btn btn-small" onclick="clearDateFilter()">🗑️ Limpar Data</button>
                </div>
                
                <div class="filter-buttons">
                    <button class="filter-btn active" onclick="filterReports('all')">Todos</button>
                    <button class="filter-btn" onclick="filterReports('success')">✅ Sucesso</button>
                    <button class="filter-btn" onclick="filterReports('error')">❌ Erro</button>
                </div>
                
                <div id="reportStats" style="margin: 15px 0; padding: 10px; background: #1a2a1a; border-radius: 5px;">Carregando estatísticas...</div>
                <div class="report-grid" id="emailReportsGrid">Carregando relatórios...</div>

                <div style="margin-top: 20px; text-align: center;">
                    <button class="btn btn-small" onclick="closeReportModal()">Fechar</button>
                    <button class="btn btn-small btn-success" onclick="loadEmailReports()">🔄 Atualizar</button>
                </div>
            </div>
        </div>

        <!-- Modal para tracking -->
        <div id="trackingModal" class="modal">
            <div class="modal-content">
                <span class="close" onclick="closeTrackingModal()">&times;</span>
                <h2>📨 Relatório de Tracking</h2>
                <p>Estatísticas em tempo real de engajamento</p>
                
                <div class="tracking-stats" id="trackingStats">Carregando estatísticas de tracking...</div>
                
                <div style="background: #1a1a2a; padding: 15px; border-radius: 8px; margin: 15px 0;">
                    <h3>🔍 Como funciona el Tracking:</h3>
                    <ul style="color: #ccc; font-size: 14px; line-height: 1.5;">
                        <li><strong>Pixel Invisible:</strong> Imagen 1x1 transparente en cada email</li>
                        <li><strong>Aberturas:</strong> Se registran cuando el pixel es cargado</li>
                        <li><strong>Cliques:</strong> Se registran cuando hacen click en links</li>
                    </ul>
                </div>
                
                <div id="trackingReportsGrid">Carregando dados de tracking...</div>

                <div style="margin-top: 20px; text-align: center;">
                    <button class="btn btn-small" onclick="closeTrackingModal()">❌ Cerrar</button>
                    <button class="btn btn-small btn-success" onclick="loadTrackingReports()">🔄 Actualizar</button>
                    <button class="btn btn-small btn-tracking-small" onclick="testTrackingPixel()">🧪 Probar Pixel</button>
                    <button class="btn btn-small btn-clear" onclick="clearTrackingData()">🗑️ Limpar Tracking</button>
                </div>
            </div>
        </div>

        <script>
            let nameMode = 'auto';
            let currentTab = 'html';
            let currentFilter = 'all';
            let currentDateFilter = null;
            let trackingMode = 'enabled';
            
            function showTab(tabName) {
                currentTab = tabName;
                document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
                document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
                document.getElementById(tabName + '-tab').classList.add('active');
                event.target.classList.add('active');
            }
            
            function setNameMode(mode) {
                nameMode = mode;
                const nameInput = document.getElementById('fromName');
                const status = document.getElementById('nameModeStatus');
                
                if (mode === 'auto') {
                    nameInput.style.display = 'none';
                    status.innerHTML = '✅ Auto Names: Cada email terá remetente diferente';
                    status.style.color = '#00ff44';
                } else {
                    nameInput.style.display = 'block';
                    status.innerHTML = '👤 Fixed Name: Todos os emails com mesmo remetente';
                    status.style.color = '#ffcc00';
                }
            }

            function setTrackingMode(mode) {
                trackingMode = mode;
                const status = document.getElementById('trackingStatus');
                
                if (mode === 'enabled') {
                    status.innerHTML = '📨 Tracking: ATIVADO - Aberturas e cliques serão rastreados';
                    status.style.color = '#ff00ff';
                } else {
                    status.innerHTML = '🚫 Tracking: DESATIVADO - Sem rastreamento';
                    status.style.color = '#ffcc00';
                }
            }
            
            function loadTemplate(type) {
                const templates = ${JSON.stringify(HTML_TEMPLATES)};
                document.getElementById('htmlMessage').value = templates[type];
                addLog('Template loaded: ' + type, 'success');
            }
            
            function previewHTML() {
                const htmlContent = document.getElementById('htmlMessage').value;
                const preview = document.getElementById('htmlPreview');
                const frame = document.getElementById('previewFrame');
                frame.srcdoc = htmlContent;
                preview.style.display = 'block';
            }
            
            function clearHTML() {
                document.getElementById('htmlMessage').value = '';
                document.getElementById('htmlPreview').style.display = 'none';
            }
            
            document.getElementById('emailQuantity').addEventListener('input', function() {
                document.getElementById('quantityValue').textContent = this.value;
            });
            
            function addSampleEmails() {
                const samples = ['user1@example.com', 'user2@example.com', 'client@business.com'];
                document.getElementById('targetEmails').value = samples.join('\\n');
            }
            
            function clearTargets() {
                document.getElementById('targetEmails').value = '';
            }
            
            async function updateStats() {
                try {
                    const response = await fetch('/get-stats');
                    const stats = await response.json();
                    document.getElementById('statSent').textContent = stats.sent;
                    document.getElementById('statFailed').textContent = stats.failed;
                    document.getElementById('statTargets').textContent = stats.targets;
                    document.getElementById('statRatio').textContent = stats.ratio + '%';
                } catch (error) {
                    console.error('Error updating stats:', error);
                }
            }
            
            async function startUltimateAttack() {
                const emails = document.getElementById('targetEmails').value.split('\\n').filter(email => email.trim().length > 0).map(email => email.trim());
                const isHTML = currentTab === 'html';
                let message = isHTML ? document.getElementById('htmlMessage').value : document.getElementById('emailMessage').value;
                
                const data = {
                    targets: emails,
                    quantity: parseInt(document.getElementById('emailQuantity').value),
                    subject: document.getElementById('emailSubject').value,
                    message: message,
                    messageType: isHTML ? 'html' : 'text',
                    apiKey: document.getElementById('apiKey').value,
                    fromEmail: document.getElementById('fromEmail').value,
                    nameMode: nameMode,
                    fixedName: document.getElementById('fromName').value,
                    tracking: trackingMode
                };
                
                if (data.targets.length === 0 || !data.fromEmail || !data.apiKey) {
                    addLog('Please fill targets, from email and API key', 'error');
                    return;
                }
                
                addLog('🚀 STARTING HTML ATTACK...', 'html');
                document.getElementById('attackProgress').style.width = '0%';
                document.getElementById('progressText').textContent = 'Starting HTML Attack...';
                
                try {
                    const response = await fetch('/ultimate-html-attack', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify(data)
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        addLog('🎉 HTML ATTACK COMPLETED!', 'html');
                        addLog('✅ Sent: ' + result.stats.sent + ' emails', 'success');
                    } else {
                        addLog('❌ Attack failed: ' + result.message, 'error');
                    }
                    
                    updateStats();
                    loadHistory();
                    
                } catch (error) {
                    addLog('❌ Network error: ' + error.message, 'error');
                }
                
                document.getElementById('progressText').textContent = 'HTML Attack Completed';
            }
            
            function addLog(message, type) {
                const log = document.getElementById('attackLog');
                const entry = document.createElement('div');
                entry.className = 'log-entry log-' + type;
                entry.innerHTML = '<strong>' + new Date().toLocaleTimeString() + '</strong> - ' + message;
                log.appendChild(entry);
                log.scrollTop = log.scrollHeight;
            }
            
            async function loadHistory() {
                try {
                    const response = await fetch('/get-history');
                    const history = await response.json();
                    const container = document.getElementById('attackHistory');
                    container.innerHTML = '';
                    
                    if (history.length === 0) {
                        container.innerHTML = '<div class="log-entry log-info">No attacks recorded yet</div>';
                        return;
                    }
                    
                    history.slice(-5).reverse().forEach(item => {
                        const div = document.createElement('div');
                        div.className = 'history-item';
                        div.innerHTML = '<strong>' + new Date(item.timestamp).toLocaleString() + '</strong><br>Targets: ' + item.targets + ' | Sent: ' + item.sent;
                        container.appendChild(div);
                    });
                } catch (error) {
                    console.error('Error loading history:', error);
                }
            }

            function showEmailReports() {
                document.getElementById('reportModal').style.display = 'block';
                loadEmailReports();
            }

            function closeReportModal() {
                document.getElementById('reportModal').style.display = 'none';
            }

            function showTrackingReports() {
                document.getElementById('trackingModal').style.display = 'block';
                loadTrackingReports();
            }

            function closeTrackingModal() {
                document.getElementById('trackingModal').style.display = 'none';
            }

            function filterReports(status) {
                currentFilter = status;
                document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
                event.target.classList.add('active');
                loadEmailReports(status);
            }

            function filterByDate() {
                const startDate = document.getElementById('startDate').value;
                const endDate = document.getElementById('endDate').value;
                currentDateFilter = (startDate || endDate) ? { start: startDate, end: endDate } : null;
                loadEmailReports(currentFilter);
            }

            function clearDateFilter() {
                document.getElementById('startDate').value = '';
                document.getElementById('endDate').value = '';
                currentDateFilter = null;
                loadEmailReports(currentFilter);
            }

            async function loadEmailReports(filter = 'all') {
                try {
                    const response = await fetch('/get-email-reports');
                    const reports = await response.json();
                    
                    let filteredReports = reports;
                    if (currentDateFilter) {
                        filteredReports = filteredReports.filter(report => {
                            const reportDate = new Date(report.timestamp).toISOString().split('T')[0];
                            const start = currentDateFilter.start || '0000-01-01';
                            const end = currentDateFilter.end || '9999-12-31';
                            return reportDate >= start && reportDate <= end;
                        });
                    }
                    
                    if (filter !== 'all') {
                        filteredReports = filteredReports.filter(r => r.status === filter);
                    }
                    
                    const total = filteredReports.length;
                    const success = filteredReports.filter(r => r.status === 'success').length;
                    const error = filteredReports.filter(r => r.status === 'error').length;
                    
                    document.getElementById('reportStats').innerHTML = '<div class="stats-badge"><strong>📈 ESTATÍSTICAS:</strong><br>Total: ' + total + ' | ✅ Sucesso: ' + success + ' | ❌ Erro: ' + error + '</div>';
                    
                    filteredReports.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                    const grid = document.getElementById('emailReportsGrid');
                    grid.innerHTML = '';
                    
                    if (filteredReports.length === 0) {
                        grid.innerHTML = '<div class="log-entry log-info">Nenhum email encontrado</div>';
                        return;
                    }
                    
                    filteredReports.forEach(report => {
                        const item = document.createElement('div');
                        item.className = 'report-item report-' + report.status;
                        const statusText = report.status === 'success' ? '✅ ENVIADO' : '❌ ERRO';
                        const statusClass = report.status === 'success' ? 'status-success' : 'status-error';
                        item.innerHTML = '<div class="report-header"><div class="report-email">' + report.to + '</div><div class="report-status ' + statusClass + '">' + statusText + '</div></div><div class="report-details"><strong>De:</strong> "' + report.fromName + '" &lt;' + report.fromEmail + '&gt;<br><strong>Assunto:</strong> ' + report.subject + (report.error ? '<br><strong>Erro:</strong> ' + report.error : '') + '</div><div class="report-time">' + new Date(report.timestamp).toLocaleString() + '</div>';
                        grid.appendChild(item);
                    });
                    
                } catch (error) {
                    document.getElementById('emailReportsGrid').innerHTML = '<div class="log-entry log-error">Erro ao carregar relatórios</div>';
                }
            }

            async function loadTrackingReports() {
                try {
                    const response = await fetch('/get-tracking-data');
                    const trackingData = await response.json();
                    
                    let totalOpens = 0;
                    let totalClicks = 0;
                    let emailsWithTracking = 0;
                    const trackingItems = [];
                    
                    for (const [targetEmail, data] of Object.entries(trackingData)) {
                        const opens = data.opens || 0;
                        const clicks = data.clicks ? data.clicks.length : 0;
                        totalOpens += opens;
                        totalClicks += clicks;
                        emailsWithTracking++;
                        
                        trackingItems.push('<div class="tracking-item"><strong>📧 Email:</strong> ' + targetEmail + '<br><strong>📨 Aberturas:</strong> ' + opens + '<br><strong>🔗 Cliques:</strong> ' + clicks + (data.clicks && data.clicks.length > 0 ? '<br><strong>Links:</strong><br>' + data.clicks.map(click => '• ' + click.url + ' (' + new Date(click.timestamp).toLocaleString() + ')').join('<br>') : '') + '</div>');
                    }
                    
                    document.getElementById('trackingStats').innerHTML = '<div class="stats-badge"><strong>📨 ESTATÍSTICAS:</strong><br>Emails: ' + emailsWithTracking + '<br>Aberturas: ' + totalOpens + '<br>Cliques: ' + totalClicks + '</div>';
                    document.getElementById('trackingReportsGrid').innerHTML = trackingItems.length > 0 ? trackingItems.join('') : '<div class="log-entry log-info">No hay datos de tracking</div>';
                    
                } catch (error) {
                    document.getElementById('trackingStats').innerHTML = '<div class="log-entry log-error">Error al cargar tracking</div>';
                }
            }

            function testTrackingPixel() {
                const testEmail = 'test@example.com';
                const pixelUrl = 'http://localhost:${PORT}/track/open/' + encodeURIComponent(testEmail);
                const img = new Image();
                img.src = pixelUrl;
                img.onload = function() {
                    addLog('✅ Pixel testado - Email: ' + testEmail, 'tracking');
                    setTimeout(loadTrackingReports, 1000);
                    alert('🧪 Pixel testado!\\nEmail: ' + testEmail + '\\n\\nRecarregando dados...');
                };
            }

            async function clearTrackingData() {
                if (confirm('⚠️ Borrar TODOS os dados de tracking?')) {
                    try {
                        const response = await fetch('/clear-tracking-data', { method: 'POST' });
                        const result = await response.json();
                        if (result.success) {
                            alert('🗑️ Tracking limpo!');
                            loadTrackingReports();
                        }
                    } catch (error) {
                        alert('❌ Erro ao limpar tracking');
                    }
                }
            }

            async function clearAllReports() {
                if (confirm('⚠️ Apagar TODOS os relatórios?')) {
                    try {
                        const response = await fetch('/clear-email-reports', { method: 'POST' });
                        const result = await response.json();
                        if (result.success) {
                            alert('🗑️ Relatórios apagados!');
                            loadEmailReports();
                        }
                    } catch (error) {
                        alert('❌ Erro ao apagar relatórios');
                    }
                }
            }

            function downloadReport(format) {
                const startDate = document.getElementById('startDate').value;
                const endDate = document.getElementById('endDate').value;
                let url = '/download-reports/' + format;
                if (startDate || endDate) {
                    url += '?start=' + startDate + '&end=' + endDate;
                }
                window.open(url, '_blank');
            }
            
            // Initialize
            setNameMode('auto');
            setTrackingMode('enabled');
            updateStats();
            loadHistory();

            window.onclick = function(event) {
                const modals = document.querySelectorAll('.modal');
                modals.forEach(modal => {
                    if (event.target === modal) {
                        modal.style.display = 'none';
                    }
                });
            }
        </script>
    </body>
    </html>
    `);
});

// ROTA ULTIMATE HTML ATTACK - MODIFICADA PARA USAR EMAIL EN TRACKING
app.post('/ultimate-html-attack', async (req, res) => {
    const { targets, quantity, subject, message, messageType, apiKey, fromEmail, nameMode, fixedName, tracking } = req.body;
    
    console.log('🚀 ULTIMATE HTML ATTACK INICIADO');
    
    let totalSent = 0;
    let totalFailed = 0;
    const usedNames = new Set();
    
    if (!targets || targets.length === 0) {
        return res.json({ success: false, message: 'Nenhum email target especificado' });
    }
    
    if (!apiKey || !apiKey.startsWith('SG.')) {
        return res.json({ success: false, message: 'API Key do SendGrid inválida' });
    }
    
    if (!fromEmail) {
        return res.json({ success: false, message: 'From Email não especificado' });
    }

    try {
        const transporter = nodemailer.createTransport({
            host: 'smtp.sendgrid.net',
            port: 587,
            secure: false,
            auth: { user: 'apikey', pass: apiKey },
            tls: { rejectUnauthorized: false }
        });

        await transporter.verify();
        console.log('✅ Conexão SMTP OK!');

        for (let targetIndex = 0; targetIndex < targets.length; targetIndex++) {
            const target = targets[targetIndex];
            
            if (!target || !target.includes('@')) {
                console.log(`❌ Target inválido: ${target}`);
                totalFailed += quantity;
                continue;
            }
            
            let targetSent = 0;
            let targetFailed = 0;
            
            for (let emailIndex = 0; emailIndex < quantity; emailIndex++) {
                try {
                    let fromName;
                    if (nameMode === 'auto') {
                        fromName = generateRandomName(target, targetIndex + emailIndex);
                        usedNames.add(fromName);
                    } else {
                        fromName = fixedName || 'Sistema de Notificações';
                    }

                    let finalMessage = message;
                    
                    // MODIFICADO: Usar el email del destinatario en lugar de un ID
                    if (tracking === 'enabled' && messageType === 'html') {
                        finalMessage = addTrackingToEmail(message, target);
                    }

                    const mailOptions = {
                        from: `"${fromName}" <${fromEmail}>`,
                        to: target,
                        subject: subject + (quantity > 1 ? ` #${emailIndex + 1}` : ''),
                        html: messageType === 'html' ? finalMessage : undefined,
                        text: messageType === 'html' ? 'Este email requer suporte a HTML.' : message
                    };

                    const info = await transporter.sendMail(mailOptions);
                    targetSent++;
                    totalSent++;
                    
                    emailReports.push({
                        timestamp: new Date(),
                        to: target,
                        fromEmail: fromEmail,
                        fromName: fromName,
                        subject: mailOptions.subject,
                        status: 'success',
                        messageId: info.messageId,
                        trackingEnabled: tracking === 'enabled',
                        error: null
                    });
                    
                } catch (error) {
                    targetFailed++;
                    totalFailed++;
                    
                    emailReports.push({
                        timestamp: new Date(),
                        to: target,
                        fromEmail: fromEmail,
                        fromName: fromName || fixedName || 'Sistema de Notificações',
                        subject: subject + (quantity > 1 ? ` #${emailIndex + 1}` : ''),
                        status: 'error',
                        error: error.message
                    });
                }

                if (emailIndex < quantity - 1) {
                    await new Promise(resolve => setTimeout(resolve, 2500));
                }
            }

            if (targetIndex < targets.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }

        targets.forEach(target => totalStats.targets.add(target));
        totalStats.sent += totalSent;
        totalStats.failed += totalFailed;

        const totalAttempts = totalSent + totalFailed;
        const deliveryRate = totalAttempts > 0 ? Math.round((totalSent / totalAttempts) * 100) : 0;

        attackHistory.push({
            timestamp: new Date(),
            targets: targets.length,
            quantity: quantity,
            sent: totalSent,
            failed: totalFailed,
            deliveryRate: deliveryRate,
            messageType: messageType
        });

        if (attackHistory.length > 20) {
            attackHistory = attackHistory.slice(-20);
        }

        saveEmailReports();

        console.log(`🎉 ATAQUE CONCLUÍDO: ${totalSent} enviados, ${totalFailed} falhas`);

        res.json({
            success: true,
            message: `HTML attack finalizado! ${totalSent} emails enviados.`,
            stats: { sent: totalSent, failed: totalFailed, targets: targets.length },
            deliveryRate: deliveryRate,
            usedNames: Array.from(usedNames)
        });

    } catch (error) {
        console.log('❌ ERRO GERAL:', error);
        res.json({ success: false, message: 'Falha no ataque: ' + error.message });
    }
});

// Rotas auxiliares
app.get('/get-stats', (req, res) => {
    const total = totalStats.sent + totalStats.failed;
    const ratio = total > 0 ? Math.round((totalStats.sent / total) * 100) : 0;
    res.json({ sent: totalStats.sent, failed: totalStats.failed, targets: totalStats.targets.size, ratio: ratio });
});

app.get('/get-history', (req, res) => {
    res.json(attackHistory);
});

app.get('/get-email-reports', (req, res) => {
    const sortedReports = [...emailReports].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json(sortedReports);
});

app.get('/get-tracking-data', (req, res) => {
    res.json(trackingData);
});

app.post('/clear-email-reports', (req, res) => {
    emailReports = [];
    saveEmailReports();
    res.json({ success: true, message: 'Todos os relatórios foram apagados' });
});

app.get('/download-reports/:format', (req, res) => {
    const { format } = req.params;
    const { start, end } = req.query;
    
    let filteredReports = [...emailReports];
    
    if (start || end) {
        filteredReports = filteredReports.filter(report => {
            const reportDate = new Date(report.timestamp).toISOString().split('T')[0];
            const startDate = start || '0000-01-01';
            const endDate = end || '9999-12-31';
            return reportDate >= startDate && reportDate <= endDate;
        });
    }
    
    filteredReports.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    if (format === 'csv') {
        const headers = ['Data', 'Hora', 'Para', 'De', 'Nome', 'Assunto', 'Status', 'Erro'];
        const csvData = filteredReports.map(report => {
            const date = new Date(report.timestamp);
            return [
                date.toLocaleDateString('pt-BR'),
                date.toLocaleTimeString('pt-BR'),
                report.to,
                report.fromEmail,
                `"${report.fromName}"`,
                `"${report.subject}"`,
                report.status === 'success' ? 'SUCESSO' : 'ERRO',
                report.error ? `"${report.error}"` : ''
            ];
        });
        
        const csvContent = [headers, ...csvData].map(row => row.join(',')).join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=email_reports.csv`);
        res.send(csvContent);
        
    } else if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=email_reports.json`);
        res.send(JSON.stringify(filteredReports, null, 2));
    } else {
        res.status(400).json({ error: 'Formato inválido' });
    }
});

app.listen(PORT, () => {
    console.log('🚀 KNJ Mail Dominator - HTML ULTIMATE Edition');
    console.log('💣 Access: http://localhost:' + PORT);
    console.log('📊 Total emails salvos:', emailReports.length);
    console.log('📈 Total tracking data:', Object.keys(trackingData).length);
});