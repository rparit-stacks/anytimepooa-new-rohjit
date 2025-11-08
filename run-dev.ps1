# PowerShell script to run Next.js dev server without Turbopack
$env:NEXT_PRIVATE_SKIP_TURBO = "1"
npm run dev

