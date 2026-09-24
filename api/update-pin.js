/**
 * Vercel Serverless Function: /api/update-pin
 * Recibe el nuevo hash de PIN y lo publica en GitHub mediante API,
 * disparando automáticamente el despliegue en Vercel para todos los dispositivos.
 */

export default async function handler(req, res) {
  // Configurar cabeceras CORS para permitir peticiones desde cualquier dispositivo
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Use POST.' });
  }

  try {
    const { newHash, newLength, token: clientToken } = req.body || {};

    if (!newHash || typeof newHash !== 'string') {
      return res.status(400).json({ error: 'El parámetro newHash es requerido.' });
    }

    const token = process.env.GITHUB_TOKEN || clientToken;
    if (!token) {
      return res.status(400).json({ 
        error: 'Token de GitHub no configurado en Vercel ni enviado en la petición.' 
      });
    }

    const owner = 'pelibuey';
    const repo = 'pagina_personal';
    const filePath = 'auth-config.json';
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

    // 1. Obtener el sha actual del archivo en GitHub
    let currentSha = null;
    try {
      const getRes = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'CRIS-StudyFlow-Vercel'
        }
      });
      if (getRes.ok) {
        const fileData = await getRes.json();
        currentSha = fileData.sha;
      }
    } catch (e) {
      console.warn('No se pudo obtener SHA previo:', e);
    }

    // 2. Preparar el nuevo contenido JSON
    const updatedData = {
      pinHash: newHash,
      pinLength: Number(newLength) || 4,
      updatedAt: new Date().toISOString(),
      updatedBy: 'vercel_api'
    };

    const base64Content = Buffer.from(JSON.stringify(updatedData, null, 2)).toString('base64');

    // 3. Crear commit en la rama main de GitHub
    const commitBody = {
      message: 'chore(auth): actualizar pin de acceso de la web',
      content: base64Content,
      branch: 'main'
    };
    if (currentSha) {
      commitBody.sha = currentSha;
    }

    const putRes = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'CRIS-StudyFlow-Vercel'
      },
      body: JSON.stringify(commitBody)
    });

    if (putRes.ok) {
      return res.status(200).json({ 
        success: true, 
        message: '¡Código PIN actualizado en GitHub! Vercel desplegará los cambios en segundos.',
        data: updatedData
      });
    } else {
      const errorJson = await putRes.json().catch(() => ({}));
      return res.status(putRes.status).json({ 
        error: errorJson.message || 'Error al actualizar el archivo en GitHub.' 
      });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Error interno del servidor.' });
  }
}
