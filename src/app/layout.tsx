import "./globals.css";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={``}>
      <body className="">{children}</body>
    </html>
  );
}
