import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const C = {
  transparent: [0, 0, 0, 0],
  outline: [38, 55, 70, 255],
  outlineSoft: [55, 74, 87, 255],
  wall: [255, 246, 223, 255],
  paper: [255, 249, 235, 255],
  sky: [101, 200, 243, 255],
  skyLight: [172, 229, 249, 255],
  water: [66, 198, 183, 255],
  waterDark: [39, 145, 149, 255],
  grass: [101, 183, 65, 255],
  grassLight: [149, 211, 93, 255],
  red: [238, 83, 83, 255],
  redDark: [170, 55, 55, 255],
  yellow: [255, 212, 90, 255],
  wood: [165, 103, 63, 255],
  woodDark: [112, 67, 41, 255],
  stone: [133, 147, 155, 255],
  stoneLight: [175, 185, 188, 255],
  skin: [242, 184, 132, 255],
  skinLight: [255, 207, 159, 255],
  pink: [239, 126, 154, 255],
  purple: [113, 92, 172, 255],
  steel: [150, 168, 181, 255],
  steelLight: [205, 216, 221, 255]
};

function canvas(width, height, color = C.transparent) {
  const pixels = new Uint8Array(width * height * 4);
  for (let index = 0; index < width * height; index += 1) {
    pixels[index * 4] = color[0];
    pixels[index * 4 + 1] = color[1];
    pixels[index * 4 + 2] = color[2];
    pixels[index * 4 + 3] = color[3];
  }
  return { width, height, pixels };
}

function pixel(target, x, y, color) {
  const px = Math.round(x);
  const py = Math.round(y);
  if (px < 0 || py < 0 || px >= target.width || py >= target.height) return;
  const index = (py * target.width + px) * 4;
  target.pixels[index] = color[0];
  target.pixels[index + 1] = color[1];
  target.pixels[index + 2] = color[2];
  target.pixels[index + 3] = color[3] ?? 255;
}

function rect(target, x, y, width, height, color) {
  for (let row = y; row < y + height; row += 1) {
    for (let column = x; column < x + width; column += 1) pixel(target, column, row, color);
  }
}

function circle(target, centerX, centerY, radius, color) {
  for (let y = centerY - radius; y <= centerY + radius; y += 1) {
    for (let x = centerX - radius; x <= centerX + radius; x += 1) {
      if ((x - centerX) ** 2 + (y - centerY) ** 2 <= radius ** 2) pixel(target, x, y, color);
    }
  }
}

function line(target, x0, y0, x1, y1, color, thickness = 1) {
  let x = x0;
  let y = y0;
  const dx = Math.abs(x1 - x0);
  const sx = x0 < x1 ? 1 : -1;
  const dy = -Math.abs(y1 - y0);
  const sy = y0 < y1 ? 1 : -1;
  let error = dx + dy;
  while (true) {
    rect(target, x, y, thickness, thickness, color);
    if (x === x1 && y === y1) break;
    const doubled = 2 * error;
    if (doubled >= dy) {
      error += dy;
      x += sx;
    }
    if (doubled <= dx) {
      error += dx;
      y += sy;
    }
  }
}

function blit(target, source, destinationX, destinationY, scale = 1) {
  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const index = (y * source.width + x) * 4;
      const alpha = source.pixels[index + 3];
      if (alpha === 0) continue;
      const color = [
        source.pixels[index],
        source.pixels[index + 1],
        source.pixels[index + 2],
        alpha
      ];
      rect(target, destinationX + x * scale, destinationY + y * scale, scale, scale, color);
    }
  }
}

function downsampleNearest(source, factor) {
  const width = Math.floor(source.width / factor);
  const height = Math.floor(source.height / factor);
  const target = canvas(width, height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sourceIndex = ((y * factor) * source.width + x * factor) * 4;
      pixel(target, x, y, [
        source.pixels[sourceIndex],
        source.pixels[sourceIndex + 1],
        source.pixels[sourceIndex + 2],
        source.pixels[sourceIndex + 3]
      ]);
    }
  }
  return target;
}

async function save(target, relativePath, scale = 1, format = "png") {
  const absolutePath = path.join(root, "public", "assets", ...relativePath.split("/"));
  await mkdir(path.dirname(absolutePath), { recursive: true });
  let pipeline = sharp(Buffer.from(target.pixels), {
    raw: { width: target.width, height: target.height, channels: 4 }
  });
  if (scale !== 1) {
    pipeline = pipeline.resize(Math.round(target.width * scale), Math.round(target.height * scale), {
      kernel: sharp.kernel.nearest
    });
  }
  if (format === "webp") {
    await pipeline.webp({ quality: 100, lossless: true, effort: 6 }).toFile(absolutePath);
  } else {
    await pipeline.png({ palette: true, colours: 128, compressionLevel: 9 }).toFile(absolutePath);
  }
}

function avatar64() {
  const image = canvas(64, 64);
  // 像素斗笠与红色帽绳
  rect(image, 24, 3, 16, 3, C.outline);
  rect(image, 19, 6, 26, 3, C.outline);
  rect(image, 14, 9, 36, 3, C.outline);
  rect(image, 10, 12, 44, 4, C.outline);
  rect(image, 13, 10, 38, 3, C.yellow);
  rect(image, 17, 7, 30, 3, [229, 170, 64, 255]);
  rect(image, 23, 4, 18, 3, C.yellow);
  rect(image, 13, 13, 38, 2, C.red);
  // 头发、面部与五官
  rect(image, 19, 16, 26, 4, C.outline);
  rect(image, 17, 20, 30, 16, C.outline);
  rect(image, 20, 19, 24, 16, C.skin);
  rect(image, 22, 20, 20, 4, C.skinLight);
  rect(image, 20, 20, 4, 10, C.outlineSoft);
  rect(image, 40, 20, 4, 10, C.outlineSoft);
  rect(image, 24, 25, 4, 3, C.outline);
  rect(image, 36, 25, 4, 3, C.outline);
  pixel(image, 25, 24, C.wall);
  pixel(image, 37, 24, C.wall);
  rect(image, 30, 29, 4, 2, C.redDark);
  rect(image, 27, 33, 10, 3, C.skin);
  // 外套、围巾、袖子
  rect(image, 17, 36, 30, 20, C.outline);
  rect(image, 20, 37, 24, 18, [58, 130, 181, 255]);
  rect(image, 24, 37, 16, 5, C.wall);
  rect(image, 29, 38, 6, 15, C.red);
  rect(image, 11, 39, 8, 16, C.outline);
  rect(image, 13, 40, 6, 13, [74, 148, 196, 255]);
  rect(image, 45, 39, 8, 16, C.outline);
  rect(image, 45, 40, 6, 13, [74, 148, 196, 255]);
  rect(image, 10, 52, 10, 4, C.skin);
  rect(image, 44, 52, 10, 4, C.skin);
  // 斜挎包与衣褶
  line(image, 22, 38, 41, 54, C.woodDark, 2);
  rect(image, 39, 47, 10, 9, C.woodDark);
  rect(image, 41, 49, 6, 5, C.wood);
  rect(image, 23, 47, 3, 7, [39, 92, 145, 255]);
  // 腿、靴子与阴影
  rect(image, 20, 55, 10, 5, C.outline);
  rect(image, 34, 55, 10, 5, C.outline);
  rect(image, 19, 59, 12, 4, C.outline);
  rect(image, 33, 59, 12, 4, C.outline);
  rect(image, 21, 56, 7, 3, [55, 83, 111, 255]);
  rect(image, 36, 56, 7, 3, [55, 83, 111, 255]);
  return image;
}

function drawFace(image, eyeY, mouthY, blush) {
  rect(image, 22, eyeY, 5, 5, C.outline);
  rect(image, 37, eyeY, 5, 5, C.outline);
  pixel(image, 23, eyeY, C.wall);
  pixel(image, 38, eyeY, C.wall);
  rect(image, 18, eyeY + 7, 5, 3, blush);
  rect(image, 41, eyeY + 7, 5, 3, blush);
  rect(image, 29, mouthY, 6, 2, C.outline);
}

function gear(image, x, y, color) {
  circle(image, x, y, 8, C.outline);
  rect(image, x - 2, y - 12, 5, 5, C.outline);
  rect(image, x - 2, y + 8, 5, 5, C.outline);
  rect(image, x - 12, y - 2, 5, 5, C.outline);
  rect(image, x + 8, y - 2, 5, 5, C.outline);
  circle(image, x, y, 6, color);
  circle(image, x, y, 2, C.outline);
}

function creature64(kind) {
  const image = canvas(64, 64);
  if (kind === "mechanical") {
    // 齿轮獾：金属耳、条纹尾与胸前齿轮
    rect(image, 13, 10, 12, 15, C.outline);
    rect(image, 39, 10, 12, 15, C.outline);
    rect(image, 16, 13, 7, 11, C.steel);
    rect(image, 41, 13, 7, 11, C.steel);
    gear(image, 52, 39, C.yellow);
    circle(image, 32, 34, 23, C.outline);
    circle(image, 32, 33, 20, C.steel);
    rect(image, 15, 29, 34, 8, C.steelLight);
    line(image, 20, 19, 25, 28, C.outlineSoft, 3);
    line(image, 44, 19, 39, 28, C.outlineSoft, 3);
    drawFace(image, 29, 41, C.red);
    gear(image, 32, 45, C.red);
    rect(image, 13, 51, 14, 8, C.outline);
    rect(image, 37, 51, 14, 8, C.outline);
    rect(image, 16, 52, 9, 5, C.steel);
    rect(image, 39, 52, 9, 5, C.steel);
    rect(image, 25, 16, 14, 3, C.red);
  } else if (kind === "water") {
    // 溪团兽：水滴头冠、鳍耳、波纹尾
    line(image, 32, 3, 24, 15, C.outline, 3);
    line(image, 32, 3, 40, 15, C.outline, 3);
    rect(image, 27, 10, 11, 10, C.sky);
    rect(image, 8, 22, 12, 20, C.outline);
    rect(image, 44, 22, 12, 20, C.outline);
    line(image, 11, 25, 18, 32, C.sky, 3);
    line(image, 53, 25, 46, 32, C.sky, 3);
    circle(image, 32, 36, 23, C.outline);
    circle(image, 32, 35, 20, C.water);
    rect(image, 18, 22, 28, 6, C.skyLight);
    rect(image, 22, 27, 20, 3, C.sky);
    drawFace(image, 32, 45, [255, 140, 151, 255]);
    line(image, 26, 48, 31, 51, C.wall, 2);
    line(image, 31, 51, 38, 47, C.wall, 2);
    rect(image, 13, 52, 14, 8, C.outline);
    rect(image, 37, 52, 14, 8, C.outline);
    rect(image, 16, 53, 9, 5, C.waterDark);
    rect(image, 39, 53, 9, 5, C.waterDark);
    line(image, 47, 46, 57, 41, C.outline, 3);
    line(image, 57, 41, 53, 35, C.outline, 3);
    line(image, 48, 45, 55, 41, C.sky, 2);
  } else {
    // 荷芽灵：双叶耳、莲花额饰与藤蔓尾
    line(image, 30, 18, 17, 6, C.outline, 4);
    line(image, 34, 18, 49, 7, C.outline, 4);
    line(image, 29, 16, 18, 8, C.grassLight, 2);
    line(image, 35, 16, 47, 9, C.grassLight, 2);
    circle(image, 32, 36, 23, C.outline);
    circle(image, 32, 35, 20, C.grass);
    rect(image, 19, 20, 26, 6, C.grassLight);
    // 三瓣荷花
    circle(image, 27, 18, 5, C.pink);
    circle(image, 37, 18, 5, C.pink);
    circle(image, 32, 14, 5, [255, 165, 184, 255]);
    rect(image, 30, 18, 5, 5, C.yellow);
    drawFace(image, 32, 45, C.pink);
    rect(image, 25, 47, 14, 3, C.grassLight);
    rect(image, 13, 52, 14, 8, C.outline);
    rect(image, 37, 52, 14, 8, C.outline);
    rect(image, 16, 53, 9, 5, C.grassLight);
    rect(image, 39, 53, 9, 5, C.grassLight);
    line(image, 48, 46, 57, 38, C.outline, 3);
    line(image, 57, 38, 55, 30, C.outline, 3);
    rect(image, 53, 27, 6, 8, C.grassLight);
  }
  // 左上高光，保证缩略图仍可辨识
  rect(image, 20, 24, 3, 5, [255, 255, 255, 130]);
  return image;
}

function recordBall32(primary, motifColor, motif) {
  const image = canvas(32, 32);
  circle(image, 16, 16, 15, C.outline);
  circle(image, 16, 16, 12, C.paper);
  for (let y = 4; y <= 15; y += 1) {
    for (let x = 4; x <= 27; x += 1) {
      if ((x - 16) ** 2 + (y - 16) ** 2 <= 144) pixel(image, x, y, primary);
    }
  }
  rect(image, 3, 14, 26, 5, C.outline);
  rect(image, 5, 15, 22, 2, C.outlineSoft);
  circle(image, 16, 16, 6, C.outline);
  circle(image, 16, 16, 3, motifColor);
  pixel(image, 8, 8, [255, 255, 255, 180]);
  rect(image, 10, 6, 5, 2, [255, 255, 255, 120]);

  if (motif === "flame") {
    line(image, 16, 5, 12, 12, motifColor, 2);
    line(image, 16, 5, 20, 12, motifColor, 2);
    rect(image, 15, 8, 3, 5, C.red);
  } else if (motif === "wave") {
    line(image, 7, 10, 11, 7, motifColor, 2);
    line(image, 11, 7, 15, 10, motifColor, 2);
    line(image, 19, 10, 23, 7, motifColor, 2);
  } else if (motif === "grain") {
    line(image, 16, 5, 16, 13, motifColor, 1);
    rect(image, 12, 7, 4, 2, motifColor);
    rect(image, 16, 10, 4, 2, motifColor);
  } else if (motif === "ink") {
    circle(image, 16, 9, 5, motifColor);
    rect(image, 12, 7, 5, 5, C.outline);
  } else if (motif === "cloud") {
    circle(image, 12, 9, 3, motifColor);
    circle(image, 17, 7, 4, motifColor);
    circle(image, 21, 10, 3, motifColor);
    rect(image, 10, 9, 13, 3, motifColor);
  } else if (motif === "lotus") {
    circle(image, 12, 9, 3, motifColor);
    circle(image, 20, 9, 3, motifColor);
    circle(image, 16, 7, 3, [255, 166, 189, 255]);
    rect(image, 15, 10, 3, 3, C.yellow);
  } else if (motif === "moon") {
    circle(image, 14, 8, 5, motifColor);
    circle(image, 17, 6, 4, primary);
    rect(image, 21, 7, 2, 2, C.yellow);
  } else {
    line(image, 9, 12, 14, 7, motifColor, 2);
    line(image, 14, 7, 18, 11, motifColor, 2);
    line(image, 18, 11, 23, 6, motifColor, 2);
  }
  return image;
}

function tagIcon24(kind) {
  const image = canvas(24, 24);
  const palettes = {
    mechanical: [79, 136, 198, 255],
    scroll: C.wood,
    star: C.grass,
    mountain: [138, 90, 194, 255]
  };
  rect(image, 2, 2, 20, 20, C.outline);
  rect(image, 4, 4, 16, 16, palettes[kind]);
  rect(image, 5, 5, 14, 2, [255, 255, 255, 80]);
  if (kind === "mechanical") {
    circle(image, 12, 12, 6, C.yellow);
    rect(image, 10, 4, 4, 5, C.yellow);
    rect(image, 10, 15, 4, 5, C.yellow);
    rect(image, 4, 10, 5, 4, C.yellow);
    rect(image, 15, 10, 5, 4, C.yellow);
    circle(image, 12, 12, 2, C.outline);
  } else if (kind === "scroll") {
    rect(image, 6, 5, 12, 14, C.paper);
    rect(image, 5, 5, 3, 14, C.yellow);
    rect(image, 16, 5, 3, 14, C.yellow);
    rect(image, 9, 9, 6, 2, C.woodDark);
    rect(image, 9, 13, 6, 2, C.woodDark);
  } else if (kind === "star") {
    rect(image, 10, 5, 4, 14, C.yellow);
    rect(image, 5, 10, 14, 4, C.yellow);
    rect(image, 8, 8, 8, 8, C.yellow);
    circle(image, 12, 12, 2, C.paper);
  } else {
    line(image, 5, 17, 11, 8, C.wall, 3);
    line(image, 11, 8, 15, 13, C.wall, 3);
    line(image, 15, 13, 20, 6, C.wall, 3);
    rect(image, 5, 17, 15, 2, C.skyLight);
  }
  return image;
}

function buildingTile96() {
  const image = canvas(96, 64, C.sky);
  // 远山与水巷
  for (let row = 0; row < 25; row += 1) {
    const half = row * 2;
    rect(image, 18 - half, 34 - row, half * 2, 1, [76, 150, 116, 255]);
    rect(image, 76 - half, 38 - row, half * 2, 1, [82, 164, 128, 255]);
  }
  rect(image, 0, 52, 96, 12, C.water);
  rect(image, 4, 56, 20, 1, C.skyLight);
  rect(image, 36, 60, 28, 1, C.skyLight);
  // 白墙黛瓦与马头墙
  rect(image, 12, 27, 72, 27, C.outline);
  rect(image, 15, 28, 66, 25, C.wall);
  rect(image, 8, 23, 80, 7, C.outline);
  for (let x = 10; x < 86; x += 8) rect(image, x, 24, 5, 3, C.outlineSoft);
  rect(image, 16, 15, 12, 10, C.outline);
  rect(image, 18, 16, 8, 9, C.wall);
  rect(image, 68, 15, 12, 10, C.outline);
  rect(image, 70, 16, 8, 9, C.wall);
  rect(image, 20, 11, 8, 5, C.outline);
  rect(image, 68, 11, 8, 5, C.outline);
  // 木门、窗棂和灯笼
  rect(image, 41, 36, 14, 18, C.woodDark);
  rect(image, 44, 39, 8, 15, C.wood);
  pixel(image, 50, 47, C.yellow);
  for (const x of [22, 65]) {
    rect(image, x, 36, 11, 10, C.woodDark);
    rect(image, x + 2, 38, 7, 6, C.water);
    line(image, x + 5, 38, x + 5, 44, C.woodDark, 1);
    line(image, x + 2, 41, x + 9, 41, C.woodDark, 1);
  }
  rect(image, 34, 31, 3, 7, C.redDark);
  rect(image, 33, 34, 5, 5, C.red);
  rect(image, 58, 31, 3, 7, C.redDark);
  rect(image, 57, 34, 5, 5, C.red);
  return image;
}

function socialPreview640() {
  const image = canvas(640, 360, C.sky);
  // 天空云层
  rect(image, 0, 0, 640, 175, C.sky);
  rect(image, 0, 0, 640, 48, C.skyLight);
  for (const [x, y] of [[66, 66], [290, 42], [500, 80]]) {
    rect(image, x, y, 54, 10, [255, 255, 255, 220]);
    rect(image, x + 14, y - 12, 28, 12, [255, 255, 255, 220]);
    rect(image, x + 38, y - 5, 34, 15, [255, 255, 255, 220]);
  }
  // 三层青绿远山
  for (const [offset, baseY, color] of [
    [-30, 185, [87, 157, 128, 255]],
    [70, 205, [72, 142, 111, 255]],
    [180, 218, [62, 125, 99, 255]]
  ]) {
    for (let x = offset; x < 700; x += 145) {
      for (let row = 0; row < 90; row += 1) {
        const half = Math.floor(row * 0.78);
        rect(image, x + 72 - half, baseY - row, half * 2, 1, color);
      }
    }
  }
  // 草地、水巷、石板路
  rect(image, 0, 210, 640, 78, C.grass);
  rect(image, 0, 288, 640, 72, C.water);
  for (let x = 0; x < 640; x += 70) {
    rect(image, x, 312 + (x % 3) * 3, 42, 3, C.skyLight);
    rect(image, x + 22, 338, 32, 2, [255, 255, 255, 130]);
  }
  rect(image, 0, 260, 640, 34, C.stone);
  for (let x = 0; x < 640; x += 48) rect(image, x, 276, 44, 2, C.stoneLight);
  // 牌坊、书院、图鉴馆、藏书楼与临水院
  const houses = [
    [30, 204, 92, 58],
    [148, 170, 132, 92],
    [330, 188, 104, 74],
    [472, 150, 124, 112]
  ];
  for (const [x, y, width, height] of houses) {
    rect(image, x, y, width, height, C.outline);
    rect(image, x + 4, y + 4, width - 8, height - 4, C.wall);
    rect(image, x - 6, y - 8, width + 12, 12, C.outline);
    for (let tile = x - 2; tile < x + width; tile += 12) rect(image, tile, y - 5, 8, 4, C.outlineSoft);
    rect(image, x + 10, y - 28, 18, 24, C.outline);
    rect(image, x + 14, y - 24, 10, 20, C.wall);
    rect(image, x + width - 28, y - 28, 18, 24, C.outline);
    rect(image, x + width - 24, y - 24, 10, 20, C.wall);
    const doorX = x + Math.floor(width / 2) - 9;
    rect(image, doorX, y + height - 30, 18, 30, C.woodDark);
    rect(image, doorX + 4, y + height - 26, 10, 26, C.wood);
    for (const windowX of [x + 16, x + width - 32]) {
      rect(image, windowX, y + 24, 16, 15, C.woodDark);
      rect(image, windowX + 3, y + 27, 10, 9, C.water);
      line(image, windowX + 8, y + 27, windowX + 8, y + 36, C.woodDark, 1);
    }
    rect(image, doorX - 18, y + 8, 4, 13, C.redDark);
    rect(image, doorX - 20, y + 14, 8, 9, C.red);
    rect(image, doorX + 31, y + 8, 4, 13, C.redDark);
    rect(image, doorX + 29, y + 14, 8, 9, C.red);
  }
  // 拱桥与荷塘
  rect(image, 270, 268, 94, 12, C.stoneLight);
  for (let x = 275; x < 360; x += 12) rect(image, x, 270, 8, 3, C.stone);
  rect(image, 278, 258, 78, 11, C.stone);
  circle(image, 410, 315, 5, C.pink);
  rect(image, 409, 319, 2, 10, C.grass);
  circle(image, 448, 330, 4, C.yellow);
  rect(image, 447, 333, 2, 8, C.grass);
  // 原创主人和三只灵兽
  blit(image, avatar64(), 72, 222, 1);
  blit(image, creature64("mechanical"), 226, 228, 1);
  blit(image, creature64("water"), 375, 238, 1);
  blit(image, creature64("nature"), 520, 232, 1);
  // 前景芦苇
  for (const x of [18, 26, 602, 614, 626]) {
    line(image, x, 352, x - 4, 315, C.grass, 2);
    rect(image, x - 7, 310, 7, 4, C.yellow);
  }
  return image;
}

const avatar = avatar64();
const avatarSmall = downsampleNearest(avatar, 2);
await save(avatar, "profile/avatar-original.png", 2);
await save(avatarSmall, "profile/avatar-32.png", 1);
await save(avatar, "profile/avatar-64.png", 1);
await save(avatarSmall, "profile/avatar-96.png", 3);
await save(avatar, "profile/avatar-128.png", 2);

for (const kind of ["mechanical", "water", "nature"]) {
  const sprite = creature64(kind);
  const id = `${kind}-01`;
  await save(sprite, `creatures/${kind}/${id}.png`, 1);
  await save(sprite, `creatures/${kind}/${id}-large.png`, 2);
}

const balls = [
  ["red-flame", C.red, C.yellow, "flame"],
  ["blue-stream", C.water, C.skyLight, "wave"],
  ["gold-harvest", C.yellow, C.woodDark, "grain"],
  ["ink-jade", C.outline, C.water, "ink"],
  ["cloud-pattern", C.sky, C.wall, "cloud"],
  ["lotus", C.pink, C.yellow, "lotus"],
  ["star-moon", C.purple, C.yellow, "moon"],
  ["huizhou-pattern", C.stone, C.red, "mountain"]
];
for (const [name, primary, motifColor, motif] of balls) {
  await save(recordBall32(primary, motifColor, motif), `calendar-icons/${name}.png`, 1);
}

for (const kind of ["mechanical", "scroll", "star", "mountain"]) {
  await save(tagIcon24(kind), `tag-icons/${kind}.png`, 1);
}
await save(tagIcon24("scroll"), "emojis/soc.webp", 1, "webp");
await save(buildingTile96(), "buildings/academy-tile.png", 2);
await save(buildingTile96(), "map/village-preview.png", 4);
await save(recordBall32(C.water, C.yellow, "lotus"), "environment/lotus-marker.png", 1);
await save(socialPreview640(), "og/huizhou-weekly-preview.png", 2);

await mkdir(path.join(root, "public", "assets", "reports"), { recursive: true });
console.log("高精度原创像素资源已生成：64px 头像/灵兽、32px 记录球、24px 徽章、1280×720 分享图。");
