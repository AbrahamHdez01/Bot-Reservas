export default async function handler(req, res) {
  const { code, error } = req.query;

  if (error) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Error de Autorización</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; text-align: center; }
            .error { color: red; }
          </style>
        </head>
        <body>
          <h1 class="error">❌ Error de Autorización</h1>
          <p>Error: ${error}</p>
          <p>Por favor, inténtalo de nuevo.</p>
        </body>
      </html>
    `);
  }

  if (!code) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Código no encontrado</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; text-align: center; }
            .error { color: red; }
          </style>
        </head>
        <body>
          <h1 class="error">❌ Código de autorización no encontrado</h1>
          <p>No se recibió el código de autorización de Google.</p>
        </body>
      </html>
    `);
  }

  return res.status(200).send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>✅ Código de Autorización Obtenido</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            padding: 20px; 
            text-align: center; 
            background: #f5f5f5;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          .code-box {
            background: #f8f9fa;
            border: 2px solid #007bff;
            border-radius: 5px;
            padding: 15px;
            margin: 20px 0;
            font-family: monospace;
            font-size: 14px;
            word-break: break-all;
            user-select: all;
          }
          .success { color: #28a745; }
          .copy-btn {
            background: #007bff;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            margin: 10px;
          }
          .copy-btn:hover { background: #0056b3; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1 class="success">✅ ¡Autorización Exitosa!</h1>
          <p>Se ha obtenido el código de autorización de Google Calendar.</p>
          
          <h3>📋 Código de Autorización:</h3>
          <div class="code-box" id="authCode">${code}</div>
          
          <button class="copy-btn" onclick="copyCode()">📋 Copiar Código</button>
          
          <div style="margin-top: 30px; padding: 20px; background: #e7f3ff; border-radius: 5px;">
            <h4>🔧 Siguiente paso:</h4>
            <p>Copia este código y pégalo en la terminal donde está ejecutándose el script de configuración.</p>
          </div>
        </div>

        <script>
          function copyCode() {
            const code = document.getElementById('authCode').textContent;
            navigator.clipboard.writeText(code).then(() => {
              alert('¡Código copiado al portapapeles!');
            });
          }
        </script>
      </body>
    </html>
  `);
} 