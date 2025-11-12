export default {
  async fetch(request) {
    const { searchParams } = new URL(request.url);
    const name = decodeText(searchParams.get("name")) || "Muhammad Fauzan";
    const role = decodeText(searchParams.get("role")) || "IT Infrastructure & Support";
    const gradientFrom = normaliseColor(searchParams.get("from") || "10b981");
    const gradientTo = normaliseColor(searchParams.get("to") || "14b8a6");

    const width = 1200;
    const height = 630;

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d");

    const backgroundGradient = ctx.createLinearGradient(0, 0, width, height);
    backgroundGradient.addColorStop(0, gradientFrom);
    backgroundGradient.addColorStop(1, gradientTo);
    ctx.fillStyle = backgroundGradient;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "rgba(15, 23, 42, 0.55)";
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "#ffffff";
    ctx.font = "700 80px 'Segoe UI', 'Inter', sans-serif";
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    const nameX = 120;
    const nameY = 180;
    wrapText(ctx, name, nameX, nameY, width - nameX * 2, 86);

    ctx.fillStyle = "#bbf7d0";
    ctx.font = "500 48px 'Segoe UI', 'Inter', sans-serif";
    wrapText(ctx, role, nameX, nameY + 190, width - nameX * 2, 62);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
    ctx.lineWidth = 12;
    roundedRect(ctx, width - 280, height - 120, 200, 60, 18);
    ctx.stroke();

    ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
    ctx.font = "500 28px 'Segoe UI', 'Inter', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("portofolio.odinsan.co.id", width - 180, height - 82);
    ctx.textAlign = "left";

    const blob = await canvas.convertToBlob({ type: "image/png" });
    return new Response(blob.stream(), {
      headers: {
        "content-type": "image/png",
        "cache-control": "public, max-age=3600"
      }
    });
  }
};

function decodeText(value) {
  if (!value) return "";
  try {
    return decodeURIComponent(value);
  } catch (error) {
    return value;
  }
}

function normaliseColor(value) {
  const cleaned = value.toString().trim().replace(/^#/g, "").slice(0, 6);
  return `#${cleaned.padEnd(6, "0")}`;
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(/\s+/).filter(Boolean);
  let line = "";
  let lineY = y;

  for (const word of words) {
    const testLine = line.length ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, lineY);
      line = word;
      lineY += lineHeight;
    } else {
      line = testLine;
    }
  }

  if (line) {
    ctx.fillText(line, x, lineY);
  }
}

function roundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
