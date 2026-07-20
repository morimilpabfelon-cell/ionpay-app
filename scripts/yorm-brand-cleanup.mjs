import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()

function filePath(relativePath) {
  return path.join(root, relativePath)
}

function read(relativePath) {
  return fs.readFileSync(filePath(relativePath), 'utf8')
}

function write(relativePath, content) {
  fs.mkdirSync(path.dirname(filePath(relativePath)), { recursive: true })
  fs.writeFileSync(filePath(relativePath), content.endsWith('\n') ? content : `${content}\n`, 'utf8')
}

function replaceIfPresent(relativePath, from, to) {
  const current = read(relativePath)
  if (current.includes(from)) {
    write(relativePath, current.replaceAll(from, to))
    return true
  }
  return false
}

function replaceRegexIfPresent(relativePath, expression, replacement) {
  const current = read(relativePath)
  if (expression.test(current)) {
    write(relativePath, current.replace(expression, replacement))
    return true
  }
  return false
}

const oldLogo = `{compact ? <span className="brand-mini">PAY</span> : <span className="brand-pay">PAY</span>}`
const newLogo = `<span className="brand-yorm">{compact ? 'Y' : 'Yorm'}</span>`

for (const relativePath of ['src/App.tsx', 'src/components/Onboarding.tsx']) {
  replaceIfPresent(relativePath, 'aria-label="PAY, aplicación Yorm"', 'aria-label="Yorm"')
  replaceIfPresent(relativePath, oldLogo, newLogo)
}

replaceIfPresent('src/App.tsx', "action === 'pay' ? 'Ion Pay Demo' : 'IONPAY Demo'", "'Yorm Demo'")

replaceRegexIfPresent(
  'src/styles.css',
  /\.brand-ion \{[^\n]*\}\r?\n\.brand-pay \{[^\n]*\}\r?\n\.brand-mini \{[^\n]*\}\r?\n\.brand-mini span \{[^\n]*\}\r?\n/,
  `.brand-yorm { font: 800 28px/1 'Manrope', system-ui, sans-serif; letter-spacing: -1.8px; }\n.brand.compact .brand-yorm { font-size: 16px; letter-spacing: -.8px; }\n`,
)

replaceIfPresent(
  'src/styles.css',
  '/* Mobile visual system based on the approved IONPAY references */',
  '/* Mobile visual system for Yorm */',
)
replaceRegexIfPresent(
  'src/styles.css',
  /\s*\.mobile-brand \.brand-ion \{[^\n]*\}\r?\n\s*\.mobile-brand \.brand-pay \{[^\n]*\}\r?\n/,
  `\n  .mobile-brand .brand-yorm { font-size: 25px; }\n`,
)
replaceRegexIfPresent(
  'src/styles.css',
  /\s*\.profile-logo \.brand-ion \{[^\n]*\}\r?\n\s*\.profile-logo \.brand-pay \{[^\n]*\}\r?\n/,
  `\n  .profile-logo .brand-yorm { font-size: 23px; }\n`,
)

const yPath = 'M22,24H38L54,44L70,24H86L61,56V84H47V56Z'
const foreground = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <path
        android:fillColor="#FF0A0A0B"
        android:pathData="${yPath}" />
</vector>`

const legacySquare = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <path
        android:fillColor="#FFFFFFFF"
        android:pathData="M0,0H108V108H0Z" />
    <path
        android:fillColor="#FF0A0A0B"
        android:pathData="${yPath}" />
</vector>`

const legacyRound = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <path
        android:fillColor="#FFFFFFFF"
        android:pathData="M54,0A54,54 0,1 1 53.999,0Z" />
    <path
        android:fillColor="#FF0A0A0B"
        android:pathData="${yPath}" />
</vector>`

write('android/app/src/main/res/drawable/yorm_foreground.xml', foreground)
write('android/app/src/main/res/mipmap-anydpi/ic_launcher.xml', legacySquare)
write('android/app/src/main/res/mipmap-anydpi/ic_launcher_round.xml', legacyRound)

for (const relativePath of [
  'android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml',
  'android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml',
]) {
  replaceIfPresent(relativePath, '@drawable/yorm_pay_foreground', '@drawable/yorm_foreground')
}

const oldForeground = filePath('android/app/src/main/res/drawable/yorm_pay_foreground.xml')
if (fs.existsSync(oldForeground)) {
  fs.rmSync(oldForeground)
}

const visibleFiles = [
  'src/App.tsx',
  'src/components/Onboarding.tsx',
  'src/styles.css',
  'android/app/src/main/res/drawable/yorm_foreground.xml',
  'android/app/src/main/res/mipmap-anydpi/ic_launcher.xml',
  'android/app/src/main/res/mipmap-anydpi/ic_launcher_round.xml',
  'android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml',
  'android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml',
]

for (const relativePath of visibleFiles) {
  const content = read(relativePath)
  const forbidden = [
    /\bPAY\b/,
    /\bIONPAY\b/,
    /ionPAY/,
    /brand-pay/,
    /brand-mini/,
    /brand-ion/,
    /yorm_pay_foreground/,
  ].filter((expression) => expression.test(content))

  if (forbidden.length > 0) {
    throw new Error(`Legacy visible branding remains in ${relativePath}: ${forbidden.join(', ')}`)
  }
}

console.log('Yorm-only visible brand cleanup applied successfully.')
