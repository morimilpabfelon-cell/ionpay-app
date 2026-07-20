from pathlib import Path
from PIL import Image, ImageDraw


def read(path: str) -> str:
    return Path(path).read_text(encoding="utf-8")


def write(path: str, content: str) -> None:
    Path(path).write_text(content, encoding="utf-8")


def replace_required(path: str, old: str, new: str, count: int = 1) -> None:
    content = read(path)
    found = content.count(old)
    if found != count:
        raise SystemExit(f"{path}: expected {count} occurrence(s), found {found}: {old!r}")
    write(path, content.replace(old, new, count))


APP_LOGO_OLD = '''function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? 'compact' : ''}`} aria-label="ionPAY">
      {compact ? <span className="brand-mini">i<span>PAY</span></span> : <><span className="brand-ion">ion</span><span className="brand-pay">PAY</span></>}
    </div>
  )
}'''

APP_LOGO_NEW = '''function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? 'compact' : ''}`} role="img" aria-label="Yorm, símbolo PAY">
      <span className="brand-pay">PAY</span>
    </div>
  )
}'''

ONBOARDING_LOGO_OLD = '''// Local copy of the Logo component since the original Logo is defined in App.tsx and not exported
function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? 'compact' : ''}`} aria-label="ionPAY">
      {compact ? (
        <span className="brand-mini">i<span>PAY</span></span>
      ) : (
        <>
          <span className="brand-ion">ion</span>
          <span className="brand-pay">PAY</span>
        </>
      )}
    </div>
  )
}'''

ONBOARDING_LOGO_NEW = '''// Local PAY mark used by the Yorm onboarding surface.
function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? 'compact' : ''}`} role="img" aria-label="Yorm, símbolo PAY">
      <span className="brand-pay">PAY</span>
    </div>
  )
}'''

CSS_OLD = '''.brand { display: inline-flex; align-items: baseline; gap: 5px; position: relative; z-index: 3; color: currentColor; line-height: 1; }
.brand-ion { font: 300 27px/1 'Manrope', system-ui, sans-serif; letter-spacing: -2.4px; }
.brand-pay { font: 900 28px/1 'Manrope', system-ui, sans-serif; letter-spacing: -2.7px; }
.brand-mini { font: 300 16px/1 'Manrope', system-ui, sans-serif; letter-spacing: -1px; }
.brand-mini span { font-weight: 900; margin-left: 2px; }'''

CSS_NEW = '''.brand { display: inline-flex; align-items: center; position: relative; z-index: 3; color: currentColor; line-height: 1; }
.brand-pay { display: inline-block; font: 900 30px/1 'Manrope', system-ui, sans-serif; letter-spacing: -2.8px; text-transform: uppercase; }
.brand.compact .brand-pay { font-size: 16px; letter-spacing: -1.35px; }'''

replace_required("src/App.tsx", APP_LOGO_OLD, APP_LOGO_NEW)
replace_required("src/components/Onboarding.tsx", ONBOARDING_LOGO_OLD, ONBOARDING_LOGO_NEW)
replace_required("src/styles.css", CSS_OLD, CSS_NEW)

for old, new in [
    ("Visita Ion Guide", "Visita Yorm"),
    ("Wallet ionPAY V1", "Wallet Yorm V1"),
    ("Ion Activity", "Yorm Activity"),
    ("<small>IonTag</small>", "<small>Yorm ID</small>"),
    ("'Transferencia IONPAY API'", "'Transferencia Yorm API'"),
    ("'Tu cuenta IONPAY'", "'Tu cuenta Yorm'"),
    ("'Cobro IONPAY API'", "'Cobro Yorm API'"),
    ("'Ion Pay Demo'", "'Yorm Demo'"),
    ("'IONPAY Demo'", "'Yorm Demo'"),
    ("Tu IonTag", "Tu Yorm ID"),
    ("IonTag copiado", "Yorm ID copiado"),
    ("dentro de ionPAY V1.", "dentro de Yorm V1."),
    ("Recibo interno ionPAY V1", "Recibo interno Yorm V1"),
]:
    replace_required("src/App.tsx", old, new)

for old, new in [
    ("Bienvenido a IONPAY", "Bienvenido a Yorm"),
    ("API local de ionPAY.", "API local de Yorm."),
    ("<span>IonTag</span>", "<span>Yorm ID</span>"),
    ('placeholder="alex.ion"', 'placeholder="alex.yorm"'),
]:
    replace_required("src/components/Onboarding.tsx", old, new)

replace_required("src/components/ServicesPage.tsx", "ionPAY V1 · PEN only", "Yorm V1 · PEN only")
replace_required(
    "index.html",
    '<meta name="description" content="IONPAY — pagos, liquidez e inversión en una sola billetera." />',
    '<meta name="description" content="Yorm — pagos y control de dinero en una experiencia simple." />',
)
replace_required("index.html", "<title>IONPAY</title>", "<title>Yorm</title>")
replace_required("capacitor.config.ts", "appName: 'IONPAY'", "appName: 'Yorm'")
replace_required(
    "android/app/src/main/res/values/strings.xml",
    '<string name="app_name">IONPAY</string>',
    '<string name="app_name">Yorm</string>',
)
replace_required(
    "android/app/src/main/res/values/strings.xml",
    '<string name="title_activity_main">IONPAY</string>',
    '<string name="title_activity_main">Yorm</string>',
)

# Compatibility identifiers must remain untouched in this phase.
protected = {
    "capacitor.config.ts": ["appId: 'com.ionpay.app'"],
    "android/app/src/main/res/values/strings.xml": [
        '<string name="package_name">com.ionpay.app</string>',
        '<string name="custom_url_scheme">com.ionpay.app</string>',
    ],
}
for path, values in protected.items():
    content = read(path)
    for value in values:
        if value not in content:
            raise SystemExit(f"Protected identifier changed or missing: {path}: {value}")


def draw_pay_mark(size: int, transparent: bool = False) -> Image.Image:
    bg = (255, 255, 255, 0 if transparent else 255)
    image = Image.new("RGBA", (size, size), bg)
    draw = ImageDraw.Draw(image)
    black = (8, 8, 9, 255)

    # Geometric PAY mark: broad P, open triangular A, angular Y.
    left = int(size * 0.13)
    top = int(size * 0.34)
    height = int(size * 0.32)
    stroke = max(2, int(size * 0.065))

    # P
    draw.rectangle((left, top, left + stroke, top + height), fill=black)
    draw.rounded_rectangle(
        (left, top, left + int(size * 0.24), top + int(size * 0.17)),
        radius=int(size * 0.07),
        fill=black,
    )
    draw.rounded_rectangle(
        (left + stroke, top + stroke, left + int(size * 0.18), top + int(size * 0.11)),
        radius=int(size * 0.035),
        fill=bg,
    )
    draw.rectangle((left, top + int(size * 0.11), left + int(size * 0.17), top + int(size * 0.17)), fill=bg)

    # A without crossbar
    ax = int(size * 0.40)
    apex = (ax + int(size * 0.09), top)
    draw.polygon([
        (ax, top + height),
        (ax + stroke, top + height),
        (apex[0] + int(stroke * 0.30), apex[1] + int(stroke * 0.45)),
        apex,
    ], fill=black)
    draw.polygon([
        apex,
        (apex[0] + int(stroke * 0.75), apex[1] + int(stroke * 0.45)),
        (ax + int(size * 0.20), top + height),
        (ax + int(size * 0.20) - stroke, top + height),
    ], fill=black)

    # Y
    yx = int(size * 0.68)
    center_x = yx + int(size * 0.09)
    split_y = top + int(size * 0.16)
    draw.polygon([
        (yx, top),
        (yx + stroke, top),
        (center_x + int(stroke * 0.30), split_y),
        (center_x - int(stroke * 0.30), split_y),
    ], fill=black)
    draw.polygon([
        (yx + int(size * 0.18) - stroke, top),
        (yx + int(size * 0.18), top),
        (center_x + int(stroke * 0.30), split_y),
        (center_x - int(stroke * 0.30), split_y),
    ], fill=black)
    draw.rectangle((center_x - stroke // 2, split_y, center_x + stroke // 2, top + height), fill=black)
    return image


resource_root = Path("android/app/src/main/res")
launcher_paths = sorted(resource_root.glob("mipmap-*/ic_launcher*.png"))
if not launcher_paths:
    raise SystemExit("No Android launcher PNG assets found")

for path in launcher_paths:
    current = Image.open(path)
    width, height = current.size
    icon = draw_pay_mark(max(width, height), transparent="foreground" in path.name)
    if icon.size != (width, height):
        icon = icon.resize((width, height), Image.Resampling.LANCZOS)
    icon.save(path)

for path in sorted(resource_root.glob("drawable*/splash.png")):
    current = Image.open(path)
    width, height = current.size
    canvas = Image.new("RGBA", (width, height), (255, 255, 255, 255))
    mark_size = max(64, int(min(width, height) * 0.72))
    mark = draw_pay_mark(mark_size)
    canvas.alpha_composite(mark, ((width - mark_size) // 2, (height - mark_size) // 2))
    canvas.save(path)

public = Path("public")
public.mkdir(exist_ok=True)
draw_pay_mark(1024).save(public / "pay-mark.png")

for path in [
    Path("src/App.tsx"),
    Path("src/components/Onboarding.tsx"),
    Path("src/components/ServicesPage.tsx"),
    Path("index.html"),
    Path("capacitor.config.ts"),
    Path("android/app/src/main/res/values/strings.xml"),
]:
    content = path.read_text(encoding="utf-8")
    for legacy in ("ionPAY", "IONPAY", "Ion Pay"):
        if legacy in content:
            raise SystemExit(f"Visible legacy brand remains in {path}: {legacy}")

print("Yorm rebrand applied: PAY-only mark, Yorm application name, compatibility IDs preserved.")
