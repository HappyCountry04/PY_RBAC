import base64
import io
import random
import uuid

from fastapi import APIRouter
from PIL import Image, ImageDraw, ImageFont

from app.core.response import success
from app.db.redis import redis_client

router = APIRouter(tags=["captcha"])

WIDTH, HEIGHT = 130, 48


@router.get("/captchaImage")
async def captcha_image():
    a = random.randint(1, 20)
    b = random.randint(1, 20)
    op = random.choice(["+", "-", "*"])
    if op == "+":
        answer = a + b
        expr = f"{a} + {b} = ?"
    elif op == "-":
        answer = max(a, b) - min(a, b)
        expr = f"{max(a, b)} - {min(a, b)} = ?"
    else:
        answer = a * b
        expr = f"{a} * {b} = ?"

    img = Image.new("RGB", (WIDTH, HEIGHT), color=(240, 244, 255))
    draw = ImageDraw.Draw(img)

    for i in range(6):
        x1 = random.randint(0, WIDTH)
        y1 = random.randint(0, HEIGHT)
        x2 = random.randint(0, WIDTH)
        y2 = random.randint(0, HEIGHT)
        draw.line([(x1, y1), (x2, y2)], fill=(180, 200, 230), width=1)

    for i in range(40):
        x = random.randint(0, WIDTH)
        y = random.randint(0, HEIGHT)
        draw.point((x, y), fill=(160, 180, 210))

    try:
        font = ImageFont.truetype("arial.ttf", 24)
    except Exception:
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 24)
        except Exception:
            font = ImageFont.load_default()

    bbox = draw.textbbox((0, 0), expr, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = (WIDTH - tw) // 2
    y = (HEIGHT - th) // 2
    draw.text((x, y), expr, fill=(30, 60, 120), font=font)

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    img_b64 = base64.b64encode(buf.getvalue()).decode()

    captcha_uuid = uuid.uuid4().hex
    await redis_client.setex(f"captcha:{captcha_uuid}", 120, str(answer))

    return success(img=f"data:image/png;base64,{img_b64}", uuid=captcha_uuid)
