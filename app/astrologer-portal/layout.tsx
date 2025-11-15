export default function AstrologerPortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // No user navbar here - astrologer portal has its own navigation
  return <>{children}</>
}
