// Detecta o país do visitante via os headers de geolocalização que a
// própria rede edge da Vercel já preenche em toda requisição — sem
// depender de nenhum serviço terceiro de geo-IP (evita custo, limite de
// taxa e enviar o IP do usuário pra fora da nossa própria infraestrutura).
// Usado só pra decidir o idioma padrão (pt no Brasil, en fora) — nunca pra
// bloquear conteúdo.
export const config = { runtime: 'edge' }

export default function handler(request) {
  const country = request.headers.get('x-vercel-ip-country') || null
  return new Response(JSON.stringify({ country }), {
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  })
}
