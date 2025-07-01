export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }
  const { password } = req.body;
  if (password === process.env.ADMIN_PASSWORD) {
    return res.status(200).json({ success: true });
  } else {
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }
} 