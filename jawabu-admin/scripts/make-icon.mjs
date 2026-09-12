import pngToIco from 'png-to-ico'
import { Jimp } from 'jimp'
import { copyFile, mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const original = path.join(root, 'public', 'images', 'brand', 'logo-mark-original.jpg')
const src = existsSync(original)
  ? original
  : path.join(root, 'public', 'images', 'brand', 'logo-mark.png')
const dest = path.join(root, 'public', 'images', 'brand', 'logo-mark.png')
const frontendDest = path.join(root, '..', 'frontend', 'public', 'images', 'brand', 'logo-mark.png')

function knockOutBlack(image) {
  const { data } = image.bitmap

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const max = Math.max(r, g, b)
    const isGold = r >= 70 && g >= 38 && r + g > b * 1.85 && r - b >= 28

    if (isGold) {
      data[i + 3] = 255
      continue
    }

    if (max < 36) {
      data[i + 3] = 0
      continue
    }

    data[i + 3] = Math.max(0, Math.min(255, Math.round(((max - 28) / 85) * 255)))
  }
}

function cropToMark(image) {
  const { data, width, height } = image.bitmap
  let minX = width
  let minY = height
  let maxX = 0
  let maxY = 0

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * 4 + 3]
      if (alpha < 18) {
        continue
      }
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }
  }

  const pad = Math.round(Math.max(maxX - minX, maxY - minY) * 0.06)
  const left = Math.max(0, minX - pad)
  const top = Math.max(0, minY - pad)
  const right = Math.min(width - 1, maxX + pad)
  const bottom = Math.min(height - 1, maxY + pad)
  return image.crop({
    x: left,
    y: top,
    w: right - left + 1,
    h: bottom - top + 1,
  })
}

const image = await Jimp.read(src)
knockOutBlack(image)
const cropped = cropToMark(image)
const side = Math.max(cropped.bitmap.width, cropped.bitmap.height)
const square = new Jimp({ width: side, height: side, color: 0x00000000 })
square.composite(
  cropped,
  Math.round((side - cropped.bitmap.width) / 2),
  Math.round((side - cropped.bitmap.height) / 2)
)

const transparentPng = await square.getBuffer('image/png')
await writeFile(dest, transparentPng)
await mkdir(path.dirname(frontendDest), { recursive: true })
await copyFile(src, frontendDest)

const sizes = [16, 24, 32, 48, 64, 128, 256]
const pngBuffers = []
for (const size of sizes) {
  const frame = square.clone().contain({ w: size, h: size })
  pngBuffers.push(await frame.getBuffer('image/png'))
}

const ico = await pngToIco(pngBuffers)
await mkdir(path.join(root, 'build'), { recursive: true })
await mkdir(path.join(root, 'electron'), { recursive: true })
await writeFile(path.join(root, 'build', 'icon.ico'), ico)
await writeFile(path.join(root, 'electron', 'icon.ico'), ico)

console.log('Wrote transparent logo-mark.png and Windows icons')
