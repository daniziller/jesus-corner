// avatarImage.js — prepara a foto de perfil escolhida no aparelho: recorta
// o quadrado do meio e reduz (avatarCrop, em comunidadeMath.js), devolvendo
// um JPEG pequeno pronto pra enviar. Tudo no navegador, sem biblioteca.
// Lança 'not_image' quando o arquivo não é uma foto que dê pra abrir.
import { avatarCrop, AVATAR_TYPES } from '../comunidade/comunidadeMath'

export async function squareAvatarBlob(file) {
  if (!AVATAR_TYPES.includes(file?.type)) throw new Error('not_image')
  let bitmap
  try {
    // 'from-image': respeita a orientação gravada pela câmera do celular.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new Error('not_image')
  }
  const { sx, sy, side, size } = avatarCrop(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  canvas.getContext('2d').drawImage(bitmap, sx, sy, side, side, 0, 0, size, size)
  bitmap.close?.()
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.85))
  if (!blob) throw new Error('not_image')
  return blob
}
